import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { accessibleBranchIds, type ScopedUser } from '@/lib/branch-access'

/**
 * Yeni forma yalnız aktiv filial üçün açılır. Tarixi forma isə filial sonradan
 * deaktiv/arxiv olsa belə səlahiyyətli rəhbərdən gizlənmir.
 */
export async function qualityFormBranchIds(
  user: ScopedUser,
  mode: 'create' | 'history',
): Promise<string[]> {
  if (mode === 'create') return accessibleBranchIds(user)

  if (user.role === 'super_admin') {
    const rows = await db.select({ id: branches.id }).from(branches)
      .where(eq(branches.tenant_id, user.tenant_id))
    return rows.map((row) => row.id)
  }

  if (user.role === 'region_manager') {
    const managedRegions = await db.select({ id: regions.id }).from(regions).where(and(
      eq(regions.tenant_id, user.tenant_id),
      eq(regions.manager_id, user.id),
    ))
    const regionIds = managedRegions.map((region) => region.id)
    if (regionIds.length === 0) return []
    const rows = await db.select({ id: branches.id }).from(branches).where(and(
      eq(branches.tenant_id, user.tenant_id),
      inArray(branches.region_id, regionIds),
    ))
    return rows.map((row) => row.id)
  }

  if (user.role === 'branch_manager') {
    const rows = await db.select({ id: branches.id }).from(branches).where(and(
      eq(branches.tenant_id, user.tenant_id),
      eq(branches.manager_id, user.id),
    ))
    return rows.map((row) => row.id)
  }

  return []
}
