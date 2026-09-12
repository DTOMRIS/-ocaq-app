import assert from 'node:assert/strict'
import test from 'node:test'
import zlib from 'node:zlib'
import { icerikdenMetn, pdfMetniCixar } from '../src/lib/acilis/pdf-metn'
import { olculeriTap, olcuEtiket } from '../src/lib/acilis/olcu-tap'

// ── MƏTN ÇIXARMA ────────────────────────────────────────────────────────────

test('Tj və TJ operatorlarından mətn çıxır', () => {
  assert.equal(icerikdenMetn('BT /F1 12 Tf (Masa sayi: 24) Tj ET'), 'Masa sayi: 24')
  assert.match(icerikdenMetn('[(Teras ) -250 (36 m2)] TJ'), /Teras.*36 m2/)
})

test('qaçış işarələri düzgün açılır', () => {
  assert.equal(icerikdenMetn('(A\\(B\\)C) Tj'), 'A(B)C')
  assert.equal(icerikdenMetn('(sətir1\\nsətir2) Tj'), 'sətir1\nsətir2')
  assert.equal(icerikdenMetn('(\\101\\102) Tj'), 'AB')   // səkkizlik
})

test('mətni olmayan PDF «mətn qatı yoxdur» deyir — uydurmur', () => {
  const r = pdfMetniCixar(Buffer.from('%PDF-1.4\nzibil\n%%EOF'))
  assert.equal(r.metnQatiVar, false)
  assert.equal(r.metn, '')
})

test('pozuq fayl istisna atmır', () => {
  // Açıla bilməyən axın — istifadəçi üçün nəticə eynidir: mətn yoxdur
  const buf = Buffer.concat([Buffer.from('stream\n'), Buffer.from([0x78, 0x9c, 0x00, 0xff]), Buffer.from('\nendstream')])
  assert.doesNotThrow(() => pdfMetniCixar(buf))
  assert.equal(pdfMetniCixar(buf).metnQatiVar, false)
})

test('sıxılmış axından mətn oxunur', () => {
  const icerik = 'BT (Daxili sahe 128 m2) Tj ET'
  const z = zlib.deflateSync(Buffer.from(icerik, 'latin1'))
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n<</Filter/FlateDecode>>\nstream\n'), z, Buffer.from('\nendstream\n%%EOF')])
  const r = pdfMetniCixar(pdf)
  assert.equal(r.metnQatiVar, true)
  assert.match(r.metn, /128 m2/)
})

// ── ÖLÇÜ TAPMA ──────────────────────────────────────────────────────────────

test('rəqəm sözdən ƏVVƏL də, SONRA da tapılır', () => {
  for (const m of ['Zalda 24 masa yerləşdirilir', 'Masa sayı: 24', 'masa sayisi 24']) {
    const t = olculeriTap(m).find(x => x.sahe === 'masa')
    assert.ok(t, m); assert.equal(t.deyer, 24, m)
  }
})

test('AZ hərfləri tələ qurmur (İ/ı/ə)', () => {
  assert.equal(olculeriTap('MASA SAYI: 18')[0]?.deyer, 18)
  assert.equal(olculeriTap('Oturacaq sayı 60').find(t => t.sahe === 'oturacaq')?.deyer, 60)
})

test('banko onluq ayırıcının hər iki formasını qəbul edir', () => {
  assert.equal(olculeriTap('Banko uzunluğu 3,6 m').find(t => t.sahe === 'banko')?.deyer, 3.6)
  assert.equal(olculeriTap('bar length: 3.6 m').find(t => t.sahe === 'banko')?.deyer, 3.6)
})

test('hər təklifin yanında TAPILDIĞI CÜMLƏ var — insan yoxlaya bilsin', () => {
  const t = olculeriTap('Plan qeydi: zalda 24 masa və 60 oturacaq nəzərdə tutulur.')
  assert.ok(t.length >= 2)
  for (const x of t) {
    assert.ok(x.kontekst.length > 0, x.sahe)
    assert.ok(x.kontekst.includes(String(x.deyer)), `${x.sahe}: kontekst rəqəmi göstərmir`)
  }
})

test('eyni sahə üçün iki fərqli rəqəm varsa heç biri «yüksək güvən» deyil', () => {
  const t = olculeriTap('Birinci variant 24 masa, ikinci variant 30 masa')
  const masalar = t.filter(x => x.sahe === 'masa')
  assert.equal(masalar.length, 2)
  for (const m of masalar) assert.equal(m.guven, 'orta', 'qərar insanın olmalıdır')
})

test('ağlabatmaz rəqəm qəbul edilmir', () => {
  assert.equal(olculeriTap('sifariş nömrəsi 9999 masa').filter(t => t.sahe === 'masa').length, 0)
  assert.equal(olculeriTap('0 masa').filter(t => t.sahe === 'masa').length, 0)
})

test('boş mətn boş siyahı verir, çökmür', () => {
  assert.deepEqual(olculeriTap(''), [])
  assert.deepEqual(olculeriTap('   \n  '), [])
})

test('sahə etiketləri insan dilindədir', () => {
  assert.equal(olcuEtiket('masa'), 'Masa sayı')
  assert.equal(olcuEtiket('banko'), 'Banko uzunluğu (m)')
})
