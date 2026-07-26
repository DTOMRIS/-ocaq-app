'use client'

import { useMemo, useRef, useState } from 'react'
import type { QualityFormDefinition } from '@/data/quality-form-catalog'
import type {
  QualityField,
  QualityFormTemplate,
} from '@/data/quality-form-templates'

type BranchOption = { id: string; code: string; name: string }
type FormValue = string | number | boolean | null
type FormRow = Record<string, FormValue>
type InitialRecord = {
  id: string
  version: number
  status: string
  branchId: string
  periodStart: string
  periodEnd: string
  payload: {
    header: FormRow
    rows: FormRow[]
    signoff: FormRow
  }
}

function defaultDates(period: QualityFormDefinition['period']) {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  if (period === 'monthly') {
    const end = new Date(y, today.getMonth() + 1, 0).getDate()
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(end).padStart(2, '0')}` }
  }
  const days = period === '5-day' ? 5 : period === '6-day' ? 6 : period === '10-day' ? 10 : 1
  const endDate = new Date(y, today.getMonth(), today.getDate() + days - 1)
  const end = [
    endDate.getFullYear(),
    String(endDate.getMonth() + 1).padStart(2, '0'),
    String(endDate.getDate()).padStart(2, '0'),
  ].join('-')
  return { start: `${y}-${m}-${d}`, end }
}

function newRow(): FormRow {
  return {}
}

function hasValue(row: FormRow) {
  return Object.values(row).some((value) => value !== '' && value !== null && value !== undefined)
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: QualityField
  value: FormValue | undefined
  onChange: (value: FormValue) => void
}) {
  const common = {
    required: field.required,
    className: 'w-full min-w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500',
  }

  if (field.type === 'choice') {
    return (
      <select {...common} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Seçin</option>
        {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    )
  }
  if (field.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-red-700"
      />
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        {...common}
        rows={2}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <div className="relative">
      <input
        {...common}
        type={field.type === 'signature' ? 'text' : field.type}
        step={field.step}
        min={field.min}
        max={field.max}
        placeholder={field.type === 'signature' ? 'Ad və soyad' : undefined}
        value={typeof value === 'number' || typeof value === 'string' ? value : ''}
        onChange={(event) => {
          if (field.type === 'number') {
            onChange(event.target.value === '' ? null : Number(event.target.value))
          } else {
            onChange(event.target.value)
          }
        }}
      />
      {field.unit && <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">{field.unit}</span>}
    </div>
  )
}

export default function QualityFormEntry({
  definition,
  template,
  branches,
  initialRecord,
  correctionMode = false,
}: {
  definition: QualityFormDefinition
  template: QualityFormTemplate
  branches: BranchOption[]
  initialRecord?: InitialRecord
  correctionMode?: boolean
}) {
  const dates = useMemo(() => defaultDates(definition.period), [definition.period])
  const [branchId, setBranchId] = useState(initialRecord?.branchId ?? (branches.length === 1 ? branches[0].id : ''))
  const [periodStart, setPeriodStart] = useState(initialRecord?.periodStart ?? dates.start)
  const [periodEnd, setPeriodEnd] = useState(initialRecord?.periodEnd ?? dates.end)
  const [header, setHeader] = useState<FormRow>(initialRecord?.payload.header ?? {})
  const [rows, setRows] = useState<FormRow[]>(
    initialRecord?.payload.rows.length ? initialRecord.payload.rows : [newRow()],
  )
  const [signoff, setSignoff] = useState<FormRow>(initialRecord?.payload.signoff ?? {})
  const [saving, setSaving] = useState(false)
  const [record, setRecord] = useState<{ id: string; version: number; status: string } | null>(
    correctionMode || !initialRecord
      ? null
      : { id: initialRecord.id, version: initialRecord.version, status: initialRecord.status },
  )
  const [correctionReason, setCorrectionReason] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string; id?: string } | null>(null)
  const createIdempotencyKey = useRef<string | null>(null)

  const updateSection = (
    setter: React.Dispatch<React.SetStateAction<FormRow>>,
    key: string,
    value: FormValue,
  ) => setter((current) => ({ ...current, [key]: value }))

  const updateRow = (index: number, key: string, value: FormValue) => {
    setRows((current) => current.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [key]: value } : row,
    ))
  }

  async function save(submit: boolean) {
    if (!branchId) {
      setMessage({ kind: 'error', text: 'Filial seçin.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        header,
        rows: rows.filter(hasValue),
        signoff,
      }
      let result: Record<string, unknown>

      if (correctionMode && !record && initialRecord) {
        if (correctionReason.trim().length < 5) {
          throw new Error('Düzəliş səbəbini ən az 5 simvolla yazın')
        }
        createIdempotencyKey.current ??= crypto.randomUUID()
        const response = await fetch(`/api/quality-forms/${initialRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'correct',
            reason: correctionReason.trim(),
            payload,
            idempotency_key: createIdempotencyKey.current,
            expected_version: initialRecord.version,
          }),
        })
        result = await response.json()
        if (!response.ok) throw new Error(String(result.error ?? 'Düzəliş taslağı yaradılmadı'))
      } else if (!record) {
        createIdempotencyKey.current ??= crypto.randomUUID()
        const response = await fetch('/api/quality-forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          branch_id: branchId,
          form_key: definition.key,
          period_start: periodStart,
          period_end: periodEnd,
          payload,
          idempotency_key: createIdempotencyKey.current,
          submit,
        }),
        })
        result = await response.json()
        if (!response.ok) throw new Error(String(result.error ?? 'Forma yadda saxlanılmadı'))
      } else {
        const draftResponse = await fetch(`/api/quality-forms/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_draft',
            payload,
            expected_version: record.version,
          }),
        })
        result = await draftResponse.json()
        if (!draftResponse.ok) throw new Error(String(result.error ?? 'Taslak yenilənmədi'))

        if (submit) {
          const submitResponse = await fetch(`/api/quality-forms/${record.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'submit',
              expected_version: Number(result.version),
            }),
          })
          result = await submitResponse.json()
          if (!submitResponse.ok) throw new Error(String(result.error ?? 'Forma göndərilmədi'))
        }
      }

      setRecord({ id: String(result.id), version: Number(result.version), status: String(result.status) })
      setMessage({
        kind: 'ok',
        text: correctionMode && !record
          ? 'Düzəliş taslağı yaradıldı; əvvəlki reviziya tarixçədə saxlanıldı.'
          : submit ? 'Forma göndərildi və auditə yazıldı.' : 'Taslak serverdə saxlanıldı.',
        id: String(result.id),
      })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Xəta baş verdi' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Filial
            <select
              disabled={Boolean(record || initialRecord)}
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
            >
              <option value="">Filial seçin</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Dövrün başlanğıcı
            <input type="date" disabled={Boolean(record || initialRecord)} value={periodStart} onChange={(event) => setPeriodStart(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Dövrün sonu
            <input type="date" disabled={Boolean(record || initialRecord)} value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" />
          </label>
        </div>
      </section>

      {correctionMode && !record && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <label className="text-sm font-bold text-amber-950">
            Düzəliş səbəbi <span className="text-red-700">*</span>
            <textarea
              value={correctionReason}
              onChange={(event) => setCorrectionReason(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-normal text-slate-900"
              placeholder="Nə yanlış və ya əskik idi, nə düzəldildi?"
            />
          </label>
          <p className="mt-2 text-xs text-amber-800">Əvvəlki reviziya dəyişməyəcək və yenidən çap edilə biləcək.</p>
        </section>
      )}

      {template.headerFields.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-slate-950">Forma başlığı</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {template.headerFields.map((field) => (
              <label key={field.key} className="text-xs font-semibold text-slate-600">
                {field.label}{field.required && <span className="text-red-600"> *</span>}
                <div className="mt-1.5">
                  <FieldInput field={field} value={header[field.key]}
                    onChange={(value) => updateSection(setHeader, field.key, value)} />
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-950">Mənbə sətirləri</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tutum: {definition.rowCapacity ?? 'məhdudiyyətsiz'} · boş sətirlər serverə göndərilmir, çapda mənbə tutumu qorunur
            </p>
          </div>
          <button
            type="button"
            disabled={definition.rowCapacity !== null && rows.length >= definition.rowCapacity}
            onClick={() => setRows((current) => [...current, newRow()])}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            + Sətir əlavə et
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-max border-collapse text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-3 py-3 text-left">#</th>
                {template.rowFields.map((field) => (
                  <th key={field.key} className="min-w-40 border-r border-slate-200 px-3 py-3 text-left font-semibold text-slate-700">
                    {field.label}{field.required && <span className="text-red-600"> *</span>}
                  </th>
                ))}
                <th className="px-3 py-3">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-slate-200 align-top">
                  <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-3 font-bold text-slate-400">{rowIndex + 1}</td>
                  {template.rowFields.map((field) => (
                    <td key={field.key} className="border-r border-slate-200 p-2">
                      <FieldInput field={field} value={row[field.key]}
                        onChange={(value) => updateRow(rowIndex, field.key, value)} />
                    </td>
                  ))}
                  <td className="p-2">
                    <button type="button" disabled={rows.length === 1}
                      onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))}
                      className="rounded-md px-2 py-2 text-red-700 disabled:text-slate-300">
                      Sətiri çıxar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {template.signoffFields.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-slate-950">Yoxlama və imza</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {template.signoffFields.map((field) => (
              <label key={field.key} className="text-xs font-semibold text-slate-600">
                {field.label}{field.required && <span className="text-red-600"> *</span>}
                <div className="mt-1.5">
                  <FieldInput field={field} value={signoff[field.key]}
                    onChange={(value) => updateSection(setSignoff, field.key, value)} />
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {definition.sourceNotes.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          <strong>Mənbə qeydləri</strong>
          <ul className="mt-2 list-disc pl-5">
            {definition.sourceNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      )}

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.text}
          {message.id && (
            <a href={`/dashboard/quality-forms/records/${message.id}/print`} className="ml-3 font-bold underline">
              Çap görünüşünə bax
            </a>
          )}
        </div>
      )}

      <div className="sticky bottom-3 flex flex-wrap justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        {correctionMode && !record ? (
          <button type="button" disabled={saving} onClick={() => save(false)}
            className="rounded-xl bg-amber-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Yaradılır…' : 'Səbəbli düzəliş taslağı yarat'}
          </button>
        ) : (
          <>
            <button type="button" disabled={saving || record?.status === 'submitted'} onClick={() => save(false)}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">
              {saving ? 'Saxlanılır…' : 'Taslak saxla'}
            </button>
            <button type="button" disabled={saving || record?.status === 'submitted'} onClick={() => save(true)}
              className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              Yoxla və göndər
            </button>
          </>
        )}
      </div>
    </div>
  )
}
