import Link from "next/link"
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { openings, opening_tasks } from '@/db/schema/acilis'
import { ne as neOp } from 'drizzle-orm'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { daily_sales, sales_targets } from '@/db/schema/sales'
import { checklists } from '@/db/schema/checklists'
import { analytics_daily_fact } from '@/db/schema/analytics'
import { eq, and, inArray, gte, lte } from 'drizzle-orm'

// Verisi olmayan metrik üçün göstərici (mock yox, dürüst)
const NA = '—'

/**
 * Rəqəm formatı — MİNLİK AYIRICI BOŞLUQ.
 * `toLocaleString('az-AZ')` minlikləri NÖQTƏ ilə ayırır: 129 193 → «129.193».
 * Bu, pul dəyərində «129 manat» kimi oxuna bilər — təhlükəli qarışıqlıq.
 * Günlük Panel-də işlədilən desen budur (boşluqlu), dashboard da ona uyğunlaşır.
 */
const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/[, ]/g, ' ')

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
  // `ids` fact KPI sorğusunda da lazımdır (aşağıda) → try-dan KƏNARDA elan olunur.
  let ids: string[] = []
  try {
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

  // ─── ÇEK KPI-ları — `analytics_daily_fact`-dən (PRODMIX/ÇEK yükləməsi) ───────
  // Mənbə: `/dashboard/panel` → «Günlük detay» yükləməsi. `payment_type='__day__'`
  // sətri gün cəmini və UNİKAL qəbz sayını daşıyır (ödəniş növlərinə bölünmür —
  // bir qəbz həm nağd həm kart ola bilər, paylasaydıq müştəri sayı şişərdi).
  // Data yoxdursa `null` qalır və kartda dürüst `—` görünür (uydurma rəqəm yox).
  let monthReceipts: number | null = null, monthReceiptAmount = 0
  let dayReceipts: number | null = null, dayReceiptAmount = 0
  let lastFactDate: string | null = null
  // Satış rəqəmi hansı mənbədən gəldi — ekranda göstərilir ki mənbə görünməz
  // qalmasın (iyul hadisəsinin dərsi).
  let salesSource: 'fact' | 'manual' | null = hasSalesData ? 'manual' : null
  try {
    const now = new Date()
    const yr = now.getFullYear(), mo = now.getMonth()
    const mStart = `${yr}-${String(mo + 1).padStart(2, '0')}-01`
    const mEnd = `${yr}-${String(mo + 1).padStart(2, '0')}-${new Date(yr, mo + 1, 0).getDate()}`

    // RBAC: super_admin şəbəkəni görür (filial adı uyğunlaşmayan sətirlər daxil).
    // Digər rollar YALNIZ öz filiallarını — `branch_id` boş sətirlər onlara
    // GÖRÜNMÜR, çünki hansı filiala aid olduğu təsdiqlənməmişdir.
    const scoped = role === 'super_admin' ? [] : [inArray(analytics_daily_fact.branch_id, ids)]
    if (role === 'super_admin' || ids.length > 0) {
      const rows = await db.select({
        d: analytics_daily_fact.business_date,
        amt: analytics_daily_fact.amount,
        rec: analytics_daily_fact.receipts,
      })
        .from(analytics_daily_fact)
        .where(and(
          eq(analytics_daily_fact.tenant_id, session.user.tenant_id),
          eq(analytics_daily_fact.payment_type, '__day__'),
          gte(analytics_daily_fact.business_date, mStart),
          lte(analytics_daily_fact.business_date, mEnd),
          ...scoped,
        ))
      if (rows.length > 0) {
        monthReceipts = rows.reduce((s, r) => s + (r.rec ?? 0), 0)
        monthReceiptAmount = rows.reduce((s, r) => s + Number(r.amt), 0)
        const allDays = [...new Set(rows.map(r => r.d))].sort()
        lastFactDate = allDays.at(-1) ?? null
        const prevFactDate = allDays.at(-2) ?? null
        const lastRows = rows.filter(r => r.d === lastFactDate)
        dayReceipts = lastRows.reduce((s, r) => s + (r.rec ?? 0), 0)
        dayReceiptAmount = lastRows.reduce((s, r) => s + Number(r.amt), 0)

        // ─── SATIŞ KARTI DA FAKTDAN ────────────────────────────────────────
        // NİYƏ: bu kart `daily_sales` cədvəlindən oxuyurdu, onu isə YALNIZ
        // `/api/sales/daily` (ƏL İLƏ giriş) doldurur — heç kim işlətmirdi, ona
        // görə dashboard boş görünürdü, halbuki real satış fakt cədvəlində
        // HAZIR dururdu. Artıq fakt varsa ondan oxunur.
        //
        // Faktı `daily_sales`-ə KÖÇÜRMÜRÜK: eyni rəqəm iki cədvəldə = İKİ
        // HƏQİQƏT, iyulda datanın «yoxa çıxması» məhz bundan oldu
        // (docs/DENETIM-2026-08-04.md §1). Tək mənbə, çox oxucu.
        monthSales = monthReceiptAmount
        dayActual = dayReceiptAmount
        dayYesterday = prevFactDate
          ? rows.filter(r => r.d === prevFactDate).reduce((s, r) => s + Number(r.amt), 0)
          : 0
        hasSalesData = true
        salesSource = 'fact'
      }
    }
  } catch (err) {
    // Cədvəl hələ yaradılmayıbsa (migration 0010) burada bitir — dashboard
    // AÇILMAĞA DAVAM EDİR, kartlar `—` göstərir. Səbəb loga yazılır, udulmur.
    console.error("Dashboard fact KPI query error:", err)
  }

  // Ortalama çek = ciro / unikal qəbz. Sıfıra bölmə yox → null (dürüst `—`).
  const dayAvgCheck = dayReceipts && dayReceipts > 0 ? dayReceiptAmount / dayReceipts : null
  const monthAvgCheck = monthReceipts && monthReceipts > 0 ? monthReceiptAmount / monthReceipts : null
  const factDateLabel = lastFactDate
    ? new Date(lastFactDate + 'T00:00:00').toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' })
    : null

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
    super_admin: 'Süper admin',
    region_manager: 'Bölgə müdiri',
    branch_manager: 'Filial müdiri',
    staff: 'Əməkdaş',
  }

  const salesPct = pctOf(salesActual, salesTarget)
  const salesDiff = salesActual - salesTarget
  // Satış var, HƏDƏF yoxdursa faiz göstərmək yanıldıcıdır (0% qırmızı çubuq
  // «pis gedir» kimi oxunur, halbuki hədəf sadəcə təyin edilməyib).
  const hasTarget = salesTarget > 0
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

  // ── Açılış takibi xülasəsi ────────────────────────────────────────────────
  // Cədvəl hələ yoxdursa səhifə SINMAMALIDIR — dashboard bütün şəbəkənin
  // giriş nöqtəsidir, bir modul ucbatından ağ ekran verə bilməz.
  const acilisXulase = { aktiv: 0, acik: 0, gecikdi: 0,
    enYaxinGun: null as number | null, enYaxinAd: null as string | null }
  try {
    const ops = await db.select().from(openings)
      .where(and(eq(openings.tenant_id, session.user.tenant_id),
                 neOp(openings.status, 'dayandirildi'), neOp(openings.status, 'acildi')))
    acilisXulase.aktiv = ops.length
    if (ops.length) {
      const bugun = new Date(); bugun.setHours(0, 0, 0, 0)
      const yaxin = ops
        .filter(o => o.planned_open_date)
        .map(o => ({ ad: o.name,
          gun: Math.round((new Date(o.planned_open_date + 'T00:00:00Z').getTime() - bugun.getTime()) / 86400000) }))
        .filter(x => x.gun >= 0)
        .sort((a, b) => a.gun - b.gun)[0]
      if (yaxin) { acilisXulase.enYaxinGun = yaxin.gun; acilisXulase.enYaxinAd = yaxin.ad }

      const ids = new Set(ops.map(o => o.id))
      const tasks = await db.select().from(opening_tasks)
        .where(eq(opening_tasks.tenant_id, session.user.tenant_id))
      const bugunStr = new Date().toISOString().slice(0, 10)
      for (const t of tasks) {
        if (!ids.has(t.opening_id)) continue
        if (t.status === 'bitdi' || t.status === 'tetbiq_olunmur') continue
        acilisXulase.acik++
        if (t.due_date && t.due_date < bugunStr) acilisXulase.gecikdi++
      }
    }
  } catch { /* cədvəl yoxdur — blok göstərilmir */ }

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

      {/* ═══ SATIŞ HƏDƏFİ — ana kart ═══ */}
      {/* Rəng YALNIZ hədəf varsa hesablanır: hədəfsiz 0% qırmızı çubuq «pis
          gedir» kimi oxunur, halbuki hədəf sadəcə təyin edilməyib. */}
      <div className={`rounded-2xl border-2 p-5 mb-4 ${!hasSalesData ? "bg-white border-slate-200" : !hasTarget ? "bg-slate-50 border-slate-200" : salesPct >= 100 ? "bg-emerald-50 border-emerald-200" : salesPct >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">📊 Günlük Satış{factDateLabel && salesSource === 'fact' ? <span className="ml-2 text-xs font-normal text-slate-400">{factDateLabel}</span> : null}</h2>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${!hasSalesData ? "bg-slate-100 text-slate-500" : !hasTarget ? "bg-slate-100 text-slate-500" : salesPct >= 100 ? "bg-emerald-100 text-emerald-700" : salesPct >= 75 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {!hasSalesData ? 'Məlumat yoxdur' : hasTarget ? `${salesPct}%` : 'Hədəf yoxdur'}
          </span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className={`text-3xl font-bold ${hasSalesData ? 'text-slate-900' : 'text-slate-300'}`}>{hasSalesData ? `${fmt(salesActual)} ₼` : NA}</span>
          {hasSalesData && hasTarget && <span className="text-sm text-slate-500 mb-1">/ {fmt(salesTarget)} ₼ hədəf</span>}
        </div>
        {hasTarget && (
          <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full transition-all ${salesPct >= 100 ? "bg-emerald-500" : salesPct >= 75 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${hasSalesData ? Math.min(salesPct, 100) : 0}%` }} />
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-slate-500 gap-3 flex-wrap">
          {hasSalesData ? <>
            <span>
              Əvvəlki gün: {fmt(salesYesterday)} ₼
              {salesSource === 'fact' && <span className="text-slate-400"> · bu ay {fmt(monthSales)} ₼</span>}
            </span>
            {hasTarget
              ? <span className={salesDiff >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                  {salesDiff >= 0 ? "+" : ""}{fmt(salesDiff)} ₼ fərq
                </span>
              : <Link href="/dashboard/sales" className="text-[var(--ocaq-red)] font-medium">Satış hədəfi təyin et →</Link>}
          </> : <span>Satış daxil edildikdə burada real nəticə görünəcək.</span>}
        </div>
        {/* Mənbə GÖRÜNMƏZ QALMASIN — iyulda datanın «yoxa çıxması» oxucunun
            hansı mənbəyə baxdığı bilinmədiyi üçün gec anlaşıldı. */}
        {salesSource && (
          <div className="mt-2 text-[10px] text-slate-400">
            Mənbə: {salesSource === 'fact'
              ? <>PRODMIX/ÇEK yükləməsi (<Link href="/dashboard/analitika" className="underline">Məhsul Analizi</Link>)</>
              : 'əl ilə daxil edilmiş günlük satış'}
          </div>
        )}
      </div>

      {/* ═══ KPI KARTLARI ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Mənbə: `/dashboard/panel` → «Günlük detay» (PRODMIX + ÇEK) yükləməsi.
            Data yoxdursa `—` qalır — uydurma rəqəm YOX (AGENTS.md). */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Ortalama Çek</p>
          <div className="flex items-end gap-1">
            <span className={`text-2xl font-bold ${dayAvgCheck !== null ? 'text-slate-900' : 'text-slate-300'}`}>
              {dayAvgCheck !== null ? dayAvgCheck.toFixed(2) : NA}
            </span>
            {dayAvgCheck !== null && <span className="text-sm text-slate-400 mb-0.5">₼</span>}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {dayAvgCheck !== null
              ? `${factDateLabel}${monthAvgCheck !== null ? ` · ay ortalaması ${monthAvgCheck.toFixed(2)} ₼` : ''}`
              : 'Çek faylı yüklənməyib'}
          </p>
        </div>

        {/* «Müştəri sayı» = unikal qəbz sayı. Bir qəbz = bir müştəri (istifadəçi
            təsdiqi 08.08.2026: «çek ise müşteri»). Ona görə Çek Sayı kartı ilə
            eyni mənbədən gəlir — fərq YALNIZ dövrdür (bu kart son gün, o kart ay). */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Müştəri Sayı</p>
          <div className="flex items-end gap-1">
            <span className={`text-2xl font-bold ${dayReceipts !== null ? 'text-slate-900' : 'text-slate-300'}`}>
              {dayReceipts !== null ? fmt(dayReceipts) : NA}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {dayReceipts !== null ? `${factDateLabel} · bir qəbz = bir müştəri` : 'Çek faylı yüklənməyib'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Çek Sayı</p>
          <div className="flex items-end gap-1">
            <span className={`text-2xl font-bold ${monthReceipts !== null ? 'text-slate-900' : 'text-slate-300'}`}>
              {monthReceipts !== null ? fmt(monthReceipts) : NA}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {monthReceipts !== null ? 'Bu ay (cəmi)' : 'Çek faylı yüklənməyib'}
          </p>
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

      {/* ═══ AÇILIŞ TAKİBİ ═══ */}
      {acilisXulase.aktiv > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">🏗 Açılış Takibi</h2>
            <Link href="/dashboard/acilis" className="text-sm text-slate-500 hover:text-slate-800">hamısı →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Aktiv açılış</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{acilisXulase.aktiv}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Açıq vəzifə</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{acilisXulase.acik}</p>
            </div>
            <div className={`rounded-xl border p-4 ${acilisXulase.gecikdi > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'}`}>
              <p className="text-xs text-slate-500">Gecikən</p>
              <p className={`text-2xl font-bold tabular-nums ${acilisXulase.gecikdi > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {acilisXulase.gecikdi}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Ən yaxın açılış</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {acilisXulase.enYaxinGun == null ? '—' : `${acilisXulase.enYaxinGun} gün`}
              </p>
              {acilisXulase.enYaxinAd && <p className="text-xs text-slate-500 mt-0.5">{acilisXulase.enYaxinAd}</p>}
            </div>
          </div>
        </div>
      )}

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
