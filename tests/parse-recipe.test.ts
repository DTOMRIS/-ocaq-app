import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRecipes, expandRecipe, deCyrillic, type RecipeProduct } from '../src/lib/analytics/parse-recipe'

// Faylın real forması — DİQQƏT: kiril/latın QARIŞIQ (МƏНSUL, Нollаnd, PİDЕ).
// Gözlə fərq görünmür, `===` sınır. Ona görə testdə də qarışıq saxlanılıb.
const ROWS: unknown[][] = [
  ['MƏНSUL', 'Mаllаr', 'код', 'Норма,\nкг', 'Ед.\nизм.', 'ÇЕŞİD'],
  ['SHAURMA LAVAŞDA BÖYÜK (300 qr)', 'Şаurmа əti tədаrük', '1000361', 0.16, 'kq', 'SHAURMA'],
  ['SHAURMA LAVAŞDA BÖYÜK (300 qr)', 'Lаvаş', '1000400', 1, 'əd', 'SHAURMA'],
  ['SHAURMA ÇÖRƏKDƏ ORTA (210 qr)', 'Şаurmа əti tədаrük', '1000361', 0.1, 'kq', 'SHAURMA'],
  ['SHAURMA ÇÖRƏKDƏ ORTA (210 qr)', 'Fırın çörəyi bişmiş', '1000500', 1, 'əd', 'SHAURMA'],
  // Yarım mamul — ÖZ reçeturası var
  ['Fırın çörəyi bişmiş', 'Un. (ə)', '2000', 0.07, 'kq', 'İSTEHSAL TƏDARÜK'],
  ['Fırın çörəyi bişmiş', 'Mаyа (ə)', '2001', 0.001, 'kq', 'İSTEHSAL TƏDARÜK'],
  ['PİDЕ QIYMАLI BАLАCА (18*8 sm)', 'Ət qıymа tədаrük', '1000362', 0.09, 'kq', 'PİDЕ BАLАCА'],
  ['Ət qıymа tədаrük', 'Ət (Mаl) Qiymа (ə)', '3000', 0.46, 'kq', 'İSTEHSAL TƏDARÜK'],
  ['Ət qıymа tədаrük', 'Soğаn (m-t)', '3001', 0.75, 'kq', 'İSTEHSAL TƏDARÜK'],
  ['Boş sətir', 'Xammal', '9', 0, 'kq', 'BAR'],   // norma 0 → atılır
]

test('kiril/latın qarışığı normallaşdırılır', () => {
  assert.equal(deCyrillic('МƏНSUL'), 'MƏHSUL')
  assert.equal(deCyrillic('Нollаnd pendiri'), 'Holland pendiri')
  assert.equal(deCyrillic('PİDЕ KАVURMА'), 'PİDE KAVURMA')
})

test('reçetura oxunur, norma 0 olan sətir atılır və bildirilir', () => {
  const r = parseRecipes(ROWS)
  assert.equal(r.products.length, 5)
  assert.ok(r.materials >= 7)
  assert.ok(r.warnings.some(w => /norma oxunmadı/.test(w)), 'atılan sətir bildirilməlidir')
})

test('şaurma əti normaları XAM kq-dır (60/100/160 q)', () => {
  const r = parseRecipes(ROWS)
  const boyuk = r.products.find(p => p.product.includes('BÖYÜK'))!
  const et = boyuk.lines.find(l => /aurm/i.test(l.material))!
  assert.equal(et.norm, 0.16)
  assert.equal(et.unit, 'kq')
  assert.equal(et.code, '1000361')   // kod ad dəyişsə də qalır
  const orta = r.products.find(p => p.product.includes('ORTA'))!
  assert.equal(orta.lines.find(l => /aurm/i.test(l.material))!.norm, 0.1)
})

test('yarım mamullar (İSTEHSAL TƏDARÜK) ayrılır', () => {
  const r = parseRecipes(ROWS)
  assert.deepEqual(r.semiFinished.sort(), ['Fırın çörəyi bişmiş', 'Ət qıyma tədarük'])
})

test('expandRecipe yarım mamulu XAM xammala endirir', () => {
  const r = parseRecipes(ROWS)
  const by = new Map<string, RecipeProduct>(r.products.map(p => [p.product, p]))
  const semi = new Set(r.semiFinished)
  const { lines } = expandRecipe('SHAURMA ÇÖRƏKDƏ ORTA (210 qr)', by, semi)
  const mats = lines.map(l => l.material).sort()
  // «Fırın çörəyi bişmiş» AÇILMALI — un və maya görünməlidir
  assert.ok(mats.includes('Un. (ə)'), 'yarım mamul açılmalıdır')
  assert.ok(mats.includes('Maya (ə)'))
  assert.equal(mats.includes('Fırın çörəyi bişmiş'), false, 'açılan yarım mamul siyahıda qalmamalıdır')
  // Şaurma əti xam alınır — reçeturası yoxdur, olduğu kimi qalır
  assert.equal(lines.find(l => /aurm/i.test(l.material))!.norm, 0.1)
  // 1 əd çörək × 0,07 kq un
  assert.ok(Math.abs(lines.find(l => l.material === 'Un. (ə)')!.norm - 0.07) < 1e-9)
})

test('expandRecipe norma vurmasını düzgün aparır', () => {
  const r = parseRecipes(ROWS)
  const by = new Map<string, RecipeProduct>(r.products.map(p => [p.product, p]))
  const { lines } = expandRecipe('PİDE QIYMALI BALACA (18*8 sm)', by, new Set(r.semiFinished))
  // 0,09 kq qıyma tədarük × 0,46 kq mal əti = 0,0414
  const mal = lines.find(l => /Ət \(Mal\)/.test(l.material))!
  assert.ok(Math.abs(mal.norm - 0.09 * 0.46) < 1e-9, `gözlənilən 0,0414 · gələn ${mal.norm}`)
})

test('dairəvi istinad sonsuz döngü yaratmır', () => {
  const D: unknown[][] = [
    ['MƏHSUL', 'Mallar', 'kod', 'Norma', 'Ed.', 'ÇEŞİD'],
    ['A', 'B', '1', 1, 'kq', 'İSTEHSAL TƏDARÜK'],
    ['B', 'A', '2', 1, 'kq', 'İSTEHSAL TƏDARÜK'],
  ]
  const r = parseRecipes(D)
  const by = new Map<string, RecipeProduct>(r.products.map(p => [p.product, p]))
  const { lines } = expandRecipe('A', by, new Set(r.semiFinished))
  assert.ok(lines.length > 0, 'nəticə qaytarmalıdır, donmamalıdır')
})

test('başlıq tapılmasa dürüst xəbərdarlıq verir', () => {
  const r = parseRecipes([['a', 'b'], ['c', 'd']])
  assert.equal(r.products.length, 0)
  assert.ok(r.warnings.length > 0)
})
