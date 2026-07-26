import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, asc, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { quality_form_events, quality_form_submissions } from '@/db/schema/quality-forms'
import { users } from '@/db/schema/auth'
import { canUseQualityForms } from '@/lib/quality-form-access'
import { qualityFormBranchIds } from '@/lib/quality-form-scope'
import { getQualityFormDefinition } from '@/data/quality-form-catalog'
import { getQualityFormTemplate } from '@/data/quality-form-templates'
import type { QualityFormPayload } from '@/lib/quality-form-validation'
import QualityFormPrintButton from '@/components/quality-form-print-button'

function displayValue(value: unknown) {
  if (value === true) return 'Bəli'
  if (value === false) return 'Xeyr'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export default async function QualityFormPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!canUseQualityForms(session.user.role, 'submission.print')) redirect('/dashboard')

  const { id } = await params
  const [record] = await db.select({
    submission: quality_form_submissions,
    branchCode: branches.code,
    branchName: branches.name,
  }).from(quality_form_submissions)
    .innerJoin(branches, and(
      eq(branches.id, quality_form_submissions.branch_id),
      eq(branches.tenant_id, quality_form_submissions.tenant_id),
    ))
    .where(and(
      eq(quality_form_submissions.id, id),
      eq(quality_form_submissions.tenant_id, session.user.tenant_id),
    )).limit(1)
  if (!record) notFound()

  const branchIds = await qualityFormBranchIds(session.user, 'history')
  if (!branchIds.includes(record.submission.branch_id)) notFound()

  const definition = getQualityFormDefinition(record.submission.form_key)
  const template = getQualityFormTemplate(record.submission.form_key)
  if (!definition || !template) notFound()

  const payload = JSON.parse(record.submission.payload_json) as QualityFormPayload
  const events = await db.select({
    id: quality_form_events.id,
    action: quality_form_events.action,
    reason: quality_form_events.reason,
    actorName: users.name,
    actorEmail: users.email,
    createdAt: quality_form_events.created_at,
  }).from(quality_form_events)
    .innerJoin(users, and(
      eq(users.id, quality_form_events.actor_id),
      eq(users.tenant_id, quality_form_events.tenant_id),
    ))
    .where(and(
      eq(quality_form_events.submission_id, record.submission.id),
      eq(quality_form_events.tenant_id, session.user.tenant_id),
    ))
    .orderBy(asc(quality_form_events.created_at))
  const printableRows = Array.from(
    { length: definition.rowCapacity ?? payload.rows.length },
    (_, index) => payload.rows[index] ?? {},
  )

  return (
    <div className="quality-form-print mx-auto max-w-[1400px] bg-white text-slate-950">
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/quality-forms" className="text-sm font-semibold text-slate-500">← Formlara qayıt</Link>
        <QualityFormPrintButton recordId={record.submission.id} />
      </div>

      <header className="border-2 border-slate-950">
        <div className="grid grid-cols-[1fr_auto]">
          <div className="p-4">
            <p className="text-xs font-bold">{definition.documentNumber}</p>
            <h1 className="mt-2 text-xl font-black uppercase">{definition.title}</h1>
            <p className="mt-2 text-xs">{record.branchCode} · {record.branchName}</p>
          </div>
          <table className="border-l-2 border-slate-950 text-xs">
            <tbody>
              <tr><th className="border-b border-r border-slate-950 p-2 text-left">Hazırlanma tarixi</th><td className="border-b border-slate-950 p-2">{definition.preparationDate}</td></tr>
              <tr><th className="border-b border-r border-slate-950 p-2 text-left">Mənbə reviziyası</th><td className="border-b border-slate-950 p-2">{definition.revision}</td></tr>
              <tr><th className="border-b border-r border-slate-950 p-2 text-left">Qeyd reviziyası</th><td className="border-b border-slate-950 p-2">{record.submission.record_revision}</td></tr>
              <tr><th className="border-b border-r border-slate-950 p-2 text-left">Reviziya vəziyyəti</th><td className="border-b border-slate-950 p-2">{record.submission.is_current ? 'Cari' : 'Əvvəlki — tarixçə'}</td></tr>
              <tr><th className="border-r border-slate-950 p-2 text-left">Dövr</th><td className="p-2">{record.submission.period_start} – {record.submission.period_end}</td></tr>
            </tbody>
          </table>
        </div>
      </header>

      {template.headerFields.length > 0 && (
        <div className="grid grid-cols-2 border-x-2 border-b-2 border-slate-950 text-xs">
          {template.headerFields.map((field) => (
            <div key={field.key} className="border-r border-slate-950 p-2 last:border-r-0">
              <strong>{field.label}:</strong> {displayValue(payload.header[field.key])}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden border-x-2 border-b-2 border-slate-950">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className="border-b border-r border-slate-950 p-1">#</th>
              {template.rowFields.map((field) => (
                <th key={field.key} className="border-b border-r border-slate-950 p-1 text-left last:border-r-0">{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {printableRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border-b border-r border-slate-500 p-1 text-center">{rowIndex + 1}</td>
                {template.rowFields.map((field) => (
                  <td key={field.key} className="border-b border-r border-slate-500 p-1 last:border-r-0">
                    {displayValue(row[field.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {template.signoffFields.length > 0 && (
        <div className="grid grid-cols-2 border-x-2 border-b-2 border-slate-950 text-xs">
          {template.signoffFields.map((field) => (
            <div key={field.key} className="border-r border-slate-950 p-3 last:border-r-0">
              <strong>{field.label}:</strong> {displayValue(payload.signoff[field.key])}
            </div>
          ))}
        </div>
      )}

      {definition.sourceNotes.length > 0 && (
        <div className="border-x-2 border-b-2 border-slate-950 p-3 text-[10px]">
          {definition.sourceNotes.map((note) => <p key={note} className="mb-1 last:mb-0"><strong>Qeyd:</strong> {note}</p>)}
        </div>
      )}

      <footer className="mt-3 flex justify-between text-[9px] text-slate-500">
        <span>Şablon SHA-256: {record.submission.template_sha256}</span>
        <span>Qeyd ID: {record.submission.id}</span>
      </footer>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 print:hidden">
        <h2 className="font-bold text-slate-950">Audit tarixçəsi</h2>
        <p className="mt-1 text-xs text-slate-500">Kim, nə vaxt, hansı əməliyyatı edib və səbəbi nə olub</p>
        <div className="mt-4 space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex flex-col justify-between gap-1 rounded-xl bg-white px-4 py-3 text-xs sm:flex-row sm:items-center">
              <div>
                <strong className="text-slate-900">{event.action}</strong>
                <span className="ml-2 text-slate-500">{event.actorName ?? event.actorEmail}</span>
                {event.reason && <p className="mt-1 text-slate-600">Səbəb: {event.reason}</p>}
              </div>
              <time className="text-slate-400">
                {new Date(event.createdAt).toLocaleString('az-AZ')}
              </time>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
