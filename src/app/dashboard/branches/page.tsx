import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getRequestOrigin } from '@/lib/request-origin'
import BranchesClient from './branches-client'
import type { BranchFilter, BranchReadModel, RegionOption } from './types'

export const metadata = { title: 'Filiallar — OCAQ' }

const FILTERS = new Set<BranchFilter>(['current', 'active', 'inactive', 'archived'])

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const requested = (await searchParams).status
  const filter: BranchFilter = requested && FILTERS.has(requested as BranchFilter) ? requested as BranchFilter : 'current'
  const effectiveFilter: BranchFilter = session.user.role === 'super_admin' ? filter : 'active'
  const headersList = await headers()
  const cookie = headersList.get('cookie') ?? ''
  const baseUrl = getRequestOrigin(headersList)
  let branches: BranchReadModel[] = []
  let regions: RegionOption[] = []
  let fetchError: string | null = null

  try {
    const [branchRes, regionRes] = await Promise.all([
      fetch(`${baseUrl}/api/branches?status=${effectiveFilter}`, { headers: { cookie }, cache: 'no-store' }),
      fetch(`${baseUrl}/api/regions`, { headers: { cookie }, cache: 'no-store' }),
    ])
    if (!branchRes.ok) fetchError = `Filiallar yüklənmədi (${branchRes.status})`
    else {
      const data: unknown = await branchRes.json()
      if (Array.isArray(data)) branches = data as BranchReadModel[]
      else fetchError = 'API cavabı gözlənilməz formatdadır'
    }
    if (regionRes.ok) {
      const data: unknown = await regionRes.json()
      if (Array.isArray(data)) regions = (data as Array<{ id: string; name: string; is_active?: boolean }>).map((region) => ({ id: region.id, name: region.name, is_active: region.is_active === true }))
    }
  } catch { fetchError = 'Serverlə əlaqə qurulmadı' }

  return <BranchesClient branches={branches} regions={regions} isSuperAdmin={session.user.role === 'super_admin'} fetchError={fetchError} filter={effectiveFilter} />
}
