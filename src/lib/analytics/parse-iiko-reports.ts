import { azFold, excelSerialToISO, normalizePayment, classifyLine } from './parse-sales-detail'
import { normalizeFilial, EXCLUDE } from './filial-map'

/**
 * iiko-nun İNGİLİS dilli standart hesabatları (istifadəçi özü endirir).
 *
 * 22.08.2026-dan etibarən üç hesabat birbaşa endirilir — analitika şöbəsindən
 * asılılıq bitdi:
 *   1. «Satış-filiallar üzrə»          → filial × ödəniş növü + ÇEK SAYI (`Bills`)
 *   2. «Satiş Hesabati Mehsullar Uzre» → filial × məhsul + ƏDƏD (`Number of items`)
 *   3. «Silinme hesabati»              → silinən sətirlər (kasa nəzarəti)
 *
 * ÜÇ ORTAQ TƏLƏ (hər üç faylda var):
 *
 * a) BAŞLIQLAR İNGİLİSCƏDİR (`Store`, `Item`, `Bills`…) — mövcud parser-lər
 *    Azərbaycan başlıqlarına görə yazılıb, ona görə bu ayrı modul.
 *
 * b) QRUP HÜCRƏLƏRİ BOŞDUR (pivot deseni): `Store` yalnız qrupun İLK sətrində
 *    yazılıb. Forward-fill edilməsə sətirlərin böyük hissəsi filialsız qalır.
 *
 * c) ARA CƏM SƏTİRLƏRİ İÇƏRİDƏDİR (`5 Mərtəbə Total`, `Cash payment Total`…).
 *    Süzülməsə ciro ikiqat-üçqat sayılır. Ayırd etmə: qrup sütununun dəyəri
 *    « Total» ilə bitir. DİQQƏT — son sütunun ADI da «… m. Total» ilə bitir,
 *    o BAŞLIQDIR, sətir deyil.
 *
 * ⚠️ GÜN MƏSƏLƏSİ: «Filial» və «Məhsul» hesabatlarında SƏTİR SƏVİYYƏSİNDƏ TARİX
 * YOXDUR — yalnız başlıqda dövr var (`Period: from 8/1/2026 to 8/31/2026`).
 * Ona görə həmin fayllar YALNIZ TƏK GÜNLÜK endirildikdə günlük cədvələ yazıla
 * bilər (`from === to` → o günün tarixi). Çox günlük fayl oxunur və dövr
 * səviyyəsində analiz üçün istifadə oluna bilər, lakin günlük fakt cədvəlinə
 * YAZILMIR — yazılsaydı hansı günə aid olduğu uydurulardı.
 * «Silinme» hesabatında isə `Accounting day` VAR — o, həmişə günlükdür.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Ortaq köməkçilər
// ─────────────────────────────────────────────────────────────────────────────

const num = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const t = String(v ?? '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

// ─────────────────────────────────────────────────────────────────────────────
// SÜTUN LÜĞƏTİ — TƏK HƏQİQƏT MƏNBƏYİ (AZ · EN · TR)
//
// 🔴 NİYƏ MƏRKƏZLƏŞDİRİLDİ: eyni sütun naxışları 5 yerə (parseHourlySales,
// parseProductDaily, parseDeletions, detectReportKind, explainUnrecognized)
// ƏL İLƏ KOPYALANMIŞDI. Nəticə: bir yerə dil əlavə edəndə digərləri geridə
// qalırdı və fayl «tanınmadı» olurdu. Artıq hamısı BURADAN oxuyur — yeni dil
// əlavə etmək bir sətirdir.
//
// 🔴 25.08.2026 HADİSƏSİ: iiko interfeys dili TÜRKÇE-yə keçdi və BÜTÜN
// hesabatlar oxunmaz oldu («Faylda tapılanlar: heç biri»). Quruluş eynidir,
// yalnız sözlər dəyişib:
//   Şube · Ödeme türü · Muhasebe günü · Kapanış saati · Ürün · Ürün miktarı ·
//   Brüt Satışlar (indirim sonrası) · Müşteri sayısı · Toplam · Genel Toplam
//
// ⚠️ ƏN TƏHLÜKƏLİSİ «Toplam» İDİ: ara cəm süzgəci yalnız «Total» axtarırdı.
// Türkçe faylda ara cəm sətirləri VERİ SAYILARDI və ciro İKİQAT çıxardı —
// AZ faylında bir dəfə yaşadığımız hadisənin eynisi. Ona görə ara cəm
// naxışları da bu lüğətdədir.
//
// ⚠️ NAXIŞLAR `azFold`-DAN SONRAKI MƏTNƏ YAZILIR. `azFold` ı/İ/I/i → «i»
// çevirir və kiçildir, DİGƏR diakritiklərə (ş ğ ü ö ç ə) TOXUNMUR:
//   «Kapanış saati» → `kapaniş saati`      (ı→i, ş qalır)
//   «Ürün miktarı»  → `ürün miktari`
//   «Müşteri sayısı»→ `müşteri sayisi`
//   «Ürünle birlikte satıldı» → `ürünle birlikte satildi`
// Bu qaydanı unutmaq sütunu «yoxdur» edir (iki dəfə oldu: `satılıb`, `sayı`).
// `[şs]` yazılan yerlərdə ASCII-yə düşmüş variant da qəbul olunur.
const V = {
  /** Filial sütunu — DƏQİQ uyğunluq (başqa sütun adının içinə düşməsin). */
  store: /^(ticarət müəssisəsi|store|[şs]ube)$/,
  payType: /(ödəniş növü|payment type|ödeme türü)/,
  hour: /(bağlama saat|closing (hour|time)|kapani[şs] saat)/,
  /**
   * PUL SÜTUNU (endirimdən SONRAKI məbləğ).
   * TR-də «Brüt Satışlar (indirim sonrası), m.» — faylda bir dənədir.
   * «İndirim öncesi ortalama satış fiyatı» ORTA QİYMƏTDİR və bu naxışa
   * uyğun gəlmir (`brüt sati[şs]lar` yoxdur) — qarışma riski yoxdur.
   */
  money: /(endirimli məbləğ|gross sales|brüt sati[şs]lar)/,
  guests: /(qonaqlar|^guests$|mü[şs]teri sayisi)/,
  day: /(uçot günü|accounting day|muhasebe günü)/,
  /** Məhsul sütunu — DƏQİQ uyğunluq: «Ürün» ≠ «Ürün miktarı». */
  item: /^(məhsul|item|ürün)$/,
  qty: /(məhsullarin sayi|number of items|ürün miktari)/,
  /** Saatdan DƏRİN pivot səviyyəsi (qonaq sayını təkrarlayan sütun). */
  soldWith: /(məhsul ilə satilib|sold with|ürünle birlikte satildi)/,
  // Silinmə hesabatı. ⚠️ TR variantları HƏLƏ REAL FAYLLA DOĞRULANMADI —
  // türkçe silinmə faylı əlimizə çatmadı. Səhv olsalar SESSİZ YANLIŞ DEYİL:
  // hesabat sadəcə tanınmır və istifadəçiyə açıq səbəb yazılır.
  delReason: /(item deleted$|silinmə səbəbi|ürün silindi$|silme nedeni)/,
  receipt: /(receipt no|qəbzin nömrəsi|fi[şs] no|çek numarasi)/,
  comment: /(item deletion comment|comment|silme yorumu|yorum)/,
} as const

/**
 * ARA CƏM / YEKUN SÖZLƏRİ — dilə görə dəyişir, bir yerdə saxlanılır.
 *   AZ/EN: `Total`, `Grand Total`
 *   TR:    `Toplam`, `Genel Toplam`
 */
const TOTAL_WORD = /total|toplam/i
/** Sətrin sonundaki ara cəm sözü — hücrədən təmizləmək üçün. */
const TRAILING_TOTAL = /\s*(total|toplam)$/i
/** Pivotun yekun sətri — cəmə ƏLAVƏ EDİLMİR, nəzarət rəqəmi kimi saxlanılır. */
const GRAND_TOTAL = /^(grand total|genel toplam)$/i

/** Sətir ara cəmdirmi? Qrup dəyəri « Total»/« Toplam» ilə bitirsə — bəli. */
const isSubtotal = (v: unknown): boolean => {
  const s = String(v ?? '').trim()
  return s.length > 6 && /\s(total|toplam)$/i.test(s)
}

