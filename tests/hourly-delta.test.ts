import assert from 'node:assert/strict'
import test from 'node:test'
import { diffCumulative, daysBetween, addDays, hourProfile, type CumeRow } from '../src/lib/analytics/hourly-delta'

const R = (filial: string, payType: string, hour: number, net: number, guests = 1): CumeRow =>
  ({ filial, payType, hour, net, guests })

// 01.08–21.08 kumulyativ baza
const PREV: CumeRow[] = [
  R('Bulvar', 'Nağd', 21, 1000, 50),
  R('Bulvar', 'Kapital Bank', 21, 500, 20),
  R('Mərdəkan', 'Nağd', 13, 2000, 90),
]

// ── tarix köməkçiləri ───────────────────────────────────────────────────────
test('daysBetween / addDays ay sərhədini keçir', () => {
  assert.equal(daysBetween('2026-08-21', '2026-08-22'), 1)
  assert.equal(daysBetween('2026-07-31', '2026-08-01'), 1)
  assert.equal(daysBetween('2026-08-22', '2026-08-21'), -1)
  assert.equal(addDays('2026-08-31', 1), '2026-09-01')
  assert.ok(Number.isNaN(daysBetween('21.08.2026', '2026-08-22')), 'səhv format NaN olmalıdır')
})

// ── Qayda 1: baza yoxdursa fərq hesablanmır ────────────────────────────────
test('birinci fayldan GÜNLÜK data ÇIXARILMIR — 21 gün tək günə yazılmamalıdır', () => {
  const d = diffCumulative(null, null, PREV, '2026-08-21')
  assert.equal(d.rows.length, 0)
  assert.equal(d.canWriteDaily, false)
  assert.equal(d.date, null)
  assert.ok(d.warnings[0].includes('BAZA'), 'səbəb açıq deyilməlidir')
})

// ── Normal hal: bir günlük fərq ────────────────────────────────────────────
test('ardıcıl iki görüntünün fərqi məhz aradakı gündür', () => {
  const next: CumeRow[] = [
    R('Bulvar', 'Nağd', 21, 1120, 56),
    R('Bulvar', 'Kapital Bank', 21, 560, 23),
    R('Mərdəkan', 'Nağd', 13, 2075, 93),
  ]
  const d = diffCumulative(PREV, '2026-08-21', next, '2026-08-22')
  assert.equal(d.spanDays, 1)
  assert.equal(d.date, '2026-08-22')
  assert.equal(d.canWriteDaily, true)
  assert.equal(d.totals.net, 255)          // 120 + 60 + 75
  assert.equal(d.totals.guests, 12)        // 6 + 3 + 3
  assert.equal(d.rows.every(r => r.date === '2026-08-22'), true)
})

test('dəyişməyən açar fərq sətri YARATMIR (boş sətir yazılmasın)', () => {
  const next = [...PREV, R('Bulvar', 'Nağd', 22, 300, 10)]
  const d = diffCumulative(PREV, '2026-08-21', next, '2026-08-22')
  assert.equal(d.rows.length, 1, 'yalnız yeni saat sətri olmalıdır')
  assert.equal(d.rows[0].hour, 22)
  assert.equal(d.rows[0].net, 300)
})

test('yeni filial/ödəniş növü tam məbləği ilə gəlir', () => {
  const next = [...PREV, R('Əcəmi', 'WOLT SATIŞ', 20, 450, 18)]
  const d = diffCumulative(PREV, '2026-08-21', next, '2026-08-22')
  assert.equal(d.rows.length, 1)
  assert.equal(d.rows[0].filial, 'Əcəmi')
  assert.equal(d.rows[0].net, 450)
})

