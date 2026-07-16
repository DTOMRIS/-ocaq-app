import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getRequestOrigin } from '@/lib/request-origin'
import ComplaintsClient from './complaints-client'

interface Branch {
  id: string
  code: string
  name: string
}

interface Complaint {
  id: string
  branch_id: string | null
  branch_code: string | null
  branch_name: string | null
  channel: string
  category: string
  priority: string
  status: string
  fault: string
  customer_name: string | null
  customer_phone: string | null
  platform_order_id: string | null
  order_total: string | null
  refund_amount: string | null
  title: string
  description: string
  action_taken: string | null
  resolution_note: string | null
  response_due_at: string | null
  resolved_at: string | null
  closed_at: string | null
  rating: number | null
  created_at: string
  updated_at: string
}

export const metadata = {
  title: 'Şikayətlər — OCAQ',
}

export default async function ComplaintsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const headersList = await headers()
  const cookie = headersList.get('cookie') ?? ''
  const baseUrl = getRequestOrigin(headersList)

  const [branchesRes, complaintsRes] = await Promise.all([
    fetch(`${baseUrl}/api/branches`, { headers: { cookie }, cache: 'no-store' }),
    fetch(`${baseUrl}/api/complaints`, { headers: { cookie }, cache: 'no-store' }),
  ])

  const branches: Branch[] = branchesRes.ok ? await branchesRes.json() : []
  const complaints: Complaint[] = complaintsRes.ok ? await complaintsRes.json() : []

  return (
    <ComplaintsClient
      branches={branches}
      complaints={complaints}
    />
  )
}