/**
 * Qrup sütunundakı ARA CƏM hücrəsi — `isSubtotal`-dan DAHA GENİŞ.
 *
 * `isSubtotal` başlıq sətrini qorumaq üçün `length > 6` şərti qoyur, ona görə
 * çılpaq « Total» (baş boşluqla, uzunluq 6) ONUN üçün ara cəm SAYILMIR.
 * Saatlıq pivotda isə məhz belə sətir var (`| | | Total | | 41.6 |`) və o,
 * yuxarıdakı sətirlərin cəmidir — süzülməsə ciro İKİQAT sayılır.
 *
 * Bu funksiya YALNIZ başlıqdan sonrakı qrup sütunlarına tətbiq olunur, ona görə
 * başlıq adı ilə qarışma riski yoxdur.
 */
const isGroupTotalCell = (v: unknown): boolean => {
  const s = String(v ?? '').trim()
  return s.length > 0 && /^(total|toplam)$|\s(total|toplam)$/i.test(s)
}

/** Başlıq sətrini tapır: bütün tələb olunan naxışlar eyni sətirdə olmalıdır. */
function findHeader(rows: unknown[][], required: RegExp[], limit = 30): { row: number; idx: number[] } | null {
  for (let r = 0; r < Math.min(rows.length, limit); r++) {
    const cells = (rows[r] ?? []).map(c => azFold(c))
    const idx = required.map(re => cells.findIndex(c => re.test(c)))
    if (idx.every(i => i >= 0)) return { row: r, idx }
  }
  return null
}

function optIndex(rows: unknown[][], headerRow: number, patterns: RegExp[]): number {
  const cells = (rows[headerRow] ?? []).map(c => azFold(c))
  for (const re of patterns) {
    const i = cells.findIndex(c => re.test(c))
    if (i >= 0) return i
  }
  return -1
}

export type ReportPeriod = {
  from: string | null      // 'YYYY-MM-DD'
  to: string | null
  /** `from === to` → bütün sətirlər həmin günə aiddir, günlük yazıla bilər. */
  singleDay: string | null
  /** Dövrün əhatə etdiyi gün sayı (bilinmirsə null). */
  days: number | null
  raw: string | null
}

/**
 * Başlıqdan dövrü oxuyur.
 * Formatlar: `Period: from 8/1/2026 to 8/31/2026` (İngilis, AY/GÜN/İL)
 *            `Dövrün: əvvəli 01.08.2026 sonu 10.08.2026` (Azərbaycan, GÜN.AY.İL)
 */
export function parsePeriodHeader(rows: unknown[][], limit = 8): ReportPeriod {
  const empty: ReportPeriod = { from: null, to: null, singleDay: null, days: null, raw: null }
  for (let r = 0; r < Math.min(rows.length, limit); r++) {
    for (const cell of rows[r] ?? []) {
      const s = String(cell ?? '')
      if (!/period|dövr/i.test(s)) continue

      // Azərbaycan: gün.ay.il — `excelSerialToISO` bu formatı onsuz da oxuyur.
      const az = s.match(/əvvəli\s*(\d{1,2}\.\d{1,2}\.\d{4}).*?sonu\s*(\d{1,2}\.\d{1,2}\.\d{4})/i)
      if (az) return build(excelSerialToISO(az[1]), excelSerialToISO(az[2]), s)

      // İngilis: M/D/YYYY. Birinci hissə > 12 olarsa gün-əvvəl kimi oxunur.
      const en = s.match(/from\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)
      if (en) return build(usDate(en[1]), usDate(en[2]), s)
    }
  }
  return empty

  function build(from: string | null, to: string | null, raw: string): ReportPeriod {
    let days: number | null = null
    if (from && to) {
      const ms = Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')
      days = Number.isFinite(ms) ? Math.round(ms / 86400000) + 1 : null
    }
    return { from, to, singleDay: from && to && from === to ? from : null, days, raw }
  }
}

/** `M/D/YYYY` → ISO. Birinci hissə > 12 olarsa GÜN/AY kimi qəbul edilir. */
function usDate(s: string): string | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const a = +m[1], b = +m[2], y = +m[3]
  const [mo, d] = a > 12 ? [b, a] : [a, b]
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. «Satış-filiallar üzrə» — filial × ödəniş növü + ÇEK SAYI
// ─────────────────────────────────────────────────────────────────────────────

export type BranchPayRow = {
  filial: string
  payGroup: string          // Bank cards / Cash payment / Non-cash payment
  payType: string           // Kapital Bank / BOLT SATIŞ Bank / …
  gross: number             // endirimdən əvvəl
  net: number               // endirimdən sonra
  bills: number             // ÇEK SAYI
}

export type BranchReport = {
  period: ReportPeriod
  rows: BranchPayRow[]
  totals: { gross: number; net: number; bills: number; discount: number; avgCheck: number | null }
  byBranch: Array<{ filial: string; net: number; bills: number; avgCheck: number | null }>
  byGroup: Array<{ group: string; net: number; share: number }>
  skippedSubtotals: number
  warnings: string[]
}

