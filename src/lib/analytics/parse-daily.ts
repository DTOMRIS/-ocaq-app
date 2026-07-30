// ─── Günlük Panel parser'ı (Python gunluk extraction portu) ───────────────────
// Satış detayı (Uçot günü + Ödəniş növü uzun format) → günlük seri + filial +
// ödəniş qarışığı + gedişat proyeksiyası. Alt-toplam sətirləri atılır, tarix normalize.

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
  gedisat: number     // gün ort × 31
  uyarilar: string[]
}

const SKIP = /cəmi|cemi|total|yekun|ümumi|grand/i
const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n)

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
  const hi = rows.findIndex(r => r.some(c => /uçot/i.test(String(c ?? ''))))
  const daily: DailyResult['daily'] = {}
  const branch: Record<string, { bolge: string | null; total: number; wolt: number; bolt: number }> = {}
  const pay = { nagd: 0, kart: 0, wolt: 0, bolt: 0 }
  if (hi < 0) { uyarilar.push('Uçot günü başlıqlı sətir tapılmadı.'); return empty(uyarilar) }

  let cf: string | null = null, cg: string | null = null
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const f = r[0], g = r[1], typ = r[2], val = r[3]
    if (f != null && String(f).trim()) cf = String(f).trim()
    const nd = g != null && String(g).trim() ? normDate(g) : null
    if (nd) cg = nd
    const tl = typ ? String(typ).toLowerCase().trim() : ''
    if (!tl || SKIP.test(tl)) continue
    if (typeof val !== 'number' || !isFinite(val) || !cf || !cg) continue
    if (SKIP.test(cf)) continue
    const kanon = normalizeFilial(cf)
    if (!kanon || EXCLUDE.has(kanon)) continue
    const ch = tl.includes('wolt') ? 'wolt' : tl.includes('bolt') ? 'bolt' : null
    const d = daily[cg] ?? (daily[cg] = { total: 0, wolt: 0, bolt: 0 })
    d.total += val
    const b = branch[kanon] ?? (branch[kanon] = { bolge: BRANCH_TO_REGION[kanon] ?? null, total: 0, wolt: 0, bolt: 0 })
    b.total += val
    if (ch) { d[ch] += val; b[ch] += val; pay[ch] += val }
    else if (/nağd|nagd|nəğd/.test(tl)) pay.nagd += val
    else if (/kart|bank|kapital|pos|visa|master/.test(tl)) pay.kart += val
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
