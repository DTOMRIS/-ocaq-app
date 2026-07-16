import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { sales_targets } from '@/db/schema/sales'
import { branches } from '@/db/schema/branches'
import { eq, and, inArray } from 'drizzle-orm'
import { accessibleBranchIds, canAccessBranch } from '@/lib/branch-access'

// GET — satış hədəflərini al (month query ilə filter)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')       // '2026-07-01'
  const branch_id = searchParams.get('branch_id')

  const role = session.user.role
  if (role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const conditions = [eq(sales_targets.tenant_id, session.user.tenant_id)]
  if (month) conditions.push(eq(sales_targets.month, month))

  if (role !== 'super_admin') {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) return NextResponse.json([])
    if (branch_id && !branchIds.includes(branch_id)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }
    conditions.push(branch_id
      ? eq(sales_targets.branch_id, branch_id)
      : inArray(sales_targets.branch_id, branchIds))
  } else if (branch_id) {
    if (!await canAccessBranch(session.user, branch_id)) {
      return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
    }
    conditions.push(eq(sales_targets.branch_id, branch_id))
  }

  const list = await db
    .select({
      id:            sales_targets.id,
      branch_id:     sales_targets.branch_id,
      branch_name:   branches.name,
      branch_code:   branches.code,
      month:         sales_targets.month,
      target_amount: sales_targets.target_amount,
      created_at:    sales_targets.created_at,
    })
    .from(sales_targets)
    .leftJoin(branches, eq(sales_targets.branch_id, branches.id))
    .where(and(...conditions))
    .orderBy(branches.code)

  return NextResponse.json(list)
}

// POST — hədəf qoy (super_admin + region_manager)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  if (role !== 'super_admin' && role !== 'region_manager') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const { branch_id, month, target_amount } = body

  if (!branch_id || !month || target_amount === undefined) {
    return NextResponse.json({ error: 'branch_id, month, target_amount tələb olunur' }, { status: 400 })
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(month) || !Number.isFinite(Number(target_amount)) || Number(target_amount) <= 0) {
    return NextResponse.json({ error: 'Hədəf 0-dan böyük olmalıdır' }, { status: 400 })
  }

  if (!await canAccessBranch(session.user, branch_id)) {
    return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
  }

  // Eyni ay + filial üçün dublikat yoxla — varsa yenilə
  const existing = await db
    .select({ id: sales_targets.id })
    .from(sales_targets)
    .where(and(
      eq(sales_targets.tenant_id, session.user.tenant_id),
      eq(sales_targets.branch_id, branch_id),
      eq(sales_targets.month, month),
    ))

  if (existing.length > 0) {
    const [updated] = await db
      .update(sales_targets)
      .set({ target_amount: String(target_amount), updated_at: new Date() })
      .where(eq(sales_targets.id, existing[0].id))
      .returning()
    return NextResponse.json(updated)
  }

  const [target] = await db
    .insert(sales_targets)
    .values({
      tenant_id:     session.user.tenant_id,
      branch_id,
      month,
      target_amount: String(target_amount),
      created_by:    session.user.id,
    })
    .returning()

  return NextResponse.json(target, { status: 201 })
}
