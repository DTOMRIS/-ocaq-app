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

// İ/ı normalize: "PLAN İYUL"/"proqnoz İYUL" → "plan iyul"/"proqnoz iyul" (nöqtəli İ birləşən işarəsini sil)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function parseTargets(rows: unknown[][], year = 2026): TargetRow[] {
  // Başlıq: müəssisə + (plan VEYA proqnoz) sütunu olan sətir
  const hi = rows.findIndex(r => r?.some(c => /müəssisə|ticarət|filial/i.test(String(c ?? ''))) && r?.some(c => /plan|proqnoz/i.test(String(c ?? ''))))
  if (hi < 0) return []
  const hdr = (rows[hi] ?? []).map(c => norm(String(c ?? '')))
  const iF = hdr.findIndex(h => /müəssisə|ticarət|filial/.test(h))
  if (iF < 0) return []
  const planCols: { col: number; month: string }[] = []
  hdr.forEach((h, col) => {
    if (!/plan|proqnoz/.test(h)) return           // "avqust plan", "PLAN İYUL", "proqnoz İYUL"
    for (const [name, mm] of Object.entries(MONTHS)) {
      if (h.includes(name)) { planCols.push({ col, month: `${year}-${mm}` }); return }
    }
  })
  const out: TargetRow[] = []
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const f = String(r[iF] ?? '').trim()
    // ara-toplam — AMA "Əcəmi" (filial) yanlış eşleşməsin: cəmi yalnız hərfdən sonra deyilsə
    if (!f || /total|yekun|ümumi|(?<!\p{L})c[əe]mi/iu.test(f)) continue
    for (const pc of planCols) {
      const amt = num(r[pc.col])
      if (amt && amt > 0) out.push({ filial: f, month: pc.month, amount: Math.round(amt) })
    }
  }
  return out
}
