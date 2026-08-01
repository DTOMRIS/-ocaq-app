// ─── Menü / food cost parser (Maya ve Qiymet Analizi raporu) ─────────────────
// "Menyu Analizi" sheet: Kateqoriya | Məhsul | Variant | Menyu qiyməti | Maya | Food Cost % | Brüt marja
// Food cost analizi (kritik/əla ürünler) — Kasavana-Smith matrisi ayrıca prodmix (ədəd) istəyir.

export type MenuProduct = {
  kateqoriya: string; mehsul: string; variant: string
  qiymet: number; maya: number; foodCost: number; marja: number
}
export type MenuResult = {
  products: MenuProduct[]
  summary: { n: number; avgFoodCost: number; kritik: number; ela: number; diqqet: number; enPis: MenuProduct | null }
}

function num(s: unknown): number | null {
  if (typeof s === 'number') return isFinite(s) ? s : null
  let t = String(s ?? '').replace(/[₼%\s    ]/g, '').replace(/,(\d{3})/g, '$1').replace(',', '.')
  const n = parseFloat(t)
  return isFinite(n) ? n : null
}
// Food cost: "14.1%"→0.141, "0.141"→0.141
function fc(s: unknown): number | null {
  const raw = String(s ?? '')
  const n = num(raw)
  if (n == null) return null
  return raw.includes('%') || n > 1 ? n / 100 : n
}

export function parseMenu(rows: unknown[][]): MenuResult {
  const empty: MenuResult = { products: [], summary: { n: 0, avgFoodCost: 0, kritik: 0, ela: 0, diqqet: 0, enPis: null } }
  const hi = rows.findIndex(r => r?.some(c => /kateqoriya/i.test(String(c ?? ''))) && r?.some(c => /food\s*cost/i.test(String(c ?? ''))))
  if (hi < 0) return empty
  const hdr = (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase())
  const iK = hdr.findIndex(h => /kateqoriya/.test(h))
  const iM = hdr.findIndex(h => /məhsul|mehsul/.test(h))
  const iV = hdr.findIndex(h => /variant/.test(h))
  const iQ = hdr.findIndex(h => /qiymət|qiymet/.test(h))
  const iMy = hdr.findIndex(h => /maya/.test(h))
  const iF = hdr.findIndex(h => /food\s*cost/.test(h))
  const iBr = hdr.findIndex(h => /marja/.test(h))
  const products: MenuProduct[] = []
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const mehsul = String(r[iM] ?? '').trim()
    const foodCost = fc(r[iF])
    if (!mehsul || foodCost == null) continue
    products.push({
      kateqoriya: String(r[iK] ?? '').trim(),
      mehsul, variant: iV >= 0 ? String(r[iV] ?? '').trim() : '',
      qiymet: num(r[iQ]) ?? 0, maya: iMy >= 0 ? (num(r[iMy]) ?? 0) : 0,
      foodCost, marja: iBr >= 0 ? (num(r[iBr]) ?? 0) : 0,
    })
  }
  if (!products.length) return empty
  const avgFoodCost = products.reduce((s, p) => s + p.foodCost, 0) / products.length
  const kritik = products.filter(p => p.foodCost > 0.40).length
  const ela = products.filter(p => p.foodCost < 0.25).length
  const diqqet = products.filter(p => p.foodCost >= 0.25 && p.foodCost <= 0.40).length
  const enPis = [...products].sort((a, b) => b.foodCost - a.foodCost)[0] ?? null
  return { products, summary: { n: products.length, avgFoodCost, kritik, ela, diqqet, enPis } }
}
