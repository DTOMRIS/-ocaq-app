import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BOLGELER,
  BRANCH_TO_REGION,
  CLOSED,
  EXCLUDE,
  canonBranchKey,
  isActiveBranch,
  normalizeFilial,
} from '../src/lib/analytics/filial-map'

// ── Mytcha (yeni filial, 08.2026) ───────────────────────────────────────────
// İstifadəçi təsdiqi (08.08.2026): Mytcha AYRI filialdır, `Bulvar Festival`-ın
// başqa yazılışı DEYİL. Bu test onların qarışdırılmasının qarşısını alır.
test('Mytcha İsmayıl bölgəsinin ayrı filialıdır', () => {
  assert.equal(BRANCH_TO_REGION['Mytcha'], 'İsmayıl')
  assert.equal(normalizeFilial('Mytcha'), 'Mytcha')
  assert.notEqual(normalizeFilial('Mytcha'), 'Bulvar Festival')
  assert.equal(isActiveBranch('Mytcha'), true)
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
  assert.notEqual(canonBranchKey('Mytcha'), canonBranchKey('Bulvar Festival'))
})

// ── Bütövlük ────────────────────────────────────────────────────────────────
test('aktiv filial sayı bölgə xəritəsi ilə uzlaşır', () => {
  const all = Object.values(BOLGELER).flat()
  assert.equal(new Set(all).size, all.length, 'filial adı təkrarlanmamalıdır')
  const active = all.filter(isActiveBranch)
  assert.equal(all.length - CLOSED.size, active.length)
  // 31 xəritədə − 2 bağlı (Masazır, Bulvar Festival) = 29 aktiv.
  // Saha Nəzarət matrisi 28 deyir — o sənəd Mytcha-dan ƏVVƏLdir (08.2026-da
  // əlavə olundu). Yeni filial açılanda bu rəqəm də artmalıdır.
  assert.equal(active.length, 29)
})
