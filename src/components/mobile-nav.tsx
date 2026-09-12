'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * TELEFONDA ALT HƏRƏKƏT ÇUBUĞU — baş barmaq bölgəsi.
 *
 * NİYƏ: menyu indiyə qədər yalnız ekranın YUXARI SOLUNDAKI ☰ düyməsində idi.
 * Telefonu bir əllə tutan adam baş barmağı ilə ora çatmır — telefonu əlində
 * çevirməli olur. Ən çox işlənən 4 ekran aşağıya, barmağın düşdüyü yerə alınır.
 *
 * NİYƏ 4+1: beşdən çox element 360 px ekranda 60 px-dən dar düşür — Apple və
 * Material hər ikisi minimum 44–48 px toxunma sahəsi tələb edir. 5-ci yuva
 * bütün menyunu açır, orada axtarış var.
 *
 * Siyahı ROLA GÖRƏ dəyişir: filial müdirinin ən çox açdığı ekran «KXT doldur»,
 * bölgə müdirininki «KXT izləmə»dir. Hamıya eyni çubuğu vermək onlardan birini
 * hər dəfə iki toxunuş uzağa atır.
 */

type Yuva = { href: string; icon: string; label: string }

const YUVALAR: Record<string, Yuva[]> = {
  super_admin: [
    { href: '/dashboard',           icon: '◈',  label: 'Panel' },
    { href: '/dashboard/panel',     icon: '📈', label: 'Günlük' },
    { href: '/dashboard/analitika', icon: '📊', label: 'Analitika' },
    { href: '/dashboard/acilis',    icon: '🏗', label: 'Açılış' },
  ],
  region_manager: [
    { href: '/dashboard',            icon: '◈',  label: 'Panel' },
    { href: '/dashboard/panel',      icon: '📈', label: 'Günlük' },
    { href: '/dashboard/checklists', icon: '📋', label: 'KXT' },
    { href: '/dashboard/complaints', icon: '🚨', label: 'Şikayət' },
  ],
  branch_manager: [
    { href: '/dashboard',                   icon: '◈',  label: 'Panel' },
    { href: '/dashboard/vardiya-checklist', icon: '✓',  label: 'KXT doldur' },
    { href: '/dashboard/sales',             icon: '₼',  label: 'Hədəf' },
    { href: '/dashboard/complaints',        icon: '🚨', label: 'Şikayət' },
  ],
}

export default function MobileNav({ role, menuOpen, onMenu }: {
  role: string; menuOpen: boolean; onMenu: () => void
}) {
  const path = usePathname()
  const yuvalar = YUVALAR[role]
  if (!yuvalar) return null        // işçi bu qabıqdan istifadə etmir

  const aktiv = (href: string) =>
    path === href || (href !== '/dashboard' && path.startsWith(href))

  return (
    <nav className="ocaq-bottomnav" aria-label="Əsas naviqasiya">
      {yuvalar.map(y => (
        <Link key={y.href} href={y.href}
              className={`ocaq-bottomnav-item${aktiv(y.href) ? ' is-active' : ''}`}
              aria-current={aktiv(y.href) ? 'page' : undefined}>
          <span className="ocaq-bottomnav-icon" aria-hidden>{y.icon}</span>
          <span className="ocaq-bottomnav-label">{y.label}</span>
        </Link>
      ))}
      <button type="button" onClick={onMenu} aria-expanded={menuOpen}
              className={`ocaq-bottomnav-item${menuOpen ? ' is-active' : ''}`}>
        <span className="ocaq-bottomnav-icon" aria-hidden>☰</span>
        <span className="ocaq-bottomnav-label">Hamısı</span>
      </button>
    </nav>
  )
}
