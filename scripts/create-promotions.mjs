import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
const url = readFileSync('.env.local','utf8').match(/^\s*DATABASE_URL\s*=\s*(.*)$/m)[1].trim().replace(/^["']|["']$/g,'')
const sql = neon(url)
await sql.query(`CREATE TABLE IF NOT EXISTS "promotions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "title" text NOT NULL,
  "description" text,
  "promo_type" text NOT NULL DEFAULT 'percent',
  "discount_value" text,
  "code" text,
  "image_url" text,
  "badge" text DEFAULT 'AKTİV',
  "valid_from" date,
  "valid_until" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "branch_id" uuid REFERENCES "branches"("id"),
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
)`)
console.log('✓ promotions cədvəli yaradıldı')
const chk = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='promotions' ORDER BY ordinal_position`)
console.log('kolonlar:', (Array.isArray(chk)?chk:chk.rows).map(r=>r.column_name).join(', '))
