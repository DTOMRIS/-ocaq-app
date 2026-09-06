import assert from 'node:assert/strict'
import test from 'node:test'
import { parseYearMatrix, mergeYearMatrix, yoyFromYearMatrix, parseYoy } from '../src/lib/analytics/parse-daily'

// «Yeni satış plan.xlsx» → sheet «2025». Bağlanmış ilin FAKT matrisi.
// Diqqət: başlıqda il YOXDUR (yalnız sheet adında), «gedişat» sözü YOXDUR,
// avqust «Avgust» (g ilə) yazılıb və İyul/Sentyabr arasında BOŞ sütun var.
// Bunların hamısı köhnə `parseYoy`-un bu faylı görməməsinin səbəbi idi.
const S2025: unknown[][] = [
  ['Cəmi', 4037351.6599999997, 3977166.629999999, 2967235.52, null, 2880785.1599999997, 2760268.66, 2694064.16],
  ['Ticarət müəssisəsi', 'İyul', 'Avgust', 'Sentyabr', null, 'Oktyabr', 'Noyabr', 'Dekabr'],
  ['Mərdəkan', 368946, 336773.6, 248255.95, null, 233231.55, 225992.25, 217710.2],
  ['Seabreeze', 334943.45, 311570.11, 32616.05, null, 0, 0, 0],
  ['Torgoviy', 293932, 312157.65, 202964.5, null, 224158.05, 231620.05, 291824.3],
  ['5 Mərtəbə', 208237.15, 215333.3, 179558.3, null, 173950.15, 163148.3, 149301],
  ['Space', 208145.2, 205714.8, 207000.75, null, 208076.1, 199217.8, 190100.71],
  ['Duet', 197858.05, 197782.3, 172012.4, null, 157207.15, 136391.95, 120709.7],
  ['Corner', 194593, 197402.15, 137338.7, null, 148780.9, 141494.35, 173953.55],
  ['Bulvar', 194143.7, 184994.55, 81507.7, null, 108052.75, 107352.5, 84226.65],
  ['Bilgəh', 194129.2, 179356.65, 89646.25, null, 81758.35, 81606.45, 71692.95],
  ['Əcəmi', 158009.15, 160210.6, 136088.55, null, 133354, 120071.75, 104534.95],
  ['Bayıl', 149760.9, 148574.3, 120865.35, null, 118004.75, 110104.05, 113063.25],
  ['Hüseyn Cavid', 122386.65, 123091.6, 101172.8, null, 65758.6, 47478.95, 32221.55],
  ['Neftçilər', 117652.9, 124260.9, 115455, null, 110663.55, 109447.85, 113616],
  ['Binəqədi', 116514.95, 110825.9, 83906.75, null, 83567.95, 82710.15, 60693.65],
  ['İnşaatçılar', 113772.35, 112388.8, 108473.1, null, 99781.6, 96443.75, 93035.1],
  ['Nərimanov', 112694.8, 118041.5, 109945.45, null, 111902.3, 102771.2, 102056.9],
  ['Amay', 102924.96, 107422.32, 94499.62, null, 102780.41, 94821.16, 100448.05],
  ['Zığ', 95695.25, 95815.05, 80266.45, null, 77402.8, 76407.2, 76060.4],
  ['Bakıxanov 2', 90332.7, 91219.9, 84628.1, null, 88108.8, 91598.9, 87830.85],
  ['Bakıxanov 1', 89142.15, 89247, 69651.9, null, 56287.95, 48276.1, 40898.4],
  ['Həzi Aslanov', 86973.45, 83664.75, 80344.3, null, 75777.9, 79517.05, 79850.5],
  ['Masazır', 85089.1, 91131.35, 79031.8, null, 75649.25, 69607.75, 72585.5],
  ['İnqilab', 83134.3, 84952.25, 73998.05, null, 70644.5, 68037.45, 76394.45],
  ['Badamdar', 64908.55, 53699.9, 53693.15, null, 60873.65, 74143.35, 51143.45],
  ['Ayna Sultanova', 64035.6, 65355, 56516.35, null, 57953.6, 51985.25, 48296],
  ['Əhmədli', 63530.05, 60258.9, 53482.4, null, 47821.2, 50270.35, 49153.3],
  ['Sumqayıt', 51219.35, 42771.6, 36394.35, null, 35048.3, 34779.75, 31891.5],
  ['Azadlıq', 41331.35, 37569.9, 36474.55, null, 37915.75, 33118.5, 32743.2],
  ['Gəncə', 33315.4, 35580, 41446.9, null, 36273.3, 31854.5, 28028.1],
]

