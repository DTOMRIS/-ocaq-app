import { MEK_F08_SECTIONS } from '@/data/mek-f08-checklist'

export const CHECKLIST_SHIFTS = ['sabah', 'axsam'] as const
export type ChecklistShift = (typeof CHECKLIST_SHIFTS)[number]

export type ChecklistAnswer = {
  checked: boolean
  note: string
  temperature?: number
  photoKey?: string
}

type ValidationContext = {
  tenantId: string
  branchId: string
  userId: string
}

type ValidationResult =
  | { ok: true; answers: Record<string, ChecklistAnswer>; scorePct: number; checkedCount: number }
  | { ok: false; error: string }

const officialItems = new Map(
  MEK_F08_SECTIONS.flatMap((section) => section.items.map((item) => [item.id, item] as const)),
)

const MAX_NOTE_LENGTH = 500
const MIN_TEMPERATURE = -100
const MAX_TEMPERATURE = 500
const ANSWER_FIELDS = new Set(['checked', 'note', 'temperature', 'photoKey'])

export function getBakuBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baku',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function isChecklistShift(value: unknown): value is ChecklistShift {
  return typeof value === 'string' && CHECKLIST_SHIFTS.includes(value as ChecklistShift)
}

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function checklistEvidencePrefix(context: ValidationContext, itemId?: string): string {
  const base = `checklist-evidence/${context.tenantId}/${context.branchId}/${context.userId}`
  return itemId ? `${base}/${itemId}/` : `${base}/`
}

export function isOfficialChecklistItem(itemId: string): boolean {
  return officialItems.has(itemId)
}

export function itemRequiresPhoto(itemId: string): boolean {
  return officialItems.get(itemId)?.requiresPhoto === true
}

export function validateChecklistAnswers(input: unknown, context: ValidationContext): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Checklist maddələri düzgün formatda deyil' }
  }

  const rawAnswers = input as Record<string, unknown>
  const unknownIds = Object.keys(rawAnswers).filter((id) => !officialItems.has(id))
  if (unknownIds.length > 0) {
    return { ok: false, error: 'Checklist-də tanınmayan maddə var' }
  }

  const answers: Record<string, ChecklistAnswer> = {}
  let checkedCount = 0

  for (const [itemId, raw] of Object.entries(rawAnswers)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: `${itemId} maddəsinin cavabı düzgün deyil` }
    }

    const candidate = raw as Record<string, unknown>
    if (Object.keys(candidate).some((field) => !ANSWER_FIELDS.has(field))) {
      return { ok: false, error: `${itemId} maddəsində tanınmayan sahə var` }
    }
    if (typeof candidate.checked !== 'boolean') {
      return { ok: false, error: `${itemId} maddəsinin statusu düzgün deyil` }
    }

    const note = candidate.note === undefined ? '' : candidate.note
    if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) {
      return { ok: false, error: `${itemId} maddəsinin qeydi çox uzundur` }
    }

    const official = officialItems.get(itemId)!
    const answer: ChecklistAnswer = { checked: candidate.checked, note: note.trim() }

    if (!candidate.checked && (candidate.temperature !== undefined || candidate.photoKey !== undefined)) {
      return { ok: false, error: `${itemId} tamamlanmadan ölçü və ya foto əlavə edilə bilməz` }
    }

    if (candidate.checked && official.temperatureField && (candidate.temperature === undefined || candidate.temperature === '')) {
      return { ok: false, error: `${itemId} maddəsi üçün ölçü daxil edilməlidir` }
    }
    if (candidate.checked && official.requiresPhoto && !candidate.photoKey) {
      return { ok: false, error: `${itemId} maddəsi üçün foto əlavə edilməlidir` }
    }

    if (candidate.temperature !== undefined && candidate.temperature !== '') {
      if (!official.temperatureField) {
        return { ok: false, error: `${itemId} maddəsi temperatur qəbul etmir` }
      }
      const temperature = typeof candidate.temperature === 'number'
        ? candidate.temperature
        : Number(candidate.temperature)
      if (!Number.isFinite(temperature) || temperature < MIN_TEMPERATURE || temperature > MAX_TEMPERATURE) {
        return { ok: false, error: `${itemId} maddəsinin temperaturu düzgün deyil` }
      }
      answer.temperature = temperature
    }

    if (candidate.photoKey !== undefined) {
      if (!official.requiresPhoto || typeof candidate.photoKey !== 'string') {
        return { ok: false, error: `${itemId} maddəsinin fotosu düzgün deyil` }
      }
      if (!candidate.photoKey.startsWith(checklistEvidencePrefix(context, itemId)) || !candidate.photoKey.endsWith('.webp')) {
        return { ok: false, error: `${itemId} fotosu bu filial və istifadəçiyə aid deyil` }
      }
      answer.photoKey = candidate.photoKey
    }

    if (candidate.checked) checkedCount += 1
    answers[itemId] = answer
  }

  if (checkedCount === 0) {
    return { ok: false, error: 'Ən azı bir maddə tamamlanmalıdır' }
  }

  return {
    ok: true,
    answers,
    checkedCount,
    scorePct: Math.round((checkedCount / officialItems.size) * 100),
  }
}

export const OFFICIAL_CHECKLIST_ITEM_COUNT = officialItems.size
