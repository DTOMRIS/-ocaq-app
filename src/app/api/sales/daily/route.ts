import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { daily_sales } from '@/db/schema/sales'
import { branches } from '@/db/schema/branches'
import { eq, and, gte, lte } from 'drizzle-orm'

// GET — gündəlik satışları al (month filteri: month_start, month_end)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branch_id   = searchParams.get('branch_id')
  const month_start = searchParams.get('month_start') // '2026-07-01'
  const month_end   = searchParams.get('month_end')   // '2026-07-31'

  const conditions = [eq(daily_sales.tenant_id, session.user.tenant_id)]
  if (branch_id) conditions.push(eq(daily_sales.branch_id, branch_id))
  if (month_start) conditions.push(gte(daily_sales.sale_date, month_start))
  if (month_end) conditions.push(lte(daily_sales.sale_date, month_end))

  // branch_manager yalnız öz filialını
  if (session.user.role === 'branch_manager') {
    const myBranches = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(
        eq(branches.tenant_id, session.user.tenant_id),
        eq(branches.manager_id, session.user.id),
      ))
    if (myBranches.length === 0) return NextResponse.json([])
    conditions.push(eq(daily_sales.branch_id, myBranches[0].id))
  }

  const list = await db
    .select()
    .from(daily_sales)
    .where(and(...conditions))
    .orderBy(daily_sales.sale_date)

  return NextResponse.json(list)
}

// POST — gündəlik satış daxil et (branch_manager + region_manager)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  if (role !== 'super_admin' && role !== 'region_manager' && role !== 'branch_manager') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const { branch_id, sale_date, amount, notes } = body

  if (!branch_id || !sale_date || amount === undefined) {
    return NextResponse.json({ error: 'branch_id, sale_date, amount tələb olunur' }, { status: 400 })
  }

  if (Number(amount) < 0) {
    return NextResponse.json({ error: 'Məbləğ mənfi ola bilməz' }, { status: 400 })
  }

  // branch_manager yalnız öz filialına yaza bilər
  if (role === 'branch_manager') {
    const myBranch = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(
        eq(branches.id, branch_id),
        eq(branches.manager_id, session.user.id),
      ))
    if (myBranch.length === 0) {
      return NextResponse.json({ error: 'Bu filial sizə aid deyil' }, { status: 403 })
    }
  }

  // day_of_week hesabla
  const dateObj = new Date(sale_date)
  const dayOfWeek = dateObj.getDay() // 0=Sunday

  // Eyni gün + filial dublikat → yenilə
  const existing = await db
    .select({ id: daily_sales.id })
    .from(daily_sales)
    .where(and(
      eq(daily_sales.tenant_id, session.user.tenant_id),
      eq(daily_sales.branch_id, branch_id),
      eq(daily_sales.sale_date, sale_date),
    ))

  if (existing.length > 0) {
    const [updated] = await db
      .update(daily_sales)
      .set({
        amount:      String(amount),
        day_of_week: dayOfWeek,
        notes:       notes ?? null,
        entered_by:  session.user.id,
        updated_at:  new Date(),
      })
      .where(eq(daily_sales.id, existing[0].id))
      .returning()
    return NextResponse.json(updated)
  }

  const [entry] = await db
    .insert(daily_sales)
    .values({
      tenant_id:   session.user.tenant_id,
      branch_id,
      sale_date,
      amount:      String(amount),
      day_of_week: dayOfWeek,
      notes:       notes ?? null,
      entered_by:  session.user.id,
    })
    .returning()

  return NextResponse.json(entry, { status: 201 })
}
