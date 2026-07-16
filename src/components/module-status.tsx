import Link from 'next/link'

export default function ModuleStatus({
  title,
  description,
  steps,
}: {
  title: string
  description: string
  steps: string[]
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Planlaşdırılır</span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">Aktivləşdirmək üçün tələb olunan axın</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-slate-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <Link href="/dashboard/hr" className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
        HR səhifəsinə qayıt
      </Link>
    </div>
  )
}
