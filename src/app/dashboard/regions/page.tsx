import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import RegionsClient from './regions-client'

export const metadata = {
  title: 'Bölgələr — OCAQ',
}

export default async function RegionsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'super_admin' && role !== 'region_manager') {
    redirect('/dashboard')
  }

  const headersList = await headers()
  const cookie = headersList.get('cookie') ?? ''

  let regions: unknown[] = []
  let managers: { id: string; name: string | null; email: string }[] = []
  let branches: { id: string; code: string; name: string; region_id: string | null }[] = []
  let fetchError: string | null = null

  try {
    const [regRes, mgrRes, brRes] = await Promise.all([
      fetch(`${process.env.NEXTAUTH_URL}/api/regions`, {
        headers: { cookie }, cache: 'no-store',
      }),
      fetch(`${process.env.NEXTAUTH_URL}/api/users?role=region_manager`, {
        headers: { cookie }, cache: 'no-store',
      }),
      fetch(`${process.env.NEXTAUTH_URL}/api/branches`, {
        headers: { cookie }, cache: 'no-store',
      }),
    ])

    if (regRes.ok) {
      const d = await regRes.json()
      if (Array.isArray(d)) regions = d
    } else {
      fetchError = `Bölgələr yüklənmədi (${regRes.status})`
    }

    if (mgrRes.ok) {
      const d = await mgrRes.json()
      if (Array.isArray(d)) managers = d
    }

    if (brRes.ok) {
      const d = await brRes.json()
      if (Array.isArray(d)) branches = d
    }
  } catch {
    fetchError = 'Serverlə əlaqə qurulmadı'
  }

  return (
    <RegionsClient
      regions={regions}
      managers={managers}
      branches={branches}
      isSuperAdmin={role === 'super_admin'}
      fetchError={fetchError}
    />
  )
}
