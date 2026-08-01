import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { sales_targets } from '@/db/schema/sales'
import { branches } from '@/db/schema/branches'
import { analytics_ingest } from '@/db/schema/analytics'
import { normalizeFilial } from '@/lib/analytics/filial-map'

// Toplu satış hədəfi — PLAN.xlsx-dən parse edilmiş (filial×ay×məbləğ) → sales_targets upsert.
// Yalnız super_admin. Mövcud /sales axınına toxunmur, yalnız data yazır.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  try {
    const body = await req.json() as {
      targets?: Array<{ filial: string; month: string; amount: number }>
      yoyRef?: Array<{ filial: string; month: string; y2025: number }>
    }
    const targets = Array.isArray(body.targets) ? body.targets : []
    if (!targets.length) return NextResponse.json({ error: 'Hədəf tapılmadı' }, { status: 400 })
    const tenantId = session.user.tenant_id

    // filial adı → branch_id
    const tb = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.tenant_id, tenantId))
    const byName = new Map(tb.map(b => [normalizeFilial(b.name)?.toLowerCase() ?? b.name.trim().toLowerCase(), b.id]))

    let saved = 0
    const unmatched = new Set<string>()
    // Paralel chunk (600 sıralı round-trip → timeout riski; chunk-lə sürətləndir)
    const CHUNK = 15
    for (let i = 0; i < targets.length; i += CHUNK) {
      await Promise.all(targets.slice(i, i + CHUNK).map(async t => {
        const key = normalizeFilial(t.filial)?.toLowerCase() ?? t.filial.trim().toLowerCase()
        const bid = byName.get(key)
        if (!bid) { unmatched.add(t.filial); return }
        const month = `${t.month}-01`
        const [ex] = await db.select({ id: sales_targets.id }).from(sales_targets)
          .where(and(eq(sales_targets.tenant_id, tenantId), eq(sales_targets.branch_id, bid), eq(sales_targets.month, month))).limit(1)
        if (ex) {
          await db.update(sales_targets).set({ target_amount: String(t.amount), updated_at: new Date() }).where(eq(sales_targets.id, ex.id))
        } else {
          await db.insert(sales_targets).values({ tenant_id: tenantId, branch_id: bid, month, target_amount: String(t.amount), created_by: session.user.id })
        }
        saved++
      }))
    }
    // Keçən il (2025) referansı — qalıcı saxla ki Panel-də YoY avtomatik gəlsin (təkrar yükləmə yox).
    // Additiv: xəta olsa belə hədəf saxlanması pozulmur.
    let refSaved = 0
    try {
      const ref = Array.isArray(body.yoyRef) ? body.yoyRef : []
      if (ref.length) {
        const map: Record<string, Record<string, number>> = {}   // { '2026-08': { 'Seabreeze': 165945, … } }
        for (const r of ref) {
          if (!r?.filial || !r?.month || !(r.y2025 > 0)) continue
          ;(map[r.month] ??= {})[normalizeFilial(r.filial) ?? r.filial] = Math.round(r.y2025)
          refSaved++
        }
        const blob = JSON.stringify(map)
        const sha = createHash('sha256').update(blob).digest('hex').slice(0, 40)
        const [ex] = await db.select({ id: analytics_ingest.id }).from(analytics_ingest)
          .where(and(eq(analytics_ingest.tenant_id, tenantId), eq(analytics_ingest.engine_version, 'yoyref-1.0'))).limit(1)
        if (ex) {
          await db.update(analytics_ingest).set({ network: blob, source_sha256: sha, generated_at: new Date() }).where(eq(analytics_ingest.id, ex.id))
        } else {
          await db.insert(analytics_ingest).values({
            tenant_id: tenantId, period: 'ref', engine_version: 'yoyref-1.0', source_sha256: sha,
            imported_total: '0', network: blob, status: 'published', generated_at: new Date(),
          })
        }
      }
    } catch { /* referans saxlama xətası hədəfi pozmasın */ }

    return NextResponse.json({ ok: true, saved, unmatched: [...unmatched], refSaved }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
