import Link from 'next/link'
import type { ManagementDashboard } from '@/lib/management-dashboard'

type Props = {
  data: ManagementDashboard
  role: string
  today: string
}

const scoreClass = (score: number | null) => {
  if (score === null) return 'text-slate-400'
  if (score >= 90) return 'text-emerald-700'
  if (score >= 70) return 'text-amber-700'
  return 'text-red-700'
}

const trendLabel = (trend: number | null) => {
  if (trend === null) return 'Müqayisə üçün məlumat yoxdur'
  if (trend === 0) return 'Əvvəlki 7 günlə eyni'
  return `${trend > 0 ? '+' : ''}${trend} bənd · əvvəlki 7 günə görə`
}

export default function ManagementNetworkDashboard({ data, role, today }: Props) {
  const isNetworkRole = role === 'super_admin' || role === 'region_manager'
  const title = role === 'super_admin'
    ? 'Şəbəkə nəzarət paneli'
    : role === 'region_manager'
      ? 'Bölgə nəzarət paneli'
      : 'Filial nəzarət paneli'

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            KXT nəticəsi, 7/30 günlük trend, cari rəsmi forma vəziyyəti və məsul şəxs · {today}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/checklists" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-300">
            KXT detalları
          </Link>
          <Link href="/dashboard/quality-forms/records" className="rounded-lg bg-[var(--ocaq-red)] px-3 py-2 text-xs font-semibold text-white">
            Forma qeydləri
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Aktiv filial" value={String(data.branchCount)} note="rol əhatəsində" />
        <Metric
          label="Bugünkü KXT"
          value={`${data.todaySubmitted}/${data.todayExpected}`}
          note={data.todayMissing ? `${data.todayMissing} növbə gözlənilir` : 'bütün növbələr tamamdır'}
          tone={data.todayMissing ? 'danger' : 'success'}
        />
        <Metric
          label="KXT · 7 gün"
          value={data.kxt7Avg === null ? '—' : `${data.kxt7Avg}%`}
          note={trendLabel(data.kxtTrend)}
          tone={data.kxt7Avg === null ? 'muted' : data.kxt7Avg >= 90 ? 'success' : data.kxt7Avg >= 70 ? 'warning' : 'danger'}
        />
        <Metric
          label="KXT · 30 gün"
          value={data.kxt30Avg === null ? '—' : `${data.kxt30Avg}%`}
          note="göndərilən real nəticələr"
          tone={data.kxt30Avg === null ? 'muted' : data.kxt30Avg >= 90 ? 'success' : data.kxt30Avg >= 70 ? 'warning' : 'danger'}
        />
        <Metric label="Rəsmi forma · 7/30" value={`${data.quality7Count}/${data.quality30Count}`} note="cari revision qeydləri" />
        <Metric
          label="Forma istisnası"
          value={String(data.pendingApproval + data.draftCount + data.voidedCount)}
          note={`${data.pendingApproval} təsdiq · ${data.draftCount} qaralama · ${data.voidedCount} ləğv`}
          tone={data.pendingApproval + data.draftCount + data.voidedCount ? 'warning' : 'success'}
        />
      </div>

      {isNetworkRole && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Filial istisnaları və məsul şəxslər</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">İstisnası çox olan filial yuxarıda görünür.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
              “Eksik form” yalnız tezlik cədvəli təsdiqlənəndən sonra hesablanacaq
            </span>
          </div>
          {data.branches.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Rol əhatəsində aktiv filial yoxdur.</div>
          ) : (
            <div className="overflow-x-auto" role="region" aria-label="Filial performans cədvəli" tabIndex={0}>
              <table className="w-full min-w-[920px] border-collapse text-xs">
                <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Filial</th>
                    <th className="px-4 py-3">Bölgə</th>
                    <th className="px-4 py-3">Məsul müdür</th>
                    <th className="px-4 py-3 text-right">Bugünkü KXT</th>
                    <th className="px-4 py-3 text-right">7 gün</th>
                    <th className="px-4 py-3 text-right">30 gün</th>
                    <th className="px-4 py-3 text-right">Forma · 7 gün</th>
                    <th className="px-4 py-3 text-right">İstisna</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branches.map((branch) => (
                    <tr key={branch.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">{branch.code} · {branch.name}</td>
                      <td className="px-4 py-3 text-slate-600">{branch.regionName ?? 'Təyin edilməyib'}</td>
                      <td className={`px-4 py-3 ${branch.managerName ? 'text-slate-700' : 'font-semibold text-red-700'}`}>
                        {branch.managerName ?? 'Müdür təyin edilməyib'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${branch.todayMissing ? 'text-red-700' : 'text-emerald-700'}`}>
                        {branch.todaySubmitted}/2
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${scoreClass(branch.kxt7Avg)}`}>
                        {branch.kxt7Avg === null ? '—' : `${branch.kxt7Avg}%`}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${scoreClass(branch.kxt30Avg)}`}>
                        {branch.kxt30Avg === null ? '—' : `${branch.kxt30Avg}%`}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{branch.quality7Count}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex min-w-7 justify-center rounded-full px-2 py-1 font-bold ${branch.exceptionCount ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {branch.exceptionCount}
                        </span>
                        {branch.exceptionCount > 0 && (
                          <p className="mt-1 whitespace-nowrap text-[9px] text-slate-500">
                            {[
                              branch.todayMissing ? `${branch.todayMissing} KXT` : null,
                              branch.pendingApproval ? `${branch.pendingApproval} təsdiq` : null,
                              branch.draftCount ? `${branch.draftCount} qaralama` : null,
                              branch.voidedCount ? `${branch.voidedCount} ləğv` : null,
                              !branch.managerName ? 'müdür yoxdur' : null,
                            ].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string
  value: string
  note: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  const valueClass = {
    default: 'text-slate-900',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    muted: 'text-slate-400',
  }[tone]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{note}</p>
    </div>
  )
}
