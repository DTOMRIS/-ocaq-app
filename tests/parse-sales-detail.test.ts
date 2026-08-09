import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  classifyLine,
  detectPartialLastDay,
  excelSerialToISO,
  normalizePayment,
  parseProdmix,
  parseReceipts,
  DELIVERY_KINDS,
  reconcileProdmixReceipts,
} from '../src/lib/analytics/parse-sales-detail'

// ── Excel tarix ────────────────────────────────────────────────────────────

test('excelSerialToISO real fayl dəyərlərini düzgün çevirir', () => {
  // 08.08.2026 datasından yoxlanılmış dəyərlər
  assert.equal(excelSerialToISO(46235), '2026-08-01')
  assert.equal(excelSerialToISO(46241), '2026-08-07')
  assert.equal(excelSerialToISO(45870), '2025-08-01')
})

test('excelSerialToISO zibil dəyəri rədd edir', () => {
  for (const bad of ['', 'abc', 0, -5, 999999, null, undefined]) {
    assert.equal(excelSerialToISO(bad), null, `${String(bad)} rədd edilməli`)
  }
})

// ── 🔴 09.08.2026 REGRESİYASI — formatlanmış tarix sətri ────────────────────
// Brauzerdə `sheet_to_json(..., { raw: false })` tarix formatlı hücrəni
// FORMATLAYIR. Fayllarımızın numFmt kodu `dd\.mm\.yyyy`-dir (fayldan yoxlandı),
// yəni serial yerinə '01.08.2026' gəlir. Əvvəl bu HƏR SƏTRİ atırdı və
// «nə PRODMIX nə ÇEK tapılmadı» xətası verirdi. 22 test tutmadı, çünki
// hamısı serial verirdi. Bu testlər həmin boşluğu bağlayır.
test('excelSerialToISO formatlanmış nöqtəli tarixi oxuyur (dd.mm.yyyy)', () => {
  assert.equal(excelSerialToISO('01.08.2026'), '2026-08-01')
  assert.equal(excelSerialToISO('07.08.2026'), '2026-08-07')
  assert.equal(excelSerialToISO('1.8.2026'), '2026-08-01')      // sıfırsız
  assert.equal(excelSerialToISO('01.08.26'), '2026-08-01')      // 2 rəqəmli il
  assert.equal(excelSerialToISO(' 01.08.2026 '), '2026-08-01')  // boşluqlu
  // Serial yolu da işləməyə davam edir — iki format bir funksiyada.
  assert.equal(excelSerialToISO('46235'), '2026-08-01')
  assert.equal(excelSerialToISO(46235), '2026-08-01')
})

test('excelSerialToISO ISO formatı oxuyur', () => {
  assert.equal(excelSerialToISO('2026-08-01'), '2026-08-01')
  assert.equal(excelSerialToISO('2026-08-01T00:00:00.000Z'), '2026-08-01')
})

test('excelSerialToISO BELİRSİZ formatı TƏXMİN ETMİR', () => {
  // 03/04/2026 həm 3 aprel həm 4 mart ola bilər. Təxmin bir aylıq datanı
  // səssizcə yerindən oynadar → null qaytarılır, sətir atılır, xəbərdarlıq çıxır.
  assert.equal(excelSerialToISO('03/04/2026'), null)
  assert.equal(excelSerialToISO('1/8/2026'), null)
  // Birmənalı olduqda oxunur:
  assert.equal(excelSerialToISO('25/12/2026'), '2026-12-25')   // 25 > 12 → gün əvvəl
  assert.equal(excelSerialToISO('12/25/2026'), '2026-12-25')   // 25 > 12 → ay əvvəl
})

test('excelSerialToISO təqvimdə olmayan tarixi rədd edir', () => {
  assert.equal(excelSerialToISO('31.02.2026'), null)   // fevralın 31-i yoxdur
  assert.equal(excelSerialToISO('00.08.2026'), null)
  assert.equal(excelSerialToISO('01.13.2026'), null)
  assert.equal(excelSerialToISO('01.08.1899'), null)   // aralıqdan kənar
})

