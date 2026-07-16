export const OPERATIONAL_ROLES = ['super_admin', 'region_manager', 'branch_manager'] as const

export type OperationalRole = typeof OPERATIONAL_ROLES[number]

export function isOperationalRole(role: string): role is OperationalRole {
  return OPERATIONAL_ROLES.includes(role as OperationalRole)
}
