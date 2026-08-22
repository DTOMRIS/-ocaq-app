import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parsePeriodHeader, parseBranchSales, parseProductSales, parseDeletions, deletionRatio,
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
