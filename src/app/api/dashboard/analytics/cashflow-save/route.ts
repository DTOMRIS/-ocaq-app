import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { canonBranchKey, normalizeFilial } from '@/lib/analytics/filial-map'

export const runtime = 'nodejs'
export const maxDuration = 60
const MAX_ROWS = 5000
const ISO = /^\d{4}-\d{2}-\d{2}$/

type InRow = { item: string; account: string; date: string; amount: number; branch?: string | null; note?: string | null }

/**
 * Pul axını sətirlərini yazır.
 *
 * DÖVR ƏVƏZLƏMƏ — `analytics_item_fact` ilə eyni məntiq: əvvəl bütün chunk-lar
 * yazılır, SONDA `sweepFrom`-dan köhnə sətirlər silinir. Yükləmə yarıda qırılsa
 * süpürmə çağırılmır → köhnə data toxunulmaz qalır.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  const tenantId = session.user.tenant_id

  try {
    const body = await req.json() as {
      rows?: unknown; source?: unknown
      sweepFrom?: unknown; sweepDays?: unknown; wantSweepFrom?: unknown
    }

    // ── SÜPÜRMƏ — bütün chunk-lar yazıldıqdan SONRA ─────────────────────────
    if (Array.isArray(body.sweepDays)) {
      const days = [...new Set((body.sweepDays as unknown[]).filter((d): d is string => typeof d === 'string' && ISO.test(d)))]
      const from = typeof body.sweepFrom === 'string' ? body.sweepFrom : null
      if (!days.length || !from) return NextResponse.json({ error: 'sweepDays və sweepFrom lazımdır' }, { status: 400 })
      if (days.length > 92) return NextResponse.json({ error: `Maksimum 92 gün (gələn: ${days.length})` }, { status: 400 })
      const q = await sqlClient.query(
        `delete from cashflow_lines
         where tenant_id=$1::uuid and op_date = any($2::date[]) and updated_at < $3::timestamp
         returning 1`, [tenantId, days, from],
      ) as unknown[]
      return NextResponse.json({ ok: true, swept: Array.isArray(q) ? q.length : 0 })
    }

    if (!Array.isArray(body.rows)) return NextResponse.json({ error: 'rows massiv olmalıdır' }, { status: 400 })
    if (body.rows.length > MAX_ROWS) return NextResponse.json({ error: `Maksimum ${MAX_ROWS} sətir` }, { status: 413 })
    const source = typeof body.source === 'string' ? body.source.slice(0, 120) : null

    // Birinci chunk süpürmə həddini alır — INSERT-dən ƏVVƏL
    let sweepFrom: string | null = null
    if (body.wantSweepFrom) {
      const n = await sqlClient.query('select now() as t', []) as Array<{ t: unknown }>
      sweepFrom = n?.[0]?.t ? new Date(String(n[0].t)).toISOString() : null
    }

    const tb = await db.select({ id: branches.id, name: branches.name }).from(branches)
      .where(eq(branches.tenant_id, tenantId))
    const byName = new Map(tb.map(b => [canonBranchKey(b.name), b.id]))

    const valid = (body.rows as InRow[]).filter(r =>
      !!r && typeof r.item === 'string' && !!r.item.trim()
      && typeof r.account === 'string' && !!r.account.trim()
      && typeof r.date === 'string' && ISO.test(r.date)
      && Number.isFinite(Number(r.amount)))

    if (valid.length) {
      await sqlClient.query(`
        insert into cashflow_lines (tenant_id, item, account, op_date, amount, branch, branch_id, note, source)
        select $1::uuid, t.item, t.account, t.op_date, t.amount, t.branch, t.branch_id, t.note, $2::text
        from unnest($3::text[], $4::text[], $5::date[], $6::numeric[], $7::text[], $8::uuid[], $9::text[])
          as t(item, account, op_date, amount, branch, branch_id, note)
      `, [
        tenantId, source,
        valid.map(r => r.item.trim().slice(0, 120)),
        valid.map(r => r.account.trim().slice(0, 60)),
        valid.map(r => r.date),
        valid.map(r => Number(r.amount).toFixed(2)),
        valid.map(r => (r.branch ? normalizeFilial(r.branch) ?? r.branch.trim() : null)),
        valid.map(r => (r.branch ? byName.get(canonBranchKey(r.branch)) ?? null : null)),
        valid.map(r => r.note ?? null),
      ])
    }
    return NextResponse.json({ ok: true, written: valid.length, rejected: body.rows.length - valid.length, sweepFrom })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