export function parseBranchSales(rows: unknown[][]): BranchReport {
  const period = parsePeriodHeader(rows)
  const warnings: string[] = []
  const h = findHeader(rows, [V.store, /payment group/, V.payType, /gross sales.*after discount|brüt sati[şs]lar.*indirim sonrasi/, /^bills$|fi[şs] sayisi/])
  if (!h) {
    return {
      period, rows: [], skippedSubtotals: 0,
      totals: { gross: 0, net: 0, bills: 0, discount: 0, avgCheck: null },
      byBranch: [], byGroup: [],
      warnings: ['Filial hesabatı başlıqları tapılmadı (Store / Payment group / Payment type / Gross Sales (after discount) / Bills gözlənilir)'],
    }
  }
  const [cStore, cGroup, cType, cNet, cBills] = h.idx
  const cGross = optIndex(rows, h.row, [/gross sales.*before discount/])

  let fStore = '', fGroup = ''
  const out: BranchPayRow[] = []
  let skipped = 0, excluded = 0
  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (isSubtotal(row[cStore]) || isSubtotal(row[cGroup]) || isSubtotal(row[cType])) { skipped++; continue }
    if (row[cStore]) fStore = String(row[cStore]).trim()
    if (row[cGroup]) fGroup = String(row[cGroup]).trim()
    const payType = String(row[cType] ?? '').trim()
    if (!payType || !fStore) continue

    const filial = normalizeFilial(fStore) ?? fStore
    if (EXCLUDE.has(filial)) { excluded++; continue }
    const net = num(row[cNet])
    out.push({
      filial, payGroup: fGroup, payType,
      gross: cGross >= 0 ? num(row[cGross]) : net,
      net, bills: num(row[cBills]),
    })
  }

  const gross = out.reduce((s, x) => s + x.gross, 0)
  const net = out.reduce((s, x) => s + x.net, 0)
  const bills = out.reduce((s, x) => s + x.bills, 0)

  const bm = new Map<string, { net: number; bills: number }>()
  for (const x of out) {
    const e = bm.get(x.filial) ?? { net: 0, bills: 0 }
    e.net += x.net; e.bills += x.bills
    bm.set(x.filial, e)
  }
  const byBranch = [...bm.entries()]
    .map(([filial, v]) => ({ filial, net: v.net, bills: v.bills, avgCheck: v.bills > 0 ? v.net / v.bills : null }))
    .sort((a, b) => b.net - a.net)

  const gm = new Map<string, number>()
  for (const x of out) gm.set(x.payGroup, (gm.get(x.payGroup) ?? 0) + x.net)
  const byGroup = [...gm.entries()]
    .map(([group, v]) => ({ group, net: v, share: net > 0 ? v / net : 0 }))
    .sort((a, b) => b.net - a.net)

  if (!out.length) warnings.push('Heç bir sətir oxunmadı')
  if (excluded) warnings.push(`${excluded} sətir EXCLUDE filialına aiddir`)
  // ÇEK SAYI QEYDİ: bir qəbz bir neçə ödəniş növü ilə ödənə bilər; belə halda
  // `Bills` hər növdə sayılır və cəm UNİKAL çek sayından bir qədər YUXARI olur.
  // Bunu gizlətmirik — filial səviyyəsində fərq kiçikdir, lakin bilinməlidir.
  if (bills > 0) warnings.push('«Bills» ödəniş növü səviyyəsində sayılır — bir qəbz iki növlə ödənibsə iki dəfə sayıla bilər (unikal çek sayından bir qədər yuxarı).')

  return {
    period, rows: out, skippedSubtotals: skipped,
    totals: { gross, net, bills, discount: gross - net, avgCheck: bills > 0 ? net / bills : null },
    byBranch, byGroup, warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. «Satiş Hesabati Mehsullar Uzre» — filial × məhsul + ƏDƏD
// ─────────────────────────────────────────────────────────────────────────────

export type ProductRow = { filial: string; item: string; qty: number; amount: number }

export type ProductReport = {
  period: ReportPeriod
  rows: ProductRow[]
  totals: { qty: number; amount: number; items: number; branches: number }
  /** Şəbəkə səviyyəsində məhsul cəmi (menyu analizi üçün). */
  byItem: Array<{ item: string; qty: number; amount: number; branches: number; avgPrice: number | null }>
  skippedSubtotals: number
  warnings: string[]
}

export function parseProductSales(rows: unknown[][]): ProductReport {
  const period = parsePeriodHeader(rows)
  const warnings: string[] = []
  // `Number of items` başlığında BOM ola bilər — `azFold` təmizləyir.
  const h = findHeader(rows, [V.store, V.item, V.qty, V.money])
  if (!h) {
    return {
      period, rows: [], skippedSubtotals: 0,
      totals: { qty: 0, amount: 0, items: 0, branches: 0 }, byItem: [],
      warnings: ['Məhsul hesabatı başlıqları tapılmadı (Store / Item / Number of items / Gross Sales gözlənilir)'],
    }
  }
  const [cStore, cItem, cQty, cAmt] = h.idx

  let fStore = ''
  const out: ProductRow[] = []
  let skipped = 0, excluded = 0
  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (isSubtotal(row[cStore]) || isSubtotal(row[cItem])) { skipped++; continue }
    if (row[cStore]) fStore = String(row[cStore]).trim()
    const item = String(row[cItem] ?? '').trim()
    if (!item || !fStore) continue
    const filial = normalizeFilial(fStore) ?? fStore
    if (EXCLUDE.has(filial)) { excluded++; continue }
    out.push({ filial, item, qty: num(row[cQty]), amount: num(row[cAmt]) })
  }

  const im = new Map<string, { qty: number; amount: number; br: Set<string> }>()
  for (const x of out) {
    const e = im.get(x.item) ?? { qty: 0, amount: 0, br: new Set<string>() }
    e.qty += x.qty; e.amount += x.amount; e.br.add(x.filial)
    im.set(x.item, e)
  }
  const byItem = [...im.entries()]
    .map(([item, v]) => ({
      item, qty: v.qty, amount: v.amount, branches: v.br.size,
      avgPrice: v.qty > 0 ? v.amount / v.qty : null,
    }))
    .sort((a, b) => b.amount - a.amount)

  if (!out.length) warnings.push('Heç bir sətir oxunmadı')
  if (excluded) warnings.push(`${excluded} sətir EXCLUDE filialına aiddir`)

  return {
    period, rows: out, skippedSubtotals: skipped,
    totals: {
      qty: out.reduce((s, x) => s + x.qty, 0),
      amount: out.reduce((s, x) => s + x.amount, 0),
      items: im.size,
      branches: new Set(out.map(x => x.filial)).size,
    },
    byItem, warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. «Silinme hesabati» — KASA NƏZARƏTİ
// ─────────────────────────────────────────────────────────────────────────────

export type DeletionRow = {
  date: string
  filial: string
  reason: string           // Item deleted without write-off / … and written off
  comment: string
  receipt: string
  item: string
  amount: number
  /** Anbardan da silinibmi (yoxsa yalnız hesabdan çıxarılıb)? */
  writtenOff: boolean
}

export type DeletionReport = {
  period: ReportPeriod
  rows: DeletionRow[]
  totals: { amount: number; count: number; receipts: number; days: number; branches: number }
  byBranch: Array<{ filial: string; amount: number; count: number }>
  byReason: Array<{ reason: string; amount: number; count: number }>
  /**
   * BÖYÜK TƏK SİLİNMƏLƏR — 22.08.2026 datasında bunlar ANOMALİYADIR, oğurluq
   * deyil: «PİZZA SALAMİ 1 ədəd = 20 079,90 ₼» kimi girişlər. Silinmə burada
   * DÜZƏLİŞDİR. Ayrıca göstərilir ki filial faizini şişirtməsin — Amay-ın
   * «%76 silinmə»si əslində 2 səhv girişdən ibarət idi; onlarsız %1,95.
   */
  outliers: DeletionRow[]
  /** Şərh yazılmayan silinmələrin payı — nəzarət boşluğu göstəricisi. */
  noCommentPct: number
  warnings: string[]
}

/** Bu məbləğdən böyük TƏK silinmə anomaliya sayılır (səhv giriş ehtimalı). */
export const DELETION_OUTLIER_MIN = 200

export function parseDeletions(rows: unknown[][], outlierMin = DELETION_OUTLIER_MIN): DeletionReport {
  const period = parsePeriodHeader(rows)
  const warnings: string[] = []
  const h = findHeader(rows, [V.day, V.store, V.delReason, V.receipt, V.item, V.money])
  if (!h) {
    return {
      period, rows: [], outliers: [], noCommentPct: 0,
      totals: { amount: 0, count: 0, receipts: 0, days: 0, branches: 0 },
      byBranch: [], byReason: [],
      warnings: ['Silinmə hesabatı başlıqları tapılmadı (Accounting day / Store / Item deleted / Receipt No. / Item / Gross Sales gözlənilir)'],
    }
  }
  const [cDay, cStore, cReason, cRcpt, cItem, cAmt] = h.idx
  const cComment = optIndex(rows, h.row, [V.comment])

  let fDay = '', fStore = '', fReason = '', fRcpt = '', fComment = ''
  const out: DeletionRow[] = []
  let skipped = 0, badDate = 0
  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (isSubtotal(row[cStore]) || isSubtotal(row[cReason]) || isSubtotal(row[cItem]) || isSubtotal(row[cDay])) { skipped++; continue }
    if (row[cDay]) fDay = String(row[cDay]).trim()
    if (row[cStore]) fStore = String(row[cStore]).trim()
    if (row[cReason]) fReason = String(row[cReason]).trim()
    if (row[cRcpt]) fRcpt = String(row[cRcpt]).trim()
    if (cComment >= 0 && row[cComment]) fComment = String(row[cComment]).trim()
    const item = String(row[cItem] ?? '').trim()
    if (!item || !fStore) continue
    const date = excelSerialToISO(fDay)
    if (!date) { badDate++; continue }
    const filial = normalizeFilial(fStore) ?? fStore
    if (EXCLUDE.has(filial)) continue
    out.push({
      date, filial, reason: fReason,
      comment: cComment >= 0 && row[cComment] ? String(row[cComment]).trim() : '',
      receipt: fRcpt, item, amount: num(row[cAmt]),
      writtenOff: /written off/i.test(fReason) && !/without/i.test(fReason),
    })
  }

  const bm = new Map<string, { amount: number; count: number }>()
  const rm = new Map<string, { amount: number; count: number }>()
  for (const x of out) {
    const b = bm.get(x.filial) ?? { amount: 0, count: 0 }
    b.amount += x.amount; b.count++; bm.set(x.filial, b)
    const rr = rm.get(x.reason) ?? { amount: 0, count: 0 }
    rr.amount += x.amount; rr.count++; rm.set(x.reason, rr)
  }

  const withComment = out.filter(x => x.comment).length
  if (badDate) warnings.push(`${badDate} sətrin tarixi oxunmadı`)
  if (!out.length) warnings.push('Heç bir sətir oxunmadı')

  return {
    period, rows: out,
    totals: {
      amount: out.reduce((s, x) => s + x.amount, 0),
      count: out.length,
      receipts: new Set(out.map(x => x.receipt)).size,
      days: new Set(out.map(x => x.date)).size,
      branches: bm.size,
    },
    byBranch: [...bm.entries()].map(([filial, v]) => ({ filial, ...v })).sort((a, b) => b.amount - a.amount),
    byReason: [...rm.entries()].map(([reason, v]) => ({ reason, ...v })).sort((a, b) => b.amount - a.amount),
    outliers: out.filter(x => x.amount >= outlierMin).sort((a, b) => b.amount - a.amount),
    noCommentPct: out.length ? 1 - withComment / out.length : 0,
    warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SAATLIQ PİVOT — «Doğan Tomris Rapor» (filial × ödəniş növü × SAAT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * iiko-da bizim üçün qurulan xüsusi OLAP hesabatı. Başlıqlar AZƏRBAYCANCA,
 * quruluş 4 səviyyəli pivotdur:
 *
 *   Ticarət müəssisəsi → Ödəniş növü → Bağlama saatı → Məhsul ilə satılıb
 *
 * NƏ VERİR (başqa heç bir faylda yoxdur): **SAATLIQ ciro**, filial və ödəniş
 * növü kəsiyində. 24 saatın hamısı var.
 *
 * ÜÇ TƏLƏ — hər biri real faylda yoxlanıb (203 293 sətir, 01–21.08.2026):
 *
 * a) ÇILPAQ « Total» SƏTRİ. Məhsul sütununda adı olmayan, sadəcə « Total»
 *    yazan sətir var və o, yuxarıdakı sətirlərin CƏMİDİR. `isSubtotal`
 *    onu tutmur (uzunluq 6) → `isGroupTotalCell` yazıldı. Süzülməsə ciro
 *    təxminən iki dəfə şişir.
 *
 * b) MƏBLƏĞ ƏSASƏN MƏHSULSUZ SƏTİRDƏDİR, LAKİN HAMISI YOX. Adi məhsul
 *    sətirlərində `Endirimli məbləğ` = 0, çünki o səviyyə səbət (basket)
 *    ölçüsüdür. AMMA kombo məhsullarda («BOLT Special Combo 3» kimi) məbləğ
 *    məhsul sətrindədir — real faylda 286 sətir, 8 759,70 ₼. Ona görə ciro
 *    BÜTÜN yarpaq sətirlərinin cəmidir; «məhsulsuz sətirləri götür» yanaşması
 *    8 759,70 ₼ itirərdi.
 *
 * c) MƏHSUL ƏDƏDİ ETİBARSIZDIR. `Məhsulların sayı` burada ölçü (dimension)
 *    kimi işlənib — «qəbzdə neçə ədəd vardı» — say (measure) deyil. Cəmlənsə
 *    yanlış nəticə verir (şəbəkənin ən çox satılan məhsulu 21 gündə guya
 *    3 188 ədəd = filial başına günə 5 ədəd). Ona görə bu parser ƏDƏD
 *    QAYTARMIR. Ədəd üçün «Satiş Hesabati Mehsullar Uzre» faylı istifadə
 *    olunur (`parseProductSales`).
 *
 * ⚠️ GÜN MƏSƏLƏSİ (ƏSAS MƏHDUDİYYƏT): faylda `Uçot günü` sütunu YOXDUR.
 * 21 günün hamısı tək rəqəmə yığılıb. Günlük fakt cədvəlinə yazmaq üçün ya
 * hesabata `Uçot günü` səviyyəsi əlavə olunmalı, ya da fayl TƏK GÜNLÜK
 * endirilməlidir (`Dövrün: əvvəli 21.08.2026 sonu 21.08.2026`). Hər ikisi
 * dəstəklənir; heç biri yoxdursa `canWriteDaily = false` qaytarılır və gün
 * UYDURULMUR.
 */

export type HourlySalesRow = {
  /** `Uçot günü` sütunundan, yoxdursa tək günlük dövrdən. Bilinmirsə null. */
  date: string | null
  filial: string
  payType: string
  /** 0–23. */
  hour: number
  net: number
  guests: number
}

export type HourlySalesReport = {
  period: ReportPeriod
  rows: HourlySalesRow[]
  totals: { net: number; guests: number; branches: number; hours: number; days: number }
  byBranch: Array<{ filial: string; net: number; guests: number; avgPerGuest: number | null }>
  byPayType: Array<{ payType: string; net: number; guests: number; share: number }>
  /** 24 element, saat 0-dan 23-ə — boş saatlar da 0 ilə. */
  byHour: Array<{ hour: number; net: number; guests: number; share: number }>
  /** Faylda `Uçot günü` sütunu vardımı? */
  hasDayColumn: boolean
  /** Günlük fakt cədvəlinə yazıla bilərmi (gün UYDURULMADAN)? */
  canWriteDaily: boolean
  /** Pivotun öz «Grand Total» sətri — nəzarət üçün (tapılmasa null). */
  grandTotal: number | null
  skippedSubtotals: number
  warnings: string[]
}

const EMPTY_HOURLY: Omit<HourlySalesReport, 'period' | 'warnings'> = {
  rows: [], totals: { net: 0, guests: 0, branches: 0, hours: 0, days: 0 },
  byBranch: [], byPayType: [], byHour: [],
  hasDayColumn: false, canWriteDaily: false, grandTotal: null, skippedSubtotals: 0,
}

/** '00' / '7' / 7 / '07:00' → 0–23, tanınmasa null. */
function parseHour(v: unknown): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 && v <= 23 ? v : null
  const s = String(v ?? '').trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2})(?::\d{2})?$/)
  if (!m) return null
  const h = Number(m[1])
  return h >= 0 && h <= 23 ? h : null
}

