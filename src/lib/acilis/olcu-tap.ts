// ─── PROYEKT MƏTNİNDƏN ÖLÇÜ TAPMA ───────────────────────────────────────────
//
// QAYDA: bu modul heç nə YAZMIR. Yalnız TƏKLİF verir və hər təklifin yanında
// onu tapdığı CÜMLƏNİ qaytarır. İnsan görüb təsdiqləyir.
//
// NİYƏ AVTOMATİK DOLDURULMUR: proyektdə «24 masa» yazısı «24 masa üçün yer»
// da ola bilər, «24 masa ləğv edildi» də. Rəqəmi səssizcə forma yazsaq səhv
// sifariş gedir və heç kim səbəbini tapa bilmir.

export type OlcuTeklifi = {
  sahe: 'masa' | 'oturacaq' | 'banko' | 'm2_ici' | 'm2_teras'
  deyer: number
  /** Rəqəmin tapıldığı cümlə — insan yoxlaya bilsin. */
  kontekst: string
  /** Eyni sahə üçün birdən çox namizəd varsa sıra nömrəsi. */
  guven: 'yuksek' | 'orta'
}

const ETIKET: Record<OlcuTeklifi['sahe'], string> = {
  masa: 'Masa sayı', oturacaq: 'Oturacaq sayı', banko: 'Banko uzunluğu (m)',
  m2_ici: 'Daxili m²', m2_teras: 'Teras m²',
}
export const olcuEtiket = (s: OlcuTeklifi['sahe']) => ETIKET[s]

/** AZ `İ` tələsi + diakritik təmizliyi. */
function fold(v: string): string {
  return v.replace(/[İIı]/g, 'i').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

type Qayda = { sahe: OlcuTeklifi['sahe']; re: RegExp; tam: boolean; max: number }

// Rəqəm SÖZDƏN ƏVVƏL və ya SONRA ola bilər: «24 masa» / «masa: 24» / «masa sayı 24»
const QAYDALAR: Qayda[] = [
  { sahe: 'masa',     re: /(\d{1,3})\s*(?:ə|e)?d?\s*(?:masa|stol|table)\b|(?:masa|stol|table)\s*(?:say[ıi]|sayisi|count|adedi)?\s*[:=]?\s*(\d{1,3})\b/gi, tam: true, max: 500 },
  { sahe: 'oturacaq', re: /(\d{1,4})\s*(?:oturacaq|stul|kresl[oa]|seat|iskemle)\b|(?:oturacaq|stul|seat)\s*(?:say[ıi]|count)?\s*[:=]?\s*(\d{1,4})\b/gi, tam: true, max: 2000 },
  { sahe: 'banko',    re: /(?:banko|bar|tezgah|counter)\s*(?:uzunlu[gğ]u|length|boy)?\s*[:=]?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:m|metr|mt)\b|(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:m|metr)\s*(?:banko|bar|tezgah)\b/gi, tam: false, max: 100 },
  { sahe: 'm2_teras', re: /(?:teras|terrace|balkon)\s*[:=]?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m2|m²|kv\.?m)\b|(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m2|m²)\s*(?:teras|terrace)\b/gi, tam: false, max: 3000 },
  { sahe: 'm2_ici',   re: /(?:daxili|i[çc]|ic[əe]ri|salon|zal|interior|sah[əe])\s*[:=]?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m2|m²|kv\.?m)\b|(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m2|m²)\b/gi, tam: false, max: 5000 },
]

/** Tapılan yerin ətrafından qısa cümlə kəsir. */
function kontekstAl(metn: string, i: number, uzunluq: number): string {
  const bas = Math.max(0, i - 34), son = Math.min(metn.length, i + uzunluq + 34)
  return (bas > 0 ? '…' : '') + metn.slice(bas, son).replace(/\s+/g, ' ').trim() + (son < metn.length ? '…' : '')
}

export function olculeriTap(metn: string): OlcuTeklifi[] {
  if (!metn.trim()) return []
  const fmetn = fold(metn)
  const cixis: OlcuTeklifi[] = []
  const gorulen = new Set<string>()

  for (const q of QAYDALAR) {
    const re = new RegExp(q.re.source, q.re.flags)
    let m: RegExpExecArray | null
    let say = 0
    while ((m = re.exec(fmetn)) !== null) {
      const xam = m[1] ?? m[2]
      if (!xam) continue
      const n = Number(xam.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0 || n > q.max) continue
      const deyer = q.tam ? Math.round(n) : Math.round(n * 100) / 100
      const acar = `${q.sahe}:${deyer}`
      if (gorulen.has(acar)) continue
      gorulen.add(acar)
      say++
      cixis.push({
        sahe: q.sahe, deyer,
        kontekst: kontekstAl(metn, m.index, m[0].length),
        // Bir sahə üçün birdən çox rəqəm tapılıbsa heç biri «yüksək» deyil —
        // insan hansının doğru olduğunu görməlidir.
        guven: say === 1 ? 'yuksek' : 'orta',
      })
      if (say >= 4) break        // 4-dən çox namizəd siyahını faydasız edir
    }
  }
  // Eyni sahə üçün birdən çox varsa hamısının güvəni «orta»ya enir
  const coxlu = new Set(cixis.map(t => t.sahe).filter((s, i, a) => a.indexOf(s) !== i))
  for (const t of cixis) if (coxlu.has(t.sahe)) t.guven = 'orta'
  return cixis
}
