import assert from 'node:assert/strict'
import test from 'node:test'
import { computeAttainment, attainmentByRegion, buildTargetIndex, type BranchSales } from '../src/lib/analytics/target-attainment'
import { canonBranchKey } from '../src/lib/analytics/filial-map'

// ── REAL HADİSƏ (avqust 2026) ───────────────────────────────────────────────
// Panel şəbəkə satışını 920 586 ₼ göstərirdi, «Gerçək» cəmi isə 867 401 ₼ idi.
// Fərq 53 186 ₼ = Əcəmi (33 261) + Abdülkerim Alizadə (19 925) — HƏDƏFSİZ
// olduqları üçün müqayisədən tamamilə çıxarılırdılar.
// Qeyd: rəqəmlər ekrandaki YUVARLAQLAŞDIRILMIŞ dəyərlərdir, ona görə cəm
// 867 400 ₼-dir (panel yuvarlaqlaşdırılmamış dəyərlə 867 401 göstərirdi).
// Testin iddiası cəmin DƏQİQ dəyəri deyil, İTKİ OLMAMASIDIR.
const REAL: BranchSales[] = [
  { filial: 'Bulvar', bolge: 'İsmayıl', actual: 246446, target: 1160000 },
  { filial: 'Abdülkerim Alizadə', bolge: 'İsmayıl', actual: 19925, target: 0 },   // hədəfsiz
  { filial: 'Gəncə', bolge: 'Ramin', actual: 239917, target: 1101000 },
  { filial: 'Binəqədi', bolge: 'Taleh', actual: 145556, target: 680000 },
  { filial: 'İnşaatçılar', bolge: 'Ceyhun', actual: 112257, target: 507000 },
  { filial: 'Əcəmi', bolge: 'Ceyhun', actual: 33261, target: 0 },                 // hədəfsiz
  { filial: 'Zığ', bolge: 'Elnur', actual: 123224, target: 560000 },
]

test('hədəfsiz filialın satışı İTMİR — şəbəkə cəmi qorunur', () => {
  const a = computeAttainment(REAL, { days: 7, daysInMonth: 31 })
  // ƏSAS İDDİA: heç bir satış düşmür.
  assert.equal(a.networkSales, 920586)
  assert.equal(a.net.actual, 867400, 'müqayisəyə girən hədəfli filiallar')
  assert.equal(a.untargetedSales, 53186)
  // Cəm izlənə bilən olmalıdır.
  assert.equal(a.net.actual + a.untargetedSales, a.networkSales)
})

test('hədəfsiz filiallar adla qaytarılır (ekranda göstərilə bilsin)', () => {
  const a = computeAttainment(REAL, { days: 7, daysInMonth: 31 })
  assert.equal(a.untargeted.length, 2)
  // Satışa görə azalan sıra — ən böyük itki ən üstdə.
  assert.deepEqual(a.untargeted.map(u => u.filial), ['Əcəmi', 'Abdülkerim Alizadə'])
  assert.equal(a.untargeted[0].actual, 33261)
  assert.equal(a.rows.length, 5)
  assert.equal(a.rows.every(r => r.target > 0), true)
})

test('proqnoz faizində PAY və MƏXRƏC eyni filial dəstindədir (%102 deyil, %96)', () => {
  const a = computeAttainment(REAL, { days: 7, daysInMonth: 31 })
  assert.equal(a.net.target, 4008000)
  // Proqnoz YALNIZ hədəfli filialların satışından: 867 401 / 7 × 31
  assert.equal(Math.round(a.projection), 3841343)   // 867 400 / 7 × 31
  assert.equal(Math.round(a.projectionPct! * 100), 96, 'hədəfin ALTINDA — %102 səhv idi')

  // SƏHV DAVRANIŞIN REPRODUKSİYASI: pay bütün şəbəkənin proqnozu olsaydı
  const wrong = a.networkSales / 7 * 31 / a.net.target
  assert.equal(Math.round(wrong * 100), 102, 'köhnə kodun verdiyi şişik rəqəm')
  assert.ok(wrong > a.projectionPct!, 'şişik rəqəm həmişə daha böyükdür')
})

test('bugünə qədər tutturma proqnozdan AYRIDIR (ziddiyyət görünmür)', () => {
  const a = computeAttainment(REAL, { days: 7, daysInMonth: 31 })
  // 867 401 / 4 008 000 = %21,6 → bu «bugünə qədər»dir
  assert.equal(Math.round(a.net.pct! * 100), 22)
  // Proqnoz isə %96 — ikisi FƏRQLİ sual, hər ikisi doğru.
  assert.equal(Math.round(a.projectionPct! * 100), 96)
})

