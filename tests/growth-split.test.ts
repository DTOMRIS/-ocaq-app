import assert from 'node:assert/strict'
import test from 'node:test'
import { boyumeAyir, filialNovu, zonayaYig, dovrdeIslek, type FilialDovr } from '../src/lib/analytics/growth-split'

const N = (filial: string, cari: number, kecen: number, zona?: string): FilialDovr =>
  ({ filial, cari, kecen, zona })

test('filial növü dörd halı ayırır', () => {
  assert.equal(filialNovu(N('a', 100, 90)), 'eyni')
  assert.equal(filialNovu(N('b', 100, 0)), 'yeni')
  assert.equal(filialNovu(N('c', 0, 90)), 'baglanan')
  assert.equal(filialNovu(N('d', 0, 0)), 'bos')
})

test('«hər iki dövrdə 0» sətri SİLİNMİR — filial var, satış yoxdur ciddi haldır', () => {
  const a = boyumeAyir([N('bos filial', 0, 0)])
  assert.equal(a.say.bos, 1)
  assert.equal(a.xalis, 0)
})

test('AÇAR TƏNLİK: eyni + yeni + bağlanan = xalis (həmişə)', () => {
  const dest = [
    N('Nərimanov', 420_000, 400_000),   // eyni, +20k
    N('Xətai', 300_000, 330_000),       // eyni, −30k
    N('Səbail 3', 155_699, 0),          // yeni
    N('Masazır', 0, 88_000),            // bağlanan
    N('Yeni boş', 0, 0),                // boş
  ]
  const a = boyumeAyir(dest)
  assert.equal(a.eyni, -10_000)
  assert.equal(a.yeni, 155_699)
  assert.equal(a.baglanan, -88_000)
  assert.equal(a.xalis, 57_699)
  assert.equal(a.eyni + a.yeni + a.baglanan, a.xalis)
  assert.deepEqual(a.say, { eyni: 2, yeni: 1, baglanan: 1, bos: 1 })
})

test('LFL faizi yalnız EYNİ filiallara baxır — yeni açılan şişirtmir', () => {
  const a = boyumeAyir([
    N('A', 110, 100),          // eyni +10%
    N('B', 1_000_000, 0),      // yeni — faizə girməməlidir
  ])
  assert.equal(a.eyniKecen, 100)
  assert.equal(a.eyniFaiz, 10)
  assert.ok(a.xalis > 1_000_000)   // xalis böyük, LFL isə hələ də %10
})

test('məxrəc sıfırdırsa faiz NULL — sonsuzluq yazılmır', () => {
  const a = boyumeAyir([N('Yeni', 500, 0)])
  assert.equal(a.eyniFaiz, null)
  assert.equal(a.eyniKecen, 0)
  // «−100%» tələsi: yalnız bağlanan filial varsa da faiz uydurmur
  assert.equal(boyumeAyir([N('Masazır', 0, 88_000)]).eyniFaiz, null)
})

test('boş siyahı çökmür', () => {
  const a = boyumeAyir([])
  assert.equal(a.xalis, 0); assert.equal(a.eyniFaiz, null)
})

// ── ZONA ────────────────────────────────────────────────────────────────────

test('Səbail zonası: filial-filial «çöküş», zona cəmi BÖYÜMƏ', () => {
  // Real rəqəmlər (avqust 2026): Səbail 2 −68 343 ₼ (−34,6%), Səbail 3 yeni
  const dest = [
    N('Səbail 2', 129_059, 197_402, 'Səbail'),
    N('Səbail 3', 155_699, 0, 'Səbail'),
  ]
  const [z] = zonayaYig(dest)
  assert.equal(z.zona, 'Səbail')
  assert.equal(z.paylasilan, true)
  assert.deepEqual(z.filiallar, ['Səbail 2', 'Səbail 3'])
  assert.equal(z.kecen, 197_402)
  assert.equal(z.cari, 284_758)
  assert.equal(z.xalis, 87_356)                 // zona BÖYÜYÜB
  assert.equal(z.eyni, -68_343)                 // tək filiala baxan bunu görür
  assert.equal(z.yeni, 155_699)
  assert.ok(z.xalis > 0 && z.eyni < 0, 'zona böyüyür, tək filial çökür — əsas tapıntı')
})

test('zonası olmayan filial TƏK BAŞINA zonadır', () => {
  const z = zonayaYig([N('Nərimanov', 100, 90)])
  assert.equal(z[0].zona, 'Nərimanov')
  assert.equal(z[0].paylasilan, false)
})

test('boş/ağ boşluqlu zona adı filial adına düşür', () => {
  assert.equal(zonayaYig([N('A', 1, 1, '')])[0].zona, 'A')
  assert.equal(zonayaYig([N('A', 1, 1, '   ')])[0].zona, 'A')
  assert.equal(zonayaYig([N('A', 1, 1, null as unknown as string)])[0].zona, 'A')
})

test('zonalar ciroya görə böyükdən kiçiyə sıralanır', () => {
  const z = zonayaYig([N('kiçik', 10, 10), N('böyük', 900, 800)])
  assert.deepEqual(z.map(x => x.zona), ['böyük', 'kiçik'])
})

// ── DÖVRDƏ İŞLƏK ────────────────────────────────────────────────────────────

test('tarix filialın dövrdə işlək olub-olmadığını deyir', () => {
  const avqust = ['2026-08-01', '2026-08-31'] as const
  assert.equal(dovrdeIslek({}, ...avqust), true)                                  // tarix yox → işlək say
  assert.equal(dovrdeIslek({ opened_at: '2026-09-15' }, ...avqust), false)         // hələ açılmayıb
  assert.equal(dovrdeIslek({ opened_at: '2026-08-20' }, ...avqust), true)          // ay içində açılıb
  assert.equal(dovrdeIslek({ closed_at: '2026-07-31' }, ...avqust), false)         // əvvəl bağlanıb
  assert.equal(dovrdeIslek({ closed_at: '2026-08-10' }, ...avqust), true)          // ay içində bağlanıb
  // sərhəd günləri DAXİLDİR — 1 avqustda açılan avqustda işləkdir
  assert.equal(dovrdeIslek({ opened_at: '2026-08-31' }, ...avqust), true)
  assert.equal(dovrdeIslek({ closed_at: '2026-08-01' }, ...avqust), true)
})

test('satışı 0 olan AÇIQ filial gizlənmir — bu fəlakətdir', () => {
  // Tarixə görə işlək, amma satış 0 → «bos» növü, siyahıda qalır
  const islek = dovrdeIslek({ opened_at: '2026-01-01' }, '2026-08-01', '2026-08-31')
  assert.equal(islek, true)
  assert.equal(filialNovu(N('sıfır satan', 0, 0)), 'bos')
})