test('parseProdmix formatlanmış tarixlə də işləyir (raw:false yolu)', () => {
  const head = ['Uçot günü', 'Ticarət müəssisəsi', 'Məhsulun kodu', 'Məhsul', 'Məhsulların sayı', 'Endirimli məbləğ, m.']
  const body = [['01.08.2026', 'Bayıl', '1000051', 'SHAURMA LAVAŞDA BÖYÜK', '10', '70.00']]
  const withText = parseProdmix([head, ...body])
  const withSerial = parseProdmix([head, [[46235], ...body[0].slice(1)].flat()])
  assert.equal(withText.lines.length, 1)
  assert.equal(withText.lines[0].date, '2026-08-01')
  assert.deepEqual(withText.warnings, [])
  // İki yol EYNİ nəticəni verməlidir.
  assert.deepEqual(withText.lines, withSerial.lines)
})

// ── 🔴 09.08.2026 REGRESİYASI №2 — təkrar açar / səssiz data itkisi ─────────
// Faylda EYNİ (filial, gün, məhsul kodu) təkrarlanır: real datada 39 549
// sətirdə 36 975 unikal açar (2 538 təkrar, hamısının adı eyni). Parser
// toplamayanda chunk-lar təkrarı ayırırdı, ikinci chunk birincinin ÜZƏRİNƏ
// yazırdı (toplamırdı) → 2 574 sətir və 102 227,56 ₼ ciro SƏSSİZ yox olurdu.
test('parseProdmix təkrar açarı toplayır — ciro itmir', () => {
  const head = ['Uçot günü', 'Ticarət müəssisəsi', 'Məhsulun kodu', 'Məhsul', 'Məhsulların sayı', 'Endirimli məbləğ, m.']
  const res = parseProdmix([
    head,
    // Real fayldan: Mytcha|2026-08-07|1000051 iki sətir
    [46241, 'Mytcha', '1000051', 'SHAURMA LAVASHDA ORTA (210 qr)', '59', '348.10'],
    [46241, 'Mytcha', '1000051', 'SHAURMA LAVASHDA ORTA (210 qr)', '23', '135.70'],
    [46241, 'Mytcha', '1000052', 'SHAURMA LAVAŞDA BÖYÜK (300 qr)', '65', '451.50'],
  ])
  assert.equal(res.lines.length, 2, 'təkrar açar BİR sətrə yığılmalıdır')
  assert.equal(res.mergedKeys, 1)
  const l = res.lines.find(x => x.itemCode === '1000051')!
  assert.equal(l.qty, 82)                       // 59 + 23
  assert.equal(l.amount.toFixed(2), '483.80')   // 348.10 + 135.70
  // ƏSAS İDDİA: aqreqasiya cironu QORUYUR.
  assert.equal(res.totals.amount.toFixed(2), '935.30')
  assert.equal(res.totals.qty, 147)
  // Hər açar bir dəfə → chunk-lı yükləmə təhlükəsizdir.
  const keys = res.lines.map(l2 => `${l2.filial}|${l2.date}|${l2.itemCode}`)
  assert.equal(new Set(keys).size, keys.length)
})

test('parseProdmix təkrarsız faylda heç nə birləşdirmir', () => {
  const head = ['Uçot günü', 'Ticarət müəssisəsi', 'Məhsulun kodu', 'Məhsul', 'Məhsulların sayı', 'Endirimli məbləğ, m.']
  const res = parseProdmix([
    head,
    [46241, 'Bayıl', '1000051', 'A', '5', '30.00'],
    [46241, 'Bayıl', '1000052', 'B', '3', '20.00'],
    [46242, 'Bayıl', '1000051', 'A', '4', '25.00'],   // fərqli gün → ayrı açar
  ])
  assert.equal(res.lines.length, 3)
  assert.equal(res.mergedKeys, 0)
  assert.equal(res.totals.amount.toFixed(2), '75.00')
})

