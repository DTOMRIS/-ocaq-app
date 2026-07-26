import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { quality_form_submissions } from '@/db/schema/quality-forms'
import { canUseQualityForms } from '@/lib/quality-form-access'
import { qualityFormBranchIds } from '@/lib/quality-form-scope'
import { getQualityFormDefinition } from '@/data/quality-form-catalog'
import { getQualityFormTemplate } from '@/data/quality-form-templates'
import type { QualityFormPayload } from '@/lib/quality-form-validation'
import QualityFormEntry from '@/components/quality-form-entry'

export default async function QualityFormCorrectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!canUseQualityForms(session.user.role, 'submission.correct')) redirect('/dashboard')

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
  if (!record || !record.submission.is_current || !['submitted', 'approved'].includes(record.submission.status)) {
    notFound()
  }

  const branchIds = await qualityFormBranchIds(session.user, 'history')
  if (!branchIds.includes(record.submission.branch_id)) notFound()

  const definition = getQualityFormDefinition(record.submission.form_key)
  const template = getQualityFormTemplate(record.submission.form_key)
  if (!definition || !template) notFound()

  const payload = JSON.parse(record.submission.payload_json) as QualityFormPayload

  return (
    <div>
      <Link href="/dashboard/quality-forms/records" className="text-sm font-semibold text-slate-500">
        ← Qeydlərə qayıt
      </Link>
      <div className="my-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Səbəbli düzəliş</p>
        <h1 className="mt-2 text-xl font-black text-amber-950">
          {definition.documentNumber} · {definition.variant ?? definition.title} · R{record.submission.record_revision}
        </h1>
        <p className="mt-2 text-sm text-amber-900">
          Bu qeyd dəyişdirilməyəcək. Düzəliş yeni R{record.submission.record_revision + 1} taslağı yaradacaq.
        </p>
      </div>

      <QualityFormEntry
        definition={definition}
        template={template}
        branches={[{
          id: record.submission.branch_id,
          code: record.branchCode,
          name: record.branchName,
        }]}
        initialRecord={{
          id: record.submission.id,
          version: record.submission.version,
          status: record.submission.status,
          branchId: record.submission.branch_id,
          periodStart: record.submission.period_start,
          periodEnd: record.submission.period_end,
          payload,
        }}
        correctionMode
      />
    </div>
  )
}
