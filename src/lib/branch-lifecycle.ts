export const BRANCH_CODE_PATTERN = /^F-[0-9]{2,}$/
export const BRANCH_ACTIONS = [
  'update_details',
  'activate',
  'deactivate',
  'restore',
] as const

export type BranchAction = typeof BRANCH_ACTIONS[number]

export function normalizeBranchCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

export function isBranchCode(value: string): boolean {
  return BRANCH_CODE_PATTERN.test(value)
}

export function formatBranchCode(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error('BRANCH_SEQUENCE_INVALID')
  }
  return `F-${String(sequence).padStart(2, '0')}`
}

export function nextBranchCode(codes: string[]): string {
  let highest = 0
  for (const rawCode of codes) {
    const code = normalizeBranchCode(rawCode)
    if (!isBranchCode(code)) continue
    const sequence = Number(code.slice(2))
    if (Number.isSafeInteger(sequence) && sequence > highest) highest = sequence
  }
  return formatBranchCode(highest + 1)
}

export function normalizeAzerbaijanPhone(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const digits = value.replace(/\D/g, '')
  const local = digits.startsWith('994') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits
  if (!/^[0-9]{9}$/.test(local)) throw new Error('PHONE_INVALID')
  return `+994${local}`
}

export function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const normalized = value.trim()
  if (normalized.length > maxLength) throw new Error('TEXT_TOO_LONG')
  return normalized
}

export function normalizeRequiredText(value: unknown, minLength: number, maxLength: number): string {
  if (typeof value !== 'string') throw new Error('TEXT_REQUIRED')
  const normalized = value.trim()
  if (normalized.length < minLength || normalized.length > maxLength) throw new Error('TEXT_LENGTH_INVALID')
  return normalized
}

export function normalizeWorkTime(value: unknown, fallback: string): string {
  const normalized = typeof value === 'string' && value.trim() ? value.trim() : fallback
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(normalized)) throw new Error('TIME_INVALID')
  return normalized
}

export function isBranchAction(value: unknown): value is BranchAction {
  return typeof value === 'string' && BRANCH_ACTIONS.includes(value as BranchAction)
}

export function hasOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed)
  return Object.keys(body).every((key) => allowedSet.has(key))
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (typeof error !== 'object' || error === null) return false
  const databaseError = error as { code?: string; constraint?: string }
  return databaseError.code === '23505' && (!constraint || databaseError.constraint === constraint)
}
