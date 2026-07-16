import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getRequestOrigin } from '@/lib/request-origin'
import TeamClient from './team-client'

export const metadata = { title: 'Komanda — OCAQ' }

export default async function TeamPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'super_admin' && role !== 'region_manager') {
    redirect('/dashboard')
  }

  const headersList = await headers()
  const cookie = headersList.get('cookie') ?? ''
  const baseUrl = getRequestOrigin(headersList)

  let invitations: unknown[] = []
  let users: unknown[] = []
  let branches: unknown[] = []
  let fetchError: string | null = null

  try {
    const [invRes, usrRes, brRes] = await Promise.all([
      fetch(`${baseUrl}/api/invitations`, { headers: { cookie }, cache: 'no-store' }),
      fetch(`${baseUrl}/api/users`, { headers: { cookie }, cache: 'no-store' }),
      fetch(`${baseUrl}/api/branches`, { headers: { cookie }, cache: 'no-store' }),
    ])

    if (invRes.ok) { const d = await invRes.json(); if (Array.isArray(d)) invitations = d }
    if (usrRes.ok) { const d = await usrRes.json(); if (Array.isArray(d)) users = d }
    if (brRes.ok) { const d = await brRes.json(); if (Array.isArray(d)) branches = d }
  } catch {
    fetchError = 'Serverlə əlaqə qurulmadı'
  }

  return (
    <TeamClient
      invitations={invitations}
      users={users}
      branches={branches}
      isSuperAdmin={role === 'super_admin'}
      fetchError={fetchError}
    />
  )
}
