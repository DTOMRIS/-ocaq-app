import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parsePeriodHeader, parseBranchSales, parseProductSales, parseDeletions, deletionRatio,
  parseHourlySales, hourlyToDailyFacts, parseProductDaily, productDailyToItemFacts, detectReportKind,
  explainUnrecognized,
} from '../src/lib/analytics/parse-iiko-reports'

// Fixture-lar REAL faylların strukturunu təkrarlayır: İngilis başlıqlar,
// boş qrup hücrələri (pivot deseni), ara cəm sətirləri, başlıqda BOM.

// ── Dövr başlığı ────────────────────────────────────────────────────────────
test('parsePeriodHeader İngilis formatını oxuyur (M/D/YYYY)', () => {
  const p = parsePeriodHeader([['Satış'], ['Restaurant name: Shaurma №1'], ['Period: from 8/1/2026 to 8/31/2026']])
  assert.equal(p.from, '2026-08-01')
  assert.equal(p.to, '2026-08-31')
  assert.equal(p.days, 31)
  assert.equal(p.singleDay, null, 'çox günlük fayl tək gün SAYILMAMALIDIR')
})

test('parsePeriodHeader tək günlük faylı tanıyır', () => {
  const p = parsePeriodHeader([['x'], ['y'], ['Period: from 8/21/2026 to 8/21/2026']])
  assert.equal(p.singleDay, '2026-08-21', 'from === to → o günün tarixi')
  assert.equal(p.days, 1)
})

test('parsePeriodHeader Azərbaycan formatını da oxuyur', () => {
  const p = parsePeriodHeader([['x'], ['Dövrün: əvvəli 01.08.2026 sonu 10.08.2026']])
  assert.equal(p.from, '2026-08-01')
  assert.equal(p.to, '2026-08-10')
  assert.equal(p.days, 10)
})

test('parsePeriodHeader gün>12 olduqda gün/ay sırasını düzgün seçir', () => {
  // 13/8/2026 — birinci hissə 12-dən böyükdür → GÜN/AY
  const p = parsePeriodHeader([['Period: from 13/8/2026 to 13/8/2026']])
  assert.equal(p.singleDay, '2026-08-13')
})

test('parsePeriodHeader dövr sətri yoxdursa boş qaytarır', () => {
  const p = parsePeriodHeader([['Satış'], ['Restaurant name: X']])
  assert.equal(p.from, null)
  assert.equal(p.singleDay, null)
})

// ── 1. Filial hesabatı ──────────────────────────────────────────────────────
const BH = ['Store', 'Payment group', 'Payment type', 'Contractor',
  'Gross Sales (before discount), m.', 'Gross Sales (after discount), m.', 'Bills']

test('parseBranchSales ÇEK SAYINI oxuyur və ara cəmləri atır', () => {
  const r = parseBranchSales([
    ['Satış-filiallar üzrə'], ['Restaurant name: Shaurma №1'],
    ['Period: from 8/1/2026 to 8/31/2026'], [null, null, null, null, 'Grand Total'],
    BH,
    ['Bayıl', 'Bank cards', 'Kapital Bank', null, '110.00', '100.00', '10'],
    [null, null, 'Uni Bank', null, '55.00', '50.00', '5'],          // qrup hücrəsi BOŞ → forward-fill
    [null, 'Bank cards Total', null, null, '165.00', '150.00', '15'], // ARA CƏM → atılmalı
    [null, 'Cash payment', 'Nağd', null, '220.00', '200.00', '20'],
    ['Bayıl Total', null, null, null, '385.00', '350.00', '35'],      // ARA CƏM → atılmalı
    ['Corner', 'Cash payment', 'Nağd', null, '60.00', '60.00', '6'],
  ])
  assert.equal(r.rows.length, 4, 'yalnız yarpaq sətirlər')
  assert.equal(r.skippedSubtotals, 2)
  assert.equal(r.totals.net.toFixed(2), '410.00', 'ara cəmlər cəmə QATILMAMALI')
  assert.equal(r.totals.bills, 41)
  assert.equal(r.totals.discount.toFixed(2), '35.00')
  assert.equal(r.totals.avgCheck!.toFixed(2), '10.00')
  // Forward-fill işlədi: ikinci sətir də «Bank cards» qrupundadır
  assert.equal(r.rows[1].payGroup, 'Bank cards')
  assert.equal(r.rows[1].filial, 'Bayıl')
  // Filial səviyyəsi
  const bayil = r.byBranch.find(b => b.filial === 'Bayıl')!
  assert.equal(bayil.net.toFixed(2), '350.00')
  assert.equal(bayil.bills, 35)
  assert.equal(bayil.avgCheck!.toFixed(2), '10.00')
  // Qrup payı
  assert.equal(r.byGroup.find(g => g.group === 'Bank cards')!.net.toFixed(2), '150.00')
})

test('parseBranchSales filial adını kanonikləşdirir və EXCLUDE-u atır', () => {
  const r = parseBranchSales([
    ['x'], ['y'], ['Period: from 8/1/2026 to 8/1/2026'], BH,
    ['Xırdalan', 'Cash payment', 'Nağd', null, '100', '100', '10'],       // alias → Masazır
    ['Siciliano Restoran', 'Cash payment', 'Nağd', null, '999', '999', '9'], // EXCLUDE
  ])
  assert.equal(r.rows.length, 1)
  assert.equal(r.rows[0].filial, 'Masazır')
  assert.equal(r.totals.net.toFixed(2), '100.00')
  assert.equal(r.warnings.some(w => w.includes('EXCLUDE')), true)
})

test('parseBranchSales başlıq tapılmasa dürüst xəbərdarlıq verir', () => {
  const r = parseBranchSales([['boş'], ['cədvəl']])
  assert.equal(r.rows.length, 0)
  assert.equal(r.totals.bills, 0)
  assert.match(r.warnings[0], /başlıqları tapılmadı/)
})

