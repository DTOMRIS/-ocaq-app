// ─── Günlük Panel parser'ı (kolon-adı bazlı; hər iki iiko formatını oxuyur) ────
// Satış detayı: filial × gün × ödəniş növü × məbləğ. Sütun SIRASI dəyişə bilər
// (Uçot günü / Ödəniş növü yerdəyişik) — başlıqdan indeks tapılır. Ara-toplam atlanır.

import { normalizeFilial, BRANCH_TO_REGION, EXCLUDE } from './filial-map'

export type DailyResult = {
  period: string | null
  gun: number
  days: string[]
  daily: Record<string, { total: number; wolt: number; bolt: number }>
  branches: Array<{ filial: string; bolge: string | null; total: number; wolt: number; bolt: number }>
  regions: Array<[string, number]>
  pay: { nagd: number; kart: number; wolt: number; bolt: number }
  toplam: number
  gedisat: number
  uyarilar: string[]
}

// "Total/Grand/Cəmi" ara-toplam — AMA "Əcəmi" (filial) yanlış eşleşməsin: cəmi yalnız hərfdən sonra deyilsə
const TOTAL = /total|grand|yekun|ümumi|(?<!\p{L})c[əe]mi/iu
const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n)

// Həm "139.06" (nöqtə decimal), həm "4,304,000" (vergül minlik), həm "44,90" (vergül decimal)
function parseNum(s: unknown): number | null {
  if (typeof s === 'number') return isFinite(s) ? s : null
  let t = String(s ?? '').replace(/[\s    ]/g, '')
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '')      // vergül minlik
  else if (/^-?\d+,\d+$/.test(t)) t = t.replace(',', '.')                   // vergül decimal
  const n = parseFloat(t)
  return isFinite(n) ? n : null
}

export type PlanResult = {
  branches: Record<string, { gedisat: number; plan: number }>
  network: { gedisat: number; plan: number }
}

/** Gedişat/plan raporu ("Plan gerçəkləşmə" sheet: filial | gedişat | plan) → filial planı. */
export function parsePlan(rows: unknown[][]): PlanResult {
  const branches: Record<string, { gedisat: number; plan: number }> = {}
  let net = { gedisat: 0, plan: 0 }
  const hi = rows.findIndex(r => r?.some(c => /^filial$/i.test(String(c ?? '').trim())) && r?.some(c => /^plan$/i.test(String(c ?? '').trim())))
  if (hi < 0) return { branches, network: net }
  const hdr = (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase().trim())
  const iF = hdr.findIndex(h => h === 'filial')
  const iG = hdr.findIndex(h => /gedişa|gedisa/.test(h))
  const iP = hdr.findIndex(h => h === 'plan')
  if (iF < 0 || iG < 0 || iP < 0) return { branches, network: net }
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const f = String(r[iF] ?? '').trim()
    if (!f || TOTAL.test(f)) continue
    const kanon = normalizeFilial(f)
    if (!kanon || EXCLUDE.has(kanon)) continue
    const gedisat = parseNum(r[iG]) ?? 0
    const plan = parseNum(r[iP]) ?? 0
    branches[kanon] = { gedisat, plan }
    net = { gedisat: net.gedisat + gedisat, plan: net.plan + plan }
  }
  return { branches, network: net }
}

function normDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

export type YoyResult = {
  branches: Record<string, { y2025: number; y2026: number }>
  network: { y2025: number; y2026: number }
}

const AY_LIST = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'avgust', 'sentyabr', 'sentabr', 'oktyabr', 'noyabr', 'dekabr']

