import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import MenyuClient from './menyu-client'

export const metadata = { title: 'Menü / Food Cost — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function MenyuPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['super_admin', 'region_manager'].includes(session.user.role)) redirect('/dashboard')
  return <MenyuClient />
}
