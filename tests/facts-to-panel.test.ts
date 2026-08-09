import assert from 'node:assert/strict'
import test from 'node:test'
import { factsToPanel, type FactRow } from '../src/lib/analytics/facts-to-panel'

// Real datanın miniatürü: 2 filial × 2 gün, ödəniş növləri gün cəminə bərabər.
const ROWS: FactRow[] = [
  // 01.08 — Bayıl 1000 ₼ / 50 çek
  { filial: 'Bayıl', business_date: '2026-08-01', payment_type: '__day__', amount: 1000, receipts: 50 },
  { filial: 'Bayıl', business_date: '2026-08-01', payment_type: 'nagd', amount: 400 },
  { filial: 'Bayıl', business_date: '2026-08-01', payment_type: 'kart', amount: 500 },
  { filial: 'Bayıl', business_date: '2026-08-01', payment_type: 'wolt', amount: 80 },
  { filial: 'Bayıl', business_date: '2026-08-01', payment_type: 'bolt', amount: 20 },
  // 02.08 — Bayıl 1200 ₼ / 60 çek
  { filial: 'Bayıl', business_date: '2026-08-02', payment_type: '__day__', amount: 1200, receipts: 60 },
  { filial: 'Bayıl', business_date: '2026-08-02', payment_type: 'nagd', amount: 700 },
  { filial: 'Bayıl', business_date: '2026-08-02', payment_type: 'kart', amount: 450 },
  { filial: 'Bayıl', business_date: '2026-08-02', payment_type: 'own_delivery', amount: 50 },
  // 02.08 — Gəncə (Ramin bölgəsi) 800 ₼ / 40 çek
  { filial: 'Gəncə', business_date: '2026-08-02', payment_type: '__day__', amount: 800, receipts: 40 },
  { filial: 'Gəncə', business_date: '2026-08-02', payment_type: 'kart', amount: 800 },
]

test('factsToPanel ciro və çek sayını gün cəmi sətrindən götürür (ikiqat sayım yox)', () => {
  const p = factsToPanel(ROWS)!
  // 1000 + 1200 + 800 = 3000. Ödəniş sətirləri ÜSTÜNƏ GƏLMƏMƏLİ.
  assert.equal(p.toplam, 3000)
  assert.equal(p.receipts, 150)
  assert.equal(p.avgCheck, 20)          // 3000 / 150
  assert.equal(p.gun, 2)
  assert.deepEqual(p.days, ['2026-08-01', '2026-08-02'])
  assert.equal(p.period, '2026-08')
})

test('factsToPanel ödəniş qarışığı gün cəminə bərabərdir', () => {
  const p = factsToPanel(ROWS)!
  const paySum = p.pay.nagd + p.pay.kart + p.pay.wolt + p.pay.bolt + p.pay.own_delivery
  assert.equal(paySum, p.toplam, 'ödəniş cəmi = gün cəmi olmalıdır')
  assert.deepEqual(p.pay, { nagd: 1100, kart: 1750, wolt: 80, bolt: 20, own_delivery: 50 })
})

test('factsToPanel günlük seriyada wolt/bolt-u ayırır', () => {
  const p = factsToPanel(ROWS)!
  assert.deepEqual(p.daily['2026-08-01'], { total: 1000, wolt: 80, bolt: 20 })
  assert.deepEqual(p.daily['2026-08-02'], { total: 2000, wolt: 0, bolt: 0 })
})

test('factsToPanel filialı bölgəsinə bağlayır və sıralayır', () => {
  const p = factsToPanel(ROWS)!
  assert.equal(p.branches.length, 2)
  assert.deepEqual(p.branches[0], { filial: 'Bayıl', bolge: 'İsmayıl', total: 2200, wolt: 80, bolt: 20 })
  assert.deepEqual(p.branches[1], { filial: 'Gəncə', bolge: 'Ramin', total: 800, wolt: 0, bolt: 0 })
  assert.deepEqual(p.regions, [['İsmayıl', 2200], ['Ramin', 800]])
})

test('factsToPanel ay proqnozunu gün ortalamasından qurur', () => {
  const p = factsToPanel(ROWS)!
  // 3000 / 2 gün × 31 gün (avqust) = 46 500
  assert.equal(p.gedisat, 46500)
})

test('factsToPanel dövrü süzür', () => {
  const mixed: FactRow[] = [
    ...ROWS,
    { filial: 'Bayıl', business_date: '2026-07-15', payment_type: '__day__', amount: 9999, receipts: 500 },
  ]
  const avq = factsToPanel(mixed, '2026-08')!
  assert.equal(avq.toplam, 3000, 'iyul sətri avqusta qarışmamalıdır')
  const iyul = factsToPanel(mixed, '2026-07')!
  assert.equal(iyul.toplam, 9999)
  assert.equal(iyul.gun, 1)
  // Dövr verilmirsə ƏN SON ay götürülür.
  assert.equal(factsToPanel(mixed)!.period, '2026-08')
})

test('factsToPanel boş girişdə null qaytarır (uydurma rəqəm yox)', () => {
  assert.equal(factsToPanel([]), null)
  assert.equal(factsToPanel(ROWS, '2026-01'), null)
})

test('factsToPanel çek sayı yoxdursa avgCheck null olur (sıfıra bölmə yox)', () => {
  const noRec: FactRow[] = [
    { filial: 'Bayıl', business_date: '2026-08-01', payment_type: '__day__', amount: 1000, receipts: null },
  ]
  const p = factsToPanel(noRec)!
  assert.equal(p.receipts, 0)
  assert.equal(p.avgCheck, null)
  assert.equal(p.toplam, 1000)
})

test('factsToPanel naməlum filialı bölgəsiz saxlayır, atmır', () => {
  const p = factsToPanel([
    { filial: 'Yeni Nöqtə', business_date: '2026-08-01', payment_type: '__day__', amount: 500, receipts: 25 },
  ])!
  assert.equal(p.branches[0].filial, 'Yeni Nöqtə')
  assert.equal(p.branches[0].bolge, null)
  assert.equal(p.toplam, 500)
  assert.deepEqual(p.regions, [['?', 500]])
})
