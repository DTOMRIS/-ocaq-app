import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
const url = readFileSync('.env.local','utf8').match(/^\s*DATABASE_URL\s*=\s*(.*)$/m)[1].trim().replace(/^["']|["']$/g,'')
const sql = neon(url)
for (const c of ['"start_time" text','"end_time" text','"active_days" text','"location" text']) {
  await sql.query(`ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS ${c}`); console.log('✓', c)
}
