import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { and, eq } from 'drizzle-orm'
import { canAccessBranch, canAccessRegion, type ScopedUser } from '@/lib/branch-access'

export const INVITABLE_ROLES = ['staff', 'branch_manager', 'region_manager'] as const
export type InvitableRole = typeof INVITABLE_ROLES[number]

export function isInvitableRole(value: unknown): value is InvitableRole {
  return typeof value === 'string' && INVITABLE_ROLES.includes(value as InvitableRole)
}

export async function invitationScope(
  actor: ScopedUser,
  role: InvitableRole,
  requestedRegionId: unknown,
  requestedBranchId: unknown,
) {
  if (actor.role !== 'super_admin' && actor.role !== 'region_manager') {
    return { error: 'Bu rol üçün dəvət göndərə bilməzsiniz' } as const
  }
  if (actor.role === 'region_manager' && role === 'region_manager') {
    return { error: 'Bu rol üçün dəvət göndərə bilməzsiniz' } as const
  }

  const regionId = typeof requestedRegionId === 'string' && requestedRegionId ? requestedRegionId : null
  const branchId = typeof requestedBranchId === 'string' && requestedBranchId ? requestedBranchId : null

  if (role === 'region_manager') {
    if (!regionId || branchId) return { error: 'Bölgə müdiri üçün bölgə seçilməlidir' } as const
    if (!await canAccessRegion(actor, regionId)) return { error: 'Bu bölgə üçün icazəniz yoxdur' } as const
    const [region] = await db.select({ manager_id: regions.manager_id }).from(regions)
      .where(and(eq(regions.id, regionId), eq(regions.tenant_id, actor.tenant_id)))
      .limit(1)
    if (!region) return { error: 'Bölgə tapılmadı' } as const
    if (region.manager_id) return { error: 'Bu bölgənin artıq müdiri var' } as const
    return { regionId, branchId: null } as const
  }

  if (!branchId) return { error: 'Filial seçilməlidir' } as const
  if (!await canAccessBranch(actor, branchId)) return { error: 'Bu filial üçün icazəniz yoxdur' } as const

  const [branch] = await db.select({ region_id: branches.region_id, manager_id: branches.manager_id })
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.tenant_id, actor.tenant_id)))
    .limit(1)
  if (!branch) return { error: 'Filial tapılmadı' } as const
  if (role === 'branch_manager' && branch.manager_id) {
    return { error: 'Bu filialın artıq müdiri var' } as const
  }

  return { regionId: branch.region_id, branchId } as const
}

export async function canManageInvitation(
  actor: ScopedUser,
  invitation: { tenant_id: string; region_id: string | null; branch_id: string | null },
) {
  if (invitation.tenant_id !== actor.tenant_id) return false
  if (actor.role === 'super_admin') return true
  if (actor.role !== 'region_manager') return false
  if (invitation.branch_id) return canAccessBranch(actor, invitation.branch_id)
  if (invitation.region_id) return canAccessRegion(actor, invitation.region_id)
  return false
}
