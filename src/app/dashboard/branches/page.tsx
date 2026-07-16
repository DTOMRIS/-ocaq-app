import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getRequestOrigin } from '@/lib/request-origin'
import BranchesClient from './branches-client'

interface Branch {
  id: string
  tenant_id: string
  region_id: string | null
  code: string
  name: string
  city: string
  address: string | null
  phone: string | null
  manager_id: string | null
  iiko_org_id: string | null
  open_time: string | null
  close_time: string | null
  is_active: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export const metadata = {
  title: 'Filiallar — OCAQ',
}

export default async function BranchesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const headersList = await headers()
  const cookie = headersList.get('cookie') ?? ''

  let branches: Branch[] = []
  let regions: { id: string; name: string }[] = []
  let fetchError: string | null = null

  const baseUrl = getRequestOrigin(headersList)

  try {
    const [branchRes, regionRes] = await Promise.all([
      fetch(`${baseUrl}/api/branches`, {
        headers: { cookie },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/regions`, {
        headers: { cookie },
        cache: 'no-store',
      }),
    ])

    if (!branchRes.ok) {
      fetchError = `Filiallar yüklənmədi (${branchRes.status})`
    } else {
      const data: unknown = await branchRes.json()
      if (Array.isArray(data)) {
        branches = data as Branch[]
      } else {
        fetchError = 'API cavabı gözlənilməz formatdadır'
      }
    }

    if (regionRes.ok) {
      const rData: unknown = await regionRes.json()
      if (Array.isArray(rData)) {
        regions = rData as { id: string; name: string }[]
      }
    }
  } catch {
    fetchError = 'Serverlə əlaqə qurulmadı'
  }

  const isSuperAdmin = session.user.role === 'super_admin'

  return (
    <BranchesClient
      branches={branches}
      regions={regions}
      isSuperAdmin={isSuperAdmin}
      fetchError={fetchError}
    />
  )
}
