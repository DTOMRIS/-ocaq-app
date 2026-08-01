// ─── Toplu satış hədəfi parser (PLAN.xlsx: filial × aylıq plan) ───────────────
// Header: Ticarət müəssisəsi | ... | PLAN İYUL | ... | avqust plan | sentyabr plan | ...
// Hər "<ay> plan" sütunu həmin ayın hədəfi. sales_targets-ə (branch × month × amount) yazılır.

const MONTHS: Record<string, string> = {
  yanvar: '01', fevral: '02', mart: '03', aprel: '04', may: '05', iyun: '06',
  iyul: '07', avqust: '08', avgust: '08', sentyabr: '09', sentabr: '09',
  oktyabr: '10', noyabr: '11', dekabr: '12',
}

export type TargetRow = { filial: string; month: string; amount: number }

function num(s: unknown): number | null {
  if (typeof s === 'number') return isFinite(s) ? s : null
  const t = String(s ?? '').replace(/[₼\s    ]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.')
  const n = parseFloat(t)
  return isFinite(n) ? n : null
}

export function parseTargets(rows: unknown[][], year = 2026): TargetRow[] {
  const hi = rows.findIndex(r => r?.some(c => /müəssisə|ticarət|filial/i.test(String(c ?? ''))) && r?.some(c => /plan/i.test(String(c ?? ''))))
  if (hi < 0) return []
  const hdr = (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase())
  const iF = hdr.findIndex(h => /müəssisə|ticarət|filial/.test(h))
  if (iF < 0) return []
  const planCols: { col: number; month: string }[] = []
  hdr.forEach((h, col) => {
    if (!/plan/.test(h)) return
    for (const [name, mm] of Object.entries(MONTHS)) {
      if (h.includes(name)) { planCols.push({ col, month: `${year}-${mm}` }); return }
    }
  })
  const out: TargetRow[] = []
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const f = String(r[iF] ?? '').trim()
    if (!f || /total|cəmi|cemi|yekun/i.test(f)) continue
    for (const pc of planCols) {
      const amt = num(r[pc.col])
      if (amt && amt > 0) out.push({ filial: f, month: pc.month, amount: Math.round(amt) })
    }
  }
  return out
}
