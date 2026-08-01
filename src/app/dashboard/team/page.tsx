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

  // Birbaşa DB — hər sorğu MÜSTƏQİL (biri xəta versə digərləri, xüsusən Bölgə dropdown, yenə dolsun)
  const errs: string[] = []
  const safe = async <T,>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn() } catch (e) { errs.push(`${label}: ${e instanceof Error ? e.message : String(e)}`); return fallback }
  }

  const regionIds = await safe('regionIds', () => accessibleRegionIds(session.user), [] as string[])
  const branchIds = await safe('branchIds', () => accessibleBranchIds(session.user), [] as string[])

  regionsData = regionIds.length ? await safe('regions', () =>
    db.select({ id: regions.id, name: regions.name, manager_id: regions.manager_id })
      .from(regions).where(and(eq(regions.tenant_id, tenantId), inArray(regions.id, regionIds))).orderBy(regions.name), []) : []

  branchesData = branchIds.length ? await safe('branches', () =>
    db.select({ id: branches.id, code: branches.code, name: branches.name, region_id: branches.region_id })
      .from(branches).where(and(eq(branches.tenant_id, tenantId), inArray(branches.id, branchIds))).orderBy(branches.code), []) : []

  usersData = await safe('users', () =>
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(eq(users.tenant_id, tenantId)).orderBy(users.name), [])

  const invConds = [eq(invitations.tenant_id, tenantId)]
  let runInv = role === 'super_admin'
  if (role !== 'super_admin') {
    const scopeConds = []
    if (regionIds.length) scopeConds.push(inArray(invitations.region_id, regionIds))
    if (branchIds.length) scopeConds.push(inArray(invitations.branch_id, branchIds))
    if (scopeConds.length) { invConds.push(or(...scopeConds)!); runInv = true }
  }
  if (runInv) {
    // Qeyd: revoked_at/replaces_manager_id (migration 0005) prod-da olmaya bilər → seçmirik ki sorğu patlamasın
    // (db:push ilə 0005 tətbiq olunandan sonra geri qaytarılmalıdır)
    invitationsData = await safe('invitations', () =>
      db.select({
        id: invitations.id, email: invitations.email, role: invitations.role,
        branch_id: invitations.branch_id, region_id: invitations.region_id,
        accepted_at: invitations.accepted_at,
        expires_at: invitations.expires_at, created_at: invitations.created_at,
      }).from(invitations).where(and(...invConds)).orderBy(desc(invitations.created_at)), [])
  }
  if (errs.length) fetchError = `Bəzi məlumat yüklənmədi (${errs.join(' | ')})`

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
