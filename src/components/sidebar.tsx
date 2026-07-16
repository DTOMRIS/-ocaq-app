'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; icon: string; label: string; roles: string[] }

const NAV: NavItem[] = [
  { href: '/dashboard', icon: '◈', label: 'İdarə paneli', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/vardiya-liderliyi', icon: '◆', label: 'Növbə liderliyi', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/vardiya-checklist', icon: '✓', label: 'KXT doldur', roles: ['branch_manager'] },
  { href: '/dashboard/checklists', icon: '📋', label: 'KXT izləmə', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/sales', icon: '₼', label: 'Satış hədəfi', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/staff', icon: '⊙', label: 'Personel', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/team', icon: '✉', label: 'Hesab və dəvət', roles: ['super_admin', 'region_manager'] },
  { href: '/dashboard/hr', icon: '👤', label: 'HR prosesləri', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/complaints', icon: '🚨', label: 'Şikayətlər', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/bildirisler', icon: '🔔', label: 'Bildirişlər', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/branches', icon: '🏪', label: 'Filiallar', roles: ['super_admin', 'region_manager'] },
  { href: '/dashboard/regions', icon: '◉', label: 'Bölgələr', roles: ['super_admin', 'region_manager'] },
  { href: '/dashboard/settings', icon: '⚙', label: 'Parametrlər', roles: ['super_admin'] },
]


export default function Sidebar({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const path = usePathname()

  const visible = NAV.filter((item) => item.roles.includes(role))

  const isActive = (href: string) => path === href || (href !== '/dashboard' && path.startsWith(href))

  return (
    <aside style={{
      width: '220px', minHeight: '100vh',
      background: '#1A1614', flexShrink: 0,
      display: 'flex', flexDirection: 'column' as const,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#C8102E', fontWeight: '700', fontSize: '16px', margin: 0 }}>
          OCAQ
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: '3px 0 0',
          letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>
          OCAQ Portal
        </p>
      </div>

      {/* Qızılı xətt */}
      <div style={{ height: '3px', background: '#F2A81D' }} />

      {/* Nav */}
      <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 8px' }}>
        {visible.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: '6px', marginBottom: '2px',
              textDecoration: 'none',
              background: active ? 'rgba(200,16,46,0.15)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              fontSize: '13px', fontWeight: active ? '500' : '400',
              transition: 'all .15s',
            }}>
              <span style={{
                color: active ? '#C8102E' : 'rgba(255,255,255,0.3)',
                fontSize: '16px', width: '20px', textAlign: 'center',
              }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Alt — versiya */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', margin: 0 }}>
          OCAQ v0.4 · Faz 1
        </p>
      </div>
    </aside>
  )
}
