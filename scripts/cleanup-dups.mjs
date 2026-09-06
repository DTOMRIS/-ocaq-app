import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
const url = readFileSync('.env.local','utf8').match(/^\s*DATABASE_URL\s*=\s*(.*)$/m)[1].trim().replace(/^["']|["']$/g,'')
const sql = neon(url)
// Aynı şubeye birden çox bekleyen branch_manager daveti → en yenisini tut, eskilerini sil
const del = await sql.query(`DELETE FROM invitations a USING invitations b
  WHERE a.role='branch_manager' AND a.accepted_at IS NULL AND a.revoked_at IS NULL
    AND b.role='branch_manager' AND b.accepted_at IS NULL AND b.revoked_at IS NULL
    AND a.tenant_id=b.tenant_id AND a.branch_id=b.branch_id AND a.created_at < b.created_at`)
console.log('Silinen duplike dəvət:', del.length ?? '(ok)')
try { await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS "invitations_live_branch_manager_uq" ON "invitations" USING btree ("tenant_id","branch_id") WHERE "invitations"."role" = 'branch_manager' AND "invitations"."accepted_at" IS NULL AND "invitations"."revoked_at" IS NULL`); console.log('✓ Index kuruldu (dup-koruma aktif)') }
catch(e){ console.log('✗ Index:', e.message) }