/** YoY: "filial|2025|2026 gedişat" VEYA "Ticarət müəssisəsi | iyul 2025 | iyul gedişat" → filial YoY. */
export function parseYoy(rows: unknown[][]): YoyResult {
  const branches: Record<string, { y2025: number; y2026: number }> = {}
  let net = { y2025: 0, y2026: 0 }
  const hi = rows.findIndex(r =>
    r?.some(c => /müəssisə|ticarət|filial/i.test(String(c ?? ''))) &&
    r?.some(c => /2025/.test(String(c ?? ''))) &&
    r?.some(c => /gedişa|gedisa/i.test(String(c ?? ''))))
  if (hi < 0) return { branches, network: net }
  const hdr = (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase())
  const iF = hdr.findIndex(h => /müəssisə|ticarət|filial/.test(h))
  const i26 = hdr.findIndex(h => /gedişa|gedisa/.test(h))
  // gedişat sütunun ayı → eyni ayın "<ay> 2025" sütununu seç (yoxsa ilk 2025)
  const gm = i26 >= 0 ? AY_LIST.find(m => hdr[i26].includes(m)) : undefined
  let i25 = hdr.findIndex(h => /2025/.test(h) && !/artım|faiz|%|gerçək/.test(h) && (gm ? h.includes(gm) : true))
  if (i25 < 0) i25 = hdr.findIndex(h => /2025/.test(h) && !/artım|faiz|%|gerçək/.test(h))
  if (iF < 0 || i25 < 0 || i26 < 0) return { branches, network: net }
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const f = String(r[iF] ?? '').trim()
    if (!f || TOTAL.test(f)) continue
    const kanon = normalizeFilial(f)
    if (!kanon || EXCLUDE.has(kanon)) continue
    const y2025 = parseNum(r[i25]) ?? 0
    const y2026 = parseNum(r[i26]) ?? 0
    branches[kanon] = { y2025, y2026 }
    net = { y2025: net.y2025 + y2025, y2026: net.y2026 + y2026 }
  }
  return { branches, network: net }
}

// ─── İl-matrisi (filial × ay) YoY mənbəyi ────────────────────────────────────
// NİYƏ AYRI PARSER: `parseYoy` ay-ortası «gedişat» faylı üçün yazılıb — başlıq
// sətrində eyni anda `ticarət` + `2025` + `gedişat` axtarır. Bağlanmış ayın
// FAKT faylı isə tamam başqa formadadır:
//     Ticarət müəssisəsi | İyul | Avgust | Sentyabr | Oktyabr | Noyabr | Dekabr
// İl yalnız SHEET ADINDA («2025») olur, «gedişat» sözü heç yoxdur → köhnə
// oxucu `hi < 0` qaytarır və YoY sükutla boş qalır (istifadəçi qeydi 06.09.2026:
// «avgusta geçen sene yok»). Bu funksiya həmin formanı oxuyur. Əlavə-yalnız:
// `parseYoy` toxunulmayıb, gedişat faylı gələndə hələ də o işləyir.

export type YearMatrix = {
  year: number | null
  /** kanonik filial → ay nömrəsi (1–12) → məbləğ */
  branches: Record<string, Record<number, number>>
}

// «Avgust» (g) və «Avqust» (q) hər ikisi işlənir — iiko və Excel faylları qarışıq
// yazır. Eyni şəkildə sentyabr/sentabr.
const AY_NO: Array<[string, number]> = [
  ['yanvar', 1], ['fevral', 2], ['mart', 3], ['aprel', 4], ['may', 5],
  ['iyun', 6], ['iyul', 7], ['avqust', 8], ['avgust', 8],
  ['sentyabr', 9], ['sentabr', 9], ['oktyabr', 10], ['noyabr', 11], ['dekabr', 12],
]
// Uzun token əvvəl yoxlanır ki qısa ad uzununun içinə düşməsin.
const AY_NO_SORTED = [...AY_NO].sort((a, b) => b[0].length - a[0].length)

// Ay sütunu OLMAYAN başlıqlar: plan/fərq/faiz/cəmi sütunları fakt deyil.
const NOT_FACT = /plan|f[əe]rq|faiz|%|art[ıi]m|gedişa|gedisa|total|c[əe]mi|proqnoz/i

