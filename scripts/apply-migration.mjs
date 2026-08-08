#!/usr/bin/env node
/**
 * Migration tətbiqçisi — `drizzle/migrations/*.sql` faylını əl ilə işlədir.
 *
 * NİYƏ LAZIMDIR: bu repoda `drizzle/migrations/meta/_journal.json` 0007-də
 * donmuşdur — 0008, 0009, 0010 ƏL İLƏ yazılmış SQL-dir və `drizzle-kit migrate`
 * onları GÖRMÜR. Deploy də migration işlətmir. Nəticədə "hansı migration
 * tətbiq olunub?" sualının cavabı heç yerdə yazılmırdı; bu skript onu
 * `schema_migrations_manual` cədvəlində qeyd edir.
 *
 * İSTİFADƏ:
 *   node scripts/apply-migration.mjs 0010_analytics_fact_tables.sql            # DRY-RUN
 *   node scripts/apply-migration.mjs 0010_analytics_fact_tables.sql --apply    # tətbiq et
 *
 * TƏHLÜKƏSİZLİK:
 *   • Standart rejim DRY-RUN — `--apply` olmadan DB-yə HEÇ NƏ yazılmır.
 *   • DATABASE_URL loga YAZILMIR (yalnız host maskalanmış göstərilir).
 *   • Destruktiv ifadə (DROP/TRUNCATE/DELETE/ALTER COLUMN) görsə DAYANIR;
 *     davam etmək üçün `--allow-destructive` lazımdır (snapshot şərtdir!).
 *   • Sətirlər ARDICIL işlədilir. Neon HTTP sürücüsü çoxifadəli sorğu qəbul
 *     etmir, bir çağırışda tranzaksiya da yoxdur — ona görə migration
 *     İDEMPOTENT olmalıdır (`IF NOT EXISTS`). Yarıda kəsilsə TƏKRAR İŞLƏT.
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const APPLY = args.includes('--apply')
const ALLOW_DESTRUCTIVE = args.includes('--allow-destructive')

if (!file) {
  console.error('İstifadə: node scripts/apply-migration.mjs <fayl.sql> [--apply] [--allow-destructive]')
  process.exit(1)
}

// ── DATABASE_URL: env → .env.local (drizzle.config.ts ilə eyni qayda) ────────
let url = process.env.DATABASE_URL
if (!url) {
  try {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.*)$/m)
    if (m) url = m[1].trim().replace(/^["']|["']$/g, '')
  } catch { /* .env.local yoxdur */ }
}
if (!url) {
  console.error('✗ DATABASE_URL tapılmadı (env və ya .env.local).')
  process.exit(1)
}
// Host-u maskala — parol/token HEÇ VAXT loga düşməsin.
let hostMask = '?'
try {
  const h = new URL(url).host
  hostMask = h.replace(/^([^.]{0,4})[^.]*/, (_, k) => k + '***')
} catch { /* parse olunmadı */ }

// ── SQL-i ifadələrə böl (string / dollar-quote / şərh nəzərə alınır) ─────────
function splitStatements(sql) {
  const out = []
  let buf = ''
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const two = sql.slice(i, i + 2)
    if (two === '--') {                       // sətir şərhi
      const nl = sql.indexOf('\n', i)
      i = nl === -1 ? sql.length : nl + 1
      continue
    }
    if (two === '/*') {                       // blok şərhi
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      continue
    }
    if (c === "'" || c === '"') {             // sətir/identifikator sabiti
      const q = c
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === q && sql[j + 1] === q) { j += 2; continue }   // qoşa qaçış
        if (sql[j] === q) { j++; break }
        j++
      }
      buf += sql.slice(i, j)
      i = j
      continue
    }
    const dollar = sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/)          // $$ ... $$
    if (dollar) {
      const tag = dollar[0]
      const end = sql.indexOf(tag, i + tag.length)
      const j = end === -1 ? sql.length : end + tag.length
      buf += sql.slice(i, j)
      i = j
      continue
    }
    if (c === ';') { out.push(buf.trim()); buf = ''; i++; continue }
    buf += c
    i++
  }
  if (buf.trim()) out.push(buf.trim())
  return out.filter(Boolean)
}

const path = resolve('drizzle/migrations', file)
const raw = readFileSync(path, 'utf8')
const statements = splitStatements(raw)

