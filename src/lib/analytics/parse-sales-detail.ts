// ─── iiko satış detalı parser'ları: PRODMIX (məhsul×ədəd) + ÇEK (qəbz) ────────
//
// Mənbə fayllar (gündəlik yüklənir):
//   1. «avqust_plan.xlsx» → `BAZA 2026` / `BAZA 2025` vərəqi
//      Uçot günü · Bölmə kodu · Ticarət müəssisəsi · Məhsulun kodu · Məhsul
//      · Məhsulların sayı · Endirimli məbləğ
//   2. «ödəniş şərtləri.xlsx» → `Baza 2026` / `Baza 2025` vərəqi
//      Ticarət müəssisəsi · Tarix · Ödəniş növü · Qəbzin nömrəsi · məbləğ
//
// Bu iki fayl OCAQ-ın uzun müddət «yoxdur» dediyi iki şeyi verir:
//   • məhsul bazlı ƏDƏD → Kasavana-Smith matrisi, çəkili food cost, upsell
//   • qəbz nömrəsi → ÇEK SAYI və ORTALAMA ÇEK (dashboard-da hazırda «—»)
//
// Doğrulama (08.08.2026, 01–07 avqust datası):
//   prodmix cəmi 961 237,84 ₼ = PLAN vərəqinin «Faktiki satış»ı (birebir)
//   1–6 avqust: prodmix və çek faylı KURUŞU KURUŞUNA eyni
//   7 avqust: çek faylı yarımçıq (169 845 vs 129 193) → son gün natamam ola
//   bilər, bax `PARTIAL_LAST_DAY_NOTE`.

import { normalizeFilial, EXCLUDE } from './filial-map'

