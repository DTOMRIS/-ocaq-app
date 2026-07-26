import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import StaffList from '@/components/staff-list'
import { getRequestOrigin } from '@/lib/request-origin'

interface Staff {
  id: string
  user_id: string
  employee_code: string | null
  position: string | null
  department: string | null
  status: 'active' | 'on_leave' | 'suspended' | 'terminated'
  branch_id: string | null
  avatar_url: string | null
  hire_date: string | null
  contract_type: 'full_time' | 'part_time' | 'casual' | 'intern'
  name: string | null
  email: string
  role: string
  is_active: boolean
}

interface Branch {
  id: string
  code: string
  name: string
}

export default async function StaffPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const headersList = await headers()
  const cookie = headersList.get('cookie') ?? ''

  const baseUrl = getRequestOrigin(headersList)

  const [branchesRes, staffRes] = await Promise.all([
    fetch(`${baseUrl}/api/branches`, { headers: { cookie }, cache: 'no-store' }),
    fetch(`${baseUrl}/api/staff`, { headers: { cookie }, cache: 'no-store' }),
  ])

  const branches: Branch[] = branchesRes.ok ? await branchesRes.json().catch(() => []) : []
  const staffList: Staff[] = staffRes.ok ? await staffRes.json().catch(() => []) : []

  return (
    <div>
      {/* Başlıq */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1a1a',
              margin: 0,
            }}>
              Personel
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '24px',
              height: '24px',
              padding: '0 7px',
              borderRadius: '12px',
              background: '#C8102E',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
            }}>
              {staffList.length}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#888', margin: '3px 0 0' }}>
            Bütün əməkdaşlar — filial, vəzifə və status üzrə idarəetmə
          </p>
        </div>
      </div>

      {/* Client komponent */}
      <StaffList
        staff={staffList}
        branches={branches}
        userRole={session.user.role}
      />
    </div>
  )
}
