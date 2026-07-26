import Link from "next/link"
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { users } from '@/db/schema/auth'
import { daily_sales, sales_targets } from '@/db/schema/sales'
import { checklists } from '@/db/schema/checklists'
import { quality_form_submissions } from '@/db/schema/quality-forms'
import { eq, and, inArray, gte, lte } from 'drizzle-orm'
import { getBakuBusinessDate } from '@/lib/checklist-validation'
import { buildManagementDashboard } from '@/lib/management-dashboard'
import ManagementNetworkDashboard from '@/components/management-network-dashboard'

// Verisi olmayan metrik üçün göstərici (mock yox, dürüst)
const NA = '—'

const pctOf = (actual: number, target: number) =>
  target > 0 ? Math.round((actual / target) * 100) : 0

const getTrainingPortalUrl = () => {
  const configured = process.env.TRAINING_PORTAL_URL?.trim()
  if (!configured) return null

  try {
    const url = new URL(configured)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const userName = session.user.name ?? 'İstifadəçi'

  // Əməkdaşın OCAQ daxilində əməliyyat rolu yoxdur. Bu səhifə yalnız
  // ayrıca təlim portalına təhlükəsiz keçid nöqtəsidir.
  if (role === 'staff') {
    const trainingPortalUrl = getTrainingPortalUrl()

    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-2">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">🎓</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Xoş gəldiniz, {userName}</h1>
          <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-slate-500">
            Əməkdaş təlimləri ayrıca təlim portalında aparılır. OCAQ idarəetmə funksiyaları filial və bölgə rəhbərləri üçündür.
          </p>
          {trainingPortalUrl ? (
            <a
              href={trainingPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--ocaq-red)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Təlim portalına keç →
            </a>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Təlim portalının ünvanı hələ təyin edilməyib. Filial müdürünüzlə əlaqə saxlayın.
            </div>
          )}
        </div>
      </div>
    )
  }

  // 2. Admin & Manager üçün statistika yükləmə
  type BranchSummary = {
    id: string
    code: string
    name: string
    city: string
    is_active: boolean
    regionName: string | null
    managerName: string | null
  }
  let myBranchesList: BranchSummary[] = []

  try {
    const branchSelection = {
      id: branches.id,
      code: branches.code,
      name: branches.name,
      city: branches.city,
      is_active: branches.is_active,
      regionName: regions.name,
      managerName: users.name,
    }

    if (role === 'super_admin') {
      myBranchesList = await db.select(branchSelection).from(branches)
        .leftJoin(regions, and(
          eq(branches.region_id, regions.id),
          eq(regions.tenant_id, session.user.tenant_id),
        ))
        .leftJoin(users, and(
          eq(branches.manager_id, users.id),
          eq(users.tenant_id, session.user.tenant_id),
        ))
        .where(and(
          eq(branches.tenant_id, session.user.tenant_id),
          eq(branches.is_active, true),
          eq(branches.is_archived, false),
        ))
    } else if (role === 'region_manager') {
      const managedRegions = await db.select({ id: regions.id }).from(regions).where(and(
        eq(regions.tenant_id, session.user.tenant_id),
        eq(regions.manager_id, session.user.id),
      ))
      if (managedRegions.length > 0) {
        const regionIds = managedRegions.map(r => r.id)
        myBranchesList = await db.select(branchSelection).from(branches)
          .leftJoin(regions, and(
            eq(branches.region_id, regions.id),
            eq(regions.tenant_id, session.user.tenant_id),
          ))
          .leftJoin(users, and(
            eq(branches.manager_id, users.id),
            eq(users.tenant_id, session.user.tenant_id),
          ))
          .where(and(
            eq(branches.tenant_id, session.user.tenant_id),
            eq(branches.is_active, true),
            eq(branches.is_archived, false),
            inArray(branches.region_id, regionIds),
          ))
      }
    } else if (role === 'branch_manager') {
      myBranchesList = await db.select(branchSelection).from(branches)
        .leftJoin(regions, and(
          eq(branches.region_id, regions.id),
          eq(regions.tenant_id, session.user.tenant_id),
        ))
        .leftJoin(users, and(
          eq(branches.manager_id, users.id),
          eq(users.tenant_id, session.user.tenant_id),
        ))
        .where(and(
          eq(branches.tenant_id, session.user.tenant_id),
          eq(branches.is_active, true),
          eq(branches.is_archived, false),
          eq(branches.manager_id, session.user.id),
        ))
    }
  } catch (err) {
    console.error("Dashboard stats query error:", err)
  }

  // ─── REAL satış (rol əhatəsinə görə) — mock deyil, DB-dən ───
  let monthSales = 0, monthTarget = 0, dayActual = 0, dayYesterday = 0
  let hasSalesData = false
  try {
    const ids = myBranchesList.map(b => b.id)
    if (ids.length > 0) {
      const now = new Date()
      const yr = now.getFullYear(), mo = now.getMonth()
      const monthStart = `${yr}-${String(mo + 1).padStart(2, '0')}-01`
      const daysInMonth = new Date(yr, mo + 1, 0).getDate()
      const monthEnd = `${yr}-${String(mo + 1).padStart(2, '0')}-${daysInMonth}`

      const salesRows = await db.select({ d: daily_sales.sale_date, a: daily_sales.amount })
        .from(daily_sales)
        .where(and(
          eq(daily_sales.tenant_id, session.user.tenant_id),
          inArray(daily_sales.branch_id, ids),
          gte(daily_sales.sale_date, monthStart),
          lte(daily_sales.sale_date, monthEnd),
        ))
      monthSales = salesRows.reduce((s, r) => s + Number(r.a), 0)

      const tgtRows = await db.select({ t: sales_targets.target_amount })
        .from(sales_targets)
        .where(and(
          eq(sales_targets.tenant_id, session.user.tenant_id),
          inArray(sales_targets.branch_id, ids),
          eq(sales_targets.month, monthStart),
        ))
      monthTarget = tgtRows.reduce((s, r) => s + Number(r.t), 0)

      const byDay: Record<string, number> = {}
      for (const r of salesRows) byDay[r.d] = (byDay[r.d] ?? 0) + Number(r.a)
      const days = Object.keys(byDay).sort()
      dayActual = days.length ? byDay[days[days.length - 1]] : 0
      dayYesterday = days.length > 1 ? byDay[days[days.length - 2]] : 0
      hasSalesData = salesRows.length > 0 || tgtRows.length > 0
    }
  } catch (err) {
    console.error("Dashboard sales query error:", err)
  }

  const now2 = new Date()
  const dim = new Date(now2.getFullYear(), now2.getMonth() + 1, 0).getDate()
  const dailyTarget = monthTarget > 0 ? Math.round(monthTarget / dim) : 0
  const salesActual = dayActual
  const salesTarget = dailyTarget
  const salesYesterday = dayYesterday

  // ─── RƏHBƏRLİK ŞƏBƏKƏ GÖRÜNÜŞÜ ───
  // Yalnız real KXT və cari rəsmi forma revision-ları hesablanır. Rəsmi forma
  // tezlik cədvəli ayrıca təsdiqlənmədiyi üçün "çatışmayan forma" uydurulmur.
  const today = getBakuBusinessDate()
  const thirtyDaysAgoDate = new Date(`${today}T12:00:00.000Z`)
  thirtyDaysAgoDate.setUTCDate(thirtyDaysAgoDate.getUTCDate() - 29)
  const thirtyDaysAgo = thirtyDaysAgoDate.toISOString().slice(0, 10)
  let managementDashboard = buildManagementDashboard(
    myBranchesList.map((branch) => ({
      id: branch.id,
      code: branch.code,
      name: branch.name,
      regionName: branch.regionName,
      managerName: branch.managerName,
    })),
    [],
    [],
    today,
  )

  try {
    const branchIds = myBranchesList.map((branch) => branch.id)
    if (branchIds.length > 0) {
      let checklistRows: Array<{ branchId: string | null; businessDate: string; shift: string; score: number }> = []
      let qualityRows: Array<{ branchId: string; periodEnd: string; status: string }> = []

      try {
        checklistRows = await db.select({
          branchId: checklists.branch_id,
          businessDate: checklists.business_date,
          shift: checklists.shift,
          score: checklists.score_pct,
        }).from(checklists).where(and(
          eq(checklists.tenant_id, session.user.tenant_id),
          inArray(checklists.branch_id, branchIds),
          gte(checklists.business_date, thirtyDaysAgo),
          lte(checklists.business_date, today),
        ))
      } catch (err) {
        console.error('Management checklist query error:', err)
      }

      try {
        qualityRows = await db.select({
          branchId: quality_form_submissions.branch_id,
          periodEnd: quality_form_submissions.period_end,
          status: quality_form_submissions.status,
        }).from(quality_form_submissions).where(and(
          eq(quality_form_submissions.tenant_id, session.user.tenant_id),
          inArray(quality_form_submissions.branch_id, branchIds),
          eq(quality_form_submissions.is_current, true),
          gte(quality_form_submissions.period_end, thirtyDaysAgo),
          lte(quality_form_submissions.period_end, today),
        ))
      } catch (err) {
        console.error('Management quality form query error:', err)
      }

      managementDashboard = buildManagementDashboard(
        myBranchesList.map((branch) => ({
          id: branch.id,
          code: branch.code,
          name: branch.name,
          regionName: branch.regionName,
          managerName: branch.managerName,
        })),
        checklistRows.map((row) => ({ ...row, score: Number(row.score) })),
        qualityRows,
        today,
      )
    }
  } catch (err) {
    console.error('Management dashboard query error:', err)
  }
  const checklistAvg = managementDashboard.kxt30Avg

  const roleLabels: Record<string, string> = {
    super_admin: 'Süper admin',
    region_manager: 'Bölgə müdiri',
    branch_manager: 'Filial müdiri',
    staff: 'Əməkdaş',
  }

  const salesPct = pctOf(salesActual, salesTarget)
  const salesDiff = salesActual - salesTarget
  const priorityActions = role === 'branch_manager'
    ? [
        { href: '/dashboard/vardiya-liderliyi', icon: '◆', title: 'Növbəni hazırla', desc: '5 dəqiqəlik görüşü, tapşırıqları və devir qeydini tamamla.' },
        { href: '/dashboard/vardiya-checklist', icon: '✓', title: 'KXT doldur', desc: 'Cari növbənin yoxlamasını göndər.' },
        { href: '/dashboard/complaints', icon: '🚨', title: 'Şikayətləri həll et', desc: 'Filialınızdakı açıq müştəri qeydlərini izləyin.' },
      ]
    : role === 'region_manager'
      ? [
          { href: '/dashboard/checklists', icon: '📋', title: 'Çatışmayan KXT-lər', desc: 'Bu gün göndərməyən filial və növbələri müəyyən et.' },
          { href: '/dashboard/complaints', icon: '🚨', title: 'Açıq şikayətlər', desc: 'Bölgədə gecikən və kritik halları izləyin.' },
          { href: '/dashboard/staff', icon: '⊙', title: 'Filial komandaları', desc: 'Bölgənizdəki əməkdaş və filial təyinatlarını yoxlayın.' },
        ]
      : [
          { href: '/dashboard/team', icon: '✉', title: 'Hesab və səlahiyyət', desc: 'İstifadəçi dəvəti, rol və əhatəni idarə et.' },
          { href: '/dashboard/checklists', icon: '📋', title: 'Şəbəkə KXT görünüşü', desc: 'Bütün filiallarda göndəriş və nəticələri izləyin.' },
          { href: '/dashboard/regions', icon: '◉', title: 'Bölgə idarəetməsi', desc: 'Bölgə, filial və rəhbər təyinatlarını yoxlayın.' },
        ]

  return (
    <div>
      {/* ═══ BAŞLIQ ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Xoş gəldiniz, {userName} 👋</h1>
          <p className="text-sm text-slate-500">
            Bugünkü performans
            {role === 'branch_manager' && myBranchesList.length > 0 && ` — ${myBranchesList[0].name}`}
            {' · '}
            <span className="font-medium">{roleLabels[role] ?? role}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">
            {new Date().toLocaleDateString("az-AZ", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-6">
        {priorityActions.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[var(--ocaq-red)] hover:shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{item.icon}</span>
              <h2 className="font-semibold text-slate-900">{item.title}</h2>
            </div>
            <p className="text-xs leading-5 text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>

      <ManagementNetworkDashboard
        data={managementDashboard}
        role={role}
        today={today}
      />

      {/* ═══ SATIŞ HƏDƏFİ — ana kart ═══ */}
      <div className={`rounded-2xl border-2 p-5 mb-4 ${!hasSalesData ? "bg-white border-slate-200" : salesPct >= 100 ? "bg-emerald-50 border-emerald-200" : salesPct >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">📊 Günlük Satış</h2>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${!hasSalesData ? "bg-slate-100 text-slate-500" : salesPct >= 100 ? "bg-emerald-100 text-emerald-700" : salesPct >= 75 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {hasSalesData ? `${salesPct}%` : 'Məlumat yoxdur'}
          </span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className={`text-3xl font-bold ${hasSalesData ? 'text-slate-900' : 'text-slate-300'}`}>{hasSalesData ? `${salesActual.toLocaleString()} ₼` : NA}</span>
          {hasSalesData && <span className="text-sm text-slate-500 mb-1">/ {salesTarget.toLocaleString()} ₼ hədəf</span>}
        </div>
        <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${salesPct >= 100 ? "bg-emerald-500" : salesPct >= 75 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${hasSalesData ? Math.min(salesPct, 100) : 0}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          {hasSalesData ? <>
            <span>Əvvəlki gün: {salesYesterday.toLocaleString()} ₼</span>
            <span className={salesDiff >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
              {salesDiff >= 0 ? "+" : ""}{salesDiff.toLocaleString()} ₼ fərq
            </span>
          </> : <span>Satış daxil edildikdə burada real nəticə görünəcək.</span>}
        </div>
      </div>

      {/* ═══ KPI KARTLARI ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Ortalama Çek</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-300">{NA}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Məlumat mənbəyi yoxdur</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Müştəri Sayı</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-300">{NA}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Məlumat mənbəyi yoxdur</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Çek Sayı</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-300">{NA}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Məlumat mənbəyi yoxdur</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Checklist Skor</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-emerald-700">{checklistAvg ?? NA}</span>
            {checklistAvg !== null && <span className="text-sm text-slate-400 mb-0.5">%</span>}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{checklistAvg !== null ? 'Ortalama skor (göndərilən)' : 'Hələ checklist yoxdur'}</p>
        </div>
      </div>

      {/* ═══ MALİYYƏT GÖSTƏRİCİLƏRİ ═══ */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">💰 Maliyyət Göstəriciləri</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Food Cost", target: 33, icon: "🥩" },
          { label: "Labor Cost", target: 30, icon: "👥" },
          { label: "Prime Cost", target: 63, icon: "📊" },
        ].map((cost) => (
          <div key={cost.label} className="rounded-xl border p-4 bg-white border-slate-200">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-lg">{cost.icon}</span>
              <p className="text-xs font-semibold text-slate-700">{cost.label}</p>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-slate-300">{NA}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Hədəf: ≤{cost.target}% · məlumat mənbəyi yoxdur</p>
          </div>
        ))}
      </div>

      {/* ═══ AYLIQ HƏDƏFLƏR ═══ */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">🎯 Aylıq Hədəflər</h2>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="space-y-3">
          {[
            { label: "Aylıq Satış", actual: monthSales, target: monthTarget, unit: "₼", na: !hasSalesData },
            { label: "Aylıq Müştəri", actual: 0, target: 0, unit: "nəfər", na: true },
            { label: "Ort. Çek", actual: 0, target: 0, unit: "₼", na: true },
            { label: "Google Rey", actual: 0, target: 0, unit: "★", na: true },
          ].map((g) => {
            const gPct = g.na ? 0 : pctOf(g.actual, g.target)
            return (
              <div key={g.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{g.label}</span>
                  <span className="text-slate-500">
                    {g.na
                      ? <span className="font-bold text-slate-300">{NA}</span>
                      : <><span className="font-bold text-slate-900">{g.actual.toLocaleString()}</span> / {g.target.toLocaleString()} {g.unit}</>}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${gPct >= 80 ? "bg-emerald-500" : gPct >= 50 ? "bg-amber-500" : "bg-slate-200"}`}
                    style={{ width: `${Math.min(gPct, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ TEZ KEÇİDLƏR ═══ */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Tez Keçidlər</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          role === 'branch_manager'
            ? { href: "/dashboard/vardiya-checklist", icon: "✅", title: "KXT doldur" }
            : { href: "/dashboard/checklists", icon: "📋", title: "KXT izləmə" },
          { href: "/dashboard/vardiya-liderliyi", icon: "◆", title: "Növbə liderliyi" },
          { href: "/dashboard/hr", icon: "📋", title: "HR" },
          { href: "/dashboard/bildirisler", icon: "🔔", title: "Bildirişlər" },
          { href: "/dashboard/sales", icon: "₼", title: "Satış Hədəfi" },
          { href: "/dashboard/complaints", icon: "🚨", title: "Şikayətlər" },
          { href: "/dashboard/staff", icon: "⊙", title: "Personel" },
          ...(role === 'super_admin' || role === 'region_manager' ? [
            { href: "/dashboard/branches", icon: "🏪", title: "Filiallar" },
            { href: "/dashboard/regions", icon: "◉", title: "Bölgələr" },
          ] : []),
          ...(role === 'super_admin' ? [
            { href: "/dashboard/team", icon: "✉", title: "Hesab və dəvət" },
            { href: "/dashboard/settings", icon: "⚙", title: "Parametrlər" },
          ] : []),
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-[var(--ocaq-red)] hover:shadow-sm transition-all text-sm font-medium text-slate-700 hover:text-[var(--ocaq-red)]">
            <span className="text-lg">{item.icon}</span>
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
