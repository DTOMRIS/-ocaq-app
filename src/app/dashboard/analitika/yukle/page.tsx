import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import UploadFlow from './upload-flow'

export const metadata = { title: 'Satış yüklə — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function YuklePage() {
  const session = await auth()
  if (!session) redirect('/login')
  // Yalnız super_admin məlumat yükləyə bilər (data giriş = admin səviyyəsi)
  if (session.user.role !== 'super_admin') redirect('/dashboard/analitika')
  return <UploadFlow />
}
