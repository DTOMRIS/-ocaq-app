import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { complaints } from '@/db/schema/complaints'
import { branches } from '@/db/schema/branches'
import { audit_logs } from '@/db/schema/auth'
import { and, eq } from 'drizzle-orm'

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
      branch_manager_id: branches.manager_id,
      created_by: complaints.created_by,
    })
    .from(complaints)
    .leftJoin(branches, eq(complaints.branch_id, branches.id))
    .where(
      and(
        eq(complaints.id, id),
        eq(complaints.tenant_id, session.user.tenant_id),
      ),
    )
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })

  if (
    session.user.role === 'branch_manager' &&
    existing.branch_manager_id !== session.user.id &&
    existing.created_by !== session.user.id
  ) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  if (session.user.role === 'staff' && existing.created_by !== session.user.id) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date() }

  if (isOneOf(STATUSES, body.status)) {
    updates.status = body.status
    if (body.status === 'resolved') updates.resolved_at = new Date()
    if (body.status === 'closed') updates.closed_at = new Date()
  }
  if (isOneOf(PRIORITIES, body.priority)) updates.priority = body.priority
  if (isOneOf(FAULTS, body.fault)) updates.fault = body.fault

  for (const field of ['assigned_to', 'action_taken', 'resolution_note']) {
    if (body[field] !== undefined) updates[field] = body[field] || null
  }

  if (body.branch_id !== undefined) {
    if (session.user.role === 'branch_manager') {
      const [branch] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.id, body.branch_id),
            eq(branches.tenant_id, session.user.tenant_id),
            eq(branches.manager_id, session.user.id),
          ),
        )
        .limit(1)

      if (!branch) return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }
    updates.branch_id = body.branch_id || null
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
