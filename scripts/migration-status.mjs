#!/usr/bin/env node
/**
 * MIGRATION VƏZİYYƏTİ — diskdə nə var, bazada nə tətbiq olunub?
 *
 * NİYƏ LAZIMDIR: journal 0007-də donub, deploy migration işlətmir, hamısı əl
 * ilə işlədilir. Beləliklə «bu mühitdə hansı migration çatmır?» sualı indiyə
 * qədər YALNIZ yadda saxlanılırdı. Unudulan bir migration isə səhifənin
 * «cədvəl yoxdur» xətası ilə sınması deməkdir.
 *
 * İSTİFADƏ:
 *   npm run db:status                      # oxu, heç nə yazma
 *   npm run db:status -- --qeyd-et 0009_x.sql
 *       ↑ migration ARTIQ tətbiq olunubsa (skriptdən əvvəl işlədilib) onu
 *         qeydə alır. SQL İŞLƏDİLMİR — yalnız qeyd yazılır.
 *
 * Heç nə silmir, heç bir sxem dəyişmir.
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync, readdirSync } from 'node:fs'

const args = process.argv.slice(2)
const qeydEt = args.includes('--qeyd-et') ? args[args.indexOf('--qeyd-et') + 1] : null

let url = process.env.DATABASE_URL
if (!url) {
  try {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.*)$/m)
    if (m) url = m[1].trim().replace(/^["']|["']$/g, '')
  } catch { /* yoxdur */ }
}
if (!url) { console.error('✗ DATABASE_URL tapılmadı (env və ya .env.local).'); process.exit(1) }

const sql = neon(url)
const rowsOf = (r) => (Array.isArray(r) ? r : r?.rows ?? [])

const diskde = readdirSync('drizzle/migrations').filter(f => f.endsWith('.sql')).sort()
const journal = JSON.parse(readFileSync('drizzle/migrations/meta/_journal.json', 'utf8'))
const journalTags = new Set(journal.entries.map(e => e.tag))

await sql.query(`
  create table if not exists "schema_migrations_manual" (
    "filename" text primary key,
    "applied_at" timestamp not null default now(),
    "statements" integer
  )`)

if (qeydEt) {
  if (!diskde.includes(qeydEt)) {
    console.error(`✗ «${qeydEt}» diskdə yoxdur. Mövcudlar: ${diskde.length} fayl.`)
    process.exit(1)
  }
  await sql.query(
    `insert into "schema_migrations_manual" (filename, statements) values ($1, null)
     on conflict (filename) do nothing`, [qeydEt])
  console.log(`✓ «${qeydEt}» tətbiq olunmuş kimi qeydə alındı (SQL İŞLƏDİLMƏDİ).`)
}

const qeydli = new Set(rowsOf(await sql.query(
  `select filename from "schema_migrations_manual"`)).map(r => r.filename))

const catismayan = diskde.filter(f => !qeydli.has(f))
const artiq = [...qeydli].filter(f => !diskde.includes(f))

console.log(`\nDisk: ${diskde.length} migration · Qeydə alınmış: ${qeydli.size}\n`)
for (const f of diskde) {
  const tag = f.replace(/\.sql$/, '')
  const isaret = qeydli.has(f) ? '✓' : '·'
  const jur = journalTags.has(tag) ? '' : '  (journal-da YOX)'
  console.log(`  ${isaret} ${f}${jur}`)
}

if (catismayan.length) {
  console.log(`\n⚠ QEYDƏ ALINMAYAN ${catismayan.length} migration:`)
  for (const f of catismayan) console.log(`    ${f}`)
  console.log(`
  Bunlar ya HEÇ İŞLƏDİLMƏYİB, ya da qeydiyyat skriptindən ƏVVƏL işlədilib.
  Fərqi bilmək üçün cədvəllərin mövcudluğunu yoxlayın, sonra:
    · işlədilməyibsə →  npm run db:migrate -- ${catismayan[0]} --apply
    · artıq varsa    →  npm run db:status -- --qeyd-et ${catismayan[0]}`)
}
if (artiq.length) {
  console.log(`\n⚠ Bazada qeyd var, diskdə fayl YOXDUR (adı dəyişib?): ${artiq.join(', ')}`)
}

// Nömrə təkrarı — 0001 iki faylda; yenisi əlavə olunmasın
const nomreler = new Map()
for (const f of diskde) {
  const n = f.slice(0, 4)
  nomreler.set(n, [...(nomreler.get(n) ?? []), f])
}
const tekrar = [...nomreler.entries()].filter(([, v]) => v.length > 1)
if (tekrar.length) {
  console.log('\n⚠ NÖMRƏ TƏKRARI:')
  for (const [n, v] of tekrar) console.log(`    ${n} → ${v.join(', ')}`)
  console.log('    (tarixi haldır, adı DƏYİŞMƏYİN — qeydiyyat fayl adına bağlıdır)')
}
console.log(`\nJournal ${journal.entries.length} girişdə donub — ${diskde.length - journal.entries.length} migration orada görünmür.`)
console.log('⛔ `drizzle-kit migrate` İŞLƏDİLMİR: journal-dakı 8 migration-dan başqasını görmür.\n')