test('parseProdmix birləşmiş sətirdə kind-i TOPLANMIŞ məbləğə görə təyin edir', () => {
  const head = ['Uçot günü', 'Ticarət müəssisəsi', 'Məhsulun kodu', 'Məhsul', 'Məhsulların sayı', 'Endirimli məbləğ, m.']
  const res = parseProdmix([
    head,
    [46241, 'Bayıl', '1000051', 'SHAURMA LAVAŞDA BÖYÜK', '2', '0.00'],    // pulsuz gedən
    [46241, 'Bayıl', '1000051', 'SHAURMA LAVAŞDA BÖYÜK', '8', '56.00'],   // satılan
  ])
  // Birləşəndən sonra məbləğ müsbətdir → real gəlirli məhsuldur.
  assert.equal(res.lines.length, 1)
  assert.equal(res.lines[0].kind, 'product')
  assert.equal(res.lines[0].qty, 10)
  assert.equal(res.totals.productAmount.toFixed(2), '56.00')
})

test('parseReceipts formatlanmış tarixlə də işləyir (raw:false yolu)', () => {
  const head = ['Ticarət müəssisəsi', 'Tarix', 'Ödəniş növü', 'Qəbzin nömrəsi', 'Endirimli məbləğ, m. Total']
  const rows = [
    [head, ['Bayıl', '01.08.2026', 'NAĞD PUL', '44131', '12.00'], ['Bayıl', '01.08.2026', 'BOLT SATIŞ', '44132', '28.00']],
    [head, ['Bayıl', 46235, 'NAĞD PUL', '44131', '12.00'], ['Bayıl', 46235, 'BOLT SATIŞ', '44132', '28.00']],
  ]
  const [withText, withSerial] = rows.map(r => parseReceipts(r))
  assert.equal(withText.days.length, 1)
  assert.equal(withText.days[0].date, '2026-08-01')
  assert.equal(withText.days[0].receipts, 2)
  assert.equal(withText.totals.amount, 40)
  assert.deepEqual(withText.warnings, [])
  assert.deepEqual(withText.days, withSerial.days)
})

// ── Ödəniş növü normalizasiyası ────────────────────────────────────────────

test('4 acquirer «kart» səbətinə düşür (ATB və Pasha ÖDƏNİŞ SİSTEMİDİR)', () => {
  for (const p of ['Uni Bank', 'UNIBANK PAX A35', 'Kapital Bank', 'ATB bank', 'Pasha bank']) {
    assert.equal(normalizePayment(p), 'kart', `${p} kart olmalı`)
  }
})

test('Wolt/Bolt adlandırma variantları — iki il arası fərq bağlanır', () => {
  assert.equal(normalizePayment('WOLT SATIŞ'), 'wolt')       // 2026
  assert.equal(normalizePayment('*WOLT'), 'wolt')            // 2025
  assert.equal(normalizePayment('Wolt Storefront'), 'wolt')
  assert.equal(normalizePayment('BOLT SATIŞ'), 'bolt')       // 2026
  assert.equal(normalizePayment('BOLT'), 'bolt')             // 2025
})

test('YANGO AYRI kateqoriyadadır — wolt/bolt-a qatılmır', () => {
  // 2025-də çatdırılma YANGO-nu da əhatə edirdi, 2026-da YANGO YOXDUR.
  // Onu wolt/bolt-a qatmaq «Delivery YoY» rəqəmini səssizcə təhrif edərdi.
  assert.equal(normalizePayment('YANGO'), 'yango_legacy')
  assert.ok(!DELIVERY_KINDS.includes('yango_legacy'), 'YANGO cari çatdırılmaya girmir')
})

test('öz çatdırılması ayrı sayılır, nağd/kart-a qarışmır', () => {
  assert.equal(normalizePayment('Delivery SeaBreeze'), 'own_delivery')
  assert.ok(DELIVERY_KINDS.includes('own_delivery'))
})

test('nağd tanınır, tanınmayan növ null qaytarır (udulmur)', () => {
  assert.equal(normalizePayment('Nağd'), 'nagd')
  assert.equal(normalizePayment('Yeni Bank 2027'), null)
  assert.equal(normalizePayment(''), null)
})

