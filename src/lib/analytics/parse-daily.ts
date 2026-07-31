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
  const region: Record<string, number> = {}
  for (const b of Object.values(branch)) region[b.bolge ?? '?'] = (region[b.bolge ?? '?'] ?? 0) + b.total
  return {
    period: days.length ? days[0].slice(0, 7) : null,
    gun, days, daily,
    branches: Object.entries(branch).map(([filial, v]) => ({ filial, ...v })).sort((a, b) => b.total - a.total),
    regions: Object.entries(region).sort((a, b) => b[1] - a[1]),
    pay,
    toplam: Math.round(toplam),
    gedisat: Math.round(toplam / gun * 31),
    uyarilar,
  }
}

function empty(uyarilar: string[]): DailyResult {
  return { period: null, gun: 0, days: [], daily: {}, branches: [], regions: [], pay: { nagd: 0, kart: 0, wolt: 0, bolt: 0 }, toplam: 0, gedisat: 0, uyarilar }
}
