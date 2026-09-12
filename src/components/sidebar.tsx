'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; icon: string; label: string; roles: string[] }

const NAV: NavItem[] = [
  { href: '/dashboard', icon: '◈', label: 'İdarə paneli', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/analitika', icon: '📊', label: 'Analitika', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/panel', icon: '📈', label: 'Günlük Panel', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/saatlik', icon: '🕐', label: 'Saatlıq Satış', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/silinme', icon: '🗑', label: 'Silinmə Nəzarəti', roles: ['super_admin', 'region_manager', 'branch_manager'] },
  { href: '/dashboard/kasa-banka', icon: '🏦', label: 'Kasa/Banka', roles: ['super_admin'] },
  { href: '/dashboard/pul-axini', icon: '💸', label: 'Pul Axını', roles: ['super_admin'] },
  { href: '/dashboard/acilis', icon: '🏗', label: 'Açılış Takibi', roles: ['super_admin', 'region_manager'] },
  { href: '/dashboard/menyu', icon: '🍔', label: 'Menü', roles: ['super_admin', 'region_manager'] },
  { href: '/dashboard/recetura', icon: '🧾', label: 'Reçetura', roles: ['super_admin', 'region_manager'] },
  { href: '/dashboard/promosyonlar', icon: '🎁', label: 'Promosyonlar', roles: ['super_admin', 'region_manager', 'branch_manager'] },
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
  const [ara, setAra] = useState('')

  /**
   * AZ hərf tələsi: 'İdarə'.toLowerCase() → 'i'+U+0307, yəni 'idar' ilə
   * uyğunlaşmır. Əvvəl İ/I/ı → i, sonra kiçildib diakritikləri atırıq ki,
   * «hedef» yazan da «Satış hədəfi»ni tapsın.
   */
  const acar = (v: string) => v.replace(/[İIı]/g, 'i').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const rolaUygun = useMemo(() => NAV.filter((item) => item.roles.includes(role)), [role])
  const visible = useMemo(() => {
    const q = acar(ara.trim())
    return q ? rolaUygun.filter((item) => acar(item.label).includes(q)) : rolaUygun
  }, [rolaUygun, ara])

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
        <p style={{ color: '#fff', fontWeight: 800, fontSize: '19px', margin: 0,
          letterSpacing: '-.02em', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: '#C8102E', display: 'inline-block' }} />
          OCAQ
        </p>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', margin: '4px 0 0 14px',
          letterSpacing: '.16em', textTransform: 'uppercase' as const, fontWeight: 600 }}>
          Əməliyyat portalı
        </p>
      </div>

      {/* Qızılı xətt */}
      <div style={{ height: '3px', background: '#F2A81D' }} />

      {/* Axtarış — 23 menyu sətrini gözlə taramaq əvəzinə yazıb tapmaq */}
      <div style={{ padding: '10px 10px 4px' }}>
        <input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Menyuda axtar…"
          aria-label="Menyuda axtar"
          style={{
            width: '100%', padding: '8px 11px', borderRadius: 9,
            border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
            color: '#fff', fontSize: 13, outline: 'none',
            fontFamily: 'inherit', letterSpacing: '-.01em',
          }}
        />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 8px 12px' }}>
        {visible.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, padding: '10px' }}>
            «{ara}» üçün menyu tapılmadı.
          </p>
        )}
        {visible.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: '11px',
              padding: '9px 11px', borderRadius: '9px', marginBottom: '1px',
              textDecoration: 'none',
              background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.56)',
              fontSize: '13px', fontWeight: active ? 600 : 450,
              letterSpacing: '-.01em',
              transition: 'background .15s, color .15s',
            }}>
              {/* Aktiv sətir qızılı zolaqla işarələnir — yalnız fon fərqi
                  qaranlıq menyuda zəif oxunur. */}
              {active && <span aria-hidden style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 3, height: 18, borderRadius: '0 3px 3px 0', background: '#F2A81D',
              }} />}
              <span style={{
                color: active ? '#F2A81D' : 'rgba(255,255,255,0.34)',
                fontSize: '15px', width: '20px', textAlign: 'center', flexShrink: 0,
              }}>{item.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
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