// «plan sen-dek» vərəqinin forması: fakt sütunları YANINDA plan sütunları.
// Plan sütunu fakt sayılsa keçən ilin rəqəmi 2026 planı ilə əvəzlənərdi.
const PLAN_SHEET: unknown[][] = [
  [null, null, 2888203.72, 3600000, 2805135.91, 3416000, 11666000.54, 13600000],
  ['bölgə müdirləri', 'Ticarət müəssisəsi', 'sentyabr 2025', 'sentyabr plan', 'oktyabr 2025', 'oktyabr plan', 'Total 2025', 'Total 2026'],
  ['İsmayıl', 'Bayıl', 120865.35, 140000, 118004.75, 135000, 473974.15, 525000],
  ['Ramin', 'Gəncə', 41446.9, 50000, 36273.3, 45000, 149574.7, 175000],
]

test('parseYearMatrix bağlanmış ilin fakt matrisini oxuyur (il sheet adından)', () => {
  const m = parseYearMatrix(S2025, '2025')
  assert.equal(m.year, 2025)
  assert.equal(Object.keys(m.branches).length, 29)

  const cem = (ay: number) => Object.values(m.branches).reduce((s, b) => s + (b[ay] ?? 0), 0)
  assert.equal(Math.round(cem(8) * 100) / 100, 3977166.63)   // Avqust 2025
  assert.equal(Math.round(cem(7) * 100) / 100, 4037351.66)   // İyul 2025

  assert.equal(m.branches['Mərdəkan'][8], 336773.6)
  assert.equal(m.branches['Corner'][8], 197402.15)
})

test('İ tələsi: «İyul» sütunu oxunur — sadə toLowerCase() ilə itirdi', () => {
  // 'İyul'.toLowerCase() === 'i' + U+0307 → 'iyul'.includes() FALSE qaytarır.
  assert.equal('İyul'.toLowerCase().includes('iyul'), false, 'tələ hələ də mövcuddur')
  const m = parseYearMatrix(S2025, '2025')
  assert.ok(m.branches['Mərdəkan'][7] > 0, 'İyul sütunu oxunmalıdır')
  assert.equal(m.branches['Mərdəkan'][7], 368946)
})

test('bağlanmış filial (Masazır) matrisdə QALIR — keçən ilin cirosu lazımdır', () => {
  const m = parseYearMatrix(S2025, '2025')
  assert.equal(m.branches['Masazır'][8], 91131.35)
})

test('plan sütunları fakt sayılmır', () => {
  const m = parseYearMatrix(PLAN_SHEET, 'plan sen-dek')
  assert.equal(m.year, 2025)
  assert.equal(m.branches['Bayıl'][9], 120865.35)    // sentyabr 2025 FAKT
  assert.notEqual(m.branches['Bayıl'][9], 140000)    // sentyabr PLAN deyil
  assert.equal(m.branches['Bayıl'][10], 118004.75)
})

test('mergeYearMatrix eyni ilin iki vərəqini birləşdirir, mövcud dəyər üstündür', () => {
  const merged = mergeYearMatrix(parseYearMatrix(S2025, '2025'), parseYearMatrix(PLAN_SHEET, 'plan sen-dek'))
  assert.equal(merged.year, 2025)
  assert.equal(merged.branches['Bayıl'][8], 148574.3)     // yalnız «2025» vərəqində
  assert.equal(merged.branches['Bayıl'][9], 120865.35)    // hər ikisində — eyni rəqəm
  assert.equal(Object.keys(merged.branches).length, 29)
})

test('yoyFromYearMatrix cari ayın faktı ilə birləşir; yeni/bağlanan filial görünür', () => {
  const m = parseYearMatrix(S2025, '2025')
  const cur = [
    { filial: 'Mərdəkan', total: 335980 },
    { filial: 'Corner', total: 129059 },
    { filial: 'Mytcha', total: 155699 },      // avqust 2026-da açılan — 2025 qarşılığı yox
  ]
  const yo = yoyFromYearMatrix(m, '2026-08', cur)!
  assert.ok(yo)
  assert.equal(Math.round(yo.network.y2025 * 100) / 100, 3977166.63)
  assert.deepEqual(yo.branches['Mərdəkan'], { y2025: 336773.6, y2026: 335980 })
  assert.equal(yo.branches['Masazır'].y2026, 0)                  // bağlanan
  assert.equal(yo.branches['Abdülkerim Alizadə'].y2025, 0)       // yeni (Mytcha aliası)
})

test('yoyFromYearMatrix keçmiş il tələb edir — eyni/gələcək il null', () => {
  const m = parseYearMatrix(S2025, '2025')
  assert.equal(yoyFromYearMatrix(m, '2025-08', [{ filial: 'Mərdəkan', total: 1 }]), null)
  assert.equal(yoyFromYearMatrix(null, '2026-08', []), null)
  assert.equal(yoyFromYearMatrix(m, null, []), null)
})

test('köhnə parseYoy bu faylı GÖRMÜR — yeni oxucu məhz ona görə lazımdır', () => {
  const eski = parseYoy(S2025)
  assert.equal(Object.keys(eski.branches).length, 0)
})
