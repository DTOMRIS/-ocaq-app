import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import Topbar  from '@/components/topbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9f9f9' }}>
      <Sidebar role={session.user.role} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
        <Topbar user={session.user} />
        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
