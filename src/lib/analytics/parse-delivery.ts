// ─── Delivery (kanal) parser'ı — Python `kanal_analisti.py` portu (add-only) ────
// Girdi: "ödəniş növü" Excel-i — sətir: [filial, tip, tutar]. Tip: Wolt/Bolt/Yango/
// Storefront/Delivery/Seabreeze. Nəticə: filial başına total/wolt/bolt/deliv + deliveryPayı.
// (Opsional) YoY Excel-i "Kanal və İllik Müqayisə" vərəqindən d2026/d2025 → deliveryYoy.

import { normalizeFilial, BRANCH_TO_REGION, EXCLUDE } from './filial-map'

export type SheetInput = { rows: unknown[][] }

export type BranchDelivery = {
  filial: string
  bolge: string | null
  eslesdi: boolean
  total: number
  wolt: number
  bolt: number
  deliv: number
  deliveryPayi: number | null   // deliv / total
  woltPayi: number | null       // wolt / deliv
  deliveryYoy: number | null    // d2026 / d2025 − 1
}

export type DeliveryResult = {
  branches: BranchDelivery[]
  network: { total: number; wolt: number; bolt: number; deliv: number; deliveryPayi: number | null; woltPayi: number | null; deliveryYoy: number | null }
  meta: { okunan: number; eslesen: number; eslesmeyen: number; uyarilar: string[] }
}

const TOTAL_RE = /\b(grand|total|cəmi|cemi|toplam|yekun)\b/i
const lc = (s: unknown) => String(s ?? '').toLowerCase().replace('̇', '')

type Acc = { xam: string; total: number; wolt: number; bolt: number; deliv: number }

/** Ödəniş növü vərəqi → filial başına kanal cəmləri (Python read_odenis birebir). */
function readOdenis(rows: unknown[][]): Map<string, Acc> {
  const out = new Map<string, Acc>()
  for (let i = 1; i < rows.length; i++) {          // min_row=2 → indeks 1-dən
    const r = rows[i] ?? []
    const f = r[0], typ = r[1], val = r[2]
    if (f == null || typeof val !== 'number' || !isFinite(val)) continue
    const fl = String(f).trim()
    if (TOTAL_RE.test(fl)) continue
    const kanon = normalizeFilial(fl)
    if (!kanon || EXCLUDE.has(kanon) || EXCLUDE.has(fl)) continue
    const tl = lc(typ)
    const o = out.get(kanon) ?? { xam: fl, total: 0, wolt: 0, bolt: 0, deliv: 0 }
    o.total += val
    if (tl.includes('wolt')) { o.wolt += val; o.deliv += val }
    else if (tl.includes('bolt')) { o.bolt += val; o.deliv += val }
    else if (['yango', 'storefront', 'delivery', 'seabreeze'].some(k => tl.includes(k))) o.deliv += val
    out.set(kanon, o)
  }
  return out
}

/** (Opsional) YoY vərəqi → filial başına {d2026, d2025} (Python read_yoy: col 2 və 6, row 4-dən). */
function readYoy(rows: unknown[][]): Map<string, { d2026: number | null; d2025: number | null }> {
  const out = new Map<string, { d2026: number | null; d2025: number | null }>()
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null)
  for (let i = 3; i < rows.length; i++) {          // min_row=4 → indeks 3-dən
    const r = rows[i] ?? []
    if (!r[0]) continue
    const raw = String(r[0]).trim()
    if (lc(raw).includes('cəmi') || lc(raw).includes('cemi')) continue
    const kanon = normalizeFilial(raw)
    if (!kanon || EXCLUDE.has(kanon)) continue
    out.set(kanon, { d2026: num(r[2]), d2025: num(r[6]) })
  }
  return out
}

export function parseDelivery(odenis: SheetInput, yoySheet?: SheetInput | null): DeliveryResult {
  const uyarilar: string[] = []
  const od = readOdenis(odenis.rows)
  const yoy = yoySheet ? readYoy(yoySheet.rows) : null
  if (od.size === 0) uyarilar.push('Ödəniş növü vərəqində filial/məbləğ tapılmadı ([filial, tip, məbləğ] gözlənilir).')

  const branches: BranchDelivery[] = []
  let nTotal = 0, nWolt = 0, nBolt = 0, nDeliv = 0, eslesen = 0
  let nd2026 = 0, nd2025 = 0

  for (const [kanon, o] of od) {
    const bolge = BRANCH_TO_REGION[kanon] ?? null
    const eslesdi = bolge != null
    const y = yoy?.get(kanon)
    const deliveryYoy = y && y.d2025 && y.d2026 ? y.d2026 / y.d2025 - 1 : null
    branches.push({
      filial: kanon, bolge, eslesdi,
      total: Math.round(o.total), wolt: Math.round(o.wolt), bolt: Math.round(o.bolt), deliv: Math.round(o.deliv),
      deliveryPayi: o.total > 0 ? o.deliv / o.total : null,
      woltPayi: o.deliv > 0 ? o.wolt / o.deliv : null,
      deliveryYoy,
    })
    nTotal += o.total; nWolt += o.wolt; nBolt += o.bolt; nDeliv += o.deliv
    if (eslesdi) eslesen++
    if (y?.d2026) nd2026 += y.d2026
    if (y?.d2025) nd2025 += y.d2025
  }

  branches.sort((a, b) => b.deliv - a.deliv)

  return {
    branches,
    network: {
      total: Math.round(nTotal), wolt: Math.round(nWolt), bolt: Math.round(nBolt), deliv: Math.round(nDeliv),
      deliveryPayi: nTotal > 0 ? nDeliv / nTotal : null,
      woltPayi: nDeliv > 0 ? nWolt / nDeliv : null,
      deliveryYoy: nd2025 > 0 ? nd2026 / nd2025 - 1 : null,
    },
    meta: { okunan: branches.length, eslesen, eslesmeyen: branches.length - eslesen, uyarilar },
  }
}