// AZƏRBAYCAN 'İ' TƏLƏSİ — `filial-map.ts`-dəki ilə eyni səbəb:
//   'İyul'.toLowerCase() === 'i' + U+0307 (birləşən nöqtə) → 'iyul' DEYİL.
// Sadə toLowerCase() ilə «İyul» və «İyun» sütunları sükutla itirdi (ilk qaçırılan
// bu idi: avqust oxundu, iyul 0 qaldı). Ona görə İ/I/ı əvvəlcə 'i'-yə yığılır,
// sonra NFD ilə birləşən nöqtələr atılır.
function foldHdr(v: unknown): string {
  return String(v ?? '')
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function ayNo(h: string): number | null {
  for (const [tok, no] of AY_NO_SORTED) if (h.includes(tok)) return no
  return null
}

/**
 * Bağlanmış ilin fakt matrisini oxuyur (filial × ay).
 * İl sırası: başlıq xanasındakı 4 rəqəm > sheet adı > ilk sətirlərdəki 4 rəqəm.
 */
export function parseYearMatrix(rows: unknown[][], sheetName = ''): YearMatrix {
  const branches: Record<string, Record<number, number>> = {}
  const hi = rows.findIndex(r => {
    if (!r?.some(c => /müəssisə|ticarət|filial/i.test(String(c ?? '')))) return false
    const ays = r.filter(c => {
      const h = foldHdr(c)
      return !!h && !NOT_FACT.test(h) && ayNo(h) != null
    })
    return ays.length >= 2                      // ən azı iki ay sütunu → matris
  })
  if (hi < 0) return { year: null, branches }

  const hdr = (rows[hi] ?? []).map(foldHdr)
  const iF = hdr.findIndex(h => /m[üu][əe]ssis[əe]|ticar[əe]t|filial/.test(h))
  if (iF < 0) return { year: null, branches }

  // İl: başlıqdakı > sheet adındakı > ilk 6 sətirdəki
  const fromHdr = hdr.map(h => h.match(/\b(20\d{2})\b/)?.[1]).find(Boolean)
  const fromSheet = String(sheetName).match(/\b(20\d{2})\b/)?.[1]
  const fromTop = rows.slice(0, 6).map(r => (r ?? []).join(' ')).join(' ').match(/\b(20\d{2})\b/)?.[1]
  const year = Number(fromHdr ?? fromSheet ?? fromTop) || null
  if (!year) return { year: null, branches }

  // Ay sütunları: başlıqda il varsa matris ili ilə eyni olmalıdır (plan sütunu qarışmasın)
  const cols: Array<[number, number]> = []
  hdr.forEach((h, i) => {
    if (!h || i === iF || NOT_FACT.test(h)) return
    const m = ayNo(h)
    if (m == null) return
    const hy = h.match(/\b(20\d{2})\b/)?.[1]
    if (hy && Number(hy) !== year) return
    cols.push([i, m])
  })
  if (!cols.length) return { year: null, branches }

  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const f = String(r[iF] ?? '').trim()
    if (!f || TOTAL.test(f)) continue
    const kanon = normalizeFilial(f)
    if (!kanon || EXCLUDE.has(kanon)) continue      // CLOSED QALIR: keçən ilin cirosu lazımdır
    const row: Record<number, number> = branches[kanon] ?? {}
    for (const [ci, m] of cols) {
      const v = parseNum(r[ci])
      if (v != null && v !== 0) row[m] = v
    }
    if (Object.keys(row).length) branches[kanon] = row
  }
  return { year, branches }
}

/** Eyni ilin bir neçə vərəqi (məs. «plan sen-dek» + «2025») birləşdirilir. */
export function mergeYearMatrix(a: YearMatrix | null, b: YearMatrix): YearMatrix {
  if (!a || !a.year) return b
  if (!b.year || b.year !== a.year) return a
  const branches: Record<string, Record<number, number>> = { ...a.branches }
  for (const [f, months] of Object.entries(b.branches)) {
    branches[f] = { ...months, ...(branches[f] ?? {}) }      // mövcud dəyər üstün
  }
  return { year: a.year, branches }
}

/**
 * İl-matrisi + cari ayın faktı → YoY.
 * `period` «2026-08» formatında; matrisdən (2025, avqust) sütunu götürülür.
 * Bağlanmış filial y2026=0, yeni filial y2025=0 ilə görünür — dörd sətirlik
 * kırılım (şəbəkə / eyni filial / yeni / bağlanan) sonra bunun üstünə qurulacaq.
 */
