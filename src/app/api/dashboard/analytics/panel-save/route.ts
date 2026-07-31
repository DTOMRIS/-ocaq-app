import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { analytics_ingest, analytics_branch } from '@/db/schema/analytics'
import { branches } from '@/db/schema/branches'

// Panel verisini (parse edilmiş, client-side) DB-yə yazır ki qalıcı olsun — hər dəfə yükləmə lazım olmasın.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  try {
    const body = await req.json() as {
      period?: string; toplam?: number
      daily?: unknown; plan?: unknown
      branches?: Array<{ filial: string; bolge?: string | null; total?: number; wolt?: number; bolt?: number; plan?: number; gedisat?: number }>
    }
    const period = String(body.period ?? '')
    if (!period) return NextResponse.json({ error: 'Dövr tapılmadı' }, { status: 400 })
    const tenantId = session.user.tenant_id
    const blob = JSON.stringify({ daily: body.daily ?? null, plan: body.plan ?? null })
    const sha = createHash('sha256').update(blob).digest('hex').slice(0, 40)

    const [existing] = await db.select({ id: analytics_ingest.id }).from(analytics_ingest)
      .where(and(eq(analytics_ingest.tenant_id, tenantId), eq(analytics_ingest.period, period), eq(analytics_ingest.source_sha256, sha)))
      .limit(1)
    if (existing) return NextResponse.json({ ok: true, ingestId: existing.id, duplicate: true }, { status: 200 })

    const [ins] = await db.insert(analytics_ingest).values({
      tenant_id: tenantId, period, engine_version: 'panel-1.0', source_sha256: sha,
      imported_total: String(body.toplam ?? 0), network: blob, status: 'published', generated_at: new Date(),
    }).returning({ id: analytics_ingest.id })

    if (Array.isArray(body.branches) && body.branches.length) {
      const tb = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.tenant_id, tenantId))
      const byName = new Map(tb.map(b => [b.name.trim().toLowerCase(), b.id]))
      await db.insert(analytics_branch).values(body.branches.map(b => ({
        tenant_id: tenantId, ingest_id: ins.id, filial: String(b.filial), bolge: b.bolge ?? null,
        branch_id: byName.get(String(b.filial).trim().toLowerCase()) ?? null, metrics: JSON.stringify(b),
      })))
    }
    return NextResponse.json({ ok: true, ingestId: ins.id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
