import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { daily_sales } from '@/db/schema/sales'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { accessibleBranchIds, canAccessBranch } from '@/lib/branch-access'

// GET — gündəlik satışları al (month filteri: month_start, month_end)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branch_id   = searchParams.get('branch_id')
  const month_start = searchParams.get('month_start') // '2026-07-01'
  const month_end   = searchParams.get('month_end')   // '2026-07-31'

  const role = session.user.role
  if (role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const conditions = [eq(daily_sales.tenant_id, session.user.tenant_id)]

  if (month_start) conditions.push(gte(daily_sales.sale_date, month_start))
  if (month_end) conditions.push(lte(daily_sales.sale_date, month_end))

  if (role !== 'super_admin') {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) return NextResponse.json([])
    if (branch_id && !branchIds.includes(branch_id)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }
    conditions.push(branch_id
      ? eq(daily_sales.branch_id, branch_id)
      : inArray(daily_sales.branch_id, branchIds))
  } else if (branch_id) {
    if (!await canAccessBranch(session.user, branch_id)) {
      return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
    }
    conditions.push(eq(daily_sales.branch_id, branch_id))
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

  const dateObj = new Date(`${sale_date}T00:00:00Z`)
  if (
    !Number.isFinite(Number(amount)) ||
    Number(amount) < 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(sale_date) ||
    Number.isNaN(dateObj.getTime())
  ) {
    return NextResponse.json({ error: 'Tarix və ya məbləğ yanlışdır' }, { status: 400 })
  }

  if (!await canAccessBranch(session.user, branch_id)) {
    return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
  }

  // day_of_week hesabla
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