// ── Destruktiv yoxlama ──────────────────────────────────────────────────────
const DESTRUCTIVE = /\b(drop\s+(table|column|index|schema|type|constraint)|truncate|delete\s+from|alter\s+column|rename\s+to)\b/i
const risky = statements.filter(s => DESTRUCTIVE.test(s))

console.log(`\nMigration : ${file}`)
console.log(`DB host   : ${hostMask}`)
console.log(`İfadə     : ${statements.length}`)
console.log(`Rejim     : ${APPLY ? '⚠️  TƏTBİQ (--apply)' : 'DRY-RUN (DB-yə yazılmır)'}`)

if (risky.length) {
  console.log(`\n⚠️  ${risky.length} DESTRUKTİV ifadə tapıldı:`)
  risky.forEach(s => console.log('   ! ' + s.replace(/\s+/g, ' ').slice(0, 120)))
  if (APPLY && !ALLOW_DESTRUCTIVE) {
    console.error('\n✗ DAYANDIRILDI. Neon snapshot alın, sonra --allow-destructive əlavə edin.')
    process.exit(2)
  }
}

if (!APPLY) {
  console.log('\nİşlədiləcək ifadələr:')
  statements.forEach((s, n) => console.log(`\n[${n + 1}/${statements.length}] ${s.replace(/\s+/g, ' ').slice(0, 160)}`))
  console.log('\n→ Tətbiq etmək üçün: --apply  (ƏVVƏLCƏ NEON SNAPSHOT!)')
  process.exit(0)
}

// ── Tətbiq ──────────────────────────────────────────────────────────────────
const sql = neon(url)

// Tətbiq qeydiyyatı (add-only, zərərsiz): "hansı migration işləyib?" sualı
// bir daha cavabsız qalmasın — journal 0007-də donduğu üçün bu boşluq vardı.
await sql.query(`
  create table if not exists "schema_migrations_manual" (
    "filename"   text primary key,
    "applied_at" timestamp not null default now(),
    "statements" integer
  )
`)
const prevRows = await sql.query(`select applied_at from "schema_migrations_manual" where filename = $1`, [file])
const prev = Array.isArray(prevRows) ? prevRows : prevRows.rows
if (prev?.length) {
  console.log(`\nℹ️  Bu migration əvvəl qeyd olunub: ${prev[0].applied_at}`)
  console.log('   Migration idempotentdirsə təkrar işlətmək zərərsizdir, davam edilir.')
}

let ok = 0
for (let n = 0; n < statements.length; n++) {
  const s = statements[n]
  const label = s.replace(/\s+/g, ' ').slice(0, 90)
  try {
    await sql.query(s)
    ok++
    console.log(`✓ [${n + 1}/${statements.length}] ${label}`)
  } catch (e) {
    // Xəta UDULMUR (CLAUDE.md §2.7).
    console.error(`\n✗ [${n + 1}/${statements.length}] UĞURSUZ: ${label}`)
    console.error(`  ${e.message}`)
    console.error(`\n${ok}/${statements.length} ifadə tətbiq olundu. Migration idempotentdir —`)
    console.error('səbəbi düzəldib TƏKRAR işlədin (uğurlu ifadələr no-op olacaq).')
    process.exit(1)
  }
}

await sql.query(
  `insert into "schema_migrations_manual" (filename, statements) values ($1, $2)
   on conflict (filename) do update set applied_at = now(), statements = excluded.statements`,
  [file, statements.length],
)

console.log(`\n✓ ${ok}/${statements.length} ifadə tətbiq olundu və qeydə alındı.`)

// ── Doğrulama: bu migration-da adı keçən cədvəllər həqiqətən varmı? ─────────
const tables = [...new Set([...raw.matchAll(/create\s+table\s+if\s+not\s+exists\s+"?([a-z0-9_]+)"?/gi)].map(m => m[1]))]
if (tables.length) {
  console.log('\nDoğrulama:')
  for (const t of tables) {
    const r = await sql.query(
      `select count(*)::int as cols from information_schema.columns where table_name = $1`, [t])
    const cols = (Array.isArray(r) ? r : r.rows)[0]?.cols ?? 0
    const ix = await sql.query(`select indexname from pg_indexes where tablename = $1 order by indexname`, [t])
    const names = (Array.isArray(ix) ? ix : ix.rows).map(x => x.indexname)
    console.log(`  ${cols > 0 ? '✓' : '✗'} ${t}: ${cols} kolon, ${names.length} indeks (${names.join(', ')})`)
  }
}