// ── Sətir təsnifatı ────────────────────────────────────────────────────────

test('məbləği olan HƏR sətir məhsuldur', () => {
  assert.equal(classifyLine('SHAURMA LAVAŞDA BÖYÜK (300 qr)', 135952), 'product')
  assert.equal(classifyLine('Ayran', 37407), 'product')
  // Adı sayğaca bənzəsə də məbləği varsa məhsuldur (pullu servis ola bilər)
  assert.equal(classifyLine('Servis', 500), 'product')
})

test('sıfır məbləğli sayğac/modifikator düzgün təsnif olunur', () => {
  assert.equal(classifyLine('Servis', 0), 'service')
  assert.equal(classifyLine('Take away', 0), 'service')
  assert.equal(classifyLine('Servis(S)', 0), 'service')
  assert.equal(classifyLine('STƏKAN SAYI', 0), 'packaging')
  assert.equal(classifyLine('AZ SOUS', 0), 'modifier')
  assert.equal(classifyLine('BOL SOUS', 0), 'modifier')
  assert.equal(classifyLine('SOUSSUZ', 0), 'modifier')
  assert.equal(classifyLine('TURŞUSUZ', 0), 'modifier')
  assert.equal(classifyLine('KƏKLİKOTU', 0), 'modifier')
  // Pulsuz gedən real qida → «included» (kombo tərkibi)
  assert.equal(classifyLine('Ketçup', 0), 'included')
  assert.equal(classifyLine('Kartof Fri', 0), 'included')
})

// ── Prodmix ────────────────────────────────────────────────────────────────

const PRODMIX_ROWS: unknown[][] = [
  ['Uçot günü', 'Bölmənin kodu:', 'Ticarət müəssisəsi', 'Məhsulun kodu', 'Məhsul', 'Məhsulların sayı', 'Endirimli məbləğ, m.'],
  [46235, '017', 'Hüseyn Cavid', '1000052', 'SHAURMA LAVAŞDA BÖYÜK (300 qr)', 50, 352],
  [46235, '017', 'Hüseyn Cavid', '1000286', 'STƏKAN SAYI', 120, 0],
  [46235, '017', 'Hüseyn Cavid', '34534634774058', 'Servis', 300, 0],
  [46235, '017', 'Hüseyn Cavid', '1000200', 'AZ SOUS', 40, 0],
  [46236, '017', 'Hüseyn Cavid', '1000052', 'SHAURMA LAVAŞDA BÖYÜK (300 qr)', 60, 420],
  [46236, '010', 'Bayıl', '1000051', 'SHAURMA LAVASHDA ORTA (210 qr)', 30, 174],
]

test('parseProdmix filial×gün×məhsul qranulunda sətir çıxarır', () => {
  const r = parseProdmix(PRODMIX_ROWS)
  assert.equal(r.lines.length, 6)
  assert.deepEqual(r.dates, ['2026-08-01', '2026-08-02'])
  assert.deepEqual(r.branches, ['Bayıl', 'Hüseyn Cavid'])
})

test('parseProdmix: gəlir YALNIZ məhsul sətirlərindən gəlir (itkisiz filtr)', () => {
  const r = parseProdmix(PRODMIX_ROWS)
  assert.equal(r.totals.amount, 946)                 // 352 + 420 + 174
  assert.equal(r.totals.productAmount, 946)          // sıfırlar gəliri dəyişmir
  assert.equal(r.warnings.length, 0, 'uyğunsuzluq xəbərdarlığı olmamalı')
})

test('parseProdmix gəlir gətirməyən sətirləri SİLMİR, sayır', () => {
  const r = parseProdmix(PRODMIX_ROWS)
  assert.equal(r.nonRevenue.service, 300)
  assert.equal(r.nonRevenue.packaging, 120)
  assert.equal(r.nonRevenue.modifier, 40)
  // Sətirlər nəticədə qalır ki zal/götür-apar qarışığı hesablana bilsin
  assert.equal(r.lines.filter(l => l.kind !== 'product').length, 3)
})