export function parseHourlySales(rows: unknown[][]): HourlySalesReport {
  const period = parsePeriodHeader(rows)
  const warnings: string[] = []

  // Başlıqlar Azərbaycanca; İngilis variantı da qəbul olunur ki hesabat dili
  // dəyişsə parser sınmasın. `azFold` ı→i çevirdiyi üçün `saatı`→`saati`.
  const h = findHeader(rows, [V.store, V.payType, V.hour, V.money])
  if (!h) {
    return {
      period, ...EMPTY_HOURLY,
      warnings: ['Saatlıq hesabatın başlıqları tapılmadı (Ticarət müəssisəsi / Ödəniş növü / Bağlama saatı / Endirimli məbləğ — TR: Şube / Ödeme türü / Kapanış saati / Brüt Satışlar gözlənilir)'],
    }
  }
  const [cStore, cPay, cHour, cNet] = h.idx
  // DİQQƏT: naxışlar `azFold`-dan SONRAKI mətnə uyğun yazılmalıdır — `azFold`
  // ı/İ/I hərflərini «i»-yə çevirir, ona görə `satılıb` → `satilib`,
  // `sayı` → `sayi`. Bunu unutmaq sütunu «tapılmadı» edir (bir dəfə oldu:
  // məhsul sütunu tapılmayınca « Total» sətirləri süzülmədi və ciro İKİQAT
  // çıxdı — «Grand Total» nəzarəti tutdu).
  const cGuests = optIndex(rows, h.row, [V.guests])
  const cDay = optIndex(rows, h.row, [V.day])
  const cItem = optIndex(rows, h.row, [V.soldWith])

  // Ölçü (qrup) sütunları — ölçmə sütunundan SOLDA olanların hamısı.
  // Ara cəm yoxlaması hamısına tətbiq olunur ki, başlığı tanınmayan bir qrup
  // səviyyəsi əlavə olunsa belə cəm sətirləri yenə süzülsün.
  const groupCols: number[] = []
  for (let c = 0; c < cNet; c++) groupCols.push(c)
  for (const c of [cStore, cPay, cHour, cItem]) if (c > cNet) groupCols.push(c)

  const hasDayColumn = cDay >= 0
  if (cGuests < 0) warnings.push('«Qonaqların sayı» sütunu yoxdur — orta çek hesablanmır')

  // Gün: sütun varsa oradan, yoxsa dövr tək günlükdürsə ondan. Başqa halda YOX.
  if (!hasDayColumn && !period.singleDay) {
    warnings.push(
      period.days && period.days > 1
        ? `Faylda «Uçot günü» sütunu yoxdur və dövr ${period.days} gündür — sətirlər hansı günə aid olduğu bilinmir, GÜNLÜK cədvələ YAZILMIR. Həll: hesabata «Uçot günü» səviyyəsi əlavə et, ya da faylı tək günlük endir.`
        : 'Faylda «Uçot günü» sütunu yoxdur və başlıqdan dövr oxunmadı — gün bilinmir, GÜNLÜK cədvələ YAZILMIR.',
    )
  }

  let fDay = '', fStore = '', fPay = ''
  // Saat da pivot qrupudur — yalnız qrupun ilk sətrində yazılır. Yuxarı
  // səviyyə (gün/filial/ödəniş növü) dəyişəndə SIFIRLANIR ki köhnə saat
  // yeni qrupa sızmasın.
  let lastHour: number | null = null
  const leaf = new Map<string, HourlySalesRow>()      // yarpaq sətirlərdən yığılan
  const sub = new Map<string, HourlySalesRow>()       // pivotun «NN Total» sətirləri
  let skipped = 0, excluded = 0, badHour = 0, grandTotal: number | null = null

  const put = (m: Map<string, HourlySalesRow>, x: HourlySalesRow) => {
    const k = `${x.date ?? ''}|${x.filial}|${x.payType}|${x.hour}`
    const e = m.get(k)
    if (e) { e.net += x.net; e.guests += x.guests }
    else m.set(k, { ...x })
  }

  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? []

    // «Grand Total» sətri — nəzarət rəqəmi kimi saxlanılır, cəmə əlavə edilmir.
    if (GRAND_TOTAL.test(String(row[cStore] ?? '').trim())) {
      grandTotal = num(row[cNet])
      skipped++
      continue
    }

    const totalCols = groupCols.filter(c => isGroupTotalCell(row[c]))

    // SAAT ARA CƏMİ («00 Total») — atılmır, AYRICA yığılır.
    // Səbəb: `Qonaqların sayı` yarpaq səviyyəsində TƏKRARLANIR (eyni qonaq
    // hər məhsul sətrində yenidən sayılır) — real faylda cəm 557 515 çıxır,
    // faylın öz «Grand Total»-ı isə 129 130. Pivotun öz ara cəmi düzgün
    // (unikal) sayır, ona görə ölçü rəqəmləri oradan götürülür.
    if (totalCols.length === 1 && totalCols[0] === cHour) {
      const hv = parseHour(String(row[cHour]).trim().replace(TRAILING_TOTAL, ''))
      if (hv !== null && fStore && fPay) {
        const filial = normalizeFilial(fStore) ?? fStore
        if (!EXCLUDE.has(filial)) {
          put(sub, {
            date: hasDayColumn ? excelSerialToISO(fDay) : period.singleDay,
            filial, payType: fPay, hour: hv,
            net: num(row[cNet]), guests: cGuests >= 0 ? num(row[cGuests]) : 0,
          })
        }
      }
      skipped++
      continue
    }

    // Digər ara cəmlər (filial / ödəniş növü / məhsul / çılpaq « Total») atılır.
    if (totalCols.length) { skipped++; continue }

    if (hasDayColumn && row[cDay]) { fDay = String(row[cDay]).trim(); lastHour = null }
    if (row[cStore]) { fStore = String(row[cStore]).trim(); lastHour = null }
    if (row[cPay]) { fPay = String(row[cPay]).trim(); lastHour = null }

    const hv = parseHour(row[cHour])
    if (hv !== null) lastHour = hv
    else if (row[cHour] != null && String(row[cHour]).trim()) badHour++

    if (lastHour === null || !fStore || !fPay) continue

    const filial = normalizeFilial(fStore) ?? fStore
    if (EXCLUDE.has(filial)) { excluded++; continue }

    const net = num(row[cNet])
    const guests = cGuests >= 0 ? num(row[cGuests]) : 0
    if (net === 0 && guests === 0) continue   // boş məhsul sətri — məlumat daşımır

    // Yarpaq sətirləri: məbləğ ƏSASƏN məhsulsuz sətirdədir, kombolarda isə
    // məhsul sətrindədir — hər ikisi yığılır (tələ «b»).
    put(leaf, {
      date: hasDayColumn ? excelSerialToISO(fDay) : period.singleDay,
      filial, payType: fPay, hour: lastHour, net, guests,
    })
  }

  // Pivotun ara cəmləri varsa ONLAR əsasdır (qonaq sayı yalnız orada düzgündür).
  //
  // 🔴 25.08.2026 — ARA CƏMİ OLMAYAN QRUPLAR SƏSSİZCƏ İTİRDİ.
  // iiko pivotu ALTINDA TƏK SƏTİR OLAN qrupa «Toplam» sətri YAZMIR. Əvvəl kod
  // `sub` dolu olan kimi `leaf`-i BÜTÜNLÜKLƏ ATIRDI → belə qruplar yoxa çıxırdı.
  // Ölçüldü (24.08.2026, türkçe «Rapor Total»): 3 qrup, 2,60 ₼ itmişdi
  // (117 983,17 ↔ faylın «Genel Toplam»-ı 117 985,77). Faiz kiçik olduğu üçün
  // %0,5-lik xəbərdarlıq həddinə də düşmürdü — yəni TAMAMİLƏ GÖRÜNMƏZ idi.
  //
  // İndi BİRLƏŞDİRİLİR: ara cəm varsa ondan, YOXDURSA yarpaqdan.
  // Təkrar sayım riski yoxdur — açar eynidir (`date|filial|payType|hour`), ona
  // görə yalnız `sub`-da OLMAYAN açarlar əlavə olunur. Tək sətirli qrupda
  // yarpaq onsuz da təkrarsızdır, qonaq sayı da düzgündür.
  const usedSubtotals = sub.size > 0
  const filled: HourlySalesRow[] = []
  if (usedSubtotals) {
    for (const [k, v] of leaf) if (!sub.has(k)) filled.push(v)
  }
  const merged = usedSubtotals ? [...sub.values(), ...filled] : [...leaf.values()]
  // TƏKRAR SAYIM YALNIZ SAATDAN DAHA DƏRİN SƏVİYYƏ VARSA OLUR.
  //
  // «Doğan Tomris Rapor»-da ən dərin səviyyə `Məhsul ilə satılıb` idi → eyni
  // qonaq hər məhsul sətrində yenidən sayılırdı (557 515 ↔ düzgünü 129 130),
  // ona görə ölçü rəqəmləri ara cəmdən götürülməli idi.
  //
  // «Satış ay və gün» hesabatında isə ən dərin səviyyə SAATDIR: hər
  // filial × ödəniş × gün × saat kombinasiyası TƏK sətirdir → təkrar YOXDUR,
  // yarpaqdan toplamaq DÜZGÜNDÜR. Ölçüldü: 01–21.08 üzrə 124 968 qonaq ↔
  // «Bills» 123 720 = **%1,01** fərq (filial üzrə −%1,90…+%3,33).
  //
  // Ona görə xəbərdarlıq YALNIZ dərin sütun (`cItem`) varsa verilir. Əvvəl
  // şərtsiz verilirdi və düzgün faylda da «rəqəm şişikdir» yazırdı — yalan idi.
  if (!usedSubtotals && cGuests >= 0 && leaf.size && cItem >= 0) {
    warnings.push('Pivotun saat ara cəm sətirləri («00 Total») tapılmadı, lakin saatdan dərin sütun («Məhsul…») var — qonaq sayı yarpaqdan yığıldığı üçün TƏKRAR SAYIMLA ŞİŞİKDİR. Ciro düzgündür. Hesabatı ara cəmlərlə endirin, ya da məhsul sütununu çıxarın.')
  }

  const net = merged.reduce((s, x) => s + x.net, 0)
  const guests = merged.reduce((s, x) => s + x.guests, 0)

  const bm = new Map<string, { net: number; guests: number }>()
  const pm = new Map<string, { net: number; guests: number }>()
  const hm = new Map<number, { net: number; guests: number }>()
  for (const x of merged) {
    const b = bm.get(x.filial) ?? { net: 0, guests: 0 }
    b.net += x.net; b.guests += x.guests; bm.set(x.filial, b)
    const p = pm.get(x.payType) ?? { net: 0, guests: 0 }
    p.net += x.net; p.guests += x.guests; pm.set(x.payType, p)
    const hh = hm.get(x.hour) ?? { net: 0, guests: 0 }
    hh.net += x.net; hh.guests += x.guests; hm.set(x.hour, hh)
  }

  if (!merged.length) warnings.push('Heç bir sətir oxunmadı')
  if (excluded) warnings.push(`${excluded} sətir EXCLUDE filialına aiddir`)
  if (badHour) warnings.push(`${badHour} sətrin «Bağlama saatı» dəyəri oxunmadı`)
  if (cItem >= 0) {
    warnings.push('Bu hesabatdakı «Məhsulların sayı» ölçü (dimension) kimi qurulub, say kimi deyil — məhsul ƏDƏDİ buradan OXUNMUR, «Satiş Hesabati Mehsullar Uzre» faylından götürülür.')
  }
  // ÇEK SAYISI ƏVƏZİNƏ QONAQ SAYI — ÖLÇÜLDÜ, İSTİFADƏ OLUNA BİLƏR.
  // 01–21.08 real data ilə «Satış-filiallar üzrə» hesabatının `Bills` sütununa
  // qarşı yoxlanıldı: 124 968 ↔ 123 720 = **%1,01** fərq (Nərimanov hər iki
  // tərəfdən çıxarılmaqla). Filial səviyyəsində sapma −%1,90…+%3,33.
  // Yəni gündəlik idarəetmə üçün çek sayı kimi işlədilə bilər; ayrıca `Bills`
  // hesabatı İSTƏMƏYƏ EHTİYAC YOXDUR. Fərqin səbəbi qorunur (bir qəbzdə iki
  // qonaq, ya da qəbzin iki saata/ödəniş növünə düşməsi), amma böyüdülmür.
  if (cGuests >= 0) {
    warnings.push('«Qonaqların sayı» çek sayının yaxın qarşılığıdır — real data ilə ölçüldü: «Bills»-dən cəmi %1,01 yuxarı (filial üzrə −%1,90…+%3,33). Ortalama çek bu fərq daxilində doğrudur.')
  }
  // İKİ MÜSTƏQİL YOL BİR-BİRİNİ YOXLAYIR: ara cəmlərdən gələn ciro ilə
  // yarpaq sətirlərdən gələn ciro üst-üstə düşməlidir.
  if (usedSubtotals && leaf.size) {
    const leafNet = [...leaf.values()].reduce((s, x) => s + x.net, 0)
    const d = Math.abs(net - leafNet) / Math.max(Math.abs(net), 1)
    if (d > 0.005) {
      warnings.push(`⚠ Ara cəmlərdən gələn ciro (${net.toFixed(2)} ₼) ilə sətirlərdən yığılan ciro (${leafNet.toFixed(2)} ₼) %${(d * 100).toFixed(2)} fərqlidir — fayl quruluşu gözlənildiyi kimi deyil.`)
    }
  }
  // Ara cəmi olmayan qruplar yarpaqdan tamamlandı. Normal haldır (tək sətirli
  // qrup), ona görə hər yükləmədə xəbərdarlıq VERİLMİR — yoxsa xəbərdarlıqlar
  // fon səsinə çevrilir. Yalnız pay BÖYÜKSƏ (faylın quruluşu gözlənildiyi kimi
  // deyil) deyilir.
  if (filled.length) {
    const filledNet = filled.reduce((s, x) => s + x.net, 0)
    if (net > 0 && filledNet / net > 0.01) {
      warnings.push(`${filled.length} saat qrupunda pivotun «Toplam» sətri yoxdur, məbləğ sətirlərdən yığıldı (${filledNet.toFixed(2)} ₼ = cəmin %${(filledNet / net * 100).toFixed(1)}-i). Pay böyükdür — hesabatın ara cəmlərlə endirildiyini yoxlayın.`)
    }
  }
  if (grandTotal !== null && grandTotal !== 0) {
    const diff = Math.abs(net - grandTotal) / Math.abs(grandTotal)
    if (diff > 0.005) {
      warnings.push(`⚠ Oxunan cəm (${net.toFixed(2)} ₼) faylın öz «Grand Total» sətrindən (${grandTotal.toFixed(2)} ₼) %${(diff * 100).toFixed(2)} fərqlidir — ara cəm süzgəci və ya sütun uyğunluğu yoxlanmalıdır.`)
    }
  }

  const dates = new Set(merged.map(x => x.date).filter(Boolean) as string[])

  return {
    period,
    rows: merged,
    totals: { net, guests, branches: bm.size, hours: hm.size, days: dates.size },
    byBranch: [...bm.entries()]
      .map(([filial, v]) => ({ filial, ...v, avgPerGuest: v.guests > 0 ? v.net / v.guests : null }))
      .sort((a, b) => b.net - a.net),
    byPayType: [...pm.entries()]
      .map(([payType, v]) => ({ payType, ...v, share: net > 0 ? v.net / net : 0 }))
      .sort((a, b) => b.net - a.net),
    byHour: Array.from({ length: 24 }, (_, hour) => {
      const v = hm.get(hour) ?? { net: 0, guests: 0 }
      return { hour, ...v, share: net > 0 ? v.net / net : 0 }
    }),
    hasDayColumn,
    canWriteDaily: merged.length > 0 && merged.every(x => x.date !== null),
    grandTotal,
    skippedSubtotals: skipped,
    warnings,
  }
}

