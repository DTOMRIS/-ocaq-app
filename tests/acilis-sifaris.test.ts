import assert from 'node:assert/strict'
import test from 'node:test'
import { SIFARIS_KATALOQ, SIFARIS_OLCULU, SIFARIS_KATLAR, SIFARIS_KAT_SERT,
         sifarisYarat, tekrarSetirleri, sifarisAcar, olcuEtiketi,
         type Olculer } from '../src/lib/acilis/sifaris'
import { type AcilisProfil } from '../src/lib/acilis/template'

const BAZA = { kofe: true, cok_kat: false, bar: false, birlesme: false, park_ici: false }
const PIZZALI: AcilisProfil = { format: 'kuce', teras: true, bagca: false, oturma: true,
  pizza: true, catdirilma: true, qaz: false, generator: false, ...BAZA }
const PIZZASIZ: AcilisProfil = { ...PIZZALI, pizza: false }
const TERASSIZ: AcilisProfil = { ...PIZZALI, teras: false }
const BOS_OLCU: Olculer = { masa: null, oturacaq: null, banko: null }
const OLCU = (o: Partial<Olculer>): Olculer => ({ ...BOS_OLCU, ...o })

test('kataloq 445 sabit sətirdir — zal-mətbəx Fırın-ın alt çoxluğu olduğu üçün çıxarıldı', () => {
  assert.equal(SIFARIS_KATALOQ.length, 441)
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
  for (const r of [...SIFARIS_KATALOQ, ...SIFARIS_OLCULU]) {
    const k = `${r.kat}|${sifarisAcar(r.ad)}`
    assert.ok(!gorulen.has(k), `təkrar: ${r.kat} · ${r.ad}`)
    gorulen.add(k)
  }
})

test('ölçülü sətirlər: 8 ədəd, hər birinin bazası var, sabit miqdarı yoxdur', () => {
  assert.equal(SIFARIS_OLCULU.length, 9)
  for (const r of SIFARIS_OLCULU) {
    assert.ok(r.olcu, r.ad)
    assert.equal(r.say, null, `${r.ad} həm sabit, həm ölçülü ola bilməz`)
    // `kat` VƏ YA `herBir` — ikisi birdən olsa hesab qeyri-müəyyən olar
    const varKat = r.olcu!.kat != null, varHer = r.olcu!.herBir != null
    assert.ok(varKat !== varHer, `${r.ad}: kat və herBir eyni anda ola bilməz`)
  }
  assert.ok(SIFARIS_OLCULU.some(r => r.ad === 'İstiot qabı'), 'istiot qabı əlavə edilməyib')
  assert.equal(SIFARIS_OLCULU.find(r => r.ad === 'Masa stikeri')?.dept, 'Marketinq')
})

test('masaya bağlı 6 sətir: 24 masa → hər biri 24', () => {
  const out = sifarisYarat(PIZZALI, OLCU({ masa: 24 }))
  const tap = (ad: string) => out.find(r => r.ad === ad)?.qty
  assert.equal(tap('Duz qabı'), 24)
  assert.equal(tap('İstiot qabı'), 24)
  assert.equal(tap('Salfet qabı'), 24)
  assert.equal(tap('Dəmir zibilqabı stolüstü'), 24)
  assert.equal(tap('Masa stikeri'), 24)
  assert.equal(tap('Masa nömrələri'), 24)
})

test('menyu OTURACAĞA bağlıdır, masaya yox — 60 stul → 30 menyu', () => {
  const out = sifarisYarat(PIZZALI, OLCU({ masa: 24, oturacaq: 60 }))
  assert.equal(out.find(r => r.ad === 'Menyu')?.qty, 30)
  // tək sayda oturacaq yuxarı yuvarlanır — 4 nəfər 3,5 menyu ilə oturmur
  assert.equal(sifarisYarat(PIZZALI, OLCU({ oturacaq: 7 })).find(r => r.ad === 'Menyu')?.qty, 4)
})

test('külqabı yalnız terası olan filiala, masa + 4 ehtiyat', () => {
  const ile = sifarisYarat(PIZZALI, OLCU({ masa: 24 }))
  assert.equal(ile.find(r => r.ad === 'Dəmir külqabı')?.qty, 28)
  // teras yoxdursa sətir ÜMUMİYYƏTLƏ yaranmır — burada «gözlə» yox, «yox» cavabı bəllidir
  const siz = sifarisYarat(TERASSIZ, OLCU({ masa: 24 }))
  assert.equal(siz.find(r => r.ad === 'Dəmir külqabı'), undefined)
})

test('menyu ekranı banko uzunluğuna görə — hər 1,2 m-ə 1 ekran', () => {
  const q = (m: number) => sifarisYarat(PIZZALI, OLCU({ banko: m }))
    .find(r => r.ad === 'Menyu ekranı (banko üstü)')?.qty
  assert.equal(q(1.2), 1)
  assert.equal(q(3.6), 3)
  assert.equal(q(4.0), 4)   // 3.33 → yuxarı: yarım ekran alınmır
  assert.equal(SIFARIS_OLCULU.find(r => r.ad === 'Menyu ekranı (banko üstü)')?.dept, 'Bilgi İşlem')
})

test('ölçü girilməyibsə sətir SİLİNMİR, qty null qalır — unudulmasın deyə', () => {
  const out = sifarisYarat(PIZZALI, BOS_OLCU)
  const duz = out.find(r => r.ad === 'Duz qabı')
  assert.ok(duz, 'duz qabı siyahıdan düşüb')
  assert.equal(duz.qty, null)
  assert.equal(out.filter(r => r.qty == null).length, 9)
})

test('bir ölçü girilsə yalnız ona bağlı sətirlər dolur', () => {
  const out = sifarisYarat(PIZZALI, OLCU({ masa: 10 }))
  assert.equal(out.find(r => r.ad === 'Duz qabı')?.qty, 10)
  assert.equal(out.find(r => r.ad === 'Menyu')?.qty, null)
  assert.equal(out.find(r => r.ad === 'Menyu ekranı (banko üstü)')?.qty, null)
})

test('ölçü etiketi rəqəmin haradan gəldiyini göstərir', () => {
  assert.equal(olcuEtiketi({ esas: 'masa', kat: 1 }), 'masa × 1')
  assert.equal(olcuEtiketi({ esas: 'masa', kat: 1, ehtiyat: 4 }), 'masa × 1 + 4')
  assert.equal(olcuEtiketi({ esas: 'banko', herBir: 1.2 }), 'hər 1.2 banko')
})

test('sabit sətirlər ölçüdən asılı deyil', () => {
  const az = sifarisYarat(PIZZALI, OLCU({ masa: 8 })), cox = sifarisYarat(PIZZALI, OLCU({ masa: 80 }))
  const fri = (a: ReturnType<typeof sifarisYarat>) => a.find(r => r.ad === 'Fri (ə)')?.qty
  assert.equal(fri(az), 25)
  assert.equal(fri(cox), 25)
})

test('pizza yoxdursa Fırın kateqoriyası göndərilmir (peçka + 850 lahmacun kağızı)', () => {
  assert.equal(SIFARIS_KAT_SERT['Fırın'], 'pizza')
  const ile = sifarisYarat(PIZZALI, OLCU({ masa: 20 })), siz = sifarisYarat(PIZZASIZ, OLCU({ masa: 20 }))
  assert.ok(ile.some(r => r.kat === 'Fırın'))
  assert.equal(siz.filter(r => r.kat === 'Fırın').length, 0)
  assert.equal(ile.length - siz.length, 56)
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
