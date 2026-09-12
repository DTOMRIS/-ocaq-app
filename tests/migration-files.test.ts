import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'

const DIR = 'drizzle/migrations'
const fayllar = readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()

/**
 * Bu testlər BAZAYA BAĞLANMIR — yalnız fayl adları və məzmunu yoxlanılır.
 * Məqsəd: journal 0007-də donduğu üçün migration intizamı ARTIQ kodla
 * qorunmur; bu boşluğu testlə bağlayırıq.
 */

test('hər migration `NNNN_ad.sql` qaydasındadır', () => {
  for (const f of fayllar) {
    assert.match(f, /^\d{4}_[a-z0-9_]+\.sql$/, `qaydaya uyğun deyil: ${f}`)
  }
})

test('nömrə təkrarı ARTMIR — tarixi 0001 istisnadır', () => {
  const m = new Map<string, string[]>()
  for (const f of fayllar) {
    const n = f.slice(0, 4)
    m.set(n, [...(m.get(n) ?? []), f])
  }
  const tekrar = [...m.entries()].filter(([, v]) => v.length > 1).map(([n]) => n)
  // `0001` iki faylda: `0001_cold_stature` + `0001_complaints`. Tarixi haldır,
  // adı DƏYİŞDİRİLMİR — `schema_migrations_manual` qeydiyyatı fayl adına
  // bağlıdır və ad dəyişsə migration «tətbiq olunmayıb» görünər.
  assert.deepEqual(tekrar, ['0001'], `yeni nömrə təkrarı: ${tekrar.join(', ')}`)
})

test('yeni migration nömrəsi ƏN BÖYÜKDƏN sonra gəlir — boşluq yoxdur', () => {
  const nomreler = [...new Set(fayllar.map(f => Number(f.slice(0, 4))))].sort((a, b) => a - b)
  for (let i = 1; i < nomreler.length; i++) {
    assert.equal(nomreler[i], nomreler[i - 1] + 1,
      `nömrə boşluğu: ${nomreler[i - 1]} → ${nomreler[i]}`)
  }
})

test('DESTRUKTİV ifadə varsa faylın başında SNAPSHOT xəbərdarlığı olmalıdır', () => {
  const TEHLUKELI = /^\s*(drop\s+table|truncate|delete\s+from)\b/im
  for (const f of fayllar) {
    const t = readFileSync(`${DIR}/${f}`, 'utf8')
    if (!TEHLUKELI.test(t)) continue
    assert.match(t.slice(0, 1200), /SNAPSHOT|snapshot/,
      `${f}: destruktiv ifadə var, başında snapshot xəbərdarlığı yoxdur`)
  }
})

test('MÖVCUD SƏTİRLƏRİ dəyişən migration snapshot tələb etdiyini yazır', () => {
  for (const f of fayllar) {
    const t = readFileSync(`${DIR}/${f}`, 'utf8')
    // Yalnız `update <cədvəl> set` — `on conflict do update` sayılmır
    if (!/^\s*update\s+"?[a-z_]+"?\s+\w*\s*set\b/im.test(t)) continue
    assert.match(t.slice(0, 1500), /SNAPSHOT|snapshot/,
      `${f}: UPDATE var, başında snapshot xəbərdarlığı yoxdur`)
  }
})

test('yeni cədvəl yaradan migration `if not exists` işlədir (təkrar işlətmə təhlükəsiz)', () => {
  // Neon HTTP sürücüsündə tranzaksiya yoxdur → migration yarıda kəsilə bilər
  // və TƏKRAR işlədilir. `create table` idempotent olmasa ikinci cəhd sınır.
  for (const f of fayllar) {
    if (Number(f.slice(0, 4)) < 9) continue        // 0000–0008 ilkin sxem, toxunulmur
    const t = readFileSync(`${DIR}/${f}`, 'utf8')
    const xam = [...t.matchAll(/create\s+table\s+(?!if\s+not\s+exists)/gi)]
    assert.equal(xam.length, 0, `${f}: «create table if not exists» işlədilməyib`)
  }
})

test('şemadakı qeydiyyat cədvəli koda salınıb', async () => {
  const m = await import('../src/db/schema/migrations')
  assert.ok(m.schema_migrations_manual, 'schema_migrations_manual təyin olunmayıb')
})