// ── 2. Məhsul hesabatı ──────────────────────────────────────────────────────
// ⚠️ Real faylda başlıq «Number of ﻿items» — söz ARASINDA BOM var.
const PH = ['Store', 'Item', 'Number of ﻿items', 'Gross Sales (after discount), m.']

test('parseProductSales BOM-lu başlığı oxuyur və ƏDƏDİ verir', () => {
  const r = parseProductSales([
    ['Satiş Hesabati'], ['Restaurant name: X'], ['Period: from 8/1/2026 to 8/31/2026'],
    [null, null, 'Grand Total'], PH,
    ['Bayıl', 'SHAURMA LAVAŞDA BÖYÜK', '100', '671.00'],
    [null, 'ÇAY DƏSTGAHI', '20', '214.60'],        // Store BOŞ → forward-fill
    [null, 'ACILI', '50', '0'],                     // modifikator: ədəd var, pul yox
    ['Bayıl Total', null, '170', '885.60'],         // ARA CƏM → atılmalı
    ['Corner', 'SHAURMA LAVAŞDA BÖYÜK', '40', '268.40'],
  ])
  assert.equal(r.rows.length, 4)
  assert.equal(r.skippedSubtotals, 1)
  assert.equal(r.totals.qty, 210, 'ƏDƏD — menyu analizinin əskik parçası')
  assert.equal(r.totals.amount.toFixed(2), '1154.00')
  assert.equal(r.totals.items, 3)
  assert.equal(r.totals.branches, 2)
  assert.equal(r.rows[1].filial, 'Bayıl', 'forward-fill')
  // Şəbəkə səviyyəsində məhsul birləşməsi
  const top = r.byItem[0]
  assert.equal(top.item, 'SHAURMA LAVAŞDA BÖYÜK')
  assert.equal(top.qty, 140)
  assert.equal(top.amount.toFixed(2), '939.40')
  assert.equal(top.branches, 2)
  assert.equal(top.avgPrice!.toFixed(2), '6.71')
  // 0 ₼-lik modifikator silinmir, sadəcə qiyməti yoxdur
  const acili = r.byItem.find(i => i.item === 'ACILI')!
  assert.equal(acili.qty, 50)
  assert.equal(acili.avgPrice, 0)
})

// ── 3. Silinmə hesabatı ─────────────────────────────────────────────────────
const DH = ['Accounting day', 'Store', 'Item deleted', 'Item deletion comment',
  'Receipt No.', 'Item', 'Gross Sales (before discount), m. Total']

test('parseDeletions oxuyur, forward-fill edir, anomaliyanı ayırır', () => {
  const r = parseDeletions([
    ['Silinme hesabati'], ['Restaurant name: X'], ['Period: from 8/1/2026 to 8/31/2026'], DH,
    [46235, 'Amay', 'Item deleted without write-off', null, '44179', 'İstisu 250 ml', '2.30'],
    [null, null, null, null, null, 'Cola 330ml', '2.90'],              // hamısı forward-fill
    [46242, null, null, 'çek çıxmadı', '34327', 'PİZZA SALAMİ', '20079.90'],  // ANOMALİYA
    [null, 'Bayıl', 'Item deleted and written off', null, '50001', 'Ayran', '1.50'],
  ])
  assert.equal(r.rows.length, 4)
  assert.equal(r.totals.amount.toFixed(2), '20086.60')
  assert.equal(r.totals.days, 2)
  assert.equal(r.rows[1].filial, 'Amay', 'forward-fill: filial')
  assert.equal(r.rows[1].date, '2026-08-01', 'forward-fill: tarix')
  assert.equal(r.rows[1].receipt, '44179', 'forward-fill: qəbz')
  // Anbardan silinmə ayırd edilir
  assert.equal(r.rows[0].writtenOff, false, '«without write-off» → anbardan silinməyib')
  assert.equal(r.rows[3].writtenOff, true)
  // Anomaliya
  assert.equal(r.outliers.length, 1)
  assert.equal(r.outliers[0].item, 'PİZZA SALAMİ')
  assert.equal(r.outliers[0].amount, 20079.90)
  // Şərh boşluğu
  assert.equal(r.noCommentPct.toFixed(2), '0.75', '4 sətirin 3-ündə şərh yoxdur')
})

test('parseDeletions ara cəm sətirlərini atır', () => {
  const r = parseDeletions([
    ['x'], ['y'], ['Period: from 8/1/2026 to 8/1/2026'], DH,
    [46235, 'Amay', 'Item deleted without write-off', null, '1', 'A', '10.00'],
    [null, 'Amay Total', null, null, null, null, '10.00'],
    ['Grand Total', null, null, null, null, null, '10.00'],
  ])
  assert.equal(r.rows.length, 1)
  assert.equal(r.totals.amount.toFixed(2), '10.00')
})

