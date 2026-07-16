import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { complaints } from '@/db/schema/complaints'
import { audit_logs } from '@/db/schema/auth'
import { and, eq } from 'drizzle-orm'
import { canAccessBranch, canAccessUser } from '@/lib/branch-access'

const STATUSES = ['new', 'in_review', 'sent_to_branch', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'normal', 'high', 'critical'] as const
const FAULTS = ['unknown', 'restaurant', 'platform', 'courier', 'customer'] as const

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [existing] = await db
    .select({
      id: complaints.id,
      branch_id: complaints.branch_id,
      created_by: complaints.created_by,
    })
    .from(complaints)
    .where(
      and(
        eq(complaints.id, id),
        eq(complaints.tenant_id, session.user.tenant_id),
      ),
    )
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })

  if (session.user.role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  if (!await canAccessBranch(session.user, existing.branch_id)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date() }

  if (isOneOf(STATUSES, body.status)) {
    updates.status = body.status
    if (body.status === 'resolved') updates.resolved_at = new Date()
    if (body.status === 'closed') updates.closed_at = new Date()
  }
  if (session.user.role !== 'branch_manager' && isOneOf(PRIORITIES, body.priority)) {
    updates.priority = body.priority
  }
  if (session.user.role !== 'branch_manager' && isOneOf(FAULTS, body.fault)) {
    updates.fault = body.fault
  }

  for (const field of ['action_taken', 'resolution_note']) {
    if (body[field] !== undefined) updates[field] = body[field] || null
  }
  if (body.rating !== undefined) {
    const rating = body.rating === null || body.rating === '' ? null : Number(body.rating)
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Müştəri balı 1–5 arasında olmalıdır' }, { status: 400 })
    }
    updates.rating = rating
  }

  if (body.assigned_to !== undefined && session.user.role !== 'branch_manager') {
    if (body.assigned_to) {
      if (!await canAccessUser(session.user, body.assigned_to)) {
        return NextResponse.json({ error: 'Təyin edilən istifadəçi tapılmadı' }, { status: 400 })
      }
    }
    updates.assigned_to = body.assigned_to || null
  }

  if (body.branch_id !== undefined) {
    if (session.user.role === 'branch_manager') {
      return NextResponse.json({ error: 'Filialı dəyişmək icazəniz yoxdur' }, { status: 403 })
    }
    if (!body.branch_id || !await canAccessBranch(session.user, body.branch_id)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }
    updates.branch_id = body.branch_id
  }

  await db.update(complaints).set(updates).where(eq(complaints.id, id))

  await db.insert(audit_logs).values({
    tenant_id: session.user.tenant_id,
    user_id: session.user.id,
    action: 'complaint.update',
    entity: 'complaint',
    entity_id: id,
    metadata: JSON.stringify(Object.keys(body)),
  })

  return NextResponse.json({ success: true })
}
