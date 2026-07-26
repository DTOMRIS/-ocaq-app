import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { staff_profiles } from '@/db/schema/staff'
import { branches } from '@/db/schema/branches'
import { eq, and, inArray } from 'drizzle-orm'
import { accessibleBranchIds } from '@/lib/branch-access'
import { OPERATIONAL_ROLES } from '@/lib/operational-roles'

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
    inArray(users.role, OPERATIONAL_ROLES),
  ]

  const validRoles = OPERATIONAL_ROLES
  if (role && !validRoles.includes(role as typeof validRoles[number])) {
    return NextResponse.json({ error: 'Yanlış rol' }, { status: 400 })
  }
  if (role) {
    conditions.push(eq(users.role, role as typeof OPERATIONAL_ROLES[number]))
  }

  if (session.user.role === 'region_manager') {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) {
      return NextResponse.json([])
    }

    const [profileRows, branchRows] = await Promise.all([
      db.select({ user_id: staff_profiles.user_id }).from(staff_profiles)
        .where(and(
          eq(staff_profiles.tenant_id, session.user.tenant_id),
          inArray(staff_profiles.branch_id, branchIds),
          eq(staff_profiles.is_archived, false),
        )),
      db.select({ manager_id: branches.manager_id }).from(branches)
        .where(and(
          eq(branches.tenant_id, session.user.tenant_id),
          inArray(branches.id, branchIds),
        )),
    ])

    const userIds = [...new Set([
      session.user.id,
      ...profileRows.map(row => row.user_id),
      ...branchRows.flatMap(row => row.manager_id ? [row.manager_id] : []),
    ])]
    conditions.push(inArray(users.id, userIds))
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