test('parseProdmix kolon SIRASI dəyişəndə də işləyir', () => {
  const shuffled: unknown[][] = [
    ['Ticarət müəssisəsi', 'Endirimli məbləğ, m.', 'Uçot günü', 'Məhsul', 'Məhsulların sayı', 'Məhsulun kodu'],
    ['Bayıl', 100, 46235, 'AYRAN', 20, 'X1'],
  ]
  const r = parseProdmix(shuffled)
  assert.equal(r.lines.length, 1)
  assert.equal(r.lines[0].amount, 100)
  assert.equal(r.lines[0].qty, 20)
  assert.equal(r.lines[0].date, '2026-08-01')
})

test('parseProdmix başlıq yoxdursa dürüst xəta verir (susmur)', () => {
  const r = parseProdmix([['a', 'b'], [1, 2]])
  assert.equal(r.lines.length, 0)
  assert.ok(r.warnings[0].includes('başlıq'))
})

// ── Çek ────────────────────────────────────────────────────────────────────

const RECEIPT_ROWS: unknown[][] = [
  ['Ticarət müəssisəsi', 'Tarix', 'Ödəniş növü', 'Qəbzin nömrəsi', 'Endirimli məbləğ, m. Total'],
  ['Bayıl', 46235, 'Nağd', '1001', 20],
  ['Bayıl', 46235, 'Uni Bank', '1002', 30],
  ['Bayıl', 46235, 'WOLT SATIŞ', '1003', 50],
  ['Bayıl', 46235, 'ATB bank', '1004', 10],
  ['Bayıl', 46236, 'Nağd', '2001', 40],
  ['Space', 46235, 'BOLT SATIŞ', '3001', 25],
]

test('parseReceipts çek sayı və ortalama çeki hesablayır', () => {
  const r = parseReceipts(RECEIPT_ROWS)
  assert.equal(r.totals.receipts, 6)
  assert.equal(r.totals.amount, 175)
  assert.equal(r.totals.avgCheck, 175 / 6)
  const bayil1 = r.days.find(d => d.filial === 'Bayıl' && d.date === '2026-08-01')!
  assert.equal(bayil1.receipts, 4)
  assert.equal(bayil1.amount, 110)
  assert.equal(bayil1.avgCheck, 27.5)
})

test('AYNI çek iki ödəniş sətrində olsa BİR dəfə sayılır', () => {
  // Qismən nağd + qismən kart ödənilən çek → çek sayı 1, məbləğ toplanır
  const split: unknown[][] = [
    ['Ticarət müəssisəsi', 'Tarix', 'Ödəniş növü', 'Qəbzin nömrəsi', 'Endirimli məbləğ, m. Total'],
    ['Bayıl', 46235, 'Nağd', '9001', 12],
    ['Bayıl', 46235, 'Kapital Bank', '9001', 18],
  ]
  const r = parseReceipts(split)
  assert.equal(r.totals.receipts, 1, 'çek bir dəfə sayılmalı')
  assert.equal(r.totals.amount, 30)
  assert.equal(r.totals.avgCheck, 30)
})

test('parseReceipts ödənişi kanonik səbətlərə yığır', () => {
  const r = parseReceipts(RECEIPT_ROWS)
  assert.equal(r.totals.byPayment.nagd, 60)                 // 20 + 40
  assert.equal(r.totals.byPayment.kart, 40)                 // Uni 30 + ATB 10
  assert.equal(r.totals.byPayment.wolt, 50)
  assert.equal(r.totals.byPayment.bolt, 25)
  assert.equal(r.totals.byPayment.yango_legacy, 0)
})

