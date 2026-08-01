import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, and, inArray, or, desc } from 'drizzle-orm'
import { db } from '@/db'
import { invitations, users } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { accessibleRegionIds, accessibleBranchIds } from '@/lib/branch-access'
import TeamClient from './team-client'

export const metadata = { title: 'Komanda — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'super_admin' && role !== 'region_manager') {
    redirect('/dashboard')
  }

  const tenantId = session.user.tenant_id
  let invitationsData: unknown[] = []
  let usersData: unknown[] = []
  let branchesData: unknown[] = []
  let regionsData: unknown[] = []
  let fetchError: string | null = null

  // Birbaşa DB (self-HTTP-fetch deyil) — dropdown-lar boş qalmasın, "əlaqə qurulmadı" olmasın
  try {
    const regionIds = await accessibleRegionIds(session.user)
    const branchIds = await accessibleBranchIds(session.user)

    regionsData = regionIds.length
      ? await db.select({ id: regions.id, name: regions.name, manager_id: regions.manager_id })
          .from(regions).where(and(eq(regions.tenant_id, tenantId), inArray(regions.id, regionIds))).orderBy(regions.name)
      : []

    branchesData = branchIds.length
      ? await db.select({ id: branches.id, code: branches.code, name: branches.name, region_id: branches.region_id })
          .from(branches).where(and(eq(branches.tenant_id, tenantId), inArray(branches.id, branchIds))).orderBy(branches.code)
      : []

    usersData = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(eq(users.tenant_id, tenantId)).orderBy(users.name)

    // Dəvətlər — super_admin hamısını, region_manager öz bölgə/filial əhatəsini görür
    if (role === 'super_admin' || regionIds.length || branchIds.length) {
      const scope = role === 'super_admin'
        ? undefined
        : or(
            regionIds.length ? inArray(invitations.region_id, regionIds) : undefined,
            branchIds.length ? inArray(invitations.branch_id, branchIds) : undefined,
          )
      invitationsData = await db.select({
        id: invitations.id, email: invitations.email, role: invitations.role,
        branch_id: invitations.branch_id, region_id: invitations.region_id,
        accepted_at: invitations.accepted_at, revoked_at: invitations.revoked_at,
        expires_at: invitations.expires_at, created_at: invitations.created_at,
        replaces_manager_id: invitations.replaces_manager_id,
      }).from(invitations).where(and(eq(invitations.tenant_id, tenantId), scope)).orderBy(desc(invitations.created_at))
    }
  } catch {
    fetchError = 'Məlumat yüklənmədi — səhifəni yeniləyin'
  }

  return (
    <TeamClient
      invitations={invitationsData}
      users={usersData}
      branches={branchesData}
      regions={regionsData}
      isSuperAdmin={role === 'super_admin'}
      fetchError={fetchError}
    />
  )
}
