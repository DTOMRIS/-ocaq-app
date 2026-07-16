type Role = 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'

const PERMISSIONS: Record<Role, string[]> = {
  super_admin:    ['*'],
  region_manager: [
    'user.invite', 'user.view', 'report.view', 'checklist.view', 'checklist.run',
    'complaint.view', 'complaint.create', 'complaint.update',
    'region.view', 'region.edit',
    'sales.view.region', 'sales.target.set', 'sales.entry.view',
  ],
  branch_manager: [
    'user.view.branch', 'report.view.branch', 'checklist.run', 'checklist.view',
    'complaint.view.branch', 'complaint.create', 'complaint.update.branch',
    'sales.view.branch', 'sales.entry.create',
  ],
  // İşçi OCAQ əməliyyat modullarından istifadə etmir; ayrıca təlim portalına
  // yönləndirilir. Operativ icazə əlavə etmək kanonik rol qərarını pozar.
  staff:          [],
}

export function can(role: Role, permission: string): boolean {
  const perms = PERMISSIONS[role] ?? []
  return perms.includes('*') || perms.includes(permission)
}

// Server component-lərdə istifadə üçün
export async function requireRole(roles: Role[]) {
  const { auth } = await import('@/auth')
  const session = await auth()
  if (!session || !roles.includes(session.user.role as Role)) {
    throw new Error('FORBIDDEN')
  }
  return session
}