// ── Qayda 2: gün atlanıbsa günlük yazılmır ─────────────────────────────────
test('gün atlansa fərq BİR GÜNƏ yazılmır', () => {
  const next = PREV.map(r => ({ ...r, net: r.net * 2 }))
  const d = diffCumulative(PREV, '2026-08-21', next, '2026-08-23')
  assert.equal(d.spanDays, 2)
  assert.equal(d.canWriteDaily, false)
  assert.equal(d.rows.length, 0, 'iki günün cəmi tək günə yazılmamalıdır')
  assert.equal(d.totals.net, 3500, 'cəm yenə hesablanır — istifadəçi görsün')
  assert.ok(d.warnings.some(w => w.includes('2 gün')))
})

// ── Qayda 3: mənfi fərq udulmur ────────────────────────────────────────────
test('mənfi fərq UDULMUR — saxlanılır və bildirilir', () => {
  const next = [
    R('Bulvar', 'Nağd', 21, 900, 45),          // 1000 → 900 (keçmişə düzəliş)
    R('Bulvar', 'Kapital Bank', 21, 560, 23),
    R('Mərdəkan', 'Nağd', 13, 2000, 90),
  ]
  const d = diffCumulative(PREV, '2026-08-21', next, '2026-08-22')
  assert.equal(d.negatives.length, 1)
  assert.equal(d.negatives[0].net, -100)
  const row = d.rows.find(r => r.payType === 'Nağd' && r.filial === 'Bulvar')!
  assert.equal(row.net, -100, 'rəqəm olduğu kimi qalmalıdır — cəmlər tutsun')
  assert.ok(d.warnings.some(w => w.includes('MƏNFİ')))
})

// ── Qayda 4: geriyə gedən dövr rədd edilir ─────────────────────────────────
test('köhnə fayl təkrar atılsa rədd edilir', () => {
  const d = diffCumulative(PREV, '2026-08-22', PREV, '2026-08-21')
  assert.equal(d.canWriteDaily, false)
  assert.equal(d.rows.length, 0)
  assert.ok(d.warnings[0].includes('GERİDƏDİR'))
})

test('eyni günə qədərki fayl təkrar atılsa cəm ŞİŞMİR', () => {
  const d = diffCumulative(PREV, '2026-08-21', PREV, '2026-08-21')
  assert.equal(d.spanDays, 0)
  assert.equal(d.canWriteDaily, false)
  assert.equal(d.rows.length, 0)
  assert.ok(d.warnings[0].includes('EYNİ'))
})

// ── İtən açar ──────────────────────────────────────────────────────────────
test('əvvəlkində olub yenidə olmayan açar bildirilir', () => {
  const next = PREV.slice(0, 2)
  const d = diffCumulative(PREV, '2026-08-21', next, '2026-08-22')
  assert.equal(d.vanished, 1)
  assert.ok(d.warnings.some(w => w.includes('YOXDUR')))
})

// ── Float dəqiqliyi ────────────────────────────────────────────────────────
test('fərq qəpik səviyyəsində yuvarlanır (float qalığı qalmasın)', () => {
  const prev = [R('X', 'Nağd', 10, 17.9, 1)]
  const next = [R('X', 'Nağd', 10, 41.6, 2)]
  const d = diffCumulative(prev, '2026-08-21', next, '2026-08-22')
  assert.equal(d.rows[0].net, 23.7, '41.6 − 17.9 = 23.7 (23.700000000000003 deyil)')
})

// ── Saat profili ───────────────────────────────────────────────────────────
test('hourProfile 24 saatın hamısını qaytarır, boşlar 0 ilə', () => {
  const p = hourProfile([{ hour: 21, net: 100, guests: 5 }, { hour: 21, net: 50, guests: 2 }, { hour: 3, net: 10, guests: 1 }])
  assert.equal(p.length, 24)
  assert.equal(p[21].net, 150)
  assert.equal(p[21].guests, 7)
  assert.equal(p[8].net, 0, 'satış olmayan saat görünməlidir')
  assert.equal(Number(p[21].share.toFixed(4)), 0.9375)
  assert.equal(p[8].avgPerGuest, null, 'qonaq yoxdursa 0 deyil, null')
})
