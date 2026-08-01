import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getRequestOrigin } from '@/lib/request-origin'
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

  const baseUrl = getRequestOrigin(headersList)

  // Hər fetch müstəqil (biri xəta versə digərləri yüklənsin — hamısı birdən çökməsin)
  const getArr = async (url: string): Promise<unknown[] | null> => {
    try { const res = await fetch(url, { headers: { cookie }, cache: 'no-store' }); if (!res.ok) return null; const d = await res.json(); return Array.isArray(d) ? d : null }
    catch { return null }
  }
  const [br, tg, ds, rg] = await Promise.all([
    getArr(`${baseUrl}/api/branches`),
    getArr(`${baseUrl}/api/sales/targets?month=${monthStart}`),
    getArr(`${baseUrl}/api/sales/daily?month_start=${monthStart}&month_end=${monthEnd}`),
    getArr(`${baseUrl}/api/regions`),
  ])
  if (br) branches = br; if (tg) targets = tg; if (ds) dailySales = ds; if (rg) regions = rg
  // Yalnız filiallar (kritik) yüklənməzsə xəta göstər — qismən uğursuzluq bütün səhifəni çökdürməsin
  if (!br) fetchError = 'Filial siyahısı yüklənmədi — yeniləyin'

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
