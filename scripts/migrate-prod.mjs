// Prod DB-yə əskik migration kolonlarını əlavə edir (0005 + 0007 + 0008).
// HAMISI additiv (ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS) — heç nə silinmir.
// DATABASE_URL .env.local-dan oxunur (secret koda yazılmır). Neon HTTP sürücüsü (pooler-lə də işləyir).
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'

const m = readFileSync('.env.local', 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.*)$/m)
if (!m) { console.error('❌ .env.local-da DATABASE_URL tapılmadı'); process.exit(1) }
const url = m[1].trim().replace(/^["']|["']$/g, '')
const sql = neon(url)

const statements = [
  // ── 0005 (branch lifecycle) — sütunlar ──
  `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp`,
  `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "revoked_by" uuid`,
  `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "revoked_reason" text`,
  `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "replaces_manager_id" uuid`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "activated_at" timestamp`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "archived_at" timestamp`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "archived_by" uuid`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "archive_reason" text`,
  // ── 0005 — FK-lar (idempotent DO bloku) ──
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invitations_revoked_by_users_id_fk') THEN ALTER TABLE "invitations" ADD CONSTRAINT "invitations_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id"); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invitations_replaces_manager_id_users_id_fk') THEN ALTER TABLE "invitations" ADD CONSTRAINT "invitations_replaces_manager_id_users_id_fk" FOREIGN KEY ("replaces_manager_id") REFERENCES "public"."users"("id"); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_archived_by_users_id_fk') THEN ALTER TABLE "branches" ADD CONSTRAINT "branches_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id"); END IF; END $$`,
  // ── 0005 — indekslər ──
  `CREATE UNIQUE INDEX IF NOT EXISTS "invitations_live_branch_manager_uq" ON "invitations" USING btree ("tenant_id","branch_id") WHERE "invitations"."role" = 'branch_manager' AND "invitations"."accepted_at" IS NULL AND "invitations"."revoked_at" IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "branches_tenant_code_uq" ON "branches" USING btree ("tenant_id","code")`,
  // ── 0007 ──
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL`,
  // ── 0008 ──
  `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
  `ALTER TABLE "invitations" ALTER COLUMN "role" DROP DEFAULT`,
  `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "external_customer_id" text`,
  `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plan_code" text`,
  `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "provisioned_by" text`,
  `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "provisioned_at" timestamp`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "tenants_external_customer_id_uq" ON "tenants" ("external_customer_id") WHERE "external_customer_id" IS NOT NULL`,
  `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'manual'`,
]

let ok = 0, fail = 0
for (const s of statements) {
  try { await sql.query(s); ok++; console.log('✓', s.slice(0, 78)) }
  catch (e) { fail++; console.log('✗', s.slice(0, 78), '→', e.message) }
}
console.log(`\nBitdi: ${ok} OK · ${fail} xəta`)

// Doğrulama — kritik kolonlar var mı
try {
  const rows = await sql.query(`SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name='invitations' AND column_name IN ('revoked_at','source','replaces_manager_id'))
       OR (table_name='branches' AND column_name IN ('version','archived_at'))
       OR (table_name='users' AND column_name='must_change_password')
       OR (table_name='tenants' AND column_name='provisioned_by')
    ORDER BY table_name, column_name`)
  const list = Array.isArray(rows) ? rows : (rows.rows ?? [])
  console.log('\n✅ Doğrulama — mövcud kritik kolonlar:')
  for (const r of list) console.log(`   ${r.table_name}.${r.column_name}`)
} catch (e) { console.log('doğrulama xətası:', e.message) }
