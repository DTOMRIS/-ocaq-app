import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import SalesClient from './sales-client'

export const metadata = {
  title: 'Satış hədəfi — OCAQ',
}

export default async function SalesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'super_admin' && role !== 'region_manager' && role !== 'branch_manager') {
    redirect('/dashboard')
  }

  const headersList = await headers()
  const cookie = headersList.get('cookie') ?? ''

  // Cari ayın start/end
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`

  let branches: unknown[] = []
  let targets: unknown[] = []
  let dailySales: unknown[] = []
  let regions: unknown[] = []
  let fetchError: string | null = null

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  try {
    const [brRes, tRes, dRes, rRes] = await Promise.all([
      fetch(`${baseUrl}/api/branches`, {
        headers: { cookie }, cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/sales/targets?month=${monthStart}`, {
        headers: { cookie }, cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/sales/daily?month_start=${monthStart}&month_end=${monthEnd}`, {
        headers: { cookie }, cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/regions`, {
        headers: { cookie }, cache: 'no-store',
      }),
    ])

    if (brRes.ok) { const d = await brRes.json(); if (Array.isArray(d)) branches = d }
    if (tRes.ok) { const d = await tRes.json(); if (Array.isArray(d)) targets = d }
    if (dRes.ok) { const d = await dRes.json(); if (Array.isArray(d)) dailySales = d }
    if (rRes.ok) { const d = await rRes.json(); if (Array.isArray(d)) regions = d }
  } catch {
    fetchError = 'Serverlə əlaqə qurulmadı'
  }

  return (
    <SalesClient
      role={role}
      userId={session.user.id}
      branches={branches}
      targets={targets}
      dailySales={dailySales}
      regions={regions}
      monthStart={monthStart}
      monthEnd={monthEnd}
      totalDays={lastDay}
      currentDay={now.getDate()}
      fetchError={fetchError}
    />
  )
}
