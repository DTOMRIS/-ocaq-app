import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { sales_targets } from '@/db/schema/sales'
import { branches } from '@/db/schema/branches'
import { normalizeFilial } from '@/lib/analytics/filial-map'

// Toplu satış hədəfi — PLAN.xlsx-dən parse edilmiş (filial×ay×məbləğ) → sales_targets upsert.
// Yalnız super_admin. Mövcud /sales axınına toxunmur, yalnız data yazır.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  try {
    const body = await req.json() as { targets?: Array<{ filial: string; month: string; amount: number }> }
    const targets = Array.isArray(body.targets) ? body.targets : []
    if (!targets.length) return NextResponse.json({ error: 'Hədəf tapılmadı' }, { status: 400 })
    const tenantId = session.user.tenant_id

    // filial adı → branch_id
    const tb = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.tenant_id, tenantId))
    const byName = new Map(tb.map(b => [normalizeFilial(b.name)?.toLowerCase() ?? b.name.trim().toLowerCase(), b.id]))

    let saved = 0
    const unmatched = new Set<string>()
    for (const t of targets) {
      const key = normalizeFilial(t.filial)?.toLowerCase() ?? t.filial.trim().toLowerCase()
      const bid = byName.get(key)
      if (!bid) { unmatched.add(t.filial); continue }
      const month = `${t.month}-01`
      // upsert: varsa güncelle, yoxdursa əlavə et
      const [ex] = await db.select({ id: sales_targets.id }).from(sales_targets)
        .where(and(eq(sales_targets.tenant_id, tenantId), eq(sales_targets.branch_id, bid), eq(sales_targets.month, month))).limit(1)
      if (ex) {
        await db.update(sales_targets).set({ target_amount: String(t.amount), updated_at: new Date() }).where(eq(sales_targets.id, ex.id))
      } else {
        await db.insert(sales_targets).values({ tenant_id: tenantId, branch_id: bid, month, target_amount: String(t.amount), created_by: session.user.id })
      }
      saved++
    }
    return NextResponse.json({ ok: true, saved, unmatched: [...unmatched] }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