export function yoyFromYearMatrix(
  matrix: YearMatrix | null,
  period: string | null,
  current: Array<{ filial: string; total: number }>,
): YoyResult | null {
  if (!matrix?.year || !period) return null
  const [ys, ms] = period.split('-')
  const y = Number(ys), m = Number(ms)
  if (!y || !m || matrix.year >= y) return null       // matris keçmiş il olmalıdır

  const cur: Record<string, number> = {}
  for (const b of current) {
    const k = normalizeFilial(b.filial)
    if (k) cur[k] = (cur[k] ?? 0) + b.total
  }
  const names = new Set([...Object.keys(matrix.branches), ...Object.keys(cur)])
  const branches: Record<string, { y2025: number; y2026: number }> = {}
  let net = { y2025: 0, y2026: 0 }
  for (const f of names) {
    const y2025 = matrix.branches[f]?.[m] ?? 0
    const y2026 = cur[f] ?? 0
    if (!y2025 && !y2026) continue
    branches[f] = { y2025, y2026 }
    net = { y2025: net.y2025 + y2025, y2026: net.y2026 + y2026 }
  }
  return Object.keys(branches).length ? { branches, network: net } : null
}

export function parseDaily(rows: unknown[][]): DailyResult {
  const uyarilar: string[] = []
  const daily: DailyResult['daily'] = {}
  const branch: Record<string, { bolge: string | null; total: number; wolt: number; bolt: number }> = {}
  const pay = { nagd: 0, kart: 0, wolt: 0, bolt: 0 }

  const hi = rows.findIndex(r => r?.some(c => /uçot/i.test(String(c ?? ''))))
  if (hi < 0) { uyarilar.push('Uçot günü başlıqlı sətir tapılmadı (ham satış detayı gözlənilir).'); return empty(uyarilar) }
  const hdr = (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase())
  let iF = hdr.findIndex(h => /müəssisə|ticarət|filial/.test(h)); if (iF < 0) iF = 0
  const iD = hdr.findIndex(h => /uçot|tarix/.test(h))
  const iT = hdr.findIndex(h => /ödəniş|növ/.test(h))
  let iA = hdr.findIndex(h => /endirimli|məbləğ|məbləg/.test(h)); if (iA < 0) iA = 3
  if (iD < 0 || iT < 0) { uyarilar.push('Ödəniş növü / Uçot günü sütunları tapılmadı.'); return empty(uyarilar) }

  let cf = '', cg: string | null = null, ct = ''
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const rawD = String(r[iD] ?? '').trim()
    const rawT = String(r[iT] ?? '').trim()
    // ara-toplam sətri (Total/Cəmi — istənilən sütunda: tarix və ya ödəniş): atla, forward-fill'i pozma
    if (TOTAL.test(rawD) || TOTAL.test(rawT)) continue
    const rf = String(r[iF] ?? '').trim(); if (rf) cf = rf
    const nd = normDate(rawD); if (nd) cg = nd
    if (rawT) ct = rawT.toLowerCase()
    if (!ct || !cf || !cg || TOTAL.test(cf)) continue
    const kanon = normalizeFilial(cf)
    if (!kanon || EXCLUDE.has(kanon)) continue
    const val = parseNum(r[iA])
    if (val == null) continue
    const ch = ct.includes('wolt') ? 'wolt' : ct.includes('bolt') ? 'bolt' : null
    const d = daily[cg] ?? (daily[cg] = { total: 0, wolt: 0, bolt: 0 })
    d.total += val
    const b = branch[kanon] ?? (branch[kanon] = { bolge: BRANCH_TO_REGION[kanon] ?? null, total: 0, wolt: 0, bolt: 0 })
    b.total += val
    if (ch) { d[ch] += val; b[ch] += val; pay[ch] += val }
    else if (/nağd|nagd|nəğd/.test(ct)) pay.nagd += val
    else if (/kart|bank|kapital|pos|visa|master/.test(ct)) pay.kart += val
  }

  const days = Object.keys(daily).sort()
  const toplam = days.reduce((s, d) => s + daily[d].total, 0)
  const gun = days.length || 1
  const period = days.length ? days[0].slice(0, 7) : null
  // Ayın gerçək gün sayı (31 sabiti deyil) — proqnoz düzgün olsun
  const daysInMonth = period ? new Date(+period.slice(0, 4), +period.slice(5, 7), 0).getDate() : 31
  const region: Record<string, number> = {}
  for (const b of Object.values(branch)) region[b.bolge ?? '?'] = (region[b.bolge ?? '?'] ?? 0) + b.total
  return {
    period,
    gun, days, daily,
    branches: Object.entries(branch).map(([filial, v]) => ({ filial, ...v })).sort((a, b) => b.total - a.total),
    regions: Object.entries(region).sort((a, b) => b[1] - a[1]),
    pay,
    toplam: Math.round(toplam),
    gedisat: Math.round(toplam / gun * daysInMonth),
    uyarilar,
  }
}

