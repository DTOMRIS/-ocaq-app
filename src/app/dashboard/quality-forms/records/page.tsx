import Link from 'next/link'
import { redirect } from 'next/navigation'
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { quality_form_submissions } from '@/db/schema/quality-forms'
import { users } from '@/db/schema/auth'
import { QUALITY_FORM_CATALOG, getQualityFormDefinition } from '@/data/quality-form-catalog'
import { canUseQualityForms } from '@/lib/quality-form-access'
import { qualityFormBranchIds } from '@/lib/quality-form-scope'
import QualityFormRecordActions from '@/components/quality-form-record-actions'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Taslak',
  submitted: 'Təsdiq gözləyir',
  approved: 'Təsdiqlənib',
  voided: 'Ləğv edilib',
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-800',
  voided: 'bg-red-100 text-red-800',
}

export default async function QualityFormRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string; form_key?: string; status?: string; history?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!canUseQualityForms(session.user.role, 'submission.view')) redirect('/dashboard')

  const filters = await searchParams
  const branchIds = await qualityFormBranchIds(session.user, 'history')
  const branchOptions = branchIds.length === 0 ? [] : await db.select({
    id: branches.id,
    code: branches.code,
    name: branches.name,
  }).from(branches).where(and(
    eq(branches.tenant_id, session.user.tenant_id),
    inArray(branches.id, branchIds),
  )).orderBy(branches.code)

  const selectedBranch = filters.branch_id && branchIds.includes(filters.branch_id)
    ? filters.branch_id
    : ''
  const selectedForm = filters.form_key && getQualityFormDefinition(filters.form_key)
    ? filters.form_key
    : ''
  const selectedStatus = ['draft', 'submitted', 'approved', 'voided'].includes(filters.status ?? '')
    ? filters.status!
    : ''
  const includeHistory = filters.history === 'all'

  let rows: Array<{
    id: string
    version: number
    branchCode: string
    branchName: string
    responsibleName: string | null
    formKey: string
    documentNumber: string
    variant: string | null
    recordRevision: number
    isCurrent: boolean
    periodStart: string
    periodEnd: string
    status: string
    submittedAt: Date | null
    approvedAt: Date | null
    createdAt: Date
  }> = []
  let loadError = ''

  try {
    if (branchIds.length > 0) {
      const conditions: SQL[] = [
        eq(quality_form_submissions.tenant_id, session.user.tenant_id),
        selectedBranch
          ? eq(quality_form_submissions.branch_id, selectedBranch)
          : inArray(quality_form_submissions.branch_id, branchIds),
      ]
      if (selectedForm) conditions.push(eq(quality_form_submissions.form_key, selectedForm))
      if (selectedStatus) conditions.push(eq(quality_form_submissions.status, selectedStatus))
      if (!includeHistory) conditions.push(eq(quality_form_submissions.is_current, true))

      rows = await db.select({
        id: quality_form_submissions.id,
        version: quality_form_submissions.version,
        branchCode: branches.code,
        branchName: branches.name,
        responsibleName: users.name,
        formKey: quality_form_submissions.form_key,
        documentNumber: quality_form_submissions.document_number,
        variant: quality_form_submissions.form_variant,
        recordRevision: quality_form_submissions.record_revision,
        isCurrent: quality_form_submissions.is_current,
        periodStart: quality_form_submissions.period_start,
        periodEnd: quality_form_submissions.period_end,
        status: quality_form_submissions.status,
        submittedAt: quality_form_submissions.submitted_at,
        approvedAt: quality_form_submissions.approved_at,
        createdAt: quality_form_submissions.created_at,
      }).from(quality_form_submissions)
        .innerJoin(branches, and(
          eq(branches.id, quality_form_submissions.branch_id),
          eq(branches.tenant_id, quality_form_submissions.tenant_id),
        ))
        .leftJoin(users, and(
          eq(users.id, branches.manager_id),
          eq(users.tenant_id, branches.tenant_id),
        ))
        .where(and(...conditions))
        .orderBy(desc(quality_form_submissions.created_at))
        .limit(500)
    }
  } catch (error) {
    console.error('Quality form records page error:', error)
    loadError = 'Preview verilənlər bazasında keyfiyyət forması migration-u hələ tətbiq edilməyib və ya məlumat oxunmadı.'
  }

  const waiting = rows.filter((row) => row.status === 'submitted').length
  const approved = rows.filter((row) => row.status === 'approved').length
  const drafts = rows.filter((row) => row.status === 'draft').length
  const voided = rows.filter((row) => row.status === 'voided').length

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link href="/dashboard/quality-forms" className="text-sm font-semibold text-slate-500">← Forma kataloqu</Link>
          <h1 className="mt-2 text-xl font-bold text-slate-950">Keyfiyyət forması qeydləri</h1>
          <p className="mt-1 text-sm text-slate-500">Rol əhatəsinə görə filial, status, reviziya və təsdiq izləməsi</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Təsdiq gözləyir', waiting, 'text-amber-700'],
          ['Təsdiqlənib', approved, 'text-emerald-700'],
          ['Taslak', drafts, 'text-slate-700'],
          ['Ləğv edilib', voided, 'text-red-700'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <form className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <select name="branch_id" defaultValue={selectedBranch} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
          <option value="">Bütün filiallar</option>
          {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}
        </select>
        <select name="form_key" defaultValue={selectedForm} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
          <option value="">Bütün formalar</option>
          {QUALITY_FORM_CATALOG.map((form) => <option key={form.key} value={form.key}>{form.documentNumber} · {form.variant ?? form.title}</option>)}
        </select>
        <select name="status" defaultValue={selectedStatus} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="history" defaultValue={includeHistory ? 'all' : 'current'} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
          <option value="current">Yalnız cari reviziyalar</option>
          <option value="all">Köhnə reviziyalar daxil</option>
        </select>
        <button className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Filtrlə</button>
      </form>

      {loadError && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {loadError ? 'Migration tamamlanandan sonra qeydlər burada görünəcək.' : 'Seçilən filtr üzrə qeyd yoxdur.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Filial</th>
                  <th className="px-4 py-3">Forma</th>
                  <th className="px-4 py-3">Dövr</th>
                  <th className="px-4 py-3">Reviziya</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Məsul</th>
                  <th className="px-4 py-3 text-right">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-middle">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.branchCode} · {row.branchName}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.documentNumber}{row.variant ? ` · ${row.variant}` : ''}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{getQualityFormDefinition(row.formKey)?.title}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.periodStart} – {row.periodEnd}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold">R{row.recordRevision}</span>
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${row.isCurrent ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                        {row.isCurrent ? 'Cari' : 'Əvvəlki'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[row.status] ?? 'bg-slate-100'}`}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.responsibleName ?? 'Təyin edilməyib'}</td>
                    <td className="px-4 py-3">
                      <QualityFormRecordActions
                        id={row.id}
                        version={row.version}
                        status={row.status}
                        canApprove={canUseQualityForms(session.user.role, 'submission.approve')}
                        canVoid={canUseQualityForms(session.user.role, 'submission.void')}
                        canCorrect={canUseQualityForms(session.user.role, 'submission.correct')}
                        isCurrent={row.isCurrent}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