/**
 * Silinmə / ciro nisbəti — kasa nəzarətinin ƏSAS göstəricisi.
 *
 * ⚠️ ANOMALİYA AYRILIR: böyük tək silinmələr (səhv giriş) faizi şişirdir.
 * Real nümunə (avqust 2026): Amay xam %76,38 → anomaliyasız **%1,95**.
 * Hər iki rəqəm qaytarılır ki qərar düzgün verilsin.
 */
export function deletionRatio(
  del: DeletionReport,
  revenueByBranch: Map<string, number>,
  outlierMin = DELETION_OUTLIER_MIN,
): Array<{
  filial: string; deleted: number; deletedClean: number; revenue: number
  pct: number | null; pctClean: number | null; outlierAmount: number; count: number
}> {
  const clean = new Map<string, number>()
  const outlier = new Map<string, number>()
  for (const x of del.rows) {
    const target = x.amount >= outlierMin ? outlier : clean
    target.set(x.filial, (target.get(x.filial) ?? 0) + x.amount)
  }
  return del.byBranch.map(b => {
    const rev = revenueByBranch.get(b.filial) ?? 0
    const cl = clean.get(b.filial) ?? 0
    return {
      filial: b.filial,
      deleted: b.amount,
      deletedClean: cl,
      revenue: rev,
      pct: rev > 0 ? b.amount / rev : null,
      pctClean: rev > 0 ? cl / rev : null,
      outlierAmount: outlier.get(b.filial) ?? 0,
      count: b.count,
    }
  }).sort((a, b) => (b.pctClean ?? -1) - (a.pctClean ?? -1))
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SAATLIQ SƏTİRLƏR → GÜNLÜK FAKT (mövcud `analytics_daily_fact` formatı)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `parseHourlySales` nəticəsini MÖVCUD günlük fakt formatına çevirir.
 *
 * NİYƏ: «Satış ay və gün» hesabatında `Uçot günü` VAR, yəni bu tək fayl həm
 * saatlıq cədvəli, həm də dashboard/analitika-nın oxuduğu `analytics_daily_fact`
 * cədvəlini doldura bilər. Ayrı PRODMIX/ÇEK faylına ehtiyac qalmır.
 *
 * İKİ NÖV SƏTİR ÇIXIR (mövcud sxemin qaydası — `fact-save/route.ts`):
 *   1. Ödəniş növü sətirləri — `payment_type` = nagd/kart/wolt/bolt/…
 *      Yalnız MƏBLƏĞ daşıyır.
 *   2. `__day__` sentinel sətri — günün CƏMİ + ÇEK SAYI.
 *      Çek sayı ödəniş növlərinə BÖLÜNMÜR: bir qəbz həm nağd həm kart ola
 *      bilər, paylasaq müştəri sayı şişər. Ona görə gün başına BİR dəfə.
 *
 * ⚠️ ÇEK SAYI = `Qonaqların sayı`. Real data ilə ölçüldü: «Bills» sütununa
 * qarşı %1,01 fərq (filial üzrə −%1,90…+%3,33). Dəqiq çek deyil, lakin
 * gündəlik idarəetmə üçün etibarlıdır — və başqa mənbə tələb etmir.
 *
 * ⚠️ TANINMAYAN ÖDƏNİŞ NÖVÜ UDULMUR: `normalizePayment` null qaytarsa məbləğ
 * ATILMIR — `unmapped` siyahısına yazılır və `__day__` cəmində QALIR, yəni
 * günün cirosu tam olur. Səssiz itki olmaz.
 */
export type DailyFactRow = {
  filial: string
  date: string
  payment_type: string
  amount: number
  receipts?: number | null
}

export function hourlyToDailyFacts(rows: HourlySalesRow[]): {
  rows: DailyFactRow[]
  unmapped: Array<{ payType: string; amount: number }>
  days: string[]
  totals: { amount: number; receipts: number }
} {
  // (filial|gün) → { kind → məbləğ, cəm, qonaq }
  const byDay = new Map<string, {
    filial: string; date: string
    kinds: Map<string, number>
    total: number; guests: number
  }>()
  const unmappedM = new Map<string, number>()

  for (const r of rows) {
    if (!r.date) continue          // günü bilinməyən sətir günlük cədvələ getmir
    const k = `${r.filial}|${r.date}`
    let e = byDay.get(k)
    if (!e) { e = { filial: r.filial, date: r.date, kinds: new Map(), total: 0, guests: 0 }; byDay.set(k, e) }
    e.total += r.net
    e.guests += r.guests
    const kind = normalizePayment(r.payType)
    if (kind) e.kinds.set(kind, (e.kinds.get(kind) ?? 0) + r.net)
    else unmappedM.set(r.payType, (unmappedM.get(r.payType) ?? 0) + r.net)
  }

  const out: DailyFactRow[] = []
  for (const e of byDay.values()) {
    for (const [kind, amount] of e.kinds) {
      if (amount === 0) continue
      out.push({ filial: e.filial, date: e.date, payment_type: kind, amount: round2(amount) })
    }
    // Gün cəmi + çek sayı — HƏMİŞƏ yazılır (ödəniş növü tanınmasa belə cəm tam).
    out.push({
      filial: e.filial, date: e.date, payment_type: '__day__',
      amount: round2(e.total),
      receipts: Math.round(e.guests),
    })
  }

  return {
    rows: out,
    unmapped: [...unmappedM.entries()]
      .map(([payType, amount]) => ({ payType, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    days: [...new Set(out.map(r => r.date))].sort(),
    totals: {
      amount: round2(out.filter(r => r.payment_type === '__day__').reduce((s, r) => s + r.amount, 0)),
      receipts: out.filter(r => r.payment_type === '__day__').reduce((s, r) => s + (r.receipts ?? 0), 0),
    },
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. «DT Məhsul sayı və qiyməti» — MƏHSUL × GÜN (menyu analizi)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quruluş: `Ticarət müəssisəsi | Məhsul | Uçot günü | Bağlama saatı`
 *          → `Məhsulların sayı`, `Endirimli məbləğ, m.`, `Endirimsiz orta qiymət, m.`
 *
 * BU FAYL NİYƏ LAZIM: menyu analizi (hansı məhsul çox satılır, hansı pul
 * gətirir) YALNIZ buradan çıxır. `Satış ay və gün` faylında məhsul adı yoxdur.
 *
 * SAAT SƏVİYYƏSİ YIĞILIR: menyu qərarı saat səviyyəsində verilmir, `Uçot günü`
 * kifayətdir. Yığmaq 225 140 yarpaq sətri kəskin azaldır və `analytics_item_fact`
 * açarı (filial + gün + məhsul) onsuz da saatı saxlamır.
 *
 * 🔴 ƏHATƏ XƏBƏRDARLIĞI — GİZLƏDİLMİR:
 * Bu hesabatın məhsul səviyyəsindəki `Endirimli məbləğ` cəmi `Satış ay və gün`
 * faylının cirosunun HAMISINI ÖRTMÜR. 01–23.08.2026 real data:
 *   satış 2 925 807,25 ₼ · məhsul 2 163 090,96 ₼ → **%73,9**
 * İki ayrı səbəb var:
 *   1. `Seabreeze` filialı bu hesabatda ÜMUMİYYƏTLƏ YOXDUR (filial süzgəci).
 *   2. Qalan filiallarda da örtük %61–80 arasıdır — kombo/set məhsulların
 *      məbləği məhsul sətrinə tam düşmür.
 * Ona görə funksiya `coverage` qaytarır və ekranda göstərilir. Bu fayl
 * MƏHSUL SIRALAMASI üçün etibarlıdır (ədəd, orta qiymət, top/flop), lakin
 * «məhsul cirosu = filial cirosu» KİMİ İŞLƏDİLMƏMƏLİDİR.
 */

export type ProductDailyRow = {
  date: string
  filial: string
  item: string
  qty: number
  amount: number
  /** `product` / `service` / `packaging` / `modifier` / `included`. */
  lineKind: string
}

export type ProductDailyReport = {
  period: ReportPeriod
  rows: ProductDailyRow[]
  totals: { qty: number; amount: number; items: number; branches: number; days: number }
  byItem: Array<{ item: string; qty: number; amount: number; branches: number; avgPrice: number | null }>
  byDay: Array<{ date: string; qty: number; amount: number }>
  hasDayColumn: boolean
  canWriteDaily: boolean
  grandTotal: number | null
  skippedSubtotals: number
  warnings: string[]
}

export function parseProductDaily(rows: unknown[][]): ProductDailyReport {
  const period = parsePeriodHeader(rows)
  const warnings: string[] = []
  const h = findHeader(rows, [V.store, V.item, V.qty, V.money])
  if (!h) {
    return {
      period, rows: [], byItem: [], byDay: [],
      totals: { qty: 0, amount: 0, items: 0, branches: 0, days: 0 },
      hasDayColumn: false, canWriteDaily: false, grandTotal: null, skippedSubtotals: 0,
      warnings: ['Məhsul hesabatının başlıqları tapılmadı (Ticarət müəssisəsi / Məhsul / Məhsulların sayı / Endirimli məbləğ — TR: Şube / Ürün / Ürün miktarı / Brüt Satışlar gözlənilir)'],
    }
  }
  const [cStore, cItem, cQty, cNet] = h.idx
  const cDay = optIndex(rows, h.row, [V.day])
  const cHour = optIndex(rows, h.row, [V.hour])
  const hasDayColumn = cDay >= 0

  // Ölçü sütunları — ölçmə sütunlarından SOLDA olanların hamısı. Ara cəm
  // yoxlaması hamısına tətbiq olunur (bax `parseHourlySales` şərhi).
  const measureFrom = Math.min(...[cQty, cNet].filter(i => i >= 0))
  const groupCols: number[] = []
  for (let c = 0; c < measureFrom; c++) groupCols.push(c)
  for (const c of [cStore, cItem, cDay, cHour]) if (c >= measureFrom) groupCols.push(c)

  if (!hasDayColumn && !period.singleDay) {
    warnings.push(
      period.days && period.days > 1
        ? `Faylda «Uçot günü» sütunu yoxdur və dövr ${period.days} gündür — məhsul sətirləri hansı günə aid olduğu bilinmir, GÜNLÜK cədvələ YAZILMIR.`
        : 'Faylda «Uçot günü» sütunu yoxdur və başlıqdan dövr oxunmadı — gün bilinmir, GÜNLÜK cədvələ YAZILMIR.',
    )
  }

  let fDay = '', fStore = '', fItem = ''
  let skipped = 0, excluded = 0, grandTotal: number | null = null
  // Saat YIĞILIR → açar (gün|filial|məhsul).
  const agg = new Map<string, ProductDailyRow>()

  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (GRAND_TOTAL.test(String(row[cStore] ?? '').trim())) {
      grandTotal = num(row[cNet]); skipped++; continue
    }
    if (groupCols.some(c => isGroupTotalCell(row[c]))) { skipped++; continue }

    if (row[cStore]) fStore = String(row[cStore]).trim()
    if (row[cItem]) fItem = String(row[cItem]).trim()
    if (hasDayColumn && row[cDay]) fDay = String(row[cDay]).trim()
    if (!fStore || !fItem) continue

    const date = hasDayColumn ? excelSerialToISO(fDay) : period.singleDay
    if (!date) continue

    const filial = normalizeFilial(fStore) ?? fStore
    if (EXCLUDE.has(filial)) { excluded++; continue }

    const qty = num(row[cQty])
    const amount = num(row[cNet])
    if (qty === 0 && amount === 0) continue

    const k = `${date}|${filial}|${fItem}`
    const e = agg.get(k)
    if (e) { e.qty += qty; e.amount += amount }
    else agg.set(k, { date, filial, item: fItem, qty, amount, lineKind: 'product' })
  }

  // Sətir növü YIĞILMIŞ məbləğə görə təyin olunur: bir məhsul bəzi saatlarda
  // 0 ₼ (kombo daxilində), bəzilərində pullu gedə bilər — gün cəmi qərar verir.
  const out = [...agg.values()].map(r => ({ ...r, lineKind: classifyLine(r.item, r.amount) }))

  const im = new Map<string, { qty: number; amount: number; br: Set<string> }>()
  const dm = new Map<string, { qty: number; amount: number }>()
  for (const r of out) {
    const i = im.get(r.item) ?? { qty: 0, amount: 0, br: new Set<string>() }
    i.qty += r.qty; i.amount += r.amount; i.br.add(r.filial); im.set(r.item, i)
    const d = dm.get(r.date) ?? { qty: 0, amount: 0 }
    d.qty += r.qty; d.amount += r.amount; dm.set(r.date, d)
  }

  const amount = out.reduce((s, r) => s + r.amount, 0)
  if (!out.length) warnings.push('Heç bir sətir oxunmadı')
  if (excluded) warnings.push(`${excluded} sətir EXCLUDE filialına aiddir`)
  if (grandTotal !== null && grandTotal !== 0) {
    const d = Math.abs(amount - grandTotal) / Math.abs(grandTotal)
    if (d > 0.005) {
      warnings.push(`⚠ Oxunan cəm (${amount.toFixed(2)} ₼) faylın «Grand Total» sətrindən (${grandTotal.toFixed(2)} ₼) %${(d * 100).toFixed(2)} fərqlidir — ara cəm süzgəci yoxlanmalıdır.`)
    }
  }
  // ƏHATƏ: bu fayl bütün cironu örtmür (yuxarıdaki şərh). Rəqəmi göstərmək
  // çağıranın öhdəsindədir — burada yalnız xatırladırıq.
  warnings.push('Bu hesabat MƏHSUL SIRALAMASI üçündür (ədəd, orta qiymət, top/flop). Məhsul səviyyəsindəki məbləğ filial cirosunun HAMISINI örtmür — real datada %73,9 (kombo/set məbləği məhsula tam düşmür, bir filial hesabatdan çıxıb). «Məhsul cirosu = filial cirosu» kimi işlədilməməlidir.')

  return {
    period, rows: out, grandTotal, skippedSubtotals: skipped,
    totals: {
      qty: out.reduce((s, r) => s + r.qty, 0),
      amount: round2(amount),
      items: im.size,
      branches: new Set(out.map(r => r.filial)).size,
      days: dm.size,
    },
    byItem: [...im.entries()]
      .map(([item, v]) => ({
        item, qty: v.qty, amount: round2(v.amount), branches: v.br.size,
        avgPrice: v.qty > 0 ? v.amount / v.qty : null,
      }))
      .sort((a, b) => b.amount - a.amount),
    byDay: [...dm.entries()]
      .map(([date, v]) => ({ date, qty: v.qty, amount: round2(v.amount) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    hasDayColumn,
    canWriteDaily: out.length > 0,
    warnings,
  }
}

/**
 * `parseProductDaily` nəticəsini MÖVCUD `analytics_item_fact` formatına çevirir.
 *
 * `item_code`: bu hesabatda məhsul KODU yoxdur, yalnız ad var. Ad açar kimi
 * işlədilir — sabitdir və menyu qərarı onsuz da ad səviyyəsində verilir
 * (`analitika` səhifəsi `item_name` üzrə qruplaşdırır). Kod gələndə əvəz
 * olunacaq; `coalesce` mövcud sətri korlamır.
 */
export type ItemFactRow = {
  filial: string; date: string; item_code: string; item_name: string
  qty: number; amount: number; line_kind: string
}

export function productDailyToItemFacts(rows: ProductDailyRow[]): ItemFactRow[] {
  return rows.map(r => ({
    filial: r.filial, date: r.date,
    item_code: r.item.slice(0, 200),
    item_name: r.item,
    qty: r.qty, amount: r.amount, line_kind: r.lineKind,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. UCUZ TANIMA — hansı hesabat olduğunu BAŞLIQDAN bilmək
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vərəqin hansı hesabat olduğunu YALNIZ başlıq sətrinə baxaraq təyin edir.
 *
 * 🔴 NİYƏ LAZIM: əvvəl hər vərəqdə HƏR İKİ parser işlədilirdi. «DT Məhsul»
 * faylı 292 610 sətirdir — iki tam keçid brauzeri DONDURURDU (istifadəçi
 * «oxu düyməsinə basılmır» dedi; əslində basılırdı, sonra səhifə kilidlənirdi).
 * Bu funksiya yalnız ilk ~30 sətrə baxır → praktiki olaraq pulsuzdur, və
 * ondan sonra YALNIZ BİR parser işləyir.
 *
 * Ayırd etmə qaydası (sütun adları, `azFold`-dan sonra):
 *   • `məhsul` sütunu VAR  → məhsul hesabatı
 *   • `ödəniş növü` VAR    → saatlıq satış hesabatı
 * Hər ikisi varsa məhsul üstün tutulur (menyu detayı daha dardır).
 */
export type ReportKind = 'hourly' | 'product' | 'deletion' | null

export function detectReportKind(rows: unknown[][], limit = 30): ReportKind {
  for (let r = 0; r < Math.min(rows.length, limit); r++) {
    const cells = (rows[r] ?? []).map(c => azFold(c))
    if (!cells.length) continue
    const has = (re: RegExp) => cells.some(c => re.test(c))
    if (!has(V.store)) continue
    if (!has(V.money)) continue
    // SİLİNMƏ hesabatı ƏVVƏLCƏ yoxlanılır: onda da `Store` + `Gross Sales` var,
    // fərqləndirici sütun «Item deleted» / «Qəbzin nömrəsi»dir.
    if (has(V.delReason) && has(V.receipt)) return 'deletion'
    if (has(V.item) && has(V.qty)) return 'product'
    if (has(V.payType) && has(V.hour)) return 'hourly'
  }
  return null
}

/**
 * Tanınmayan faylda NƏYİN ÇATIŞMADIĞINI deyir.
 *
 * 🔴 NİYƏ: «iiko hesabatı tanınmadı» tək başına heç nə demir. Real hadisə —
 * istifadəçi «Doğan Tomris Rapor Məhsul» faylını yüklədi; həmin faylda
 * `Endirimli məbləğ` sütunu ÜMUMİYYƏTLƏ YOXDUR (yalnız ədəd var), ona görə
 * ciro hesablana bilməz və fayl haqlı olaraq rədd edilir. Lakin ekranda səbəb
 * yazılmadığı üçün istifadəçi faylın nəyi əskik olduğunu anlaya bilmədi.
 */
export function explainUnrecognized(rows: unknown[][], limit = 30): string {
  const found = { store: false, money: false, item: false, qty: false, pay: false, hour: false, day: false }
  for (let r = 0; r < Math.min(rows.length, limit); r++) {
    const cells = (rows[r] ?? []).map(c => azFold(c))
    if (!cells.length) continue
    const has = (re: RegExp) => cells.some(c => re.test(c))
    if (has(V.store)) found.store = true
    if (has(V.money)) found.money = true
    if (has(V.item)) found.item = true
    if (has(V.qty)) found.qty = true
    if (has(V.payType)) found.pay = true
    if (has(V.hour)) found.hour = true
    if (has(V.day)) found.day = true
  }

  const miss: string[] = []
  if (!found.store) miss.push('«Ticarət müəssisəsi» (filial)')
  if (!found.money) miss.push('«Endirimli məbləğ» (PUL SÜTUNU — bu olmadan ciro hesablanmır)')

  const seen = [
    found.store && 'filial', found.pay && 'ödəniş növü', found.day && 'gün',
    found.hour && 'saat', found.item && 'məhsul adı', found.qty && 'ədəd',
    found.money && 'məbləğ',
  ].filter(Boolean).join(' · ') || 'heç biri'

  // 🔴 HEÇ BİR SÜTUN TANINMADI → ehtimal ki HESABATIN DİLİ dəyişib.
  //
  // 25.08.2026-da iiko interfeysi Türkçe-yə keçdi və bütün fayllar «tapılanlar:
  // heç biri» verdi. O vaxt mesaj yalnız AZ sütun adlarını sayırdı, ona görə
  // istifadəçi səbəbi (DİL) anlaya bilmədi və «yenə başa döndük» dedi.
  // Artıq AZ/EN/TR dəstəklənir; başqa dil çıxsa faylın ÖZ BAŞLIQ SƏTRİ
  // göstərilir ki dərhal əlavə edilə bilsin — təxmin etməyə ehtiyac qalmasın.
  if (!found.store && !found.money && !found.pay && !found.item) {
    const headRow = rows.slice(0, limit).find(r => (r ?? []).filter(c => String(c ?? '').trim()).length >= 4)
    const names = (headRow ?? []).map(c => String(c ?? '').trim()).filter(Boolean).slice(0, 12).join(' · ')
    return 'Bu faylın SÜTUN ADLARI tanınmadı — ehtimal ki iiko hesabatının DİLİ dəyişib. ' +
      'Dəstəklənən dillər: Azərbaycan, İngilis, Türkçe. ' +
      (names ? `Faylda görünən başlıqlar: ${names}. ` : '') +
      'Bu sətri olduğu kimi göndər — lüğətə əlavə olunacaq (parse-iiko-reports.ts → V).'
  }

  if (miss.length) {
    return `Bu fayl oxuna bilmir — çatışmayan sütun: ${miss.join(', ')}. ` +
      `Faylda tapılanlar: ${seen}. ` +
      'Lazım olan iki hesabat: «Satış ay və gün» (filial · ödəniş növü · Uçot günü · Bağlama saatı · Endirimli məbləğ) ' +
      'və «DT Məhsul sayı və qiyməti» (filial · Məhsul · Uçot günü · Məhsulların sayı · Endirimli məbləğ). ' +
      'Türkçe hesabatda eyni sütunlar: Şube · Ödeme türü · Muhasebe günü · Kapanış saati · Ürün · Ürün miktarı · Brüt Satışlar (indirim sonrası).'
  }
  // Pul və filial var, amma nə məhsul adı, nə də ödəniş+saat cütü tam deyil.
  if (!found.item && !(found.pay && found.hour)) {
    return `Bu fayl oxuna bilmir — nə «Məhsul» adı, nə də «Ödəniş növü» + «Bağlama saatı» cütü tam deyil. ` +
      `Faylda tapılanlar: ${seen}. Saatlıq hesabat üçün ödəniş növü VƏ bağlama saatı, ` +
      'məhsul hesabatı üçün məhsul adı VƏ məhsulların sayı lazımdır.'
  }
  if (found.item && !found.qty) {
    return `Bu fayl məhsul hesabatına oxşayır, lakin «Məhsulların sayı» sütunu yoxdur. Faylda tapılanlar: ${seen}.`
  }
  return `Fayl tanınmadı. Faylda tapılanlar: ${seen}. Gözlənilən: «Satış ay və gün» və ya «DT Məhsul sayı və qiyməti».`
}
