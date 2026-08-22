import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parsePeriodHeader, parseBranchSales, parseProductSales, parseDeletions, deletionRatio,
  parseHourlySales,
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