// ── Silinmə / ciro — ƏSAS TAPINTI ───────────────────────────────────────────
// Real data (avqust 2026): Amay xam %76,38 idi, çünki 37 562 ₼-si İKİ səhv
// girişdən ibarətdir (20 079,90 ₼-lik «1 ədəd pizza»). Anomaliyasız %1,95.
// Xam faizə baxıb qərar versək səhv filialı günahlandırardıq.
test('deletionRatio anomaliyanı ayırır — səhv filialı günahlandırmır', () => {
  const del = parseDeletions([
    ['x'], ['y'], ['Period: from 8/1/2026 to 8/31/2026'], DH,
    [46242, 'Amay', 'Item deleted without write-off', null, '34327', 'PİZZA SALAMİ', '20079.90'],
    [null, null, null, null, '34327', 'PİZZA VEGETERİAN', '17482.50'],
    // Normal gündəlik silinmələr — hamısı eşikdən AŞAĞI (real datada yüzlərlə
    // kiçik sətirdir, burada 6-ya sıxılıb; cəmi 983,50 ₼)
    [null, null, null, null, '44179', 'SHAURMA ÇÖRƏKDƏ ORTA', '187.90'],
    [null, null, null, null, '44180', 'SHAURMA LAVAŞDA BÖYÜK', '178.50'],
    [null, null, null, null, '44181', 'SHAURMA ÇÖRƏKDƏ BÖYÜK', '188.80'],
    [null, null, null, null, '44182', 'SHAURMA LAVASHDA ORTA', '162.00'],
    [null, null, null, null, '44183', 'ÇAY DƏSTGAHI', '143.60'],
    [null, null, null, null, '44184', 'Ayran', '122.70'],
    // Bakıxanov 2 — anomaliyası YOX, hamısı adi kiçik silinmələr
    [46242, 'Bakıxanov 2', 'Item deleted without write-off', null, '9001', 'SHAURMA', '100.00'],
    [null, null, null, null, '9002', 'SHAURMA', '100.00'],
    [null, null, null, null, '9003', 'SHAURMA', '100.00'],
  ])
  const rev = new Map([['Amay', 50469.24], ['Bakıxanov 2', 4918.03]])
  const rr = deletionRatio(del, rev)

  const amay = rr.find(x => x.filial === 'Amay')!
  assert.equal((amay.pct! * 100).toFixed(2), '76.38', 'xam faiz')
  assert.equal((amay.pctClean! * 100).toFixed(2), '1.95', 'anomaliyasız — NORMAL')
  assert.equal(amay.outlierAmount.toFixed(2), '37562.40')
  assert.equal(amay.deletedClean.toFixed(2), '983.50')

  const bak = rr.find(x => x.filial === 'Bakıxanov 2')!
  assert.equal(bak.outlierAmount, 0, 'anomaliyası yoxdur')
  assert.equal((bak.pctClean! * 100).toFixed(2), '6.10')

  // ƏSAS İDDİA: təmiz faizə görə sıralananda ƏSL şübhəli üstə çıxır.
  assert.equal(rr[0].filial, 'Bakıxanov 2', 'xam faizlə Amay üstdə olardı — səhv qərar')
})

