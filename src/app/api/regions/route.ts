import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { regions } from '@/db/schema/regions'
import { users } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'
import { accessibleRegionIds } from '@/lib/branch-access'
import { inArray } from 'drizzle-orm'

// GET — bölgə listini al
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const regionIds = await accessibleRegionIds(session.user)
  if (regionIds.length === 0) return NextResponse.json([])

  const list = await db
    .select({
      id:         regions.id,
      name:       regions.name,
      manager_id: regions.manager_id,
      manager_name: users.name,
      is_active:  regions.is_active,
      created_at: regions.created_at,
    })
    .from(regions)
    .leftJoin(users, eq(regions.manager_id, users.id))
    .where(and(
      eq(regions.tenant_id, session.user.tenant_id),
      inArray(regions.id, regionIds),
    ))
    .orderBy(regions.name)

  return NextResponse.json(list)
}

// POST — yeni bölgə yarat
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const { name, manager_id } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Bölgə adı tələb olunur' }, { status: 400 })
  }

  if (manager_id) {
    const [manager] = await db.select({ id: users.id }).from(users)
      .where(and(
        eq(users.id, manager_id),
        eq(users.tenant_id, session.user.tenant_id),
        eq(users.role, 'region_manager'),
        eq(users.is_active, true),
      ))
      .limit(1)
    if (!manager) return NextResponse.json({ error: 'Bölgə müdiri tapılmadı' }, { status: 400 })
  }

  const [region] = await db
    .insert(regions)
    .values({
      tenant_id:  session.user.tenant_id,
      name:       name.trim(),
      manager_id: manager_id || null,
    })
    .returning()

  return NextResponse.json(region, { status: 201 })
}

// PATCH — bölgəni yenilə
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  if (role !== 'super_admin' && role !== 'region_manager') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const { id, name, manager_id, is_active } = body

  if (!id) {
    return NextResponse.json({ error: 'Bölgə ID tələb olunur' }, { status: 400 })
  }

  if (manager_id !== undefined && role === 'super_admin' && manager_id) {
    const [manager] = await db.select({ id: users.id }).from(users)
      .where(and(
        eq(users.id, manager_id),
        eq(users.tenant_id, session.user.tenant_id),
        eq(users.role, 'region_manager'),
        eq(users.is_active, true),
      ))
      .limit(1)
    if (!manager) return NextResponse.json({ error: 'Bölgə müdiri tapılmadı' }, { status: 400 })
  }

  // region_manager yalnız ÖZ bölgəsini dəyişə bilər (başqasını ələ keçirə bilməz)
  if (role === 'region_manager') {
    const [own] = await db
      .select({ id: regions.id })
      .from(regions)
      .where(and(
        eq(regions.id, id),
        eq(regions.tenant_id, session.user.tenant_id),
        eq(regions.manager_id, session.user.id),
      ))
      .limit(1)
    if (!own) {
      return NextResponse.json({ error: 'Bu bölgə sizə aid deyil' }, { status: 403 })
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (name !== undefined) updates.name = name.trim()
  if (is_active !== undefined) updates.is_active = is_active
  // manager_id dəyişməsi (bölgə sahibliyi) yalnız super_admin
  if (manager_id !== undefined && role === 'super_admin') updates.manager_id = manager_id || null

  const [updated] = await db
    .update(regions)
    .set(updates)
    .where(and(eq(regions.id, id), eq(regions.tenant_id, session.user.tenant_id)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Bölgə tapılmadı' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
