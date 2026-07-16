import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { staff_profiles } from '@/db/schema/staff'
import { accessibleBranchIds } from '@/lib/message-audience'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (session.user.role === 'staff') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  const actor = { id: session.user.id, tenant_id: session.user.tenant_id, role: session.user.role }
  const branchIds = await accessibleBranchIds(actor)
  const branchRows = branchIds.length ? await db.select({ id: branches.id, name: branches.name, region_id: branches.region_id }).from(branches).where(and(
    eq(branches.tenant_id, session.user.tenant_id),
    inArray(branches.id, branchIds),
  )).orderBy(branches.name) : []

  let regionRows: { id: string; name: string }[] = []
  if (session.user.role === 'super_admin') {
    regionRows = await db.select({ id: regions.id, name: regions.name }).from(regions).where(and(
      eq(regions.tenant_id, session.user.tenant_id),
      eq(regions.is_active, true),
    )).orderBy(regions.name)
  } else if (session.user.role === 'region_manager') {
    regionRows = await db.select({ id: regions.id, name: regions.name }).from(regions).where(and(
      eq(regions.tenant_id, session.user.tenant_id),
      eq(regions.manager_id, session.user.id),
      eq(regions.is_active, true),
    )).orderBy(regions.name)
  }

  let userRows: { id: string; name: string | null; email: string }[] = []
  if (session.user.role === 'super_admin') {
    userRows = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(and(
      eq(users.tenant_id, session.user.tenant_id),
      eq(users.is_active, true),
    )).orderBy(users.name)
  } else if (branchIds.length) {
    userRows = await db.selectDistinct({ id: users.id, name: users.name, email: users.email }).from(staff_profiles).innerJoin(users, and(
      eq(users.id, staff_profiles.user_id),
      eq(users.is_active, true),
    )).where(and(
      eq(staff_profiles.tenant_id, session.user.tenant_id),
      inArray(staff_profiles.branch_id, branchIds),
      eq(staff_profiles.is_archived, false),
    )).orderBy(users.name)
  }

  return NextResponse.json({
    capabilities: {
      all: session.user.role === 'super_admin',
      role: session.user.role === 'super_admin',
      region: ['super_admin', 'region_manager'].includes(session.user.role),
      branch: true,
      selected: true,
      shiftBriefingWrite: session.user.role === 'branch_manager',
    },
    roles: session.user.role === 'super_admin' ? [
      { id: 'super_admin', name: 'Baş administrator' },
      { id: 'region_manager', name: 'Bölgə müdürü' },
      { id: 'branch_manager', name: 'Filial müdürü' },
      { id: 'staff', name: 'Əməkdaş' },
    ] : [],
    regions: regionRows,
    branches: branchRows,
    users: userRows,
  })
}
