export function isBranchManagerInvitation(role: unknown): role is 'branch_manager' {
  return role === 'branch_manager'
}

export function managerScopeMatches(
  currentManagerId: string | null,
  replacesManagerId: string | null,
) {
  return currentManagerId === replacesManagerId
}

