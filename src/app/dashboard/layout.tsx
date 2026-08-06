import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  // `!session` KİFAYƏT DEYİL. `auth.ts` session callback-i sessiya ləğv edildikdə
  // (məs. şifrə dəyişdi → `users.updated_at` dəyişdi → `session_version` uyğun
  // gəlmir) `null` qaytarır, lakin NextAuth bunu BOŞ AMMA TRUTHY obyekt kimi
  // verə bilir. O halda `!session` yoxlaması keçir və shell `user: undefined`
  // ilə render olunur → sidebar boş, KPI-lar boş. Rol yoxsa sessiya etibarsızdır.
  if (!session?.user?.role) redirect('/login')

  return <DashboardShell user={session.user}>{children}</DashboardShell>
}
