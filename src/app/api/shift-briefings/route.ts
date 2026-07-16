import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { shift_briefings, shift_customer_conversations } from '@/db/schema/operations'
import { accessibleBranchIds } from '@/lib/message-audience'

const SHIFTS = new Set(['morning', 'evening', 'night'])
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (session.user.role === 'staff') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  const actor = { id: session.user.id, tenant_id: session.user.tenant_id, role: session.user.role }
  const branchIds = await accessibleBranchIds(actor)
  if (!branchIds.length) return NextResponse.json([])

  const branchId = req.nextUrl.searchParams.get('branch_id')
  const shiftDate = req.nextUrl.searchParams.get('date')
  if (branchId && !branchIds.includes(branchId)) {
    return NextResponse.json({ error: 'Bu filiala giriş icazəniz yoxdur' }, { status: 403 })
  }

  const conditions = [
    eq(shift_briefings.tenant_id, session.user.tenant_id),
    branchId ? eq(shift_briefings.branch_id, branchId) : inArray(shift_briefings.branch_id, branchIds),
  ]
  if (shiftDate) {
    if (!DATE_PATTERN.test(shiftDate)) return NextResponse.json({ error: 'Tarix düzgün deyil' }, { status: 400 })
    conditions.push(eq(shift_briefings.shift_date, shiftDate))
  }

  const briefings = await db.select({
    id: shift_briefings.id,
    branch_id: shift_briefings.branch_id,
    branch_name: branches.name,
    shift_date: shift_briefings.shift_date,
    shift: shift_briefings.shift,
    status: shift_briefings.status,
    service_focus: shift_briefings.service_focus,
    sales_focus: shift_briefings.sales_focus,
    sales_target: shift_briefings.sales_target,
    quality_focus: shift_briefings.quality_focus,
    training_completed_count: shift_briefings.training_completed_count,
    training_pending_count: shift_briefings.training_pending_count,
    manager_note: shift_briefings.manager_note,
    handover_note: shift_briefings.handover_note,
    completed_at: shift_briefings.completed_at,
    created_at: shift_briefings.created_at,
  }).from(shift_briefings).innerJoin(branches, eq(branches.id, shift_briefings.branch_id)).where(and(...conditions)).orderBy(desc(shift_briefings.shift_date), desc(shift_briefings.created_at)).limit(100)

  if (!briefings.length) return NextResponse.json([])
  const notes = await db.select().from(shift_customer_conversations).where(and(
    eq(shift_customer_conversations.tenant_id, session.user.tenant_id),
    inArray(shift_customer_conversations.briefing_id, briefings.map((item) => item.id)),
  )).orderBy(shift_customer_conversations.sequence)

  return NextResponse.json(briefings.map((briefing) => ({
    ...briefing,
    conversations: notes.filter((note) => note.briefing_id === briefing.id),
  })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (session.user.role !== 'branch_manager') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const branchId = typeof body?.branch_id === 'string' ? body.branch_id : ''
  const shiftDate = typeof body?.shift_date === 'string' ? body.shift_date : ''
  const shift = typeof body?.shift === 'string' ? body.shift : ''
  if (!branchId || !DATE_PATTERN.test(shiftDate) || !SHIFTS.has(shift)) {
    return NextResponse.json({ error: 'Filial, tarix və növbə düzgün seçilməlidir' }, { status: 400 })
  }

  const branchIds = await accessibleBranchIds({ id: session.user.id, tenant_id: session.user.tenant_id, role: session.user.role })
  if (!branchIds.includes(branchId)) return NextResponse.json({ error: 'Bu filiala giriş icazəniz yoxdur' }, { status: 403 })

  const existing = await db.select({ id: shift_briefings.id }).from(shift_briefings).where(and(
    eq(shift_briefings.tenant_id, session.user.tenant_id),
    eq(shift_briefings.branch_id, branchId),
    eq(shift_briefings.shift_date, shiftDate),
    eq(shift_briefings.shift, shift),
  )).limit(1)
  if (existing.length) return NextResponse.json({ error: 'Bu filial, tarix və növbə üçün toplantı artıq mövcuddur', id: existing[0].id }, { status: 409 })

  try {
    const [created] = await db.insert(shift_briefings).values({
      tenant_id: session.user.tenant_id,
      branch_id: branchId,
      shift_date: shiftDate,
      shift,
      created_by: session.user.id,
      service_focus: cleanText(body?.service_focus, 1000),
      sales_focus: cleanText(body?.sales_focus, 1000),
      sales_target: cleanText(body?.sales_target, 200),
      quality_focus: cleanText(body?.quality_focus, 1000),
      manager_note: cleanText(body?.manager_note, 2000),
      handover_note: cleanText(body?.handover_note, 3000),
      training_completed_count: nonNegativeInteger(body?.training_completed_count),
      training_pending_count: nonNegativeInteger(body?.training_pending_count),
    }).returning()
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: 'Bu növbə toplantısı artıq mövcuddur' }, { status: 409 })
    console.error('Shift briefing create error:', error)
    return NextResponse.json({ error: 'Toplantı yaradıla bilmədi' }, { status: 500 })
  }
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : 0
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
