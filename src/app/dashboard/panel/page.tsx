import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import PanelClient from './panel-client'

export const metadata = { title: 'Günlük Panel — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function PanelPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) redirect('/dashboard')
  return <PanelClient />
}