test('çatdırılma = wolt + bolt + öz kanalı (YANGO daxil DEYİL)', () => {
  const withYango: unknown[][] = [
    ['Ticarət müəssisəsi', 'Tarix', 'Ödəniş növü', 'Qəbzin nömrəsi', 'Endirimli məbləğ, m. Total'],
    ['Bayıl', 45870, '*WOLT', '1', 100],
    ['Bayıl', 45870, 'BOLT', '2', 50],
    ['Bayıl', 45870, 'YANGO', '3', 200],
  ]
  const r = parseReceipts(withYango)
  const day = r.days[0]
  assert.equal(day.deliveryAmount, 150, 'cari çatdırılma yalnız wolt+bolt')
  assert.equal(day.byPayment.yango_legacy, 200, 'YANGO itmir, ayrı saxlanılır')
})

test('tanınmayan ödəniş növü UDULMUR — xəbərdarlıq + məbləğ qeydə alınır', () => {
  const odd: unknown[][] = [
    ['Ticarət müəssisəsi', 'Tarix', 'Ödəniş növü', 'Qəbzin nömrəsi', 'Endirimli məbləğ, m. Total'],
    ['Bayıl', 46235, 'Kripto Ödəniş', '1', 99],
  ]
  const r = parseReceipts(odd)
  assert.equal(r.totals.unknownPayments['Kripto Ödəniş'], 99)
  assert.ok(r.warnings.some(w => w.includes('Tanınmayan ödəniş')))
})

// ── Natamam son gün ────────────────────────────────────────────────────────

test('detectPartialLastDay real hadisəni tutur (07.08.2026 çek faylı)', () => {
  // 1–6 avqust ≈ 130k, 7 avqust 129k idi prodmix-də 169k — çek faylı yarımçıq.
  const w = detectPartialLastDay([
    { date: '2026-08-01', amount: 139858 },
    { date: '2026-08-02', amount: 142793 },
    { date: '2026-08-03', amount: 125209 },
    { date: '2026-08-04', amount: 128351 },
    { date: '2026-08-05', amount: 128043 },
    { date: '2026-08-06', amount: 127139 },
    { date: '2026-08-07', amount: 40000 },     // qəsdən çox aşağı
  ])
  assert.ok(w && w.includes('2026-08-07'), 'natamam gün bildirilməli')
})

test('detectPartialLastDay normal günə xəbərdarlıq vermir', () => {
  assert.equal(detectPartialLastDay([
    { date: '2026-08-01', amount: 100 },
    { date: '2026-08-02', amount: 105 },
    { date: '2026-08-03', amount: 98 },
  ]), null)
})

// ── İki faylın gün-gün tutuşdurulması (natamam export-un əsl detektoru) ──────

test('reconcile: uyğun günlər təmiz, natamam gün tutulur', () => {
  // 08.08.2026 real hadisəsi: 1-ci gün uyğun, 2-ci gündə çek faylı yarımçıq
  const rec = reconcileProdmixReceipts(
    { lines: [
      { filial: 'Bayıl', date: '2026-08-06', itemCode: '1', itemName: 'X', qty: 1, amount: 127139, kind: 'product' },
      { filial: 'Bayıl', date: '2026-08-07', itemCode: '1', itemName: 'X', qty: 1, amount: 169845, kind: 'product' },
    ] },
    { days: [
      { filial: 'Bayıl', date: '2026-08-06', receipts: 10, amount: 127139, avgCheck: 1, byPayment: { nagd: 0, kart: 0, wolt: 0, bolt: 0, own_delivery: 0, yango_legacy: 0 }, deliveryAmount: 0 },
      { filial: 'Bayıl', date: '2026-08-07', receipts: 10, amount: 129193, avgCheck: 1, byPayment: { nagd: 0, kart: 0, wolt: 0, bolt: 0, own_delivery: 0, yango_legacy: 0 }, deliveryAmount: 0 },
    ] },
  )
  assert.equal(rec.days.length, 2)
  assert.equal(rec.days[0].ok, true, '6 avqust uyğun olmalı')
  assert.equal(rec.days[1].ok, false, '7 avqust uyğunsuz olmalı')
  assert.equal(Math.round(rec.days[1].diff), 40652)
  assert.equal(rec.warnings.length, 1)
  assert.ok(rec.warnings[0].includes('çek faylı natamam'))
})
