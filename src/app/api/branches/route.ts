import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { eq, and } from 'drizzle-orm'

// GET — filial listini al
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db
    .select()
    .from(branches)
    .where(
      and(
        eq(branches.tenant_id, session.user.tenant_id),
        eq(branches.is_archived, false),
      )
    )
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
