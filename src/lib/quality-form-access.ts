export type QualityFormRole = 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'
export type QualityFormAction =
  | 'catalog.view'
  | 'submission.create'
  | 'submission.view'
  | 'submission.approve'
  | 'submission.correct'
  | 'submission.print'
  | 'submission.void'
  | 'template.revise'

const ACTIONS: Record<QualityFormRole, readonly QualityFormAction[]> = {
  super_admin: [
    'catalog.view', 'submission.create', 'submission.view', 'submission.approve',
    'submission.correct', 'submission.print', 'submission.void', 'template.revise',
  ],
  region_manager: [
    'catalog.view', 'submission.view', 'submission.approve',
    'submission.correct', 'submission.print',
  ],
  branch_manager: [
    'catalog.view', 'submission.create', 'submission.view',
    'submission.correct', 'submission.print',
  ],
  // Ümumi personel OCAQ əməliyyatlarına daxil olmur. Formu filial müdiri
  // və ya gələcəkdə ayrıca təsdiqlənəcək nəzarətçi hesabı daxil edir.
  staff: [],
}

export function canUseQualityForms(role: string, action: QualityFormAction): boolean {
  if (!(role in ACTIONS)) return false
  return ACTIONS[role as QualityFormRole].includes(action)
}

export function qualityFormScope(role: string): 'tenant' | 'region' | 'branch' | 'none' {
  if (role === 'super_admin') return 'tenant'
  if (role === 'region_manager') return 'region'
  if (role === 'branch_manager') return 'branch'
  return 'none'
}
