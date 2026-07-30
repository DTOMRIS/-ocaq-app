import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import KasaBankaClient from './kasa-banka-client'

export const metadata = { title: 'Kasa/Banka Mutabakatı — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function KasaBankaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin') redirect('/dashboard')
  return <KasaBankaClient />
}