// ─────────────────────────────────────────────────────────────────────────────
// Azərbaycan hərf qatlanması (İ/I/ı/i tələsi)
//
// JS `toLowerCase()` Azərbaycan/Türk əlifbasını SƏHV qatlayır:
//   'I'.toLowerCase() === 'i'   (doğru: 'ı')
//   'İ'.toLowerCase() === 'i̇'   (i + birləşən nöqtə — GÖRÜNMƏZ fərq!)
// Nəticədə `/sayı/i` regex-i 'SAYI' ilə UYĞUN GƏLMİR.
//
// Bu tələ bu repoda ARTIQ zərər vermişdi — CHANGELOG:
//   «CƏMİ (böyük İ) TOTAL-a tutmurdu → gün-sütunlu formatda çift sayım (4×)»
//
// `azFold` nöqtəli/nöqtəsiz fərqi tamamilə aradan qaldırır: hər dördü → 'i'.
// Bu, dil sıralaması üçün deyil, YALNIZ açar söz uyğunlaşdırması üçündür.
// ─────────────────────────────────────────────────────────────────────────────
export function azFold(v: unknown): string {
  return String(v ?? '').replace(/[\u0130\u0131Ii]/g, 'i').toLowerCase().trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Ödəniş növü normalizasiyası
//
// Faylda 2026-da 9, 2025-də 7 fərqli ad var və illər arası UYĞUN GƏLMİR.
// İstifadəçi təsdiqi (08.08.2026):
//   • Çatdırılma bu il YALNIZ Wolt və Bolt-dur. YANGO 2025-də var idi, ARTIQ YOX.
//   • ATB və Pasha bank ÖDƏNİŞ SİSTEMİDİR (bank kartı) → `kart`, çatdırılma deyil.
//
// ⚠️ YANGO ayrı kateqoriyada saxlanılır (silinmir): 2025 çatdırılması YANGO-nu
// da əhatə etdiyi üçün «Delivery YoY» iki fərqli cür hesablana bilər —
// YANGO daxil (kanaldan çıxış görünür) və xaric (yalnız wolt/bolt müqayisəsi).
// Onu `kart`/`nagd` içinə qatmaq YoY-u səssizcə təhrif edərdi.
// ─────────────────────────────────────────────────────────────────────────────
export const PAYMENT_KINDS = ['nagd', 'kart', 'wolt', 'bolt', 'own_delivery', 'yango_legacy'] as const
export type PaymentKind = (typeof PAYMENT_KINDS)[number]

// Qeyd: naxışlar `azFold` çıxışına (kiçik hərf, nöqtəsiz ı → i) görə yazılıb.
const PAYMENT_MAP: Array<[RegExp, PaymentKind]> = [
  [/^nağd|^nagd|^naqd/,                   'nagd'],
  [/wolt/,                                'wolt'],   // WOLT SATIŞ · *WOLT · Wolt Storefront
  [/bolt/,                                'bolt'],   // BOLT SATIŞ · BOLT
  [/yango/,                               'yango_legacy'],
  [/^delivery\s/,                         'own_delivery'], // Delivery SeaBreeze (öz kanal)
  [/uni\s*bank|unibank|kapital|atb|pasha/, 'kart'],   // 4 acquirer + PAX terminal
]

/** Ödəniş növü adını kanonik səbətə çevirir. Tanınmayan → null (udulmur, sayılır). */
export function normalizePayment(raw: string): PaymentKind | null {
  const s = azFold(raw)
  if (!s) return null
  for (const [re, kind] of PAYMENT_MAP) if (re.test(s)) return kind
  return null
}

/** Çatdırılma sayılan səbətlər. 2026 reallığı: yalnız wolt + bolt (+ öz kanalı). */
export const DELIVERY_KINDS: PaymentKind[] = ['wolt', 'bolt', 'own_delivery']

// ─────────────────────────────────────────────────────────────────────────────
// Sətir növü təsnifatı
//
// 443 unikal «məhsul» adının 157-si SIFIR məbləğlidir və satış deyil:
// sayğac (Servis 98 160, Take away 40 086, Stəkan sayı 15 034), modifikator
// (AZ SOUS, BOL SOUS, SOUSSUZ, ACILI, TURŞUSUZ, KƏKLİKOTU), kombo daxilində
// pulsuz gedən məhsul (Ketçup, Mayonez, Kartof Fri).
//
// QAYDA: `məbləğ > 0` → real satış. `məbləğ = 0` → gəlir gətirməyən sətir.
// Bu qayda ƏLLƏ SAXLANILAN qara siyahı tələb etmir və İTKİSİZDİR:
// məbləği olan 286 ad tam 961 237,84 ₼ verir (faylın bütün cirosu).
//
// Sıfır məbləğli sətirlər SİLİNMİR — təsnif olunur, çünki özləri məlumatdır:
// «Servis» vs «Take away» nisbəti zalda/götür-apar qarışığını verir, modifikator
// sayları isə resept/hazırlıq meylini göstərir. Menyu mühəndisliyi yalnız
// `product` sətirlərini işlədir.
// ─────────────────────────────────────────────────────────────────────────────
export const LINE_KINDS = ['product', 'service', 'packaging', 'modifier', 'included'] as const
export type LineKind = (typeof LINE_KINDS)[number]

// Naxışlar `azFold` çıxışına görə (SAYI → sayi, KƏKLİKOTU → kəklikotu).
const SERVICE_RE   = /^servis|^take\s*away|çay dəstgahı servis|^zalda /
const PACKAGING_RE = /stəkan sayi|^paket|^bardaq/
const MODIFIER_RE  = /sous(suz)?$|^az sous|^bol sous|^acili|^turşusuz|^presdə|kəklikotu|^samuray|^şirin çili/

/**
 * Sətrin növünü təyin edir. Məbləği olan HƏR sətir `product`-dır — sıfır
 * məbləğlilər isə ada görə alt-təsnif olunur.
 */
export function classifyLine(name: string, amount: number): LineKind {
  if (amount > 0) return 'product'
  const s = azFold(name)
  if (SERVICE_RE.test(s)) return 'service'
  if (PACKAGING_RE.test(s)) return 'packaging'
  if (MODIFIER_RE.test(s)) return 'modifier'
  return 'included'   // pulsuz gedən real qida (kombo tərkibi, ketçup, mayonez)
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel tarix → ISO
//
// 🔴 09.08.2026 HADİSƏSİ — niyə burada iki yol var:
// Bu parser-lər Python ilə çıxarılmış XAM serial-lara (46235) qarşı yazılıb və
// test edilib. Brauzerdə isə `sheet_to_json(..., { raw: false })` işlədilir və
// SheetJS tarix formatlı hücrəni FORMATLAYIB QAYTARIR: '01.08.2026'.
// Faylların tarix sütunlarının numFmt kodu məhz `dd\.mm\.yyyy`-dir
// (BAZA 2026!A · Baza 2026!B — fayldan yoxlandı). Nəticədə `Number('01.08.2026')`
// = NaN → HƏR SƏTİR atılırdı → «nə PRODMIX nə ÇEK tapılmadı».
// 22 test bunu tutmadı, çünki hamısı serial verirdi.
//
// Ona görə: serial DA, formatlanmış sətir DƏ qəbul edilir.
//
// ⚠️ BELİRSİZ FORMAT TƏXMİN EDİLMİR: `03/04/2026` həm 3 aprel həm 4 mart ola
// bilər. Təxmin etsək bir aylıq data SƏSSİZCƏ yerini dəyişər. Ona görə belə
// hallarda `null` qaytarılır → sətir atılır və «tarixi oxunmadı» xəbərdarlığı
// görünür. Səssiz səhvdən uca səs yaxşıdır (CLAUDE.md §2.7).
// ─────────────────────────────────────────────────────────────────────────────
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30)

/** y-m-d-dən ISO qurur; təqvimdə olmayan tarixi (31.02) rədd edir. */
function ymdToISO(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  // Round-trip: 31.02 → 03.03 olardı, bunu tutur.
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

export function excelSerialToISO(serial: unknown): string | null {
  if (serial == null) return null

  // 1) Xam serial (number, və ya tam rəqəmdən ibarət sətir)
  if (typeof serial === 'number' || /^\d+(\.\d+)?$/.test(String(serial).trim())) {
    const n = typeof serial === 'number' ? serial : Number(String(serial).trim())
    if (!Number.isFinite(n) || n <= 0 || n > 100000) return null
    return new Date(EXCEL_EPOCH_UTC + Math.floor(n) * 86400000).toISOString().slice(0, 10)
  }

  const s = String(serial).trim()
  if (!s) return null

  // 2) ISO: 2026-08-01 (bəzən saatla birlikdə)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/)
  if (iso) return ymdToISO(+iso[1], +iso[2], +iso[3])

  // 3) Nöqtəli — fayllarımızın formatı, GÜN ƏVVƏL (dd.mm.yyyy / d.m.yy)
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/)
  if (dot) {
    const y = +dot[3] < 100 ? 2000 + +dot[3] : +dot[3]
    return ymdToISO(y, +dot[2], +dot[1])
  }

  // 4) Slash/tire — YALNIZ birmənalı olduqda. Hər iki hissə ≤ 12-dirsə
  //    gün/ay ayırd edilə bilmir → null (təxmin etmirik).
  const sl = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2}|\d{4})$/)
  if (sl) {
    const a = +sl[1], b = +sl[2]
    const y = +sl[3] < 100 ? 2000 + +sl[3] : +sl[3]
    if (a > 12 && b <= 12) return ymdToISO(y, b, a)   // gün/ay/il
    if (b > 12 && a <= 12) return ymdToISO(y, a, b)   // ay/gün/il
    return null                                       // BELİRSİZ → uca səs
  }

  return null
}

