import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { staff_profiles } from '@/db/schema/staff'
import { users } from '@/db/schema/auth'
import { and, eq, inArray } from 'drizzle-orm'

export type ScopedUser = {
  id: string
  tenant_id: string
  role: string
}

export async function accessibleRegionIds(user: ScopedUser): Promise<string[]> {
  if (user.role === 'super_admin') {
    const rows = await db.select({ id: regions.id }).from(regions)
      .where(eq(regions.tenant_id, user.tenant_id))
    return rows.map(row => row.id)
  }

  if (user.role === 'region_manager') {
    const rows = await db.select({ id: regions.id }).from(regions)
      .where(and(
        eq(regions.tenant_id, user.tenant_id),
        eq(regions.manager_id, user.id),
      ))
    return rows.map(row => row.id)
  }

  const branchIds = await accessibleBranchIds(user)
  if (branchIds.length === 0) return []

  const rows = await db.select({ region_id: branches.region_id }).from(branches)
    .where(and(
      eq(branches.tenant_id, user.tenant_id),
      inArray(branches.id, branchIds),
    ))

  return [...new Set(rows.flatMap(row => row.region_id ? [row.region_id] : []))]
}

export async function accessibleBranchIds(user: ScopedUser): Promise<string[]> {
  if (user.role === 'super_admin') {
    const rows = await db.select({ id: branches.id }).from(branches)
      .where(and(
        eq(branches.tenant_id, user.tenant_id),
        eq(branches.is_active, true),
        eq(branches.is_archived, false),
      ))
    return rows.map(row => row.id)
  }

  if (user.role === 'region_manager') {
    const regionIds = await accessibleRegionIds(user)
    if (regionIds.length === 0) return []
    const rows = await db.select({ id: branches.id }).from(branches)
      .where(and(
        eq(branches.tenant_id, user.tenant_id),
        inArray(branches.region_id, regionIds),
        eq(branches.is_active, true),
        eq(branches.is_archived, false),
      ))
    return rows.map(row => row.id)
  }

  if (user.role === 'branch_manager') {
    const rows = await db.select({ id: branches.id }).from(branches)
      .where(and(
        eq(branches.tenant_id, user.tenant_id),
        eq(branches.manager_id, user.id),
        eq(branches.is_active, true),
        eq(branches.is_archived, false),
      ))
    return rows.map(row => row.id)
  }

  if (user.role === 'staff') {
    const rows = await db.select({ branch_id: staff_profiles.branch_id }).from(staff_profiles)
      .where(and(
        eq(staff_profiles.tenant_id, user.tenant_id),
        eq(staff_profiles.user_id, user.id),
        eq(staff_profiles.is_archived, false),
      ))
    return [...new Set(rows.flatMap(row => row.branch_id ? [row.branch_id] : []))]
  }

  return []
}

export async function canAccessBranch(user: ScopedUser, branchId: string | null | undefined) {
  if (!branchId) return false
  const ids = await accessibleBranchIds(user)
  return ids.includes(branchId)
}

export async function canAccessRegion(user: ScopedUser, regionId: string | null | undefined) {
  if (!regionId) return false
  const ids = await accessibleRegionIds(user)
  return ids.includes(regionId)
}

export async function canAccessUser(actor: ScopedUser, targetUserId: string) {
  if (actor.id === targetUserId) return true
  const [target] = await db.select({ id: users.id }).from(users).where(and(
    eq(users.id, targetUserId),
    eq(users.tenant_id, actor.tenant_id),
    eq(users.is_active, true),
  )).limit(1)
  if (!target) return false
  if (actor.role === 'super_admin') return true

  const branchIds = await accessibleBranchIds(actor)
  if (branchIds.length === 0) return false

  const [profile, managedBranch] = await Promise.all([
    db.select({ id: staff_profiles.id }).from(staff_profiles).where(and(
      eq(staff_profiles.tenant_id, actor.tenant_id),
      eq(staff_profiles.user_id, targetUserId),
      inArray(staff_profiles.branch_id, branchIds),
      eq(staff_profiles.is_archived, false),
    )).limit(1),
    db.select({ id: branches.id }).from(branches).where(and(
      eq(branches.tenant_id, actor.tenant_id),
      eq(branches.manager_id, targetUserId),
      inArray(branches.id, branchIds),
      eq(branches.is_active, true),
      eq(branches.is_archived, false),
    )).limit(1),
  ])
  if (profile[0] || managedBranch[0]) return true

  if (actor.role === 'region_manager') {
    const regionIds = await accessibleRegionIds(actor)
    if (regionIds.length === 0) return false
    const [managedRegion] = await db.select({ id: regions.id }).from(regions).where(and(
      eq(regions.tenant_id, actor.tenant_id),
      eq(regions.manager_id, targetUserId),
      inArray(regions.id, regionIds),
    )).limit(1)
    return Boolean(managedRegion)
  }

  return false
}