test('deletionRatio cirosu olmayan filialda sıfıra bölmür', () => {
  const del = parseDeletions([
    ['x'], ['y'], ['Period: from 8/1/2026 to 8/1/2026'], DH,
    [46235, 'Yeni Filial', 'Item deleted without write-off', null, '1', 'A', '50.00'],
  ])
  const rr = deletionRatio(del, new Map())
  assert.equal(rr[0].pct, null)
  assert.equal(rr[0].pctClean, null)
  assert.equal(rr[0].deleted, 50)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Saatlıq pivot — «Doğan Tomris Rapor»
// ─────────────────────────────────────────────────────────────────────────────
//
// Fixture REAL faylın (203 293 sətir, 01–21.08.2026) quruluşunu birə-bir
// təkrarlayır: 4 səviyyəli pivot, boş qrup hücrələri, çılpaq « Total» sətri,
// məhsul sətirlərində 0 məbləğ + komboda dolu məbləğ, təkrarlanan qonaq sayı.

/** Bir saat bloku: məhsulsuz məbləğ sətirləri + « Total» + məhsul sətirləri. */
function hourBlock(hour: string, amounts: Array<[number, number]>, items: string[], combo?: [string, number, number]) {
  const rows: unknown[][] = []
  amounts.forEach(([qty, amt], i) => {
    rows.push([null, null, i === 0 ? hour : null, null, qty, amt, 1, amt])
  })
  const sum = amounts.reduce((s, a) => s + a[1], 0)
  // Çılpaq « Total» — yuxarıdakıların cəmi. `isSubtotal` bunu TUTMUR (uzunluq 6).
  rows.push([null, null, null, ' Total', null, sum, 1, sum])
  for (const it of items) rows.push([null, null, null, it, 1, 0, 1, 0])
  if (combo) rows.push([null, null, null, combo[0], 1, combo[1], combo[2], combo[1]])
  const total = sum + (combo ? combo[1] : 0)
  // Saat ara cəmi — ölçü rəqəmləri BURADAN oxunur (qonaq sayı yalnız burada düz).
  rows.push([null, null, `${hour} Total`, null, null, total, 2, total / 2])
  return rows
}

const HOURLY_HEAD: unknown[][] = [
  ['Doğan Tomris Rapor'],
  ['Restoranın adı: Shaurma №1'],
  ['Dövrün: əvvəli 01.08.2026 sonu 31.08.2026'],
  [null, null, null, null, null, 'Grand Total'],
  ['Ticarət müəssisəsi', 'Ödəniş növü', 'Bağlama saatı', 'Məhsul ilə satılıb', 'Məhsulların sayı', 'Endirimli məbləğ, m.', 'Qonaqların sayı', 'Qonaqdan orta gəlir, m.'],
]

function hourlyFixture(): unknown[][] {
  const rows: unknown[][] = [...HOURLY_HEAD.map(r => [...r])]
  const b1 = hourBlock('00', [[1, 17.9], [3, 23.7]], ['Ayran', 'KARTOF FRİ (160 qr)'], ['BOLT Special Combo 3', 20.1, 1])
  rows.push(['5 Mərtəbə', 'BOLT SATIŞ', ...b1[0].slice(2)])
  rows.push(...b1.slice(1))
  rows.push([null, 'BOLT SATIŞ Total', null, null, null, 61.7, 2, 30.85])
  const b2 = hourBlock('21', [[1, 100]], ['Lahmacun Sadə (D-27 sm)'])
  rows.push([null, 'Nağd', ...b2[0].slice(2)])
  rows.push(...b2.slice(1))
  rows.push([null, 'Nağd Total', null, null, null, 100, 2, 50])
  rows.push(['5 Mərtəbə Total', null, null, null, null, 161.7, 4, 40.43])
  const b3 = hourBlock('13', [[2, 50]], ['Ayran'])
  rows.push(['Bulvar', 'Kapital Bank', ...b3[0].slice(2)])
  rows.push(...b3.slice(1))
  rows.push([null, 'Kapital Bank Total', null, null, null, 50, 2, 25])
  rows.push(['Bulvar Total', null, null, null, null, 50, 2, 25])
  rows.push(['Grand Total', null, null, null, null, 211.7, 6, 35.28])
  return rows
}

test('parseHourlySales pivotu oxuyur və ciro «Grand Total» ilə üst-üstə düşür', () => {
  const rep = parseHourlySales(hourlyFixture())
  assert.equal(rep.grandTotal, 211.7)
  assert.equal(Number(rep.totals.net.toFixed(2)), 211.7, 'ciro faylın öz cəmi ilə eyni olmalıdır')
  assert.equal(rep.totals.branches, 2)
  assert.deepEqual(rep.warnings.filter(w => w.startsWith('⚠')), [], 'nəzarət xəbərdarlığı olmamalıdır')
})

test('parseHourlySales çılpaq « Total» sətrini süzür — yoxsa ciro İKİQAT olur', () => {
  const rep = parseHourlySales(hourlyFixture())
  // Süzülməsəydi 5 Mərtəbə/00 saatı 41,6 + 41,6 = 83,2 sayılardı.
  const r = rep.rows.find(x => x.filial === '5 Mərtəbə' && x.hour === 0)
  assert.ok(r, 'saat 00 sətri olmalıdır')
  assert.equal(Number(r!.net.toFixed(2)), 61.7, '17,9 + 23,7 + kombo 20,1')
})

test('parseHourlySales kombo sətrindəki məbləği İTİRMİR', () => {
  const rep = parseHourlySales(hourlyFixture())
  const r = rep.rows.find(x => x.filial === '5 Mərtəbə' && x.hour === 0)!
  assert.ok(r.net > 41.6, 'məhsul sətrindəki kombo məbləği (20,1 ₼) də daxil olmalıdır')
})

test('parseHourlySales qonaq sayını ara cəmdən götürür, yarpaqdan yox', () => {
  const rep = parseHourlySales(hourlyFixture())
  // Yarpaq sətirlərdə hər məhsul üçün 1 qonaq yazılıb (təkrar sayım).
  // Ara cəm sətirlərində saat başına 2 qonaq var → 3 saat = 6.
  assert.equal(rep.totals.guests, 6)
})

test('parseHourlySales 24 saatın hamısını qaytarır (boşlar 0 ilə)', () => {
  const rep = parseHourlySales(hourlyFixture())
  assert.equal(rep.byHour.length, 24)
  assert.deepEqual(rep.byHour.map(h => h.hour), Array.from({ length: 24 }, (_, i) => i))
  assert.equal(Number(rep.byHour[0].net.toFixed(2)), 61.7)
  assert.equal(rep.byHour[21].net, 100)
  assert.equal(rep.byHour[5].net, 0, 'satış olmayan saat 0 olmalıdır')
})

test('parseHourlySales çox günlük faylda GÜNÜ UYDURMUR', () => {
  const rep = parseHourlySales(hourlyFixture())
  assert.equal(rep.hasDayColumn, false)
  assert.equal(rep.canWriteDaily, false, 'gün bilinmirsə günlük cədvələ yazılmamalıdır')
  assert.equal(rep.rows.every(r => r.date === null), true)
  assert.ok(rep.warnings.some(w => w.includes('Uçot günü')), 'səbəb açıq deyilməlidir')
})

test('parseHourlySales tək günlük faylda tarixi başlıqdan götürür', () => {
  const rows = hourlyFixture()
  rows[2] = ['Dövrün: əvvəli 21.08.2026 sonu 21.08.2026']
  const rep = parseHourlySales(rows)
  assert.equal(rep.canWriteDaily, true)
  assert.equal(rep.rows.every(r => r.date === '2026-08-21'), true)
  assert.equal(rep.totals.days, 1)
})

test('parseHourlySales «Uçot günü» sütunu varsa çox günlük fayl da yazıla bilər', () => {
  const rows = hourlyFixture().map(r => [...r])
  rows[4] = ['Uçot günü', ...(rows[4] as unknown[])]
  for (let i = 5; i < rows.length; i++) rows[i] = [null, ...(rows[i] as unknown[])]
  // Gün yalnız ilk sətirdə yazılır (pivot deseni) — forward-fill yoxlanır.
  rows[5][0] = '01.08.2026'
  const rep = parseHourlySales(rows)
  assert.equal(rep.hasDayColumn, true)
  assert.equal(rep.canWriteDaily, true)
  assert.equal(rep.rows.every(r => r.date === '2026-08-01'), true)
  assert.equal(Number(rep.totals.net.toFixed(2)), 211.7, 'sütun sürüşməsi cirunu pozmamalıdır')
})

test('parseHourlySales ödəniş növlərini ayırır (Wolt/Bolt/nağd/kart)', () => {
  const rep = parseHourlySales(hourlyFixture())
  const m = new Map(rep.byPayType.map(p => [p.payType, Number(p.net.toFixed(2))]))
  assert.equal(m.get('BOLT SATIŞ'), 61.7)
  assert.equal(m.get('Nağd'), 100)
  assert.equal(m.get('Kapital Bank'), 50)
  assert.equal(Number(rep.byPayType.reduce((s, p) => s + p.share, 0).toFixed(6)), 1)
})

test('parseHourlySales başlıq tapılmasa səssiz keçmir', () => {
  const rep = parseHourlySales([['boş'], ['fayl']])
  assert.equal(rep.rows.length, 0)
  assert.equal(rep.canWriteDaily, false)
  assert.ok(rep.warnings[0].includes('başlıq'))
})

test('parseHourlySales ara cəm yoxdursa ciro düz qalır, qonaq şişməsi bildirilir', () => {
  const rows = hourlyFixture().filter(r => !/\bTotal$/.test(String(r[2] ?? '')))
  const rep = parseHourlySales(rows)
  assert.equal(Number(rep.totals.net.toFixed(2)), 211.7, 'ciro yarpaqlardan da düzgün yığılır')
  assert.ok(rep.warnings.some(w => w.includes('ŞİŞİK')), 'qonaq sayının etibarsızlığı deyilməlidir')
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. hourlyToDailyFacts — saatlıq sətirlər → mövcud günlük fakt formatı
// ─────────────────────────────────────────────────────────────────────────────

const H = (date: string | null, filial: string, payType: string, hour: number, net: number, guests: number) =>
  ({ date, filial, payType, hour, net, guests })

test('hourlyToDailyFacts ödəniş növünü səbətə yığır və gün cəmini verir', () => {
  const r = hourlyToDailyFacts([
    H('2026-08-01', 'Bulvar', 'Nağd', 20, 100, 5),
    H('2026-08-01', 'Bulvar', 'Nağd', 21, 50, 3),
    H('2026-08-01', 'Bulvar', 'Kapital Bank', 21, 200, 8),
    H('2026-08-01', 'Bulvar', 'WOLT SATIŞ', 21, 30, 2),
  ])
  const by = new Map(r.rows.map(x => [x.payment_type, x]))
  assert.equal(by.get('nagd')!.amount, 150)
  assert.equal(by.get('kart')!.amount, 200)
  assert.equal(by.get('wolt')!.amount, 30)
  assert.equal(by.get('__day__')!.amount, 380, 'gün cəmi bütün növlərin cəmidir')
  assert.equal(by.get('__day__')!.receipts, 18, 'çek sayı gün başına BİR dəfə')
})

test('hourlyToDailyFacts çek sayını ödəniş növlərinə BÖLMÜR', () => {
  const r = hourlyToDailyFacts([
    H('2026-08-01', 'X', 'Nağd', 20, 100, 5),
    H('2026-08-01', 'X', 'Kapital Bank', 20, 100, 5),
  ])
  const withRec = r.rows.filter(x => x.receipts != null)
  assert.equal(withRec.length, 1, 'yalnız __day__ sətrində çek olmalıdır')
  assert.equal(withRec[0].payment_type, '__day__')
  assert.equal(r.rows.filter(x => x.payment_type === 'nagd')[0].receipts, undefined)
})

test('hourlyToDailyFacts günləri və filialları ayırır', () => {
  const r = hourlyToDailyFacts([
    H('2026-08-01', 'A', 'Nağd', 20, 10, 1),
    H('2026-08-02', 'A', 'Nağd', 20, 20, 2),
    H('2026-08-01', 'B', 'Nağd', 20, 30, 3),
  ])
  assert.deepEqual(r.days, ['2026-08-01', '2026-08-02'])
  assert.equal(r.rows.filter(x => x.payment_type === '__day__').length, 3, '2 filial × günlər')
  assert.equal(r.totals.amount, 60)
  assert.equal(r.totals.receipts, 6)
})

test('hourlyToDailyFacts tanınmayan ödəniş növünü UDMUR — cəmdə qalır, bildirilir', () => {
  const r = hourlyToDailyFacts([
    H('2026-08-01', 'X', 'Nağd', 20, 100, 5),
    H('2026-08-01', 'X', 'Kripto XYZ', 20, 40, 2),
  ])
  assert.equal(r.unmapped.length, 1)
  assert.equal(r.unmapped[0].payType, 'Kripto XYZ')
  assert.equal(r.unmapped[0].amount, 40)
  const day = r.rows.find(x => x.payment_type === '__day__')!
  assert.equal(day.amount, 140, 'tanınmayan məbləğ gün cəmindən DÜŞMÜR')
  assert.equal(r.rows.some(x => x.payment_type === 'kart'), false)
})

test('hourlyToDailyFacts günü olmayan sətri ATLAYIR (gün uydurulmur)', () => {
  const r = hourlyToDailyFacts([
    H(null, 'X', 'Nağd', 20, 999, 9),
    H('2026-08-01', 'X', 'Nağd', 20, 100, 5),
  ])
  assert.equal(r.totals.amount, 100, 'tarixsiz sətir günlük cədvələ yazılmır')
  assert.deepEqual(r.days, ['2026-08-01'])
})

test('hourlyToDailyFacts sıfır məbləğli səbət sətri yaratmır', () => {
  const r = hourlyToDailyFacts([H('2026-08-01', 'X', 'Nağd', 20, 0, 3)])
  assert.equal(r.rows.filter(x => x.payment_type === 'nagd').length, 0)
  const day = r.rows.find(x => x.payment_type === '__day__')!
  assert.equal(day.receipts, 3, 'qonaq varsa gün sətri yenə yazılır')
})

test('hourlyToDailyFacts qəpik dəqiqliyi saxlayır', () => {
  const r = hourlyToDailyFacts([
    H('2026-08-01', 'X', 'Nağd', 20, 17.9, 1),
    H('2026-08-01', 'X', 'Nağd', 21, 23.7, 1),
  ])
  assert.equal(r.rows.find(x => x.payment_type === 'nagd')!.amount, 41.6)
})

test('hourlyToDailyFacts — Wolt/Bolt-un bank variantı da doğru səbətə düşür', () => {
  const r = hourlyToDailyFacts([
    H('2026-08-01', 'X', 'WOLT SATIŞ', 20, 10, 1),
    H('2026-08-01', 'X', 'WOLT SATIŞ Bank', 20, 20, 1),
    H('2026-08-01', 'X', 'Wolt Storefront', 20, 5, 1),
    H('2026-08-01', 'X', 'BOLT SATIŞ Bank', 20, 7, 1),
    H('2026-08-01', 'X', 'UNİBANK PAX A35', 20, 9, 1),
    H('2026-08-01', 'X', 'Delivery SeaBreeze', 20, 3, 1),
  ])
  const by = new Map(r.rows.map(x => [x.payment_type, x.amount]))
  assert.equal(by.get('wolt'), 35, 'WOLT + WOLT Bank + Storefront')
  assert.equal(by.get('bolt'), 7)
  assert.equal(by.get('kart'), 9, 'PAX terminal kartdır')
  assert.equal(by.get('own_delivery'), 3)
  assert.equal(r.unmapped.length, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. parseProductDaily — «DT Məhsul sayı və qiyməti»
// ─────────────────────────────────────────────────────────────────────────────

const PDH = ['Ticarət müəssisəsi', 'Məhsul', 'Uçot günü', 'Bağlama saatı',
  'Məhsulların sayı', 'Endirimli məbləğ, m.', 'Endirimsiz orta qiymət, m.']

function pdFixture(): unknown[][] {
  return [
    ['DT Məhsul sayı və qiyməti'], ['Restoranın adı: Shaurma №1'],
    ['Dövrün: əvvəli 01.08.2026 sonu 31.08.2026'], [null, null, null, null, null, 'Grand Total'],
    PDH,
    // Bulvar / SHAURMA / 01.08 — iki saat, YIĞILMALI
    ['Bulvar', 'SHAURMA LAVAŞDA BÖYÜK', '01.08.2026', '20', 3, 36, 12],
    [null, null, null, '21', 2, 24, 12],
    [null, null, null, '21 Total', 5, 60, 12],                 // ara cəm → atılmalı
    [null, null, '01.08.2026 Total', null, 5, 60, 12],          // ara cəm → atılmalı
    // Bulvar / SHAURMA / 02.08 — ayrı gün
    [null, null, '02.08.2026', '20', 1, 12, 12],
    // Bulvar / Ketçup — 0 ₼ (kombo daxili)
    [null, 'Ketçup', '01.08.2026', '20', 4, 0, 0],
    [null, 'Ketçup Total', null, null, 4, 0, 0],                // ara cəm → atılmalı
    ['Bulvar Total', null, null, null, 10, 72, 12],             // ara cəm → atılmalı
    ['Corner', 'Ayran', '01.08.2026', '13', 10, 35, 3.5],
    ['Grand Total', null, null, null, 20, 107, 0],
  ]
}

test('parseProductDaily saatı YIĞIR və ara cəmləri atır', () => {
  const r = parseProductDaily(pdFixture())
  assert.equal(r.grandTotal, 107)
  assert.equal(r.totals.amount, 107, 'cəm faylın «Grand Total»-ı ilə eynidir')
  // Bulvar/SHAURMA/01.08 → iki saat BİR sətirdə
  const one = r.rows.find(x => x.filial === 'Bulvar' && x.item === 'SHAURMA LAVAŞDA BÖYÜK' && x.date === '2026-08-01')!
  assert.ok(one, 'sətir tapılmalıdır')
  assert.equal(one.qty, 5, '3 + 2')
  assert.equal(one.amount, 60, '36 + 24')
  assert.deepEqual(r.warnings.filter(w => w.startsWith('⚠')), [], 'nəzarət xəbərdarlığı olmamalıdır')
})

test('parseProductDaily gün-gün ayırır', () => {
  const r = parseProductDaily(pdFixture())
  assert.deepEqual(r.byDay.map(d => d.date), ['2026-08-01', '2026-08-02'])
  assert.equal(r.totals.days, 2)
  assert.equal(r.hasDayColumn, true)
  assert.equal(r.canWriteDaily, true)
})

test('parseProductDaily 0 ₼-lik sətri SİLMİR, təsnif edir', () => {
  const r = parseProductDaily(pdFixture())
  const k = r.rows.find(x => x.item === 'Ketçup')!
  assert.ok(k, 'kombo daxilindəki məhsul silinməməlidir')
  assert.equal(k.amount, 0)
  assert.equal(k.qty, 4)
  assert.equal(k.lineKind, 'included', 'pulsuz gedən real qida')
  const paid = r.rows.find(x => x.item === 'Ayran')!
  assert.equal(paid.lineKind, 'product')
})

test('parseProductDaily məhsulu şəbəkə üzrə birləşdirir və orta qiymət verir', () => {
  const r = parseProductDaily(pdFixture())
  const top = r.byItem[0]
  assert.equal(top.item, 'SHAURMA LAVAŞDA BÖYÜK')
  assert.equal(top.amount, 72, '60 + 12')
  assert.equal(top.qty, 6)
  assert.equal(top.avgPrice, 12)
  assert.equal(top.branches, 1)
  assert.equal(r.totals.items, 3)
  assert.equal(r.totals.branches, 2)
})

test('parseProductDaily əhatə məhdudiyyətini HƏMİŞƏ bildirir', () => {
  const r = parseProductDaily(pdFixture())
  assert.ok(
    r.warnings.some(w => w.includes('HAMISINI örtmür')),
    'məhsul cirosunun filial cirosunu örtmədiyi susdurulmamalıdır',
  )
})

test('parseProductDaily başlıq tapılmasa səssiz keçmir', () => {
  const r = parseProductDaily([['boş'], ['fayl']])
  assert.equal(r.rows.length, 0)
  assert.equal(r.canWriteDaily, false)
  assert.ok(r.warnings[0].includes('başlıqları tapılmadı'))
})

test('parseProductDaily — «Məhsulların sayı» azFold-dan sonra «məhsullarin sayi» olur', () => {
  // REGRESSİYA: naxış `məhsulların sayi` yazılmışdı və sütun TAPILMIRDI
  // (`ların` → `larin`). Fayl tamamilə oxunmamış qalırdı.
  const r = parseProductDaily(pdFixture())
  assert.ok(r.rows.length > 0, 'ədəd sütunu tapılmalı, fayl oxunmalıdır')
  assert.equal(r.totals.qty, 20, 'ədəd cəmi (5+1+4+10)')
})

test('parseProductDaily EXCLUDE filialını atır, aliası kanonikləşdirir', () => {
  const r = parseProductDaily([
    ['x'], ['y'], ['Dövrün: əvvəli 01.08.2026 sonu 01.08.2026'], PDH,
    ['Xırdalan', 'Ayran', '01.08.2026', '20', 1, 3, 3],            // alias → Masazır
    ['Siciliano Restoran', 'Ayran', '01.08.2026', '20', 9, 99, 11], // EXCLUDE
  ])
  assert.equal(r.rows.length, 1)
  assert.equal(r.rows[0].filial, 'Masazır')
  assert.equal(r.totals.amount, 3)
  assert.ok(r.warnings.some(w => w.includes('EXCLUDE')))
})

test('productDailyToItemFacts item_code-u addan qurur (kod yoxdur)', () => {
  const r = parseProductDaily(pdFixture())
  const f = productDailyToItemFacts(r.rows)
  assert.equal(f.length, r.rows.length)
  assert.equal(f[0].item_code, f[0].item_name)
  assert.ok(f.every(x => x.date && x.filial && x.item_code && x.line_kind))
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. detectReportKind — ucuz tanıma (brauzeri dondurmamaq üçün)
// ─────────────────────────────────────────────────────────────────────────────

test('detectReportKind saatlıq hesabatı tanıyır', () => {
  assert.equal(detectReportKind(HOURLY_HEAD), 'hourly')
})

test('detectReportKind məhsul hesabatını tanıyır', () => {
  assert.equal(detectReportKind([['DT'], ['x'], ['y'], [null], PDH]), 'product')
})

test('detectReportKind hər ikisi olsa MƏHSULU seçir (detay daha dardır)', () => {
  const both = ['Ticarət müəssisəsi', 'Ödəniş növü', 'Məhsul', 'Bağlama saatı',
    'Məhsulların sayı', 'Endirimli məbləğ, m.']
  assert.equal(detectReportKind([['x'], both]), 'product')
})

test('detectReportKind tanımadığı faylda null qaytarır (təxmin etmir)', () => {
  // «məhsul ay və gün» — məhsul ADI yoxdur, ona görə məhsul hesabatı DEYİL;
  // `Bağlama saatı` var, amma ölçü yalnız ədəddir → saatlıq da deyil.
  assert.equal(detectReportKind([['x'], ['Ticarət müəssisəsi', 'Ödəniş növü', 'Uçot günü', 'Bağlama saatı', 'Məhsulların sayı', 'Qonaqların sayı']]), null)
  assert.equal(detectReportKind([['boş'], ['fayl']]), null)
})

test('detectReportKind yalnız ilk sətirlərə baxır — böyük fayl üçün ucuzdur', () => {
  const big: unknown[][] = [...HOURLY_HEAD, ...Array.from({ length: 50 }, () => ['x'])]
  assert.equal(detectReportKind(big, 8), 'hourly', 'başlıq limit daxilindədir')
  // Başlıq limitdən sonradırsa tapılmır — səssiz yanlış nəticə YOX, null.
  assert.equal(detectReportKind([...Array.from({ length: 40 }, () => ['x']), ...HOURLY_HEAD], 5), null)
})

// ── TÜRKÇE HESABATLAR (25.08.2026 hadisəsi) ─────────────────────────────────
//
// iiko interfeys dili Türkçe-yə keçdi və BÜTÜN fayllar oxunmaz oldu:
// «Bu fayl oxuna bilmir … Faylda tapılanlar: heç biri». Quruluş dəyişməmişdi,
// yalnız sütun ADLARI. Bu bloklar həmin dilin bir daha sınmamasını qoruyur.
//
// Naxışlar real fayllardan götürülüb (Doğan Tomris Rapor Total / Satış,
// DT Məhsul sayı və qiyməti — 24–25.08.2026).

const TR_HOURLY_HEAD: unknown[][] = [
  ['Doğan Tomris Rapor Satış'],
  ['Restoran adı: Shaurma №1'],
  ['Tarih: 24.08.2026'],
  [null, null, null, null, 'Genel Toplam'],
  ['Şube', 'Ödeme türü', 'Muhasebe günü', 'Kapanış saati',
    'Brüt Satışlar (indirim sonrası), m.', 'Müşteri sayısı', 'Müşteri başına ortalama gelir, m.'],
]

/** 46258 = 24.08.2026 (real fayldakı serial). */
const TR_DAY = 46258

function trHourlyFixture(): unknown[][] {
  return [
    ...TR_HOURLY_HEAD.map(r => [...r]),
    ['5 Mərtəbə', 'BOLT SATIŞ Bank', TR_DAY, '00', 20, 2, 10],
    [null, null, null, '02', 13.2, 1, 13.2],
    // Ödəniş növü ara cəmi — SÜZÜLMƏLİDİR, yoxsa ciro ikiqat.
    [null, 'BOLT SATIŞ Bank Toplam', null, null, 33.2, 3, 11.07],
    [null, 'Nağd', TR_DAY, '13', 50, 5, 10],
    [null, 'Nağd Toplam', null, null, 50, 5, 10],
    ['5 Mərtəbə Toplam', null, null, null, 83.2, 8, 10.4],
    ['Zığ', 'Kapital Bank', TR_DAY, '19', 16.8, 2, 8.4],
    [null, 'Kapital Bank Toplam', null, null, 16.8, 2, 8.4],
    ['Zığ Toplam', null, null, null, 16.8, 2, 8.4],
    ['Genel Toplam', null, null, null, 100, 10, 10],
  ]
}

test('TR: detectReportKind türkçe saatlıq hesabatı tanıyır', () => {
  assert.equal(detectReportKind(trHourlyFixture()), 'hourly')
})

test('TR: türkçe «Toplam» ara cəmi süzülür — süzülməsə ciro İKİQAT olur', () => {
  const rep = parseHourlySales(trHourlyFixture())
  // Süzülməsəydi 100 yerinə 200 çıxardı (hər qrup cəmi ikinci dəfə sayılardı).
  assert.equal(Number(rep.totals.net.toFixed(2)), 100, 'ciro «Genel Toplam» ilə eyni olmalıdır')
  assert.equal(rep.grandTotal, 100, '«Genel Toplam» sətri nəzarət rəqəmi kimi oxunmalıdır')
  assert.deepEqual(rep.warnings.filter(w => w.startsWith('⚠')), [], 'nəzarət xəbərdarlığı olmamalıdır')
})

test('TR: türkçe sütun adları düzgün xəritələnir (filial · gün · saat · qonaq)', () => {
  const rep = parseHourlySales(trHourlyFixture())
  assert.equal(rep.totals.branches, 2, '«Şube» → filial')
  assert.equal(rep.totals.guests, 10, '«Müşteri sayısı» → qonaq')
  assert.equal(rep.canWriteDaily, true, '«Muhasebe günü» → gün, günlük yazıla bilər')
  assert.deepEqual([...new Set(rep.rows.map(r => r.date))], ['2026-08-24'], 'serial 46258 → 24.08.2026')
  assert.deepEqual(rep.rows.filter(r => r.filial === '5 Mərtəbə').map(r => r.hour).sort((a, b) => a - b), [0, 2, 13],
    '«Kapanış saati» → saat')
})

test('TR: türkçe məhsul hesabatı tanınır və oxunur', () => {
  const rows: unknown[][] = [
    ['DT Məhsul sayı və qiyməti'],
    ['Tarih: 25.08.2026'],
    [null, null, null, null, null, 'Genel Toplam'],
    ['Şube', 'Ürün', 'Muhasebe günü', 'Kapanış saati', 'Ürün miktarı',
      'Brüt Satışlar (indirim sonrası), m.', 'İndirim öncesi ortalama satış fiyatı, m.'],
    ['5 Mərtəbə', 'Ayran', TR_DAY, '00', 1, 10, 2],
    [null, null, null, '01', 2, 12, 2],
    [null, null, null, '00 Toplam', null, 22, 2],
    [null, 'Americano', TR_DAY, '13', 1, 4, 4],
    [null, null, '24.08.2026 Toplam', null, null, 4, 4],
    ['5 Mərtəbə Toplam', null, null, null, null, 26, 2],
    ['Genel Toplam', null, null, null, null, 26, 2],
  ]
  assert.equal(detectReportKind(rows), 'product', '«Ürün» + «Ürün miktarı» → məhsul hesabatı')
  const rep = parseProductDaily(rows)
  assert.equal(Number(rep.totals.amount.toFixed(2)), 26, 'ciro «Genel Toplam» ilə eyni')
  assert.equal(rep.totals.items, 2)
  assert.equal(rep.canWriteDaily, true)
  // «Ürün» ≠ «Ürün miktarı»: dəqiq uyğunluq olmasa məhsul sütunu SƏHV seçilərdi.
  assert.deepEqual(rep.byItem.map(i => i.item).sort(), ['Americano', 'Ayran'])
})

test('TR: «Ürün miktarı» məhsul ADI sütunu kimi seçilmir', () => {
  // Saatlıq «Rapor Total» faylında `Ürünle birlikte satıldı` + `Ürün miktarı`
  // var, MƏHSUL ADI sütunu (`Ürün`) YOXDUR → bu SAATLIQ hesabatdır.
  // Naxışlar boş olsa məhsul hesabatı kimi tanınıb səhv parser işləyərdi.
  const head = ['Şube', 'Ödeme türü', 'Muhasebe günü', 'Kapanış saati',
    'Ürünle birlikte satıldı', 'Ürün miktarı',
    'Brüt Satışlar (indirim sonrası), m.', 'Müşteri sayısı']
  assert.equal(detectReportKind([['Doğan Tomris Rapor Total'], head]), 'hourly')
})

test('ara cəmi OLMAYAN saat qrupu itmir (pivot tək sətirli qrupa «Toplam» yazmır)', () => {
  // 🔴 REAL HADİSƏ (24.08.2026): 3 saat qrupunun altında tək sətir vardı, iiko
  // onlara «Toplam» sətri yazmamışdı. Kod `sub` dolu olan kimi `leaf`-i
  // BÜTÜNLÜKLƏ atırdı → 2,60 ₼ SƏSSİZCƏ itmişdi (%0,5 həddinə də düşmürdü).
  const rows: unknown[][] = [
    ...TR_HOURLY_HEAD.map(r => [...r]),
    // saat 00 — ara cəmi VAR (iki sətir)
    ['5 Mərtəbə', 'Nağd', TR_DAY, '00', 10, 1, 10],
    [null, null, null, null, 20, 1, 20],
    [null, null, null, '00 Toplam', 30, 2, 15],
    // saat 18 — TƏK sətir, ara cəm YOXDUR. İtməməlidir.
    [null, null, null, '18', 0.2, 1, 0.2],
    [null, 'Nağd Toplam', null, null, 30.2, 3, 10.07],
    ['5 Mərtəbə Toplam', null, null, null, 30.2, 3, 10.07],
    ['Genel Toplam', null, null, null, 30.2, 3, 10.07],
  ]
  const rep = parseHourlySales(rows)
  assert.equal(Number(rep.totals.net.toFixed(2)), 30.2, 'ara cəmsiz saat da cəmə daxil olmalıdır')
  assert.ok(rep.rows.some(r => r.hour === 18 && Number(r.net.toFixed(2)) === 0.2), 'saat 18 sətri qalmalıdır')
  assert.deepEqual(rep.warnings.filter(w => w.startsWith('⚠')), [], 'artıq fərq yoxdur — nəzarət xəbərdarlığı olmamalıdır')
})

test('tanınmayan DİL üçün mesaj faylın öz başlıqlarını göstərir', () => {
  // Rus dilli hesabat çıxsa: «tapılanlar: heç biri» kifayət etmir — istifadəçi
  // səbəbi (DİL) anlamalı və başlıq sətrini göndərə bilməlidir.
  const ru: unknown[][] = [
    ['Отчет'],
    ['Подразделение', 'Тип оплаты', 'Учетный день', 'Час закрытия', 'Сумма со скидкой', 'Количество гостей'],
  ]
  assert.equal(detectReportKind(ru), null, 'təxmin etmir')
  const msg = explainUnrecognized(ru)
  assert.match(msg, /DİLİ dəyişib/, 'səbəb DİL kimi göstərilməlidir')
  assert.match(msg, /Подразделение/, 'faylın öz başlıqları mesajda olmalıdır')
  assert.match(msg, /Türkçe/, 'dəstəklənən dillər sadalanmalıdır')
})
