import assert from 'node:assert/strict'
import test from 'node:test'
import { ACILIS_SABLON, sertUygun, vezifeYarat, avadanliqSiyahisi, AVADANLIQ,
         STOK_STANDART, STOK_OLCULU, type AcilisProfil } from '../src/lib/acilis/template'

const BOS = { kofe: true, cok_kat: false, bar: false, birlesme: false, park_ici: false }
const KUCE: AcilisProfil = { format: 'kuce', teras: true, bagca: true, oturma: true,
  pizza: true, catdirilma: true, qaz: false, generator: true, ...BOS }
const MALL: AcilisProfil = { format: 'mall', teras: false, bagca: false, oturma: false,
  pizza: false, catdirilma: true, qaz: false, generator: false, ...BOS }

// ── 06.09.2026 planlanan lokasiyalar (istifadəçi təsviri) ──────────────────
const METROPARK: AcilisProfil = { ...MALL, oturma: true, kofe: false }
const QALA: AcilisProfil = { format: 'mall', teras: true, bagca: false, oturma: true,
  pizza: true, catdirilma: true, qaz: false, generator: false,
  kofe: true, cok_kat: true, bar: true, birlesme: false, park_ici: false }
const HCAVID2: AcilisProfil = { format: 'kuce', teras: false, bagca: false, oturma: true,
  pizza: false, catdirilma: true, qaz: false, generator: false,
  kofe: true, cok_kat: false, bar: false, birlesme: true, park_ici: true }

test('şablon bütöv və hər sətri qapıya bağlıdır', () => {
  assert.ok(ACILIS_SABLON.length >= 205, `${ACILIS_SABLON.length} vəzifə`)
  for (const s of ACILIS_SABLON) {
    assert.match(s.gate, /^G[0-6]$/, s.task)
    assert.ok(s.dept.length > 1, s.task)
    assert.ok(s.task.length > 3)
    if (s.offset != null) {
      assert.equal(s.gate, 'G6', `geri sayım yalnız G6: ${s.task}`)
      assert.ok(s.offset >= 0, `mənfi offset: ${s.task}`)   // 0 = açılış günü
    }
  }
})

test('şablonda TƏKRAR vəzifə yoxdur', () => {
  // İki mənbə birləşdirildiyi üçün eyni iş iki dəfə yazıla bilər: biri şərtsiz,
  // biri şərtli. Şərtsiz olan hər profilə düşür və şərti mənasız edir.
  const say = new Map<string, number>()
  for (const s of ACILIS_SABLON) say.set(s.task, (say.get(s.task) ?? 0) + 1)
  const tekrar = [...say].filter(([, n]) => n > 1).map(([t]) => t)
  assert.deepEqual(tekrar, [], `təkrar vəzifə: ${tekrar.join(' · ')}`)
})

test('sertUygun — format bərabərlik/fərq və bayraq', () => {
  assert.equal(sertUygun(null, MALL), true, 'şərtsiz vəzifə hər zaman var')
  assert.equal(sertUygun("format=='mall'", MALL), true)
  assert.equal(sertUygun("format=='mall'", KUCE), false)
  assert.equal(sertUygun("format!='mall'", MALL), false)
  assert.equal(sertUygun("format!='mall'", KUCE), true)
  assert.equal(sertUygun('teras', KUCE), true)
  assert.equal(sertUygun('teras', MALL), false)
  // Tanınmayan şərt vəzifə YARATMAMALIDIR — səssiz «true» yanlış siyahı verir
  assert.equal(sertUygun('naməlum_bayraq', KUCE), false)
})

test('mall food court-da masa/stul/teras vəzifələri YARANMIR', () => {
  const kuce = vezifeYarat(KUCE, '2026-10-15')
  const mall = vezifeYarat(MALL, '2026-10-15')
  assert.ok(kuce.length > mall.length, 'küçə flagship daha çox vəzifə')

  const mallT = new Set(mall.map(x => x.task))
  for (const yox of ['Oturma qrupları (masa, stul, divan)', 'Uşaq üçün yemək stulu',
                     'Teras icazəsi (yerli icra hakimiyyəti)', 'Terasın hazırlanması',
                     'Pizza sobası', 'Masa nömrələri', 'Duz qabı, bibər qabı']) {
    assert.equal(mallT.has(yox), false, `mall-da olmamalı: ${yox}`)
  }
  // Dönər ocağı HƏR filialda var — əsas məhsul
  assert.ok(mallT.has('Dönər ocağı + dönər bıçaqları + kəsmə avadanlıqları'))
})

test('geri sayım tarixləri açılış tarixindən düzgün hesablanır', () => {
  const v = vezifeYarat(KUCE, '2026-10-15')
  const otuz = v.find(x => x.offset === 30)!
  assert.equal(otuz.due, '2026-09-15')
  const bir = v.find(x => x.offset === 1)!
  assert.equal(bir.due, '2026-10-14')
  // Qapıya bağlı vəzifələrin sabit tarixi yoxdur
  assert.equal(v.find(x => x.gate === 'G3')!.due, null)
})

