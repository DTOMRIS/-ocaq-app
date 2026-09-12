import zlib from 'node:zlib'

// ─── PDF MƏTN QATI ──────────────────────────────────────────────────────────
//
// NƏ EDİR: PDF-in İÇİNDƏKİ MƏTNİ oxuyur. OCR DEYİL — şəkli «oxumağa» çalışmır.
//
// NİYƏ OCR YOX: mimari proyekt PDF-i iki cür olur.
//   ① CAD-dan ixrac edilib → içində əsl mətn qatı var, rəqəmlər dəqiq oxunur
//   ② skan edilib / şəkil kimi yerləşdirilib → içində yalnız piksel var
// ②-də OCR bəzən düz oxuyur, bəzən «24»-ü «21» edir — VƏ SƏHV OXUDUĞUNU HEÇ
// KİM GÖRMÜR. Səhv masa sayı ilə sifariş gedir. Ona görə: mətn qatı varsa
// oxunur, yoxdursa AÇIQ deyilir «bu fayl çizimdir, əl ilə girin».
//
// NİYƏ XARİCİ KİTABXANA YOX: bu iş üçün `zlib` (Node-un öz modulu) kifayətdir.
// Bir asılılıq gətirmək təchizat zənciri riski və build yükü deməkdir.

/** `(mətn) Tj` və `[(a) -20 (b)] TJ` operatorlarından sətirləri çıxarır. */
export function icerikdenMetn(icerik: string): string {
  const parcalar: string[] = []
  // PDF sətri: mötərizədə, `\(` `\)` `\\` qaçışları ilə
  const re = /\((?:\\.|[^\\()])*\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(icerik)) !== null) {
    const xam = m[0].slice(1, -1)
    parcalar.push(xam
      .replace(/\\([nrtbf])/g, (_, c) => ({ n: '\n', r: '\n', t: ' ', b: '', f: '\n' }[c as string] ?? ''))
      .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/\\(.)/g, '$1'))
  }
  // Hex sətirlər: <0041 0042> — CAD ixracında da rast gəlinir
  const hexRe = /<([0-9A-Fa-f\s]{4,})>\s*Tj/g
  while ((m = hexRe.exec(icerik)) !== null) {
    const hex = m[1].replace(/\s/g, '')
    let s = ''
    for (let i = 0; i + 3 < hex.length; i += 4) {
      const kod = parseInt(hex.slice(i, i + 4), 16)
      if (kod >= 32 && kod < 0xfffd) s += String.fromCharCode(kod)
    }
    if (s.trim()) parcalar.push(s)
  }
  return parcalar.join(' ')
}

export type PdfNetice = {
  metn: string
  /** Mətn qatı tapıldımı. `false` → fayl çizimdir/skandır, rəqəm çıxarıla bilməz. */
  metnQatiVar: boolean
  /** Açıla bilən axın sayı — diaqnostika üçün. */
  axin: number
}

/**
 * PDF-dən mətn çıxarır. Heç vaxt istisna atmır — pozuq fayl «mətn yoxdur»
 * kimi qayıdır, çünki bu, istifadəçi üçün eyni cavabdır.
 */
export function pdfMetniCixar(buf: Buffer): PdfNetice {
  const parcalar: string[] = []
  let axin = 0
  const xam = buf.toString('latin1')
  const re = /stream\r?\n?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xam)) !== null) {
    const bas = m.index + m[0].length
    const son = xam.indexOf('endstream', bas)
    if (son < 0) break
    re.lastIndex = son
    const govde = buf.subarray(bas, son)
    if (govde.length === 0) continue
    let icerik: string | null = null
    try {
      // Flate (ən yayılmış). Bəzi yazıcılar son baytı kəsir → `inflateSync`
      // xəta verir, `unzipSync` bəzən keçir; ikisi də sınanır.
      icerik = zlib.inflateSync(govde).toString('latin1')
    } catch {
      try { icerik = zlib.inflateRawSync(govde).toString('latin1') } catch { icerik = null }
    }
    if (icerik == null) {
      // Sıxılmamış məzmun axını ola bilər
      const d = govde.toString('latin1')
      if (/\bTj\b|\bTJ\b/.test(d)) icerik = d
    }
    if (icerik == null) continue
    if (!/\bTj\b|\bTJ\b/.test(icerik)) continue
    axin++
    const t = icerikdenMetn(icerik)
    if (t.trim()) parcalar.push(t)
  }
  const metn = parcalar.join('\n').replace(/[ \t]{2,}/g, ' ').trim()
  return { metn, metnQatiVar: metn.length > 0, axin }
}
