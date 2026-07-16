import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { shift_briefings, shift_customer_conversations } from '@/db/schema/operations'
import { accessibleBranchIds } from '@/lib/message-audience'

type Context = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (session.user.role === 'staff') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  const { id } = await context.params
  const [briefing] = await db.select().from(shift_briefings).where(and(
    eq(shift_briefings.id, id),
    eq(shift_briefings.tenant_id, session.user.tenant_id),
  )).limit(1)
  if (!briefing) return NextResponse.json({ error: 'Toplantı tapılmadı' }, { status: 404 })
  const branches = await accessibleBranchIds({ id: session.user.id, tenant_id: session.user.tenant_id, role: session.user.role })
  if (!branches.includes(briefing.branch_id)) return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  const conversations = await db.select().from(shift_customer_conversations).where(and(
    eq(shift_customer_conversations.briefing_id, id),
    eq(shift_customer_conversations.tenant_id, session.user.tenant_id),
  )).orderBy(shift_customer_conversations.sequence)
  return NextResponse.json({ ...briefing, conversations })
}

export async function PATCH(req: NextRequest, context: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const { id } = await context.params
  const [briefing] = await db.select().from(shift_briefings).where(and(
    eq(shift_briefings.id, id),
    eq(shift_briefings.tenant_id, session.user.tenant_id),
  )).limit(1)
  if (!briefing) return NextResponse.json({ error: 'Toplantı tapılmadı' }, { status: 404 })
  const branches = await accessibleBranchIds({ id: session.user.id, tenant_id: session.user.tenant_id, role: session.user.role })
  if (!branches.includes(briefing.branch_id)) return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  if (briefing.status === 'completed') return NextResponse.json({ error: 'Tamamlanmış toplantı dəyişdirilə bilməz' }, { status: 409 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const completing = body?.status === 'completed'
  const handoverNote = body?.handover_note === undefined ? briefing.handover_note : cleanText(body.handover_note, 3000)
  if (completing) {
    const notes = await db.select({ note: shift_customer_conversations.note }).from(shift_customer_conversations).where(and(
      eq(shift_customer_conversations.briefing_id, id),
      eq(shift_customer_conversations.tenant_id, session.user.tenant_id),
    ))
    if (notes.length !== 5 || notes.some((item) => !item.note.trim())) {
      return NextResponse.json({ error: 'Toplantını bitirmək üçün 5 müştəri söhbəti qeyd edilməlidir' }, { status: 400 })
    }
    if (!handoverNote) return NextResponse.json({ error: 'Növbə təhvil qeydi tələb olunur' }, { status: 400 })
  }

  const updates: Partial<typeof shift_briefings.$inferInsert> = { updated_at: new Date() }
  assignText(updates, body, 'service_focus', 1000)
  assignText(updates, body, 'sales_focus', 1000)
  assignText(updates, body, 'sales_target', 200)
  assignText(updates, body, 'quality_focus', 1000)
  assignText(updates, body, 'manager_note', 2000)
  if (body?.handover_note !== undefined) updates.handover_note = handoverNote
  if (body?.training_completed_count !== undefined) updates.training_completed_count = nonNegativeInteger(body.training_completed_count)
  if (body?.training_pending_count !== undefined) updates.training_pending_count = nonNegativeInteger(body.training_pending_count)
  if (completing) {
    updates.status = 'completed'
    updates.completed_at = new Date()
  }

  const [updated] = await db.update(shift_briefings).set(updates).where(and(
    eq(shift_briefings.id, id),
    eq(shift_briefings.tenant_id, session.user.tenant_id),
    eq(shift_briefings.status, 'draft'),
  )).returning()
  if (!updated) return NextResponse.json({ error: 'Toplantı artıq tamamlanıb' }, { status: 409 })
  return NextResponse.json(updated)
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : 0
}

function assignText(target: Record<string, unknown>, source: Record<string, unknown> | null, key: string, max: number) {
  if (source?.[key] !== undefined) target[key] = cleanText(source[key], max)
}
