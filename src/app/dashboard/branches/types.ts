export type BranchFilter = 'current' | 'active' | 'inactive' | 'archived'

export interface PendingManagerInvitation {
  id: string
  branch_id: string
  email: string
  expires_at: string
  replaces_manager_id: string | null
}

export interface BranchReadModel {
  id: string
  code: string
  name: string
  region_id: string | null
  region_name: string | null
  city: string
  address: string | null
  phone: string | null
  open_time: string | null
  close_time: string | null
  manager_id: string | null
  manager_name: string | null
  manager_email: string | null
  is_active: boolean
  is_archived: boolean
  version: number
  activated_at: string | null
  archived_at: string | null
  archive_reason: string | null
  created_at: string
  updated_at: string
  pending_manager_invitation: PendingManagerInvitation | null
}

export interface RegionOption {
  id: string
  name: string
  is_active: boolean
}

export interface BranchBlockers {
  pending_invitations: number
  draft_shift_briefings: number
  open_complaints: number
}

export interface ManagerCandidate {
  id: string
  name: string | null
  email: string
  is_active: boolean
  is_email_verified: boolean
  assigned_branch_count: number
  assigned_branches: Array<{ id: string; code: string; name: string }>
}

export function isBranchReadModel(value: unknown): value is BranchReadModel {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string'
    && typeof item.code === 'string'
    && typeof item.name === 'string'
    && typeof item.city === 'string'
    && typeof item.is_active === 'boolean'
    && typeof item.is_archived === 'boolean'
    && Number.isSafeInteger(item.version)
    && 'region_name' in item
    && 'manager_name' in item
    && 'pending_manager_invitation' in item
    && 'activated_at' in item
    && 'archived_at' in item
    && 'archive_reason' in item
}