test('bölgə tutturması yalnız hədəfli filialları sayır', () => {
  const a = computeAttainment(REAL, { days: 7, daysInMonth: 31 })
  const byReg = attainmentByRegion(a)
  const ceyhun = byReg.find(r => r.bolge === 'Ceyhun')!
  // Əcəmi hədəfsizdir → bölgə müqayisəsinə girmir
  assert.equal(ceyhun.actual, 112257)
  assert.equal(ceyhun.target, 507000)
  const ismayil = byReg.find(r => r.bolge === 'İsmayıl')!
  assert.equal(ismayil.actual, 246446)
  // Bölgə cəmləri hədəfli cəmə bərabər olmalıdır
  assert.equal(byReg.reduce((s, r) => s + r.actual, 0), a.net.actual)
})

test('heç bir hədəf yoxdursa faiz null olur (uydurma rəqəm yox)', () => {
  const a = computeAttainment(
    [{ filial: 'A', bolge: null, actual: 100, target: 0 }],
    { days: 7, daysInMonth: 31 },
  )
  assert.equal(a.net.pct, null)
  assert.equal(a.projectionPct, null)
  assert.equal(a.networkSales, 100)
  assert.equal(a.untargetedSales, 100)
  assert.equal(a.rows.length, 0)
})

test('gün sayı 0 olsa sıfıra bölmə yoxdur', () => {
  const a = computeAttainment(
    [{ filial: 'A', bolge: null, actual: 100, target: 500 }],
    { days: 0, daysInMonth: 31 },
  )
  assert.equal(a.projection, 0)
  assert.equal(a.projectionPct, null)
  assert.equal(a.net.pct, 0.2)   // bugünə qədər hesablana bilir
})

test('bütün filiallar hədəfliysə hədəfsiz siyahı boş, cəmlər bərabər', () => {
  const a = computeAttainment(REAL.filter(b => b.target > 0), { days: 7, daysInMonth: 31 })
  assert.equal(a.untargeted.length, 0)
  assert.equal(a.untargetedSales, 0)
  assert.equal(a.net.actual, a.networkSales)
})

// ── 🔴 09.08.2026 — «HƏDƏFLƏR GİRİLDİ, PANEL GÖRMÜR» ────────────────────────
// İki kod yolu fərqli açar işlədirdi: hədəflər OCAQ-daki XAM `branches.name`
// ilə yazılır, oxuma isə KANONİK filial adı ilə olurdu. OCAQ-da filial
// «Əcəmi Shaurma» adlanırsa hədəf tapılmır və filial «hədəfsiz» görünür.
test('buildTargetIndex OCAQ adı ilə iiko adını EYNİ açara bağlayır', () => {
  const idx = buildTargetIndex(
    [{ name: 'Əcəmi Shaurma', amount: 160000 }],
    canonBranchKey,
  )
  // Panel kanonik adla axtarır — TAPILMALIDIR.
  assert.equal(idx[canonBranchKey('Əcəmi')], 160000)
  assert.equal(idx[canonBranchKey('Shaurma №1 Memar Əcəmi')], 160000)
  // SƏHV DAVRANIŞIN REPRODUKSİYASI: xam adla qurulsaydı tapılmazdı.
  const wrong: Record<string, number> = { 'Əcəmi Shaurma': 160000 }
  assert.equal(wrong['Əcəmi'], undefined, 'köhnə kod məhz burada boş qaytarırdı')
})

test('buildTargetIndex eyni kanonik filiala düşən hədəfləri TOPLAYIR', () => {
  // ALIASES: «Torgoviy Yuxarı» + «Torgoviy Aşağı» → «Torgoviy».
  // Üzərinə yazsaydıq hədəf yarıya enərdi.
  const idx = buildTargetIndex([
    { name: 'Torgoviy Yuxarı', amount: 300000 },
    { name: 'Torgoviy Aşağı', amount: 200000 },
  ], canonBranchKey)
  assert.equal(idx[canonBranchKey('Torgoviy')], 500000)
})

test('buildTargetIndex yeni filialı da bağlayır (F-31)', () => {
  const idx = buildTargetIndex([{ name: 'Abdülkerim Alizadə', amount: 100000 }], canonBranchKey)
  assert.equal(idx[canonBranchKey('Abdülkerim Alizadə')], 100000)
  // iiko hələ «Mytcha» göndərir — o da eyni hədəfə düşməlidir.
  assert.equal(idx[canonBranchKey('Mytcha')], 100000)
})

test('buildTargetIndex zibil dəyəri atır, hədəfi pozmur', () => {
  const idx = buildTargetIndex([
    { name: 'Bayıl', amount: '500000' },      // mətn rəqəm — oxunur
    { name: '   ', amount: 999 },             // boş ad — atılır
    { name: 'Zığ', amount: 'abc' },           // rəqəm deyil — atılır
  ], canonBranchKey)
  assert.equal(idx[canonBranchKey('Bayıl')], 500000)
  assert.equal(Object.keys(idx).length, 1)
})
