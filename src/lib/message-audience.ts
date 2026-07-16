import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { OPERATIONAL_ROLES } from '@/lib/operational-roles'

export type AudienceKind = 'all' | 'role' | 'region' | 'branch' | 'selected'

export interface AudienceSelection {
  kind: AudienceKind
  value?: string
  user_ids?: string[]
}

type Actor = { id: string; tenant_id: string; role: string }

export async function accessibleBranchIds(actor: Actor): Promise<string[]> {
  if (actor.role === 'staff') return []

  if (actor.role === 'super_admin') {
    const rows = await db.select({ id: branches.id }).from(branches).where(and(
      eq(branches.tenant_id, actor.tenant_id),
      eq(branches.is_active, true),
      eq(branches.is_archived, false),
    ))
    return rows.map((row) => row.id)
  }

  if (actor.role === 'branch_manager') {
    const rows = await db.select({ id: branches.id }).from(branches).where(and(
      eq(branches.tenant_id, actor.tenant_id),
      eq(branches.manager_id, actor.id),
      eq(branches.is_active, true),
      eq(branches.is_archived, false),
    ))
    return rows.map((row) => row.id)
  }

  const managedRegions = await db.select({ id: regions.id }).from(regions).where(and(
    eq(regions.tenant_id, actor.tenant_id),
    eq(regions.manager_id, actor.id),
  ))
  if (!managedRegions.length) return []
  const rows = await db.select({ id: branches.id }).from(branches).where(and(
    eq(branches.tenant_id, actor.tenant_id),
    inArray(branches.region_id, managedRegions.map((region) => region.id)),
    eq(branches.is_active, true),
    eq(branches.is_archived, false),
  ))
  return rows.map((row) => row.id)
}

export async function resolveAudience(actor: Actor, selection: AudienceSelection): Promise<string[]> {
  if (actor.role === 'staff') throw new Error('FORBIDDEN')

  const activeTenantUsers = await db.select({ id: users.id }).from(users).where(and(
    eq(users.tenant_id, actor.tenant_id),
    eq(users.is_active, true),
    inArray(users.role, OPERATIONAL_ROLES),
  ))
  const tenantUserIds = new Set(activeTenantUsers.map((user) => user.id))

  if (selection.kind === 'all') {
    if (actor.role !== 'super_admin') throw new Error('FORBIDDEN')
    return [...tenantUserIds]
  }

  if (selection.kind === 'role') {
    const role = OPERATIONAL_ROLES.find((item) => item === selection.value)
    if (!role) throw new Error('INVALID_AUDIENCE')
    if (actor.role !== 'super_admin') throw new Error('FORBIDDEN')
    const rows = await db.select({ id: users.id }).from(users).where(and(
      eq(users.tenant_id, actor.tenant_id),
      eq(users.is_active, true),
      eq(users.role, role),
    ))
    return rows.map((row) => row.id)
  }

  const allowedBranches = new Set(await accessibleBranchIds(actor))
  if (selection.kind === 'branch') {
    if (!selection.value || !allowedBranches.has(selection.value)) throw new Error('FORBIDDEN')
    return managerIdsForBranches(actor.tenant_id, [selection.value])
  }

  if (selection.kind === 'region') {
    if (!selection.value) throw new Error('INVALID_AUDIENCE')
    if (actor.role !== 'super_admin') {
      const managed = await db.select({ id: regions.id }).from(regions).where(and(
        eq(regions.id, selection.value),
        eq(regions.tenant_id, actor.tenant_id),
        eq(regions.manager_id, actor.id),
      )).limit(1)
      if (!managed.length) throw new Error('FORBIDDEN')
    }
    const scopedBranches = await db.select({ id: branches.id }).from(branches).where(and(
      eq(branches.tenant_id, actor.tenant_id),
      eq(branches.region_id, selection.value),
      eq(branches.is_active, true),
      eq(branches.is_archived, false),
    ))
    const branchManagerIds = scopedBranches.length
      ? await managerIdsForBranches(actor.tenant_id, scopedBranches.map((branch) => branch.id))
      : []
    const [region] = await db.select({ manager_id: regions.manager_id }).from(regions).where(and(
      eq(regions.id, selection.value),
      eq(regions.tenant_id, actor.tenant_id),
      eq(regions.is_active, true),
    )).limit(1)
    return [...new Set([
      ...branchManagerIds,
      ...(region?.manager_id && tenantUserIds.has(region.manager_id) ? [region.manager_id] : []),
    ])]
  }

  const requested = [...new Set(selection.user_ids ?? [])].filter((id) => tenantUserIds.has(id))
  if (actor.role === 'super_admin') return requested
  if (!requested.length || !allowedBranches.size) return []
  const scopedManagerIds = new Set(await managerIdsForBranches(actor.tenant_id, [...allowedBranches]))
  scopedManagerIds.add(actor.id)
  return requested.filter((id) => scopedManagerIds.has(id))
}

async function managerIdsForBranches(tenantId: string, branchIds: string[]) {
  if (!branchIds.length) return []
  const rows = await db.select({ manager_id: branches.manager_id }).from(branches).innerJoin(
    users,
    and(
      eq(users.id, branches.manager_id),
      eq(users.tenant_id, tenantId),
      eq(users.is_active, true),
      eq(users.role, 'branch_manager'),
    ),
  ).where(and(
    eq(branches.tenant_id, tenantId),
    inArray(branches.id, branchIds),
    eq(branches.is_active, true),
    eq(branches.is_archived, false),
  ))
  return [...new Set(rows.flatMap((row) => row.manager_id ? [row.manager_id] : []))]
}
