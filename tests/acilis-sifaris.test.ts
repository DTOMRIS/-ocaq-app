import assert from 'node:assert/strict'
import test from 'node:test'
import { SIFARIS_KATALOQ, SIFARIS_MASA, SIFARIS_KATLAR, SIFARIS_KAT_SERT,
         sifarisYarat, tekrarSetirleri, sifarisAcar } from '../src/lib/acilis/sifaris'
import { type AcilisProfil } from '../src/lib/acilis/template'

const BAZA = { kofe: true, cok_kat: false, bar: false, birlesme: false, park_ici: false }
const PIZZALI: AcilisProfil = { format: 'kuce', teras: true, bagca: false, oturma: true,
  pizza: true, catdirilma: true, qaz: false, generator: false, ...BAZA }
const PIZZASIZ: AcilisProfil = { ...PIZZALI, pizza: false }

test('kataloq 445 sabit sətirdir — zal-mətbəx Fırın-ın alt çoxluğu olduğu üçün çıxarıldı', () => {
  assert.equal(SIFARIS_KATALOQ.length, 444)
  assert.deepEqual([...SIFARIS_KATLAR], ['Qida', 'Qeyri-qida', 'Bar', 'Fırın'])
})

test('hər sətrin adı, vahidi və miqdarı var', () => {
  for (const r of SIFARIS_KATALOQ) {
    assert.ok(r.ad.trim().length > 0, 'boş ad')
    assert.ok(r.vahid.trim().length > 0, `vahid yoxdur: ${r.ad}`)
    assert.ok(r.say != null && r.say > 0, `miqdar yoxdur: ${r.ad}`)
    assert.ok(SIFARIS_KATLAR.includes(r.kat), `naməlum kateqoriya: ${r.kat}`)
  }
})

test('eyni kateqoriyada eyni ad iki dəfə yoxdur (unique açar sınmasın)', () => {
  const gorulen = new Set<string>()
  for (const r of [...SIFARIS_KATALOQ, ...SIFARIS_MASA]) {
    const k = `${r.kat}|${sifarisAcar(r.ad)}`
    assert.ok(!gorulen.has(k), `təkrar: ${r.kat} · ${r.ad}`)
    gorulen.add(k)
  }
})

test('masa sətirləri: yalnız 4 ədəd, hamısının perMasa-sı var, sabit miqdarı yoxdur', () => {
  assert.equal(SIFARIS_MASA.length, 4)
  for (const r of SIFARIS_MASA) {
    assert.ok(r.perMasa != null && r.perMasa > 0, r.ad)
    assert.equal(r.say, null, `${r.ad} həm sabit, həm masa-asılı ola bilməz`)
  }
  assert.ok(SIFARIS_MASA.some(r => r.ad === 'İstiot qabı'), 'istiot qabı əlavə edilməyib')
  assert.equal(SIFARIS_MASA.find(r => r.ad === 'Masa stikeri')?.dept, 'Marketinq')
})

test('24 masa → duz 48, istiot 48, salfet 24, stiker 24', () => {
  const out = sifarisYarat(PIZZALI, 24)
  const tap = (ad: string) => out.find(r => r.ad === ad)
  assert.equal(tap('Duz qabı')?.qty, 48)
  assert.equal(tap('İstiot qabı')?.qty, 48)
  assert.equal(tap('Salfet qabı')?.qty, 24)
  assert.equal(tap('Masa stikeri')?.qty, 24)
})

test('masa sayı girilməyibsə sətir SİLİNMİR, qty null qalır — unudulmasın deyə', () => {
  const out = sifarisYarat(PIZZALI, null)
  const duz = out.find(r => r.ad === 'Duz qabı')
  assert.ok(duz, 'duz qabı siyahıdan düşüb')
  assert.equal(duz.qty, null)
  assert.equal(out.filter(r => r.qty == null).length, 4)
})

test('sabit sətirlər masa sayından asılı deyil', () => {
  const az = sifarisYarat(PIZZALI, 8), cox = sifarisYarat(PIZZALI, 80)
  const fri = (a: ReturnType<typeof sifarisYarat>) => a.find(r => r.ad === 'Fri (ə)')?.qty
  assert.equal(fri(az), 25)
  assert.equal(fri(cox), 25)
})

test('pizza yoxdursa Fırın kateqoriyası göndərilmir (peçka + 850 lahmacun kağızı)', () => {
  assert.equal(SIFARIS_KAT_SERT['Fırın'], 'pizza')
  const ile = sifarisYarat(PIZZALI, 20), siz = sifarisYarat(PIZZASIZ, 20)
  assert.ok(ile.some(r => r.kat === 'Fırın'))
  assert.equal(siz.filter(r => r.kat === 'Fırın').length, 0)
  assert.equal(ile.length - siz.length, 56)
  // qalan üç siyahı şərtsizdir — hər filiala gedir
  for (const k of ['Qida', 'Qeyri-qida', 'Bar'] as const) assert.equal(SIFARIS_KAT_SERT[k], null)
})

test('təkrar aşkarlayıcı: birdən çox siyahıda olan məhsul cəmlə göstərilir', () => {
  const t = tekrarSetirleri()
  assert.ok(t.length > 0)
  for (const r of t) assert.ok(r.katlar.length > 1)
  const zibil = t.find(r => sifarisAcar(r.ad) === sifarisAcar('Zibil qabı (Pedallı) orta'))
  assert.ok(zibil, 'pedallı zibil qabı təkrar kimi görünmür')
  assert.equal(zibil.cem, 5)   // Qeyri-qida 2 + Bar 2 + Fırın 1
})

test('açar İ/I/ı tələsinə düşmür', () => {
  assert.equal(sifarisAcar('İstiot qabı'), sifarisAcar('istiot qabi'))
  assert.equal(sifarisAcar('Duz qabı'), sifarisAcar('DUZ QABI'))
})
