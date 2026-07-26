import { getQualityFormDefinition } from '@/data/quality-form-catalog'
import {
  getQualityFormTemplate,
  type QualityField,
} from '@/data/quality-form-templates'

type FieldValue = string | number | boolean | null

export type QualityFormPayload = {
  header: Record<string, FieldValue>
  rows: Array<Record<string, FieldValue>>
  signoff: Record<string, FieldValue>
}

type ValidationResult =
  | { ok: true; payload: QualityFormPayload }
  | { ok: false; error: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys)
  return Object.keys(value).every((key) => allowed.has(key))
}

function isPresent(value: unknown) {
  return value !== null && value !== undefined && value !== ''
}

function validateFieldValue(field: QualityField, value: unknown): boolean {
  if (!isPresent(value)) return !field.required
  if (field.type === 'boolean') return typeof value === 'boolean'
  if (field.type === 'number') {
    return typeof value === 'number'
      && Number.isFinite(value)
      && (field.min === undefined || value >= field.min)
      && (field.max === undefined || value <= field.max)
  }
  if (typeof value !== 'string' || value.length > 5_000) return false
  if (field.type === 'date') return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  if (field.type === 'time') return ISO_TIME.test(value)
  if (field.type === 'choice') return Boolean(field.options?.includes(value))
  return true
}

function validateSection(
  section: unknown,
  fields: readonly QualityField[],
  requireAll: boolean,
): section is Record<string, FieldValue> {
  if (!isRecord(section) || !onlyKeys(section, fields.map((field) => field.key))) return false
  return fields.every((field) => {
    const value = section[field.key]
    if (requireAll && field.required && !isPresent(value)) return false
    return validateFieldValue({ ...field, required: requireAll && field.required }, value)
  })
}

export function isQualityFormIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value)
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function validateQualityFormPeriod(
  formKey: string,
  start: unknown,
  end: unknown,
): string | null {
  const form = getQualityFormDefinition(formKey)
  if (!form) return 'Forma tapılmadı'
  if (!isIsoDate(start) || !isIsoDate(end)) return 'Dövr tarixləri düzgün deyil'

  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
  if (days < 1) return 'Dövrün sonu başlanğıcdan əvvəl ola bilməz'

  const expectedDays = {
    event: 1,
    '5-day': 5,
    '6-day': 6,
    '10-day': 10,
    monthly: null,
  }[form.period]
  if (form.period === 'event' && days !== 1) return 'Hadisə forması bir gün üçün açılır'
  if (expectedDays !== null && days !== expectedDays) {
    return `Bu forma tam ${expectedDays} günlük dövr üçün açılır`
  }
  if (form.period === 'monthly') {
    const lastDay = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth() + 1,
      0,
    )).getUTCDate()
    if (
      startDate.getUTCMonth() !== endDate.getUTCMonth()
      || startDate.getUTCDate() !== 1
      || endDate.getUTCDate() !== lastDay
    ) {
      return 'Aylıq forma ayın ilk günündən son gününədək açılır'
    }
  }
  return null
}

export function validateQualityFormPayload(
  formKey: string,
  input: unknown,
  options: { final: boolean },
): ValidationResult {
  const form = getQualityFormDefinition(formKey)
  const template = getQualityFormTemplate(formKey)
  if (!form || !template) return { ok: false, error: 'Forma şablonu tapılmadı' }
  if (!isRecord(input) || !onlyKeys(input, ['header', 'rows', 'signoff'])) {
    return { ok: false, error: 'Forma məlumat strukturu düzgün deyil' }
  }

  const serialized = JSON.stringify(input)
  if (serialized.length > 2_000_000) return { ok: false, error: 'Forma məlumatı çox böyükdür' }

  if (!validateSection(input.header, template.headerFields, options.final)) {
    return { ok: false, error: 'Forma başlıq sahələrindən biri düzgün deyil' }
  }
  if (!Array.isArray(input.rows) || (form.rowCapacity !== null && input.rows.length > form.rowCapacity)) {
    return { ok: false, error: 'Forma sətirlərinin sayı düzgün deyil' }
  }
  if (options.final && input.rows.length === 0) {
    return { ok: false, error: 'Göndərmək üçün ən az bir məlumat sətri olmalıdır' }
  }
  if (!input.rows.every((row) => validateSection(row, template.rowFields, options.final))) {
    return { ok: false, error: 'Forma sətirlərindən biri natamam və ya düzgün deyil' }
  }
  if (!validateSection(input.signoff, template.signoffFields, options.final)) {
    return { ok: false, error: 'Forma imza sahələrindən biri düzgün deyil' }
  }

  return {
    ok: true,
    payload: input as QualityFormPayload,
  }
}
