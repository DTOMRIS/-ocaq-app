'use client'

import { useState } from 'react'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'

export default function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name?: string | null; email?: string | null; role: string }
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isStaff = user.role === 'staff'

  return (
    <div className="dashboard-shell">
      {!isStaff && (
        <div className="dashboard-sidebar-desktop">
          <Sidebar role={user.role} />
        </div>
      )}

      {!isStaff && menuOpen && (
        <div className="dashboard-drawer-layer" role="presentation">
          <button
            type="button"
            className="dashboard-drawer-backdrop"
            aria-label="Menyunu bağla"
            onClick={() => setMenuOpen(false)}
          />
          <div className="dashboard-drawer">
            <Sidebar role={user.role} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <div className="dashboard-mobile-header">
          {!isStaff && (
            <button
              type="button"
              className="dashboard-menu-button"
              aria-label="Menyunu aç"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>
          )}
          <span>OCAQ</span>
        </div>
        <Topbar user={user} />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  )
}
