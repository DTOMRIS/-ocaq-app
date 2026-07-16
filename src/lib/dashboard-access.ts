const LEGACY_MOCK_ROUTES = [
  '/dashboard/haccp',
  '/dashboard/kasa',
  '/dashboard/fire',
  '/dashboard/ekipman',
  '/dashboard/tahmin',
  '/dashboard/menu',
  '/dashboard/promosyonlar',
] as const

export function isLegacyMockRoute(pathname: string) {
  return LEGACY_MOCK_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function dashboardRedirectForRole(role: string, pathname: string) {
  if (isLegacyMockRoute(pathname)) return '/dashboard'

  // Əməkdaş OCAQ əməliyyat modullarından istifadə etmir. Yalnız təlim
  // portalına keçid verən /dashboard başlanğıc səhifəsi açıqdır.
  if (role === 'staff' && pathname.startsWith('/dashboard/')) return '/dashboard'

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