test('qapı sırası pozulmur — G0 əvvəl, G6 sonda', () => {
  const v = vezifeYarat(KUCE, '2026-10-15')
  const sira = v.map(x => Number(x.gate.slice(1)))
  for (let i = 1; i < sira.length; i++) {
    assert.ok(sira[i] >= sira[i - 1], `qapı sırası pozuldu: ${v[i].task}`)
  }
})

test('yaşanmış problemlər şablonda var (bir daha unudulmasın)', () => {
  const t = new Set(ACILIS_SABLON.map(x => x.task))
  for (const lazim of [
    'Barda ƏL YUMA lavabosu proyektə salınır',      // bar olan filialda
    'Arxa giriş qapısına pəncərə + milçək toru (sineklik)',
    'Milçək üçün ultraviole cihazı (içəri)',
    'UPS cihazları (kassa + POS + soyuducu)',
    'Su analizi — filtr seçimi bundan sonra',
    // TƏK filtr — qəhvə üçün ayrı sistem alınmır (istifadəçi qərarı 11.09.2026)
    'Su filtr sistemi — TƏK sistem, bütün bağlantılar planlanır',
    'Cola premix sistemi və qurulumu',
    'Açılışdan ƏVVƏL dərmanlama (ilaçlama) icra olunur',
    'QİDA sifarişləri verilir — SON TARİX',
    'Giriş/çıxış EXIT və təhlükə işıqları',
  ]) assert.ok(t.has(lazim), `şablonda yoxdur: ${lazim}`)
})

test('qida/qeyri-qida sifarişi açılışdan 21 gün əvvəl bağlanır', () => {
  const v = vezifeYarat(KUCE, '2026-10-15')
  const q = v.filter(x => x.task.includes('SON TARİX'))
  assert.equal(q.length, 2)
  for (const x of q) assert.equal(x.due, '2026-09-24')
})

test('stok tipi ayrılıb — standart mərkəzdə, ölçülü filiala özəl', () => {
  assert.ok(STOK_STANDART.includes('Nerj un qabı'))
  assert.ok(STOK_STANDART.includes('Dolab Steyşn böyük'))
  assert.ok(STOK_OLCULU.includes('Oturma qrupları (masa, stul, divan)'))
  // Bir mal hər iki siyahıda ola bilməz — sifariş yolu qeyri-müəyyən olardı
  for (const s of STOK_STANDART) assert.equal(STOK_OLCULU.includes(s), false, s)
})

test('Metropark: qəhvə xətti yoxdur → qəhvə avadanlığı yaranmır', () => {
  const t = new Set(vezifeYarat(METROPARK, '2026-10-15').map(x => x.task))
  for (const yox of ['Kofe maşını', 'Qrinder (qəhvə dəyirmanı)',
                     'Türk qəhvəsi maşını', 'Qəhvə filtr sistemi']) {
    assert.equal(t.has(yox), false, `Metropark-da olmamalı: ${yox}`)
  }
  const a = avadanliqSiyahisi(METROPARK).map(x => x.ad)
  assert.equal(a.includes('Kofe maşını'), false)
  assert.ok(a.includes('Sh (şaurma) aparatı'), 'əsas avadanlıq hər filialda')
})

test('Qala/Səbail 1: mətbəx ayrı mərtəbədə → lift və axın planı yaranır', () => {
  const t = new Set(vezifeYarat(QALA, '2026-10-15').map(x => x.task))
  for (const lazim of ['Mətbəx→zal yemək lifti (dumbwaiter) yeri proyektə salınır',
                       'Mərtəbələr arası personal pilləkəni + təhlükəsizlik',
                       'Mərtəbələr arası servis axını planı (kim nəyi daşıyır)',
                       'Alt mərtəbədə tualet + havalandırma',
                       'Mal giriş-çıxışı ayrı marşrut (qonaq axını ilə kəsişməsin)']) {
    assert.ok(t.has(lazim), `çox mərtəbəlidə olmalı: ${lazim}`)
  }
  // Tək mərtəbəli filialda yaranmamalı
  assert.equal(new Set(vezifeYarat(MALL, '2026-10-15').map(x => x.task))
    .has('Mətbəx→zal yemək lifti (dumbwaiter) yeri proyektə salınır'), false)
})

test('bar olan filialda əl yuma və qapı tipi yaranır', () => {
  const t = new Set(vezifeYarat(QALA, '2026-10-15').map(x => x.task))
  assert.ok(t.has('Barda ƏL YUMA lavabosu proyektə salınır'))
  assert.ok(t.has('Zaldan bara qapı tipi (kovboy / ortası şüşəli gəmici qapısı)'))
  assert.ok(t.has('Bar tezgahı və arxa bar rəfləri'))
})

