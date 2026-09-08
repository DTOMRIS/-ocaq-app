import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCashflow } from '../src/lib/analytics/parse-cashflow'

// Doqquz vərəqin HƏR BİRİNİN başlığı fərqlidir. Ortaq olan tək sütun `Maddə`.
// Məbləğ çıxarma qaydası da vərəqdən vərəqə dəyişir — səhv qayda bütün axını
// TƏRSİNƏ çevirir, ona görə hər biri ayrıca yoxlanılır.
const SHEETS = [
  { name: 'Baş kassa', rows: [
    ['MADDƏ', 'Uçot tarix', 'Şərh', 'Debet', 'Kredit', 'Məbləğ', 'Qalıq', 'Bölmə'],
    ['Daxil olan qalıq', '2026-08-20', 'qalıq', '', '', 0, 219625, ''],   // ATILIR
    ['Satışdan mədaxil', '2026-08-20', 'ticarət kassa', 15269.9, '', 15269.9, 0, 'Shaurma Mərkəz'],
    ['İcarə ödənişi', '2026-08-21', 'avqust', '', 5000, 5000, 0, 'Corner'],
  ]},
  { name: 'ATB 1', rows: [
    ['Maddə', 'Valyutalaşma tarixi', 'Tranzaksiya', 'Müxbir', 'VÖEN', 'Təsvir', 'Sənəd', 'Debit', 'Kredit', 'Balans'],
    ['—', '', '', '', '', '', '', '', '', ''],
    ['Wolt satışdan mədaxil', '2026-08-21', '21.08.2026', 'AZ06', '140', 'WOLT', '001', 0, 698.44, 8811],
    ['Komissiya məxarici', '2026-08-20', '20.08.2026', 'AZ06', '140', 'WOLT', '002', 1.64, 0, 8724],
  ]},
  { name: 'Unibank pos', rows: [
    ['Daxil olan qalıq', '', '', 67740.44, '', '', '', ''],
    ['Maddə', '2026-08-20', 'MƏBLƏĞ', '', 'SALDO', 'TƏYINAT', 'POS ID', 'ID'],
    ['Satışdan mədaxil', '2026-08-20', '(+) CR', 30.8, 67771, 'ŞEYXOV', '', ''],
    ['Pos komissiya məxarici', '2026-08-20', '(-) DB', 0.46, 67770, 'ACQUIRING', '', ''],
  ]},
  { name: 'Kapital bizneskart', rows: [
    ['Maddə', 'Tarix', 'Məxaric', 'Mədaxil', 'Balans', 'Təsvir'],
    ['—', '', '', '', '', ''],
    ['Cərimə ödənişi', '2026-08-25', 200, 0, 5000, 'cərimə'],
  ]},
  // CF PİVOTDUR — hərəkət deyil, oxunmamalıdır
  { name: 'CF', rows: [['FS category', 'Kateqoriya', '2026-08-20'], ['x', 'Satışdan mədaxil', 85785]] },
]

test('doqquz fərqli başlıq oxunur, CF pivotu ATILIR', () => {
  const r = parseCashflow(SHEETS)
  assert.equal(r.warnings.length, 0, r.warnings.join(' · '))
  assert.equal(r.rows.length, 7)
  assert.equal(r.rows.some(x => x.account === 'CF'), false, 'CF pivotu girməməlidir')
})

test('«qalıq» sətirləri hərəkət sayılmır (açılış balansı)', () => {
  const r = parseCashflow(SHEETS)
  assert.equal(r.rows.some(x => /qalıq/i.test(x.item)), false)
})

test('Baş kassa: Debet−Kredit (kassaya giriş müsbət)', () => {
  const r = parseCashflow(SHEETS)
  const sat = r.rows.find(x => x.account === 'Baş kassa' && x.item === 'Satışdan mədaxil')!
  assert.equal(sat.amount, 15269.9)
  assert.equal(sat.branch, 'Shaurma Mərkəz')
  const ic = r.rows.find(x => x.account === 'Baş kassa' && x.item === 'İcarə ödənişi')!
  assert.equal(ic.amount, -5000, 'ödəniş MƏNFİ olmalıdır')
  assert.equal(ic.branch, 'Səbail 2', 'filial adı kanonikləşməlidir (Corner→Səbail 2)')
})

test('ATB: Kredit−Debet (bankda əks işarə)', () => {
  const r = parseCashflow(SHEETS)
  assert.equal(r.rows.find(x => x.item === 'Wolt satışdan mədaxil')!.amount, 698.44)
  assert.equal(r.rows.find(x => x.item === 'Komissiya məxarici')!.amount, -1.64)
})

test('Unibank: «(+) CR» / «(-) DB» işarə sütunu', () => {
  const r = parseCashflow(SHEETS)
  const u = r.rows.filter(x => x.account === 'Unibank pos')
  assert.equal(u.find(x => x.item === 'Satışdan mədaxil')!.amount, 30.8)
  assert.equal(u.find(x => /komissiya/i.test(x.item))!.amount, -0.46)
})

test('Kapital biznes kart: Mədaxil−Məxaric', () => {
  const r = parseCashflow(SHEETS)
  assert.equal(r.rows.find(x => x.item === 'Cərimə ödənişi')!.amount, -200)
})

test('daxil/xaric/xalis düzgün toplanır', () => {
  const r = parseCashflow(SHEETS)
  assert.equal(Math.round(r.inflow * 100) / 100, 15999.14)
  assert.equal(Math.round(r.outflow * 100) / 100, -5202.1)
  assert.equal(Math.round(r.net * 100) / 100, 10797.04)
})

test('tanınmayan vərəq SÜKUTLA atılmır — xəbərdarlıq verilir', () => {
  const r = parseCashflow([{ name: 'Yeni Bank 5', rows: [['Maddə', 'Tarix'], ['x', 'y']] }])
  assert.ok(r.warnings.some(w => /Tanınmayan vərəq/.test(w)))
  assert.ok(r.warnings.some(w => /Yeni Bank 5/.test(w)))
})
