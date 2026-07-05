import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { regions } from '@/db/schema/regions'
import { users } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'

// GET — bölgə listini al
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    .where(eq(regions.tenant_id, session.user.tenant_id))
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

  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (name !== undefined) updates.name = name.trim()
  if (manager_id !== undefined) updates.manager_id = manager_id || null
  if (is_active !== undefined) updates.is_active = is_active

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
