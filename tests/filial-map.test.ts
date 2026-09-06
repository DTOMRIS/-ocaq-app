import assert from 'node:assert/strict'
import test from 'node:test'
import { BOLGELER, BRANCH_TO_REGION, CLOSED, EXCLUDE, canonBranchKey, isActiveBranch, normalizeFilial, tradeZone } from '../src/lib/analytics/filial-map'

// ── F-31 «Səbail 3» (yeni filial 08.2026; əvvəl Mytcha/Abdülkerim Alizadə) ──
// İstifadəçi təsdiqi (08.08.2026): AYRI filialdır, `Bulvar Festival`-ın başqa
// yazılışı DEYİL. (09.08.2026): OCAQ-da ünvana görə «Abdülkerim Alizadə»
// adlanırdı; 06.09.2026-da «Səbail 3» oldu. Köhnə adların hamısı alias qalır —
// yoxsa keçən ilin cirosu yeni ada bağlanmaz.
// Kanonik ad OCAQ `branches.name` ilə eyni olmalıdır, yoxsa `branchIdOf`
// bağlantı qurmur və bölgə/filial müdiri datanı görmür.
test('F-31 İsmayıl bölgəsinin ayrı filialıdır və iiko adı bağlanıb', () => {
  assert.equal(BRANCH_TO_REGION['Səbail 3'], 'İsmayıl')
  assert.equal(normalizeFilial('Mytcha'), 'Səbail 3')
  assert.equal(normalizeFilial('Səbail 3'), 'Səbail 3')
  assert.notEqual(normalizeFilial('Mytcha'), 'Bulvar Festival')
  assert.equal(isActiveBranch('Mytcha'), true)
  assert.equal(isActiveBranch('Səbail 3'), true)
  // Yazılış variantları da bağlanır (iiko/əl ilə giriş fərqləri).
  for (const v of ['Mycta', 'Myctha', 'Abdulkerim Alizade']) {
    assert.equal(normalizeFilial(v), 'Səbail 3', `${v} bağlanmalıdır`)
  }
  // OCAQ adı ilə iiko adı EYNİ açara düşür → branchIdOf bağlantı qurur.
  assert.equal(canonBranchKey('Mytcha'), canonBranchKey('Səbail 3'))
})

// ── CLOSED vs EXCLUDE ───────────────────────────────────────────────────────
test('bağlanmış filial aktiv sayılmır, amma xəritədən silinmir', () => {
  for (const name of ['Masazır', 'Bulvar Festival']) {
    assert.equal(CLOSED.has(name), true, `${name} CLOSED-da olmalıdır`)
    assert.equal(isActiveBranch(name), false, `${name} aktiv sayılmamalıdır`)
    // TARİXİ DATA QORUNUR: bölgə xəritəsində qalır → keçən ilin cirosu YoY-da görünür.
    assert.equal(typeof BRANCH_TO_REGION[name], 'string', `${name} bölgəsi itməməlidir`)
    // CLOSED ≠ EXCLUDE: bağlanmış filial parser-də sətir atmır.
    assert.equal(EXCLUDE.has(name), false, `${name} EXCLUDE-a düşməməlidir`)
  }
})

test('Xırdalan alias-ı bağlı Masazır-a düşür və aktiv sayılmır', () => {
  assert.equal(normalizeFilial('Xırdalan'), 'Masazır')
  assert.equal(isActiveBranch('Xırdalan'), false)
})

test('bizim olmayan adlar (EXCLUDE) aktiv deyil', () => {
  assert.equal(isActiveBranch('Siciliano Restoran'), false)
  assert.equal(isActiveBranch('Yasamal'), false)
})

test('işləyən filial aktivdir, boş/naməlum ad aktiv deyil', () => {
  assert.equal(isActiveBranch('Bayıl'), true)
  assert.equal(isActiveBranch('Shaurma Seabreez'), true)   // alias → Seabreeze
  assert.equal(isActiveBranch('   '), false)
  assert.equal(isActiveBranch(''), false)
})

// ── canonBranchKey: Azərbaycan hərf tələsi ──────────────────────────────────
// CHANGELOG-da qeyd olunan 4× ikiqat sayma bu tələdən yaranmışdı; regresiya
// testi olmadan geri qayıda bilər.
test('canonBranchKey İ/I/ı/i fərqini yığır', () => {
  // Xam JS tələsi — testin nəyi qorduğunu göstərir:
  assert.equal('I'.toLowerCase(), 'i')            // Azərbaycanca 'ı' olmalıydı
  assert.notEqual('İ'.toLowerCase(), 'i')         // 'i' + U+0307 birləşən nöqtə
  // canonBranchKey bunu düzəldir:
  assert.equal(canonBranchKey('İnşaatçılar'), canonBranchKey('inşaatçilar'))
  assert.equal(canonBranchKey('Bakıxanov 1'), canonBranchKey('BAKIXANOV 1'))
  assert.equal(canonBranchKey('Zığ'), canonBranchKey('ZIĞ'))
  // Hər halda birləşən nöqtə açara sızmır:
  assert.equal(canonBranchKey('İsmayıl').includes('̇'), false)
})

