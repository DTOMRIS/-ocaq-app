import assert from 'node:assert/strict'
import test from 'node:test'
import { ACILIS_SABLON, sertUygun, vezifeYarat, STOK_STANDART, STOK_OLCULU,
         type AcilisProfil } from '../src/lib/acilis/template'

const KUCE: AcilisProfil = { format: 'kuce', teras: true, bagca: true, oturma: true,
  pizza: true, catdirilma: true, qaz: false, generator: true }
const MALL: AcilisProfil = { format: 'mall', teras: false, bagca: false, oturma: false,
  pizza: false, catdirilma: true, qaz: false, generator: false }

test('şablon bütöv və hər sətri qapıya bağlıdır', () => {
  assert.ok(ACILIS_SABLON.length >= 180, `${ACILIS_SABLON.length} vəzifə`)
  for (const s of ACILIS_SABLON) {
    assert.match(s.gate, /^G[0-6]$/, s.task)
    assert.ok(s.dept.length > 1, s.task)
    assert.ok(s.task.length > 3)
    if (s.offset != null) assert.equal(s.gate, 'G6', `geri sayım yalnız G6: ${s.task}`)
  }
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
    'Barda ƏL YUMA yeri (lavabo) proyektə salınır',
    'Arxa giriş qapısına pəncərə + milçək toru (sineklik)',
    'Milçək üçün ultraviole cihazı (içəri)',
    'UPS cihazları (kassa + POS + soyuducu)',
    'Qəhvə filtr sistemi',
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
