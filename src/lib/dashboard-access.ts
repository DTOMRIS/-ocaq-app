/**
 * NÜMUNƏ (mock) ROUTE-LAR — bazaya yazmayan ekranlar.
 *
 * Middleware bunları `/dashboard`-a qaytarır: səhifə AÇILMIR. Yəni müdir
 * kassa sayımı girib «yadda saxladım» sanmır — ora ümumiyyətlə çata bilmir.
 * Səhifələr silinmir (`AGENTS.md` §2), sadəcə bağlıdır.
 *
 * ⚠️ 12.09.2026 — `/dashboard/promosyonlar` BU SİYAHIDAN ÇIXARILDI.
 * O, nümunə DEYİL: `page.tsx` bazadan oxuyur (`promotions` cədvəli, migration
 * 0024) və sidebar-da hər üç rola görünür. Siyahıda qaldığı üçün menyu sətri
 * tıklananda istifadəçi sakitcə `/dashboard`-a atılırdı — modul qurulub, amma
 * heç kim aça bilmirdi.
 */
const LEGACY_MOCK_ROUTES = [
  '/dashboard/haccp',
  '/dashboard/kasa',
  '/dashboard/fire',
  '/dashboard/ekipman',
  '/dashboard/tahmin',
  '/dashboard/menu',
] as const

const LEGACY_ADMIN_REDIRECTS: Array<{ route: string; destination: string; exact?: boolean }> = [
  { route: '/admin/filiallar', destination: '/dashboard/branches' },
  { route: '/admin/personel', destination: '/dashboard/staff' },
  { route: '/admin/ayarlar', destination: '/dashboard/settings' },
  { route: '/admin/ekipman', destination: '/dashboard' },
  { route: '/admin/menu', destination: '/dashboard' },
  // `/admin/promosyonlar` dashboard səhifəsinin 2 sətirlik re-export-udur →
  // əsl siyahıya yönləndirilir. ⚠️ `/yeni` İSTİSNADIR: promosiya yaratma formu
  // ORADADIR və `promo-client.tsx` ona link verir. Prefiks uyğunluğu onu da
  // tuturdu, yəni «Yeni promosiya» düyməsi də ölü idi.
  { route: '/admin/promosyonlar', destination: '/dashboard/promosyonlar', exact: true },
]

export function isLegacyMockRoute(pathname: string) {
  return LEGACY_MOCK_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function dashboardRedirectForRole(role: string, pathname: string) {
  const legacyAdmin = LEGACY_ADMIN_REDIRECTS.find(
    ({ route, exact }) => pathname === route || (!exact && pathname.startsWith(`${route}/`)),
  )
  if (legacyAdmin) return legacyAdmin.destination

  if (isLegacyMockRoute(pathname)) return '/dashboard'

  // Əməkdaş OCAQ əməliyyat modullarından istifadə etmir. Yalnız təlim
  // portalına keçid verən başlanğıc səhifəsi və öz profil səhifəsi açıqdır.
  if (
    role === 'staff'
    && pathname.startsWith('/dashboard/')
    && pathname !== '/dashboard/profile'
  ) return '/dashboard'

  const superAdminOnly = ['/dashboard/settings']
  if (superAdminOnly.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return role === 'super_admin' ? null : '/dashboard'
  }

  const upperManagementOnly = ['/dashboard/branches', '/dashboard/regions', '/dashboard/team']
  if (upperManagementOnly.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return role === 'super_admin' || role === 'region_manager' ? null : '/dashboard'
  }

  if (
    role !== 'branch_manager'
    && (pathname === '/dashboard/vardiya-checklist' || pathname === '/vardiya-checklist')
  ) {
    return '/dashboard/checklists'
  }

  return null
}
