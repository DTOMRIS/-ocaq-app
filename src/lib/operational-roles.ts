export const OPERATIONAL_ROLES = ['super_admin', 'region_manager', 'branch_manager'] as const

export type OperationalRole = typeof OPERATIONAL_ROLES[number]

export function isOperationalRole(role: string): role is OperationalRole {
  return OPERATIONAL_ROLES.includes(role as OperationalRole)
}

export const MANAGER_INVITABLE_ROLES = ['branch_manager', 'region_manager'] as const

export type ManagerInvitableRole = typeof MANAGER_INVITABLE_ROLES[number]

export function isManagerInvitableRole(role: unknown): role is ManagerInvitableRole {
  return typeof role === 'string'
    && MANAGER_INVITABLE_ROLES.includes(role as ManagerInvitableRole)
}
