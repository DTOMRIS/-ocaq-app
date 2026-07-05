import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { sales_targets } from '@/db/schema/sales'
import { branches } from '@/db/schema/branches'
import { eq, and } from 'drizzle-orm'

// GET — satış hədəflərini al (month query ilə filter)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')       // '2026-07-01'
  const branch_id = searchParams.get('branch_id')

  const conditions = [eq(sales_targets.tenant_id, session.user.tenant_id)]
  if (month) conditions.push(eq(sales_targets.month, month))
  if (branch_id) conditions.push(eq(sales_targets.branch_id, branch_id))

  // branch_manager yalnız öz filialını görə bilər
  if (session.user.role === 'branch_manager') {
    const myBranches = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(
        eq(branches.tenant_id, session.user.tenant_id),
        eq(branches.manager_id, session.user.id),
      ))
    const myIds = myBranches.map(b => b.id)
    if (myIds.length === 0) return NextResponse.json([])
    // Sadəcə öz filiallarını filter et
    conditions.push(eq(sales_targets.branch_id, myIds[0]))
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

  if (!branch_id || !month || !target_amount) {
    return NextResponse.json({ error: 'branch_id, month, target_amount tələb olunur' }, { status: 400 })
  }

  if (Number(target_amount) <= 0) {
    return NextResponse.json({ error: 'Hədəf 0-dan böyük olmalıdır' }, { status: 400 })
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
