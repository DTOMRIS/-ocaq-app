import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { complaints } from '@/db/schema/complaints'
import { branches } from '@/db/schema/branches'
import { audit_logs } from '@/db/schema/auth'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { accessibleBranchIds, canAccessBranch } from '@/lib/branch-access'

const CHANNELS = ['wolt', 'bolt', 'phone', 'whatsapp', 'instagram', 'in_store', 'other'] as const
const CATEGORIES = ['late_delivery', 'missing_item', 'wrong_item', 'cold_food', 'packaging', 'courier_behavior', 'food_quality', 'refund', 'pricing', 'other'] as const
const PRIORITIES = ['low', 'normal', 'high', 'critical'] as const
const STATUSES = ['new', 'in_review', 'sent_to_branch', 'resolved', 'closed'] as const
const FAULTS = ['unknown', 'restaurant', 'platform', 'courier', 'customer'] as const

type Channel = typeof CHANNELS[number]
type Category = typeof CATEGORIES[number]
type Priority = typeof PRIORITIES[number]
type Status = typeof STATUSES[number]
type Fault = typeof FAULTS[number]

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

function responseDueFor(priority: Priority) {
  if (priority === 'critical') return addHours(1)
  if (priority === 'high') return addHours(4)
  if (priority === 'normal') return addHours(24)
  return addHours(48)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branch_id')
  const status = searchParams.get('status')
  const channel = searchParams.get('channel')

  const filters = [
    eq(complaints.tenant_id, session.user.tenant_id),
    ...(isOneOf(STATUSES, status) ? [eq(complaints.status, status)] : []),
    ...(isOneOf(CHANNELS, channel) ? [eq(complaints.channel, channel)] : []),
  ]

  if (session.user.role !== 'super_admin') {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) return NextResponse.json([])
    if (branchId && !branchIds.includes(branchId)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }
    filters.push(branchId
      ? eq(complaints.branch_id, branchId)
      : inArray(complaints.branch_id, branchIds))
  } else if (branchId) {
    if (!await canAccessBranch(session.user, branchId)) {
      return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
    }
    filters.push(eq(complaints.branch_id, branchId))
  }

  const list = await db
    .select({
      id: complaints.id,
      branch_id: complaints.branch_id,
      branch_code: branches.code,
      branch_name: branches.name,
      channel: complaints.channel,
      category: complaints.category,
      priority: complaints.priority,
      status: complaints.status,
      fault: complaints.fault,
      customer_name: complaints.customer_name,
      customer_phone: complaints.customer_phone,
      platform_order_id: complaints.platform_order_id,
      order_total: complaints.order_total,
      refund_amount: complaints.refund_amount,
      title: complaints.title,
      description: complaints.description,
      action_taken: complaints.action_taken,
      resolution_note: complaints.resolution_note,
      response_due_at: complaints.response_due_at,
      resolved_at: complaints.resolved_at,
      closed_at: complaints.closed_at,
      rating: complaints.rating,
      created_at: complaints.created_at,
      updated_at: complaints.updated_at,
    })
    .from(complaints)
    .leftJoin(branches, eq(complaints.branch_id, branches.id))
    .where(and(...filters))
    .orderBy(desc(complaints.created_at))

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const channel: Channel = isOneOf(CHANNELS, body.channel) ? body.channel : 'other'
  const category: Category = isOneOf(CATEGORIES, body.category) ? body.category : 'other'
  const priority: Priority = isOneOf(PRIORITIES, body.priority) ? body.priority : 'normal'
  const status: Status = isOneOf(STATUSES, body.status) ? body.status : 'new'
  const fault: Fault = isOneOf(FAULTS, body.fault) ? body.fault : 'unknown'

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const branchId = typeof body.branch_id === 'string' && body.branch_id ? body.branch_id : null
  const rating = body.rating === null || body.rating === undefined || body.rating === ''
    ? null
    : Number(body.rating)

  if (!title || !description) {
    return NextResponse.json({ error: 'Başlıq və təsvir tələb olunur' }, { status: 400 })
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'Müştəri balı 1–5 arasında olmalıdır' }, { status: 400 })
  }

  if (branchId && !await canAccessBranch(session.user, branchId)) {
    return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
  }
  if (session.user.role !== 'super_admin' && !branchId) {
    return NextResponse.json({ error: 'Filial tələb olunur' }, { status: 400 })
  }

  const [complaint] = await db
    .insert(complaints)
    .values({
      tenant_id: session.user.tenant_id,
      branch_id: branchId,
      created_by: session.user.id,
      channel,
      category,
      priority,
      status: session.user.role === 'super_admin' ? status : 'new',
      fault,
      customer_name: typeof body.customer_name === 'string' ? body.customer_name.trim() || null : null,
      customer_phone: typeof body.customer_phone === 'string' ? body.customer_phone.trim() || null : null,
      platform_order_id: typeof body.platform_order_id === 'string' ? body.platform_order_id.trim() || null : null,
      order_total: body.order_total || null,
      refund_amount: body.refund_amount || null,
      title,
      description,
      action_taken: typeof body.action_taken === 'string' ? body.action_taken.trim() || null : null,
      response_due_at: responseDueFor(priority),
      rating,
    })
    .returning()

  await db.insert(audit_logs).values({
    tenant_id: session.user.tenant_id,
    user_id: session.user.id,
    action: 'complaint.create',
    entity: 'complaint',
    entity_id: complaint.id,
    metadata: JSON.stringify({ channel, category, priority, branch_id: branchId }),
  })

  return NextResponse.json(complaint, { status: 201 })
}