test('Hüseyn Cavid 2: birləşmə + park → köçürmə və icazə vəzifələri', () => {
  const t = new Set(vezifeYarat(HCAVID2, '2026-10-15').map(x => x.task))
  assert.ok(t.has('Birləşdiriləcək filialın müştəri transfer nisbəti ölçülür'))
  assert.ok(t.has('Köhnə filialın kadrosu yeni filiala keçirilir'))
  assert.ok(t.has('Köhnə filial qapısına «yeni ünvanımız» yönləndirmə'))
  assert.ok(t.has('Park idarəsindən icazə (ərazi istifadəsi)'))
  // Birləşmə olmayan filialda yaranmamalı
  assert.equal(new Set(vezifeYarat(KUCE, '2026-10-15').map(x => x.task))
    .has('Köhnə filialın kadrosu yeni filiala keçirilir'), false)
})

test('açılış günü tədbiri planlanır (son həftədə montajın altında qalmasın)', () => {
  const v = vezifeYarat(KUCE, '2026-10-15')
  const gun0 = v.filter(x => x.offset === 0)
  assert.ok(gun0.length >= 2, 'açılış günü vəzifələri var')
  for (const x of gun0) assert.equal(x.due, '2026-10-15')
  const t = new Set(v.map(x => x.task))
  assert.ok(t.has('Tort və lent kəsimi mərasimi'))
  assert.ok(t.has('DJ və musiqi proqramı sifariş edilir, tarix təsdiqlənir'))
  assert.ok(t.has('Shaurma №1 brend geyimində 2 hostes təyin edilir'))
})

test('avadanlıq kataloqu — say və şərt', () => {
  assert.ok(AVADANLIQ.length >= 30)
  const sh = AVADANLIQ.find(a => a.ad === 'Sh (şaurma) aparatı')!
  assert.equal(sh.say, 5)
  assert.equal(sh.cond, null, 'əsas avadanlıq şərtsizdir')
  const bar = AVADANLIQ.find(a => a.ad === 'Vitrin bar soyuducu (kiçik)')!
  assert.equal(bar.cond, 'bar')
  assert.equal(avadanliqSiyahisi(MALL).some(a => a.ad === 'Vitrin bar soyuducu (kiçik)'), false)
})

// ── 11.09.2026 istifadəçi düzəlişləri — geri dönməsin ─────────────────────

test('təkrarlanan vəzifə yoxdur (eyni qapı + departament + mətn)', () => {
  const gorulen = new Set<string>()
  for (const t of ACILIS_SABLON) {
    const k = `${t.gate}|${t.dept}|${t.task}`
    assert.ok(!gorulen.has(k), `təkrar: ${k}`)
    gorulen.add(k)
  }
})

test('qəhvə üçün AYRI filtr yoxdur — tək su filtri', () => {
  const filtr = ACILIS_SABLON.filter(t => /filtr/i.test(t.task))
  assert.equal(filtr.length, 2)                       // su analizi + tək filtr
  assert.ok(!ACILIS_SABLON.some(t => t.task === 'Qəhvə filtr sistemi'))
  // su analizi filtrdən ƏVVƏL gəlməlidir — analizsiz filtr seçilmir
  const iAnaliz = ACILIS_SABLON.findIndex(t => t.task.startsWith('Su analizi'))
  const iFiltr = ACILIS_SABLON.findIndex(t => t.task.startsWith('Su filtr'))
  assert.ok(iAnaliz >= 0 && iAnaliz < iFiltr)
})

test('iş saatları stikeri tək sətirdir (G5 + G6 təkrarı birləşdirildi)', () => {
  const saat = ACILIS_SABLON.filter(t => /iş saatları|saatların/i.test(t.task))
  assert.equal(saat.length, 1)
  assert.equal(saat[0].gate, 'G5')
})

test('SMM: səhifə açma vəzifəsi yoxdur, reklam mətni reklamdan əvvəldir', () => {
  assert.ok(!ACILIS_SABLON.some(t => /səhifələrinin açılması/i.test(t.task)))
  const iMetn = ACILIS_SABLON.findIndex(t => /SMM reklam mətni/i.test(t.task))
  const iRek  = ACILIS_SABLON.findIndex(t => t.task === 'SMM reklamının verilməsi')
  assert.ok(iMetn >= 0 && iRek >= 0 && iMetn < iRek, 'mətn reklamdan sonra gəlir')
  assert.ok(ACILIS_SABLON.some(t => /«Tezliklə» baneri/.test(t.task)))
})