function empty(uyarilar: string[]): DailyResult {
  return { period: null, gun: 0, days: [], daily: {}, branches: [], regions: [], pay: { nagd: 0, kart: 0, wolt: 0, bolt: 0 }, toplam: 0, gedisat: 0, uyarilar }
}

// ─── Gün-sütunlu format (Müqayisə cədvəli): Filial | 01.08.2026 | 02.08.2026 | ... ──
// Hər tarix sütunu bir gün → günlük qrafik. Ödəniş breakdown-u yoxdur (pay=0).
export function parseDailyWide(rows: unknown[][]): DailyResult {
  const uyarilar: string[] = []
  const hi = rows.findIndex(r => r?.some(c => /müəssisə|ticarət|filial/i.test(String(c ?? ''))) && r?.some(c => /^\d{2}\.\d{2}\.\d{4}$/.test(String(c ?? '').trim())))
  if (hi < 0) { uyarilar.push('Gün-sütunlu başlıq tapılmadı.'); return empty(uyarilar) }
  const hdr = rows[hi] ?? []
  let iF = hdr.findIndex(c => /müəssisə|ticarət|filial/i.test(String(c ?? ''))); if (iF < 0) iF = 0
  const dateCols: { col: number; date: string }[] = []
  hdr.forEach((c, col) => { const s = String(c ?? '').trim(); if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) { const nd = normDate(s); if (nd) dateCols.push({ col, date: nd }) } })
  if (!dateCols.length) { uyarilar.push('Tarix sütunu tapılmadı.'); return empty(uyarilar) }

  const daily: DailyResult['daily'] = {}
  const branch: Record<string, { bolge: string | null; total: number; wolt: number; bolt: number }> = {}
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const f = String(r[iF] ?? '').trim()
    if (!f) continue
    // İ-normalize (İ→i): "CƏMİ" böyük İ ilə TOTAL-a tutsun. İlk CƏMİ filial blokunu bitirir (altdakı ödəniş cədvəlini sayma).
    if (TOTAL.test(f.normalize('NFD').replace(/[̀-ͯ]/g, ''))) break
    const kanon = normalizeFilial(f)
    if (!kanon || EXCLUDE.has(kanon)) continue
    const b = branch[kanon] ?? (branch[kanon] = { bolge: BRANCH_TO_REGION[kanon] ?? null, total: 0, wolt: 0, bolt: 0 })
    for (const dc of dateCols) {
      const v = parseNum(r[dc.col]); if (v == null) continue
      const d = daily[dc.date] ?? (daily[dc.date] = { total: 0, wolt: 0, bolt: 0 })
      d.total += v; b.total += v
    }
  }

  const days = Object.keys(daily).sort()
  const toplam = days.reduce((s, d) => s + daily[d].total, 0)
  const gun = days.length || 1
  const period = days.length ? days[0].slice(0, 7) : null
  const daysInMonth = period ? new Date(+period.slice(0, 4), +period.slice(5, 7), 0).getDate() : 31
  const region: Record<string, number> = {}
  for (const b of Object.values(branch)) region[b.bolge ?? '?'] = (region[b.bolge ?? '?'] ?? 0) + b.total
  return {
    period, gun, days, daily,
    branches: Object.entries(branch).map(([filial, v]) => ({ filial, ...v })).sort((a, b) => b.total - a.total),
    regions: Object.entries(region).sort((a, b) => b[1] - a[1]),
    pay: { nagd: 0, kart: 0, wolt: 0, bolt: 0 },
    toplam: Math.round(toplam),
    gedisat: Math.round(toplam / gun * daysInMonth),
    uyarilar,
  }
}

