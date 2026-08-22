import { azFold, excelSerialToISO } from './parse-sales-detail'
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

/** Sətir ara cəmdirmi? Qrup dəyəri « Total» ilə bitirsə — bəli. */
const isSubtotal = (v: unknown): boolean => {
  const s = String(v ?? '').trim()
  return s.length > 6 && /\stotal$/i.test(s)
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
  const h = findHeader(rows, [/^store$/, /payment group/, /payment type/, /gross sales.*after discount/, /^bills$/])
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
  const h = findHeader(rows, [/^store$/, /^item$/, /number of items/, /gross sales/])
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
  const h = findHeader(rows, [/accounting day/, /^store$/, /item deleted$/, /receipt no/, /^item$/, /gross sales/])
  if (!h) {
    return {
      period, rows: [], outliers: [], noCommentPct: 0,
      totals: { amount: 0, count: 0, receipts: 0, days: 0, branches: 0 },
      byBranch: [], byReason: [],
      warnings: ['Silinmə hesabatı başlıqları tapılmadı (Accounting day / Store / Item deleted / Receipt No. / Item / Gross Sales gözlənilir)'],
    }
  }
  const [cDay, cStore, cReason, cRcpt, cItem, cAmt] = h.idx
  const cComment = optIndex(rows, h.row, [/item deletion comment/, /comment/])

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