test('bayraq sifariş edilmir — el ilanı ayrı, şar açılışda', () => {
  assert.ok(!ACILIS_SABLON.some(t => /bayraq/i.test(t.task)))
  assert.ok(ACILIS_SABLON.some(t => t.task === 'El ilanı — dizayn, çap və paylanma'))
  assert.ok(ACILIS_SABLON.some(t => /şar dekorasiyası/i.test(t.task)))
})

test('canlı çiçək marketinqin deyil, zalı olan filialındır', () => {
  const c = ACILIS_SABLON.find(t => /Canlı çiçək/i.test(t.task))
  assert.ok(c)
  assert.notEqual(c.dept, 'Marketinq')
  assert.equal(c.cond, 'oturma')
})

test('sifariş kataloqundakı məhsul vəzifə kimi təkrarlanmır', () => {
  for (const yasaq of ['Duz qabı, bibər qabı', 'Masa üstü balaca zibil qabı',
                       'Tualet avadanlıqları, zibil qabları, küllüklər']) {
    assert.ok(!ACILIS_SABLON.some(t => t.task === yasaq), `kataloqla təkrarlanır: ${yasaq}`)
  }
})

test('«bağlanır» yalnız fiziki bağlantı üçün işlədilir, sifariş/müqavilə üçün yox', () => {
  // Azərbaycanca «bağlanır» = qapanır. «DJ bağlanır» sifariş kimi oxunmur.
  for (const t of ACILIS_SABLON) {
    if (!/bağlanır/.test(t.task)) continue
    assert.match(t.task, /(sistemə|şəbəkəyə|filtrə) bağlanır|bağlantılar/,
      `mənası qarışıq: ${t.task}`)
  }
})

test('şablonda «UNUDULDU» etiketi qalmır', () => {
  // Siyahıda olan iş artıq unudulmur — etiket yalnız gözü yorur (11.09.2026)
  for (const t of ACILIS_SABLON) {
    assert.ok(!/UNUDULDU/.test(t.note ?? ''), `${t.task}: ${t.note}`)
    assert.ok(!/UNUDULDU/.test(t.task), t.task)
  }
})

test('tikinti zənciri: müqavilə → yerləşim → proyekt → təsdiq → təhvil', () => {
  const tap = (re: RegExp) => ACILIS_SABLON.find(t => re.test(t.task))
  const muq = tap(/Kirayə müqaviləsi hazırlanır/)
  const yer = tap(/sahədə funksiya və yerləşimi/)
  const pro = tap(/İnşaat proyekti çıxarılır/)
  const tes = tap(/Mimari layihə komanda tərəfindən/)
  const teh = tap(/Yer tikinti departamentinə təhvil/)
  for (const [ad, t] of Object.entries({ muq, yer, pro, tes, teh })) assert.ok(t, `yoxdur: ${ad}`)
  assert.equal(muq!.gate, 'G2')
  // yerləşim OPS-un, proyekt İnşaatın işidir — qarışdırılmasın
  assert.equal(yer!.dept, 'OPS')
  assert.equal(pro!.dept, 'İnşaat')
  assert.equal(teh!.dept, 'OPS')
  // sıra qeydlərdə nömrələnib (ekranda departament üzrə çeşidləndiyi üçün)
  for (const [n, t] of [[2, yer], [3, pro], [4, tes], [5, teh]] as const) {
    assert.match(t!.note ?? '', new RegExp(`^${n}-c[üı]? ?addım|^${n}-ci addım`), `${t!.task}: ${t!.note}`)
  }
})

test('barmaq izi: cihaz işçi qeydiyyatından ƏVVƏL qurulur', () => {
  const cihaz = ACILIS_SABLON.find(t => /Barmaq izi \(PDKS\) cihazı/.test(t.task))
  const isci  = ACILIS_SABLON.find(t => /barmaq izi sistemində qeydiyyatdan/.test(t.task))
  assert.ok(cihaz && isci)
  assert.equal(cihaz.dept, 'Bilgi İşlem')
  assert.equal(isci.dept, 'İK')
  // offset = açılışa neçə gün qalmış → böyük offset ƏVVƏL gəlir
  assert.ok(cihaz.offset! > isci.offset!, 'cihaz işçi qeydiyyatından sonra qurulur')
})

test('Wolt/Bolt: şəbəkə hesabı var, filial ona əlavə edilir', () => {
  for (const ad of ['Wolt', 'Bolt Food']) {
    const t = ACILIS_SABLON.find(x => x.task.includes(ad))
    assert.ok(t, ad)
    assert.match(t.task, /əlavə edildi/, `${ad}: hələ «hesab açıldı» yazır`)
    assert.equal(t.cond, 'catdirilma')
  }
})

test('İK istirahət günü və masa nömrələri vəzifə siyahısında deyil', () => {
  assert.ok(!ACILIS_SABLON.some(t => t.task === 'Komanda istirahət günü'))
  assert.ok(!ACILIS_SABLON.some(t => t.task === 'Masa nömrələri'))
})
