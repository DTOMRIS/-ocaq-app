import Link from "next/link"
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { daily_sales, sales_targets } from '@/db/schema/sales'
import { checklists } from '@/db/schema/checklists'
import { eq, and, inArray, gte, lte } from 'drizzle-orm'

// Verisi olmayan metrik üçün göstərici (mock yox, dürüst)
const NA = '—'

const pctOf = (actual: number, target: number) =>
  target > 0 ? Math.round((actual / target) * 100) : 0

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const userName = session.user.name ?? 'İstifadəçi'

  // 1. Staff üçün sadələşdirilmiş görünüş
  if (role === 'staff') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 10px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1a1a1a', margin: '0 0 6px' }}>
            Xoş gəldiniz, {userName} 👋
          </h2>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            OCAQ Əməkdaş Portalı
          </p>
          <span style={{
            display: 'inline-block', fontSize: '11px', padding: '3px 10px',
            borderRadius: '12px', fontWeight: '600', marginTop: '10px',
            background: '#05966915', color: '#059669',
            border: '1px solid #05966930',
          }}>
            Əməkdaş
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <a href="/dashboard/bildirisler" style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, #1A1614 0%, #2A2422 100%)',
            color: '#fff', padding: '24px', borderRadius: '16px',
            textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            <span style={{ fontSize: '32px', background: 'rgba(242,168,29,0.15)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px', color: '#F2A81D' }}>Bildirişlərim</h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                Müdürün göndərdiyi məlumat və tapşırıqları izləyin.
              </p>
            </div>
          </a>
          <a href="/dashboard/complaints" style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: '#fff', border: '1px solid #e8e8e8',
            color: '#1a1a1a', padding: '24px', borderRadius: '16px',
            textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}>
            <span style={{ fontSize: '32px', background: 'rgba(200,16,46,0.1)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚨</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px', color: '#C8102E' }}>Şikayət / İnsident Bildir</h3>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                Kuryer, müştəri şikayətləri və ya daxili insidentləri qeyd edin.
              </p>
            </div>
          </a>
        </div>
      </div>
    )
  }

  // 2. Admin & Manager üçün statistika yükləmə
  type BranchSummary = { id: string; code: string; name: string; city: string; is_active: boolean }
  let myBranchesList: BranchSummary[] = []

  try {
    if (role === 'super_admin') {
      // Super admin satış və checklist sorğularında bütün tenant filiallarını görür.
    } else if (role === 'region_manager') {
      const managedRegions = await db.select({ id: regions.id }).from(regions).where(eq(regions.manager_id, session.user.id))
      if (managedRegions.length > 0) {
        const regionIds = managedRegions.map(r => r.id)
        const regBranches = await db.select({ id: branches.id, code: branches.code, name: branches.name, city: branches.city, is_active: branches.is_active }).from(branches).where(and(eq(branches.is_archived, false), inArray(branches.region_id, regionIds)))
        myBranchesList = regBranches
      }
    } else if (role === 'branch_manager') {
      const myBranches = await db.select({ id: branches.id, code: branches.code, name: branches.name, city: branches.city, is_active: branches.is_active }).from(branches).where(and(eq(branches.is_archived, false), eq(branches.manager_id, session.user.id)))
      myBranchesList = myBranches
    }
  } catch (err) {
    console.error("Dashboard stats query error:", err)
  }

  // ─── REAL satış (rol əhatəsinə görə) — mock deyil, DB-dən ───
  let monthSales = 0, monthTarget = 0, dayActual = 0, dayYesterday = 0
  let hasSalesData = false
  try {
    let ids: string[] = []
    if (role === 'super_admin') {
      ids = (await db.select({ id: branches.id }).from(branches).where(eq(branches.is_archived, false))).map(b => b.id)
    } else {
      ids = myBranchesList.map(b => b.id)
    }
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

  // ─── REAL checklist skoru (rol əhatəsinə görə) ───
  let checklistAvg: number | null = null
  try {
    const clScope = role === 'super_admin'
      ? undefined
      : (myBranchesList.map(b => b.id).length ? myBranchesList.map(b => b.id) : ['00000000-0000-0000-0000-000000000000'])
    const clConds = [eq(checklists.tenant_id, session.user.tenant_id)]
    if (clScope) clConds.push(inArray(checklists.branch_id, clScope))
    const cl = await db.select({ s: checklists.score_pct }).from(checklists).where(and(...clConds))
    if (cl.length > 0) checklistAvg = Math.round(cl.reduce((a, r) => a + r.s, 0) / cl.length)
  } catch (err) {
    console.error("Dashboard checklist query error:", err)
  }

  const roleLabels: Record<string, string> = {
    super_admin: 'Süper Admin',
    region_manager: 'Bölgə Meneceri',
    branch_manager: 'Filial Meneceri',
    staff: 'Əməkdaş',
  }

  const salesPct = pctOf(salesActual, salesTarget)
  const salesDiff = salesActual - salesTarget

  return (
    <div>
      {/* ═══ BAŞLIQ ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Xoş gəldiniz, {userName} 👋</h1>
          <p className="text-sm text-slate-500">
            Bugünkü performans
            {myBranchesList.length > 0 && ` — ${myBranchesList[0].name}`}
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
          { href: "/dashboard/komanda", icon: "👥", title: "Komanda" },
          { href: "/dashboard/sales", icon: "₼", title: "Satış Hədəfi" },
          { href: "/dashboard/complaints", icon: "🚨", title: "Şikayətlər" },
          { href: "/dashboard/staff", icon: "⊙", title: "Personel" },
          ...(role === 'super_admin' || role === 'region_manager' ? [
            { href: "/dashboard/branches", icon: "🏪", title: "Filiallar" },
            { href: "/dashboard/regions", icon: "◉", title: "Bölgələr" },
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
