import assert from 'node:assert/strict'
import test from 'node:test'
import { detectReportKind, parseWriteoffs } from '../src/lib/analytics/parse-iiko-reports'

// «Silinmə <ay>.xlsx» → `data` vərəqinin real forması.
// DİQQƏT: filial «Hesab», pul «Məbləğ, m.» adlanır — köhnə oxucu bunları
// tanımırdı və fayl haqsız yerə rədd edilirdi (istifadəçi 06.09.2026).
const DATA: unknown[][] = [
  ['Uçot günü', 'Hesab', 'Nomenklatura elementi', 'Miqdar', 'Məbləğ, m.', 'Satış Azn', 'B/M', 'ANBAR'],
  ['2026-08-01', 'Bilgəh', 'Çəngəl paketi', -1, -0.02, 427.7, 'Yusifov Ramil', 'QEYRI QIDA'],
  ['2026-08-01', 'Amay', 'Domestos', -7, -7.7, 59.97, 'Ələkbərov Taleh', 'QEYRI QIDA'],
  ['2026-08-01', 'Amay', 'Personal Toyuq', -12, -55.2, 59.97, 'Ələkbərov Taleh', 'QİDA'],
  ['2026-08-02', 'Bayıl', 'Şaurma əti tədarük', -3.5, -20.21, 5000, 'İbrahimov İsmayıl', 'QİDA'],
  ['2026-08-02', 'Bayıl', 'Fri yağı (ə)', -20, -68.2, 5000, 'İbrahimov İsmayıl', 'QİDA'],
]

// `XÜLASƏ` vərəqi PİVOTDUR — bunu oxumaq cəhdi istifadəçiyə səhv xəta verirdi.
const XULASE: unknown[][] = [
  [' Silinmə%', 'Н', 'Çeşidlər', 'Miqdar', 'Məbləğ'],
  ['Filiallar', '2026-08-01', '2026-08-02', '2026-08-03', ''],
  ['Badamdar', '', -0.1837, '', ''],
]

test('anbar silinməsi TANINIR — «Hesab» + «Nomenklatura» + «ANBAR»', () => {
  assert.equal(detectReportKind(DATA), 'writeoff')
})

test('XÜLASƏ pivot vərəqi anbar silinməsi kimi tanınmır', () => {
  assert.notEqual(detectReportKind(XULASE), 'writeoff')
})

test('mənfi məbləğlər MÜSBƏT böyüklüyə çevrilir', () => {
  const w = parseWriteoffs(DATA)
  assert.equal(w.rows.length, 5)
  for (const r of w.rows) {
    assert.ok(r.amount > 0, `${r.item} müsbət olmalıdır`)
    assert.ok(r.qty >= 0)
  }
  assert.equal(Math.round(w.total * 100) / 100, 151.33)
})

test('ANBAR kateqoriyası ayrılır — food cost üçün kritik', () => {
  const w = parseWriteoffs(DATA)
  assert.equal(Math.round(w.byCategory['QEYRI QIDA'] * 100) / 100, 7.72)
  assert.equal(Math.round(w.byCategory['QİDA'] * 100) / 100, 143.61)
})

test('«Personal ...» kalemləri personal yeməyi kimi işarələnir', () => {
  const w = parseWriteoffs(DATA)
  const p = w.rows.filter(r => r.isStaffMeal)
  assert.equal(p.length, 1)
  assert.equal(p[0].item, 'Personal Toyuq')
  assert.equal(w.staffMealTotal, 55.2)
  // Şaurma əti personal yeməyi DEYİL — qarışdırılsa ət hesabı pozulur
  assert.equal(w.rows.find(r => r.item.includes('Şaurma əti'))!.isStaffMeal, false)
})

test('günlər yığılır — gün əvəzləmə üçün lazımdır', () => {
  const w = parseWriteoffs(DATA)
  assert.deepEqual(w.days, ['2026-08-01', '2026-08-02'])
})

test('filial adı kanonikləşir (alias tətbiq olunur)', () => {
  const w = parseWriteoffs([
    DATA[0],
    ['2026-08-01', 'Corner', 'Test', -1, -5, 100, 'X', 'QİDA'],
  ])
  assert.equal(w.rows[0].filial, 'Səbail 2')   // Corner → Səbail 2
})

test('başlıq tapılmasa dürüst xəbərdarlıq verir, sükutla boş qayıtmır', () => {
  const w = parseWriteoffs([['a', 'b'], ['c', 'd']])
  assert.equal(w.rows.length, 0)
  assert.ok(w.warnings.length > 0)
})
