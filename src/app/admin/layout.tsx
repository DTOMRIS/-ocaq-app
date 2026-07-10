import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// ⛔ /admin/* bütün səhifələri qorunur — yalnız super_admin.
// (Əvvəl heç bir auth guard yox idi: girişsiz açıq idi.)
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin') redirect('/dashboard')
  return <>{children}</>
}
