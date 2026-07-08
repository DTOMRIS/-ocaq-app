'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  super_admin:    'Sistem Admini',
  region_manager: 'Bölgə Meneceri',
  branch_manager: 'Filial Müdürü',
  staff:          'İşçi',
}

export default function Topbar({ user }: {
  user: { name?: string | null; email?: string | null; role: string }
}) {
  return (
    <header style={{
      height: '56px', borderBottom: '0.5px solid #e5e5e5',
      background: '#fff', display: 'flex', alignItems: 'center',
      padding: '0 24px', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#C8102E',
        }} />
        <span style={{ fontSize: '13px', color: '#888' }}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Ad — profil linki */}
        <Link href="/dashboard/profile" style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>
          {user.name ?? user.email}
        </Link>
        {/* Avatar */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: '#C8102E', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: '500',
        }}>
          {(user.name ?? user.email ?? 'A')[0].toUpperCase()}
        </div>

        {/* Çıxış */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            padding: '5px 12px', fontSize: '12px',
            border: '0.5px solid #ddd', borderRadius: '6px',
            background: 'none', cursor: 'pointer', color: '#555',
          }}
        >
          Çıxış
        </button>
      </div>
    </header>
  )
}