// ─── OLAP Hesabat formatı: filial × ödəniş növü AYLIQ toplam (Uçot günü YOX) ───
// Başlıq: Ticarət müəssisəsi | Ödəniş növü | Endirimli məbləğ, m. Total
// Filial adı yalnız qrupun 1-ci sətrində (birləşmiş xana → sonrakılar null); "X Total" ara-toplam.
// Günlük breakdown yoxdur → days=[], daily={}; filial toplamı + ödəniş qarışığı + bölgə + proqnoz verir.
export function parseOlap(rows: unknown[][]): DailyResult {
  const uyarilar: string[] = []
  const branch: Record<string, { bolge: string | null; total: number; wolt: number; bolt: number }> = {}
  const pay = { nagd: 0, kart: 0, wolt: 0, bolt: 0 }

  const hi = rows.findIndex(r => r?.some(c => /müəssisə|ticarət/i.test(String(c ?? ''))) && r?.some(c => /ödəniş|ödeniş|növ/i.test(String(c ?? ''))))
  if (hi < 0) { uyarilar.push('OLAP başlığı (Ticarət müəssisəsi + Ödəniş növü) tapılmadı.'); return empty(uyarilar) }
  const hdr = (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase())
  let iF = hdr.findIndex(h => /müəssisə|ticarət|filial/.test(h)); if (iF < 0) iF = 0
  const iT = hdr.findIndex(h => /ödəniş|ödeniş|növ/.test(h))
  let iA = hdr.findIndex(h => /məbləğ|məbləg|total|endirimli/.test(h)); if (iA < 0) iA = iT + 1
  if (iT < 0) { uyarilar.push('Ödəniş növü sütunu tapılmadı.'); return empty(uyarilar) }

  // Dövr: "Dövrün: əvvəli 01.07.2026 sonu 31.07.2026" → period + gün sayı
  let period: string | null = null, periodDays = 0, daysInMonth = 31
  for (let i = 0; i < Math.min(hi, rows.length); i++) {
    const s = (rows[i] ?? []).map(c => String(c ?? '')).join(' ')
    const m = s.match(/(\d{2})\.(\d{2})\.(\d{4}).*?(\d{2})\.(\d{2})\.(\d{4})/)
    if (m) { period = `${m[3]}-${m[2]}`; periodDays = +m[4] - +m[1] + 1; daysInMonth = new Date(+m[6], +m[5], 0).getDate(); break }
  }

  let cf = ''
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const rf = String(r[iF] ?? '').trim()
    if (TOTAL.test(rf)) continue            // "X Total" / "Grand Total" — cf-ə toxunma
    if (rf) cf = rf
    const rt = String(r[iT] ?? '').trim().toLowerCase()
    if (!cf || !rt || TOTAL.test(cf)) continue
    const kanon = normalizeFilial(cf)
    if (!kanon || EXCLUDE.has(kanon)) continue
    const val = parseNum(r[iA]); if (val == null) continue
    const b = branch[kanon] ?? (branch[kanon] = { bolge: BRANCH_TO_REGION[kanon] ?? null, total: 0, wolt: 0, bolt: 0 })
    b.total += val
    if (/wolt|storefront/.test(rt)) { b.wolt += val; pay.wolt += val }
    else if (/bolt/.test(rt)) { b.bolt += val; pay.bolt += val }
    else if (/nağd|nagd|nəğd/.test(rt)) pay.nagd += val
    else if (/kart|bank|kapital|uni|atb|pasha|pos|pax|verifone|visa|master/.test(rt)) pay.kart += val
  }

  const toplam = Object.values(branch).reduce((s, b) => s + b.total, 0)
  if (!Object.keys(branch).length) { uyarilar.push('OLAP: filial tapılmadı.'); return empty(uyarilar) }
  const region: Record<string, number> = {}
  for (const b of Object.values(branch)) region[b.bolge ?? '?'] = (region[b.bolge ?? '?'] ?? 0) + b.total
  const gun = periodDays || daysInMonth
  return {
    period, gun, days: [], daily: {},
    branches: Object.entries(branch).map(([filial, v]) => ({ filial, ...v })).sort((a, b) => b.total - a.total),
    regions: Object.entries(region).sort((a, b) => b[1] - a[1]),
    pay,
    toplam: Math.round(toplam),
    gedisat: Math.round(gun ? toplam / gun * daysInMonth : toplam),   // dövr tam aysa = toplam
    uyarilar,
  }
}
