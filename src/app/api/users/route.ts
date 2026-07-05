import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'

// GET — istifadəçi listini al (role filter ilə)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'super_admin' && session.user.role !== 'region_manager') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  const conditions = [
    eq(users.tenant_id, session.user.tenant_id),
    eq(users.is_active, true),
  ]

  if (role) {
    conditions.push(eq(users.role, role as 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'))
  }

  const list = await db
    .select({
      id:    users.id,
      name:  users.name,
      email: users.email,
      role:  users.role,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name)

  return NextResponse.json(list)
}
