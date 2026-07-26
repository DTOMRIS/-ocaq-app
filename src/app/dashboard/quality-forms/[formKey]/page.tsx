import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { getQualityFormDefinition } from '@/data/quality-form-catalog'
import { getQualityFormTemplate } from '@/data/quality-form-templates'
import { accessibleBranchIds } from '@/lib/branch-access'
import { canUseQualityForms } from '@/lib/quality-form-access'
import QualityFormEntry from '@/components/quality-form-entry'

export default async function QualityFormEntryPage({
  params,
}: {
  params: Promise<{ formKey: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!canUseQualityForms(session.user.role, 'submission.create')) redirect('/dashboard/quality-forms')

  const { formKey } = await params
  const definition = getQualityFormDefinition(formKey)
  const template = getQualityFormTemplate(formKey)
  if (!definition || !template) notFound()

  const branchIds = await accessibleBranchIds(session.user)
  const branchOptions = branchIds.length === 0 ? [] : await db.select({
    id: branches.id,
    code: branches.code,
    name: branches.name,
  }).from(branches).where(and(
    eq(branches.tenant_id, session.user.tenant_id),
    inArray(branches.id, branchIds),
    eq(branches.is_active, true),
    eq(branches.is_archived, false),
  )).orderBy(branches.code)

  return (
    <div>
      <Link href="/dashboard/quality-forms" className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-red-700">
        ← Keyfiyyət formalarına qayıt
      </Link>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white">{definition.documentNumber}</span>
          {definition.variant && <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">{definition.variant}</span>}
          <span className="text-xs font-semibold text-slate-400">Mənbə rev. {definition.revision}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">{definition.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mənbədəki sahələr qısaldılmadan serverə yazılır; göndərilən qeyd sonradan dəyişdirilmir.
        </p>
      </div>

      {branchOptions.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Aktiv və səlahiyyətiniz daxilində filial tapılmadı. Forma yaradıla bilməz.
        </div>
      ) : (
        <QualityFormEntry definition={definition} template={template} branches={branchOptions} />
      )}
    </div>
  )
}