test('canonBranchKey ə/diakritik və boşluğu normalize edir', () => {
  assert.equal(canonBranchKey('Əcəmi'), 'ecemi')
  assert.equal(canonBranchKey('  5   Mərtəbə '), '5 mertebe')
  assert.equal(canonBranchKey('Hüseyn Cavid'), 'huseyn cavid')
  // 'q' Azərbaycan əlifbasında müstəqil hərfdir — diakritik deyil, 'g' olmur.
  assert.equal(canonBranchKey('Binəqədi'), 'bineqedi')
  assert.equal(canonBranchKey('Bineqedi'), 'bineqedi')   // ALIASES-dəki yazılış da uyğun gəlir
  assert.equal(canonBranchKey(null), '')
  assert.equal(canonBranchKey('   '), '')
})

test('canonBranchKey alias-ları eyni açara yığır (ikiqat sətir olmasın)', () => {
  assert.equal(canonBranchKey('Xırdalan'), canonBranchKey('Masazır'))
  assert.equal(canonBranchKey('Torgoviy Yuxarı'), canonBranchKey('Torgoviy Aşağı'))
  assert.equal(canonBranchKey('Shaurma №1 Zığ Şosesi'), canonBranchKey('Zığ'))
})

test('canonBranchKey ayrı filialları qarışdırmır', () => {
  const keys = Object.values(BOLGELER).flat().map(canonBranchKey)
  assert.equal(new Set(keys).size, keys.length, 'iki filial eyni açara düşməməlidir')
  assert.notEqual(canonBranchKey('Bakıxanov 1'), canonBranchKey('Bakıxanov 2'))
  assert.notEqual(canonBranchKey('Bulvar'), canonBranchKey('Bulvar Festival'))
  assert.notEqual(canonBranchKey('Səbail 3'), canonBranchKey('Bulvar Festival'))
})

// ── Bütövlük ────────────────────────────────────────────────────────────────
test('aktiv filial sayı bölgə xəritəsi ilə uzlaşır', () => {
  const all = Object.values(BOLGELER).flat()
  assert.equal(new Set(all).size, all.length, 'filial adı təkrarlanmamalıdır')
  const active = all.filter(isActiveBranch)
  assert.equal(all.length - CLOSED.size, active.length)
  // 32 xəritədə − 2 bağlı (Masazır, Bulvar Festival) = 30 aktiv.
  //
  // 25.08.2026: 29 → 30. «Aeroport» xəritədə YOX İDİ, halbuki iiko datasında
  // vardı (01–24.08 üzrə 12 071,05 ₼) və istifadəçi onu `/admin/filiallar`-da
  // Ramin bölgəsinə təyin etmişdi. Xəritədə olmadığı üçün panel onu bölgəsiz
  // sayırdı. Real fayllarda 30 filial görünür — düzgün rəqəm budur.
  //
  // Saha Nəzarət matrisi 28 deyir — o sənəd daha köhnədir. Yeni filial
  // açılanda bu rəqəm artmalıdır; ARTIQ ƏSAS MƏNBƏ `branches.region_id`-dir,
  // bu siyahı yalnız toxum/ehtiyatdır.
  assert.equal(active.length, 30)
})

// ── Ad dəyişikliyi 06.09.2026: Corner → Səbail 2 · Mytcha → Səbail 3 ────────
// Tarixi data QORUNMALIDIR: 2025 fakt faylı hələ «Corner» yazır, iiko «Mytcha»
// göndərir, Wolt «Əziz Əliyev Küç» deyir. Alias qırılsa keçən ilin cirosu yeni
// ada bağlanmaz və YoY sıfırdan başlayar.
test('Corner → Səbail 2: köhnə adların hamısı yeni kanonikə bağlanır', () => {
  for (const v of ['Corner', 'Səbail 2', 'Shaurma №1 Əziz Əliyev Küç', 'Əziz Əliyev Küç', 'Aziz Aliyev Str.']) {
    assert.equal(normalizeFilial(v), 'Səbail 2', `${v} → Səbail 2`)
  }
  assert.equal(BRANCH_TO_REGION['Səbail 2'], 'İsmayıl')
  assert.equal(isActiveBranch('Corner'), true)
  assert.equal(canonBranchKey('Corner'), canonBranchKey('Səbail 2'))
})

test('Mytcha → Səbail 3: iiko və OCAQ köhnə adları eyni açara düşür', () => {
  for (const v of ['Mytcha', 'Mycta', 'Myctha', 'Matcha', 'Abdülkerim Alizadə', 'Abdulkerim Alizade', 'Səbail 3']) {
    assert.equal(normalizeFilial(v), 'Səbail 3', `${v} → Səbail 3`)
  }
  assert.equal(BRANCH_TO_REGION['Səbail 3'], 'İsmayıl')
  assert.equal(canonBranchKey('Mytcha'), canonBranchKey('Səbail 3'))
})

test('Səbail 2 və Səbail 3 AYRI filialdır, amma EYNİ ticarət zonasıdır', () => {
  // 140 m aralı. Ayrı müqayisə edilsə biri «çökdü», digəri «yeni» görünür.
  assert.notEqual(canonBranchKey('Səbail 2'), canonBranchKey('Səbail 3'))
  assert.equal(tradeZone('Corner'), 'Səbail')
  assert.equal(tradeZone('Mytcha'), 'Səbail')
  assert.equal(tradeZone('Səbail 2'), tradeZone('Səbail 3'))
  // Zonası olmayan filial öz-özünə bir zonadır
  assert.equal(tradeZone('Mərdəkan'), 'Mərdəkan')
  assert.equal(tradeZone(''), null)
})