function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const t = String(v ?? '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

/** Başlıq sətrini tapır və kolon adı → indeks xəritəsi qurur (sıra dəyişə bilər). */
function headerIndex(rows: unknown[][], required: RegExp[]): { row: number; idx: number[] } | null {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const cells = (rows[r] ?? []).map(c => azFold(c))
    const idx = required.map(re => cells.findIndex(c => re.test(c)))
    if (idx.every(i => i >= 0)) return { row: r, idx }
  }
  return null
}

/**
 * İSTƏYƏ BAĞLI sütunu tapır — yoxsa `-1`.
 *
 * NİYƏ: analitika şöbəsindən `Maya dəyəri`, `Kateqoriya`, `Saat` sütunları
 * istənilib (bax docs/IIKO-GUNLUK-EXPORT.md §7). Onlar gələndə sistem
 * DƏYİŞİKLİK OLMADAN oxumalıdır — yeni deploy gözlənilməsin. Sütun yoxdursa
 * heç nə pozulmur, sadəcə həmin analiz açılmır.
 */
function optionalIndex(rows: unknown[][], headerRow: number, patterns: RegExp[]): number {
  const cells = (rows[headerRow] ?? []).map(c => azFold(c))
  for (const re of patterns) {
    const i = cells.findIndex(c => re.test(c))
    if (i >= 0) return i
  }
  return -1
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODMIX
// ─────────────────────────────────────────────────────────────────────────────
export type ProdmixLine = {
  filial: string
  date: string            // YYYY-MM-DD
  itemCode: string
  itemName: string
  qty: number
  amount: number
  kind: LineKind
  /** İSTƏYƏ BAĞLI — `Maya dəyəri` sütunu gələndə dolur (sətir cəmi maya, ₼). */
  cost?: number
  /** İSTƏYƏ BAĞLI — `Kateqoriya` sütunu gələndə dolur. */
  category?: string
}

export type ProdmixResult = {
  /**
   * filial × gün × məhsul kodu — HƏR AÇAR BİR DƏFƏ (DB unique açarı ilə eyni).
   * Faylda təkrarlanan açarlar burada TOPLANIR, yoxsa chunk-lı yükləmə səssiz
   * data itirir (bax funksiya içindəki 09.08.2026 şərhi).
   */
  lines: ProdmixLine[]
  dates: string[]
  branches: string[]
  totals: {
    qty: number; amount: number; productAmount: number
    /** `Maya dəyəri` sütunu gəldiyi hallarda məhsul sətirlərinin maya cəmi. */
    productCost: number
    /** Çəkili food cost = maya cəmi / məhsul cirosu. Maya yoxsa `null`. */
    foodCostPct: number | null
  }
  /** Gəlir gətirməyən sətirlər — silinmir, ayrıca sayılır. */
  nonRevenue: Record<Exclude<LineKind, 'product'>, number>
  /** Faylda təkrarlanıb burada birləşdirilən açar sayı (şəffaflıq üçün). */
  mergedKeys: number
  /** İstəyə bağlı sütunlardan hansı gəldi — UI bunu göstərir. */
  optional: { cost: boolean; category: boolean }
  warnings: string[]
}

/** `BAZA 20xx` vərəqini parse edir. `rows` = sheet_to_json(header:1) çıxışı. */
export function parseProdmix(rows: unknown[][]): ProdmixResult {
  const warnings: string[] = []
  const h = headerIndex(rows, [
    /uçot günü/, /ticarət müəssisəsi/, /məhsulun kodu/, /^məhsul$/, /məhsullarin sayi/, /endirimli məbləğ/,
  ])
  if (!h) {
    return {
      lines: [], dates: [], branches: [],
      totals: { qty: 0, amount: 0, productAmount: 0, productCost: 0, foodCostPct: null },
      nonRevenue: { service: 0, packaging: 0, modifier: 0, included: 0 },
      mergedKeys: 0,
      optional: { cost: false, category: false },
      warnings: ['Prodmix başlıqları tapılmadı (Uçot günü / Ticarət müəssisəsi / Məhsul / Məhsulların sayı / Endirimli məbləğ gözlənilir)'],
    }
  }
  const [cDate, cBranch, cCode, cName, cQty, cAmt] = h.idx

  // ── İSTƏYƏ BAĞLI sütunlar (gələndə avtomatik oxunur, yoxsa keçilir) ─────────
  // `Maya dəyəri` — 1 ƏDƏD üçün maya gözlənilir (sənəddə belə istənilib).
  // «Maya məbləği/cəmi» kimi adlar sətir CƏMİ ola bilər → aşağıda yoxlanılır.
  const cCost = optionalIndex(rows, h.row, [/maya dəyəri/, /^maya$/, /maya \(/, /self ?cost/, /cost price/])
  const cCostTotal = optionalIndex(rows, h.row, [/maya məbləği/, /maya cəmi/, /cost amount/])
  const cCat = optionalIndex(rows, h.row, [/kateqoriya/, /kategoriya/, /^qrup$/, /category/, /menyu qrupu/])

  // 🔴 09.08.2026 — NİYƏ AQREQASİYA (əvvəl hər xam sətir ayrıca push olunurdu):
  // Bu funksiyanın qranulu «filial × gün × məhsul» OLMALIDIR (DB unique açarı
  // da budur), lakin faylda EYNİ açar TƏKRARLANIR: real datada 39 549 sətirdə
  // 36 975 unikal açar var — 2 538 açar təkrarlanır (hamısının məhsul ADI EYNİ,
  // yəni toplamaq doğrudur; yoxlandı). Səbəbi: bir kanonik filial altında iki
  // fiziki nöqtə/bölmə ola bilər (məs. ALIASES 'Torgoviy Yuxarı' + 'Torgoviy
  // Aşağı' → 'Torgoviy').
  //
  // Aqreqasiya olmadan yükləmə SƏSSİZ DATA İTİRİRDİ: chunk-lar təkrar açarı
  // ayırır, ikinci chunk birincinin ÜZƏRİNƏ yazır (toplamır) → 2 574 sətir və
  // 102 227,56 ₼ ciro yox olurdu (859 010,28 yerinə 961 237,84 olmalıydı).
  // Aqreqasiyadan sonra ciro xam cəmə BƏRABƏRDİR (yoxlandı).
  const agg = new Map<string, {
    filial: string; date: string; itemCode: string; itemName: string
    qty: number; amount: number; cost: number; category: string
  }>()
  const dates = new Set<string>(), branches = new Set<string>()
  let skippedDate = 0, skippedBranch = 0, mergedKeys = 0
  const hasCost = cCost >= 0 || cCostTotal >= 0
  const hasCat = cCat >= 0

  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const rawBranch = String(row[cBranch] ?? '').trim()
    if (!rawBranch) continue
    const date = excelSerialToISO(row[cDate])
    if (!date) { skippedDate++; continue }

    const filial = normalizeFilial(rawBranch) ?? rawBranch
    if (EXCLUDE.has(filial)) { skippedBranch++; continue }

    const itemName = String(row[cName] ?? '').trim()
    if (!itemName) continue
    const itemCode = String(row[cCode] ?? '').trim()
    const q = num(row[cQty]), a = num(row[cAmt])

    // Maya: SƏTİR CƏMİ kimi saxlanılır (aqreqasiyada toplanabilsin).
    // `Maya dəyəri` 1 ədəd üçündür → ədədə vurulur. `Maya məbləği` artıq cəmdir.
    const cost = cCostTotal >= 0 ? num(row[cCostTotal])
      : cCost >= 0 ? num(row[cCost]) * q
      : 0
    const category = hasCat ? String(row[cCat] ?? '').trim() : ''

    const key = `${filial}|${date}|${itemCode}`
    const prev = agg.get(key)
    if (prev) {
      mergedKeys++
      prev.qty += q
      prev.amount += a
      prev.cost += cost
      if (!prev.category && category) prev.category = category
    } else {
      agg.set(key, { filial, date, itemCode, itemName, qty: q, amount: a, cost, category })
    }
    dates.add(date); branches.add(filial)
  }

  // `kind` TOPLANMIŞ məbləğə görə təyin olunur: eyni məhsulun bir sətri 0 ₼,
  // digəri müsbət ola bilər — birləşdikdən sonra o, real gəlirli məhsuldur.
  let qty = 0, amount = 0, productAmount = 0, productCost = 0
  const nonRevenue = { service: 0, packaging: 0, modifier: 0, included: 0 }
  const lines: ProdmixLine[] = [...agg.values()].map(e => {
    const kind = classifyLine(e.itemName, e.amount)
    qty += e.qty; amount += e.amount
    if (kind === 'product') { productAmount += e.amount; productCost += e.cost }
    else nonRevenue[kind] += e.qty
    return {
      filial: e.filial, date: e.date, itemCode: e.itemCode, itemName: e.itemName,
      qty: e.qty, amount: e.amount, kind,
      ...(hasCost ? { cost: e.cost } : {}),
      ...(hasCat && e.category ? { category: e.category } : {}),
    }
  })

  if (skippedDate) warnings.push(`${skippedDate} sətrin tarixi oxunmadı`)
  if (skippedBranch) warnings.push(`${skippedBranch} sətir EXCLUDE filialına aiddir`)
  if (!lines.length) warnings.push('Heç bir sətir oxunmadı')
  // Sıfır məbləğli sətirlər gəlirə təsir etməməlidir — yoxla.
  if (Math.abs(amount - productAmount) > 0.01) {
    warnings.push(`Gəlir uyğunsuzluğu: cəmi ${amount.toFixed(2)} ≠ məhsul ${productAmount.toFixed(2)}`)
  }

  const foodCostPct = hasCost && productAmount > 0 ? productCost / productAmount : null
  // MAYA SÜTUNU SƏHV ŞƏRH EDİLİBSƏ SƏSSİZ KEÇMƏSİN.
  // `Maya dəyəri` 1 ədəd üçün gözlənilir. Əgər faylda əslində SƏTİR CƏMİ
  // verilibsə, ədədə vurmaqla nəticə ədəd qatı qədər şişər və food cost
  // qeyri-real olar. Restoranda çəkili food cost tipik olaraq %20–45-dir.
  if (foodCostPct != null && (foodCostPct > 0.9 || foodCostPct < 0.05)) {
    warnings.push(
      `Food cost qeyri-real çıxdı (%${(foodCostPct * 100).toFixed(1)}). ` +
      `«${cCostTotal >= 0 ? 'Maya məbləği' : 'Maya dəyəri'}» sütunu ` +
      `${cCostTotal >= 0 ? 'sətir cəmi' : '1 ədəd'} kimi oxundu — ` +
      'faylda əksi ola bilər. Maya nəticələri istifadə edilməməlidir, sütun adı dəqiqləşdirilməlidir.',
    )
  }

  return {
    lines,
    dates: [...dates].sort(),
    branches: [...branches].sort(),
    totals: { qty, amount, productAmount, productCost, foodCostPct },
    nonRevenue, warnings, mergedKeys,
    optional: { cost: hasCost, category: hasCat },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÇEK / ÖDƏNİŞ
// ─────────────────────────────────────────────────────────────────────────────
export type ReceiptDay = {
  filial: string
  date: string
  receipts: number                          // unikal qəbz sayı → ÇEK SAYI
  amount: number
  avgCheck: number | null                   // amount / receipts → ORTALAMA ÇEK
  byPayment: Record<PaymentKind, number>
  deliveryAmount: number                    // wolt + bolt + own_delivery
}

export type ReceiptsResult = {
  days: ReceiptDay[]                        // filial × gün (upsert qranulu)
  dates: string[]
  totals: {
    receipts: number; amount: number; avgCheck: number | null
    byPayment: Record<PaymentKind, number>
    unknownPayments: Record<string, number>
  }
  warnings: string[]
}

const emptyPay = (): Record<PaymentKind, number> =>
  ({ nagd: 0, kart: 0, wolt: 0, bolt: 0, own_delivery: 0, yango_legacy: 0 })

/** `Baza 20xx` (ödəniş şərtləri) vərəqini parse edir. */
export function parseReceipts(rows: unknown[][]): ReceiptsResult {
  const warnings: string[] = []
  const h = headerIndex(rows, [/ticarət müəssisəsi/, /^tarix$/, /ödəniş növü/, /qəbzin nömrəsi/, /endirimli məbləğ/])
  if (!h) {
    return {
      days: [], dates: [],
      totals: { receipts: 0, amount: 0, avgCheck: null, byPayment: emptyPay(), unknownPayments: {} },
      warnings: ['Çek başlıqları tapılmadı (Ticarət müəssisəsi / Tarix / Ödəniş növü / Qəbzin nömrəsi / Endirimli məbləğ gözlənilir)'],
    }
  }
  const [cBranch, cDate, cPay, cRec, cAmt] = h.idx

  // filial|gün → aqreqat. Qəbz nömrəsi UNİKAL sayılır: bir çekin bir neçə
  // ödəniş sətri ola bilər (qismən nağd + qismən kart) → iki dəfə sayılmasın.
  const agg = new Map<string, { filial: string; date: string; recs: Set<string>; amount: number; pay: Record<PaymentKind, number> }>()
  const unknown: Record<string, number> = {}
  let skipped = 0

  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const rawBranch = String(row[cBranch] ?? '').trim()
    if (!rawBranch) continue
    const date = excelSerialToISO(row[cDate])
    if (!date) { skipped++; continue }
    const filial = normalizeFilial(rawBranch) ?? rawBranch
    if (EXCLUDE.has(filial)) continue

    const key = `${filial}|${date}`
    let cell = agg.get(key)
    if (!cell) { cell = { filial, date, recs: new Set(), amount: 0, pay: emptyPay() }; agg.set(key, cell) }

    const a = num(row[cAmt])
    const receiptNo = String(row[cRec] ?? '').trim()
    if (receiptNo) cell.recs.add(receiptNo)
    cell.amount += a

    const kind = normalizePayment(String(row[cPay] ?? ''))
    if (kind) cell.pay[kind] += a
    else {
      const name = String(row[cPay] ?? '').trim() || '(boş)'
      unknown[name] = (unknown[name] ?? 0) + a
    }
  }

  const days: ReceiptDay[] = [...agg.values()].map(c => {
    const receipts = c.recs.size
    const deliveryAmount = DELIVERY_KINDS.reduce((s, k) => s + c.pay[k], 0)
    return {
      filial: c.filial, date: c.date, receipts, amount: c.amount,
      avgCheck: receipts > 0 ? c.amount / receipts : null,
      byPayment: c.pay, deliveryAmount,
    }
  }).sort((a, b) => a.date.localeCompare(b.date) || a.filial.localeCompare(b.filial))

  const byPayment = emptyPay()
  let receipts = 0, amount = 0
  for (const d of days) {
    receipts += d.receipts; amount += d.amount
    for (const k of PAYMENT_KINDS) byPayment[k] += d.byPayment[k]
  }

  if (skipped) warnings.push(`${skipped} sətrin tarixi oxunmadı`)
  const unknownKeys = Object.keys(unknown)
  if (unknownKeys.length) {
    // Xəta UDULMUR: tanınmayan ödəniş növü səssizcə itməməlidir.
    warnings.push(`Tanınmayan ödəniş növü (${unknownKeys.length}): ${unknownKeys.slice(0, 5).join(', ')}`)
  }
  if (!days.length) warnings.push('Heç bir sətir oxunmadı')

  return {
    days,
    dates: [...new Set(days.map(d => d.date))].sort(),
    totals: { receipts, amount, avgCheck: receipts > 0 ? amount / receipts : null, byPayment, unknownPayments: unknown },
    warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gündəlik yükləmə qaydası — natamam son gün
//
// Fayllar HƏR GÜN atılır və son gün TAM OLMAYA BİLƏR: 08.08.2026 datasında
// çek faylının 7 avqustu 129 193 ₼, prodmix-in 7 avqustu 169 845 ₼ idi
// (1–6 avqust kuruşu kuruşuna eyni). Yəni çek export-u daha erkən saatda
// çıxarılmışdı.
//
// Ona görə DB yazısı mütləq (filial, gün) açarı üzrə ÜZƏRİNƏ YAZMA (upsert)
// olmalıdır — ƏLAVƏ ETMƏ (insert) yox. Əks halda sabah tam 7 avqust gələndə
// həmin gün İKİ DƏFƏ sayılar.
// ─────────────────────────────────────────────────────────────────────────────
export const PARTIAL_LAST_DAY_NOTE =
  'Son gün natamam ola bilər (export saatına görə). Yazı (filial, gün) açarı ilə upsert olunur — təkrar yükləmə günü ikiqat saymır.'

/** Bir dövrün son günü digər günlərdən nəzərəçarpacaq dərəcədə azdırsa xəbər ver. */
export function detectPartialLastDay(dayTotals: Array<{ date: string; amount: number }>): string | null {
  if (dayTotals.length < 3) return null
  const sorted = [...dayTotals].sort((a, b) => a.date.localeCompare(b.date))
  const last = sorted[sorted.length - 1]
  const prev = sorted.slice(0, -1)
  const avg = prev.reduce((s, d) => s + d.amount, 0) / prev.length
  if (avg > 0 && last.amount < avg * 0.7) {
    const pct = Math.round((1 - last.amount / avg) * 100)
    return `${last.date} günü ortalamadan %${pct} aşağıdır — export natamam ola bilər.`
  }
  return null
}

/**
 * İKİ FAYLI GÜN-GÜN TUTUŞDURUR — natamam export-un ƏSL detektoru.
 *
 * `detectPartialLastDay` tək faylın içindəki kənarlaşmaya baxır və 08.08.2026
 * hadisəsini TUTMADI: çek faylının 7 avqustu (129 193 ₼) öz faylının
 * ortalamasına yaxın idi, yəni daxildən NORMAL görünürdü. Natamamlıq yalnız
 * prodmix ilə müqayisədə göründü (169 845 vs 129 193).
 *
 * Ona görə əsas yoxlama BUDUR: iki fayl eyni günü eyni məbləği göstərməlidir.
 * 1–6 avqust kuruşu kuruşuna uyğun idi; fərq yalnız son gündə çıxdı.
 */
export type DayReconcile = {
  date: string
  prodmixAmount: number
  receiptsAmount: number
  diff: number
  diffPct: number
  ok: boolean
}

export function reconcileProdmixReceipts(
  prodmix: Pick<ProdmixResult, 'lines'>,
  receipts: Pick<ReceiptsResult, 'days'>,
  tolerance = 0.01,
): { days: DayReconcile[]; warnings: string[] } {
  const p = new Map<string, number>()
  for (const l of prodmix.lines) p.set(l.date, (p.get(l.date) ?? 0) + l.amount)
  const r = new Map<string, number>()
  for (const d of receipts.days) r.set(d.date, (r.get(d.date) ?? 0) + d.amount)

  const days: DayReconcile[] = [...new Set([...p.keys(), ...r.keys()])].sort().map(date => {
    const pa = p.get(date) ?? 0, ra = r.get(date) ?? 0
    const diff = pa - ra
    const diffPct = pa > 0 ? diff / pa : 0
    return { date, prodmixAmount: pa, receiptsAmount: ra, diff, diffPct, ok: Math.abs(diff) <= tolerance }
  })

  const warnings: string[] = []
  const bad = days.filter(d => !d.ok)
  for (const d of bad) {
    // ⚠️ 10.08.2026 — MESAJ DÜZƏLDİLDİ. Əvvəl bu, «filan fayl NATAMAMDIR»
    // deyirdi və səbəbi TƏSDİQLƏNMƏMİŞ halda iddia edirdi. Yoxlama göstərdi ki
    // 07.08.2026 fərqi (40 652,13 ₼) natamamlıqdan DEYİL:
    //   • 10.08.2026-da alınmış «total satış» export-u həmin günü eyni məbləğlə
    //     (129 192,78 ₼) göstərir — yəni 3 gün sonra da dəyişməyib;
    //   • saat-saat baxıldıqda 07.08-də 24 saatın HAMISI var və profil normaldır
    //     (zirvə 21:00–22:00, digər günlərlə eyni) → kəsilmə YOXDUR;
    //   • fərq 29 filialın 28-inə yayılıb (yalnız Hüseyn Cavid üst-üstə düşür).
    // Səbəb hələ məlum deyil (ehtimal: açıq/ödənilməmiş sifarişlər, ləğv edilmiş
    // qəbzlər və ya iki hesabatın fərqli bazası). Ona görə burada SƏBƏB İDDİA
    // EDİLMİR — yalnız fərq bildirilir və araşdırma istənilir.
    const higher = d.diff > 0 ? 'prodmix' : 'çek'
    warnings.push(
      `${d.date}: prodmix ${d.prodmixAmount.toFixed(2)} ₼ ≠ çek ${d.receiptsAmount.toFixed(2)} ₼ ` +
      `(fərq ${Math.abs(d.diff).toFixed(2)} ₼ · %${Math.abs(d.diffPct * 100).toFixed(1)}, ${higher} yüksəkdir) — ` +
      'səbəb araşdırılmalıdır: natamam export, açıq/ləğv edilmiş qəbz, ya da iki hesabatın fərqli bazası. ' +
      'Yazmaq təhlükəsizdir (upsert), lakin rəqəm bu fərqlə oxunmalıdır.',
    )
  }
  return { days, warnings }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÇOX FAYLIN BİRLƏŞDİRİLMƏSİ
//
// 🔴 10.08.2026 — NİYƏ LAZIM OLDU: yükləmə ekranı bir dəfədə bir neçə fayl
// qəbul edir, lakin `read()` içində `if (!prodmix) …` şərti vardı — İLK uyğun
// vərəq tapıldıqdan sonra qalan fayllar SƏSSİZ ATLANIRDI. İstifadəçi «hər gün
// tək günlük fayl atacağam» dedi; 10 günü 10 fayl kimi atsa yalnız 1 gün
// yazılar, 9-u yoxa çıxardı.
//
// BİRLƏŞDİRMƏ SEMANTİKASI — SON QALİB (last-wins), TOPLAMA DEYİL:
// Fayl DAXİLİNDƏ təkrar açar TOPLANIR (real təkrar sətirlərdir, bax `parseProdmix`).
// Fayllar ARASINDA isə eyni açar «həmin data iki dəfə göndərildi» deməkdir —
// toplasaydıq gün İKİQAT sayılardı. Ona görə sonuncu fayl üzərinə yazır (DB-dəki
// upsert davranışı ilə eyni) və üst-üstə düşmə SƏSSİZ KEÇMİR: xəbərdarlıq verilir.
// ─────────────────────────────────────────────────────────────────────────────

/** Bir neçə faylın PRODMIX nəticəsini birləşdirir (son qalib). */
export function mergeProdmix(parts: ProdmixResult[]): ProdmixResult | null {
  const real = parts.filter(p => p.lines.length)
  if (!real.length) return null
  if (real.length === 1) return real[0]

  const byKey = new Map<string, ProdmixLine>()
  let overlaps = 0
  for (const p of real) {
    for (const l of p.lines) {
      const k = `${l.filial}|${l.date}|${l.itemCode}`
      if (byKey.has(k)) overlaps++
      byKey.set(k, l)          // son fayl üzərinə yazır
    }
  }
  const lines = [...byKey.values()]

  let qty = 0, amount = 0, productAmount = 0, productCost = 0
  const nonRevenue = { service: 0, packaging: 0, modifier: 0, included: 0 }
  const dates = new Set<string>(), branches = new Set<string>()
  let hasCost = false, hasCat = false
  for (const l of lines) {
    qty += l.qty; amount += l.amount
    if (l.kind === 'product') { productAmount += l.amount; productCost += l.cost ?? 0 }
    else nonRevenue[l.kind] += l.qty
    dates.add(l.date); branches.add(l.filial)
    if (l.cost != null) hasCost = true
    if (l.category) hasCat = true
  }

  const warnings = [...new Set(real.flatMap(p => p.warnings))]
  if (overlaps) {
    warnings.push(
      `${overlaps} məhsul sətri bir neçə faylda təkrarlanır (eyni filial+gün+məhsul) — ` +
      'sonuncu fayl üzərinə yazıldı, toplanmadı. Fayllar üst-üstə düşən gün əhatə edir.',
    )
  }
  return {
    lines,
    dates: [...dates].sort(),
    branches: [...branches].sort(),
    totals: {
      qty, amount, productAmount, productCost,
      foodCostPct: hasCost && productAmount > 0 ? productCost / productAmount : null,
    },
    nonRevenue,
    mergedKeys: real.reduce((s, p) => s + p.mergedKeys, 0),
    optional: { cost: hasCost, category: hasCat },
    warnings,
  }
}

/** Bir neçə faylın ÇEK nəticəsini birləşdirir (son qalib). */
export function mergeReceipts(parts: ReceiptsResult[]): ReceiptsResult | null {
  const real = parts.filter(r => r.days.length)
  if (!real.length) return null
  if (real.length === 1) return real[0]

  const byKey = new Map<string, ReceiptDay>()
  let overlaps = 0
  for (const r of real) {
    for (const d of r.days) {
      const k = `${d.filial}|${d.date}`
      if (byKey.has(k)) overlaps++
      byKey.set(k, d)
    }
  }
  const days = [...byKey.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.filial.localeCompare(b.filial))

  const byPayment = emptyPay()
  let receipts = 0, amount = 0
  const dates = new Set<string>()
  for (const d of days) {
    receipts += d.receipts; amount += d.amount
    dates.add(d.date)
    for (const k of PAYMENT_KINDS) byPayment[k] += d.byPayment[k]
  }
  // Naməlum ödəniş növləri bütün fayllardan yığılır — heç biri itməsin.
  const unknownPayments: Record<string, number> = {}
  for (const r of real) {
    for (const [k, v] of Object.entries(r.totals.unknownPayments)) {
      unknownPayments[k] = (unknownPayments[k] ?? 0) + v
    }
  }

  const warnings = [...new Set(real.flatMap(r => r.warnings))]
  if (overlaps) {
    warnings.push(
      `${overlaps} gün-filial sətri bir neçə faylda təkrarlanır — sonuncu fayl ` +
      'üzərinə yazıldı, toplanmadı.',
    )
  }
  return {
    days,
    dates: [...dates].sort(),
    totals: {
      receipts, amount,
      avgCheck: receipts > 0 ? amount / receipts : null,
      byPayment, unknownPayments,
    },
    warnings,
  }
}
