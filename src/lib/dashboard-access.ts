const LEGACY_MOCK_ROUTES = [
  '/dashboard/haccp',
  '/dashboard/kasa',
  '/dashboard/fire',
  '/dashboard/ekipman',
  '/dashboard/tahmin',
  '/dashboard/menu',
  '/dashboard/promosyonlar',
] as const

const LEGACY_ADMIN_REDIRECTS: Array<{ route: string; destination: string }> = [
  { route: '/admin/filiallar', destination: '/dashboard/branches' },
  { route: '/admin/personel', destination: '/dashboard/staff' },
  { route: '/admin/ayarlar', destination: '/dashboard/settings' },
  { route: '/admin/ekipman', destination: '/dashboard' },
  { route: '/admin/menu', destination: '/dashboard' },
  { route: '/admin/promosyonlar', destination: '/dashboard' },
]

export function isLegacyMockRoute(pathname: string) {
  return LEGACY_MOCK_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function dashboardRedirectForRole(role: string, pathname: string) {
  const legacyAdmin = LEGACY_ADMIN_REDIRECTS.find(
    ({ route }) => pathname === route || pathname.startsWith(`${route}/`),
  )
  if (legacyAdmin) return legacyAdmin.destination

  if (isLegacyMockRoute(pathname)) return '/dashboard'

  // Əməkdaş hesabı OCAQ-a daxil olmur. Auth qatında da bloklanır; bu qayda
  // köhnə JWT və ya birbaşa route cəhdi üçün ikinci müdafiə qatıdır.
  if (role === 'staff' && (pathname === '/dashboard' || pathname.startsWith('/dashboard/'))) {
    return '/login'
  }

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
