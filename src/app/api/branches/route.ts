import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { eq, and, inArray } from 'drizzle-orm'
import { accessibleBranchIds } from '@/lib/branch-access'
import { regions } from '@/db/schema/regions'

// GET — filial listini al
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const role = session.user.role
  const conditions = [
    eq(branches.tenant_id, session.user.tenant_id),
    eq(branches.is_archived, false),
  ]

  if (role !== 'super_admin') {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) return NextResponse.json([])
    conditions.push(inArray(branches.id, branchIds))
  }

  const query = role === 'super_admin'
    ? db.select().from(branches)
    : db.select({
        id: branches.id,
        region_id: branches.region_id,
        code: branches.code,
        name: branches.name,
        city: branches.city,
        address: branches.address,
        phone: branches.phone,
        manager_id: branches.manager_id,
        open_time: branches.open_time,
        close_time: branches.close_time,
        is_active: branches.is_active,
      }).from(branches)

  const list = await query
    .where(and(...conditions))
    .orderBy(branches.code)

  return NextResponse.json(list)
}

// POST — yeni filial yarat
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Yalnız super_admin filial yarada bilər
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const { code, name, city, address, phone, open_time, close_time, iiko_org_id, region_id } = body

  if (!code || !name) {
    return NextResponse.json({ error: 'Kod və ad tələb olunur' }, { status: 400 })
  }

  if (region_id) {
    const [region] = await db.select({ id: regions.id }).from(regions)
      .where(and(
        eq(regions.id, region_id),
        eq(regions.tenant_id, session.user.tenant_id),
      ))
      .limit(1)
    if (!region) return NextResponse.json({ error: 'Bölgə tapılmadı' }, { status: 400 })
  }

  const [branch] = await db
    .insert(branches)
    .values({
      tenant_id: session.user.tenant_id,  // tenant_id HƏMİŞƏ session-dan
      region_id: region_id || null,
      code,
      name,
      city: city ?? 'Bakı',
      address,
      phone,
      open_time,
      close_time,
      iiko_org_id,
    })
    .returning()

  return NextResponse.json(branch, { status: 201 })
}
