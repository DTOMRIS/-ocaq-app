import { auth } from '@/auth'
import { QUALITY_FORM_CATALOG } from '@/data/quality-form-catalog'
import { canUseQualityForms, qualityFormScope } from '@/lib/quality-form-access'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Keyfiyyət formaları — OCAQ' }

const PERIOD_LABELS = {
  event: 'Hadisə üzrə',
  '5-day': '5 günlük',
  '6-day': '6 günlük',
  '10-day': '10 günlük',
  monthly: 'Aylıq',
} as const

const SCOPE_COPY = {
  tenant: 'Bütün filialların formalarını görürsünüz.',
  region: 'Yalnız sizə bağlı bölgə və filialların formalarını görürsünüz.',
  branch: 'Yalnız öz filialınızın formalarını görür və doldurursunuz.',
  none: '',
} as const

export default async function QualityFormsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!canUseQualityForms(session.user.role, 'catalog.view')) redirect('/dashboard')

  const scope = qualityFormScope(session.user.role)
  const canCreate = canUseQualityForms(session.user.role, 'submission.create')
  const canApprove = canUseQualityForms(session.user.role, 'submission.approve')

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="m-0 text-xl font-bold text-slate-950">Keyfiyyət formaları</h1>
          <p className="mt-1 text-sm text-slate-500">
            18 rəsmi forma · mənbə sahələri, saatları, imzaları və reviziyaları qorunur
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <Link href="/dashboard/quality-forms/records"
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-white">
            Qeydlər və təsdiqlər →
          </Link>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-900">
            KXT-dən ayrıdır
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
            Köhnə reviziya silinmir
          </span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rol əhatəsi</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{SCOPE_COPY[scope]}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daxil etmə</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {canCreate ? 'Filial müdiri yeni qeyd yarada bilər.' : 'Bu rol yeni qeyd daxil etmir.'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Təsdiq</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {canApprove ? 'Əhatənizdəki qeydləri yoxlayıb təsdiqləyə bilərsiniz.' : 'Təsdiq bölgə müdiri və ya super admin üçündür.'}
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <strong>Məlumat qorunması:</strong> göndərilmiş forma dəyişdirilmir. Səhv olduqda səbəbi yazılmış
        yeni reviziya yaradılır; əvvəlki reviziya və onun “Çap et” nüsxəsi qalır. Fiziki silmə yoxdur.
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {QUALITY_FORM_CATALOG.map((form) => (
          <article key={form.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white">
                    {form.documentNumber}
                  </span>
                  {form.variant && (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                      {form.variant}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-base font-bold leading-snug text-slate-950">{form.title}</h2>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {PERIOD_LABELS[form.period]}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <span className="block text-slate-400">Mənbə reviziyası</span>
                <strong className="text-slate-800">Rev. {form.revision}</strong>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <span className="block text-slate-400">Sahə sayı</span>
                <strong className="text-slate-800">{form.preservedFields.length} sahə qrupu</strong>
              </div>
            </div>

            {form.fixedTimes.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                <strong className="text-slate-700">Mənbə saatları:</strong> {form.fixedTimes.join(' · ')}
              </p>
            )}

            <details className="mt-4 rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                Qorunan sahələri göstər
              </summary>
              <div className="border-t border-slate-100 px-4 py-3">
                <ul className="grid list-disc grid-cols-1 gap-x-6 gap-y-1 pl-5 text-xs text-slate-600 sm:grid-cols-2">
                  {form.preservedFields.map((field) => <li key={field}>{field}</li>)}
                </ul>
                {form.sourceNotes.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-950">
                    {form.sourceNotes.map((note) => <p key={note} className="m-0 mb-1 last:mb-0">{note}</p>)}
                  </div>
                )}
              </div>
            </details>

            {canCreate ? (
              <Link href={`/dashboard/quality-forms/${form.key}`}
                className="mt-4 inline-flex rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-800">
                Formanı doldur →
              </Link>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Bu rol forma yaratmır; əhatəsindəki filial qeydlərini izləyib təsdiqləyir.
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
