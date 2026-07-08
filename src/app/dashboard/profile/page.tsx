import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export const metadata = { title: 'Profil — OCAQ' }

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <ProfileClient
      name={session.user.name ?? ''}
      email={session.user.email ?? ''}
      role={session.user.role}
    />
  )
}
