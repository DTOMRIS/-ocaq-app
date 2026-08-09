import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { desc, eq, and, inArray } from 'drizzle-orm'
import { db, sqlClient } from '@/db'
import { factsToPanel, type FactRow } from '@/lib/analytics/facts-to-panel'
import { analytics_ingest } from '@/db/schema/analytics'
import { sales_targets } from '@/db/schema/sales'
import { branches } from '@/db/schema/branches'
import { accessibleBranchIds } from '@/lib/branch-access'
import { normalizeFilial } from '@/lib/analytics/filial-map'
import PanelClient from './panel-client'

export const metadata = { title: 'Günlük Panel — OCAQ' }
export const dynamic = 'force-dynamic'

type DailyFull = {
  period?: string; gun: number; days: string[]
  daily: Record<string, { total: number; wolt: number; bolt: number }>
  branches: Array<{ filial: string; bolge: string | null; total: number; wolt: number; bolt: number }>
  regions: [string, number][]; pay: { nagd: number; kart: number; wolt: number; bolt: number }
  toplam: number; gedisat: number
}

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) redirect('/dashboard')

  const tenantId = session.user.tenant_id
  const sp = await searchParams
  const wantPeriod = sp?.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : null

  // Arxiv: yadda saxlanmış bütün dövrlər (ay-ay) — dropdown üçün
  const periodRows = await db.selectDistinct({ period: analytics_ingest.period })
    .from(analytics_ingest)
    .where(and(eq(analytics_ingest.tenant_id, tenantId), eq(analytics_ingest.engine_version, 'panel-1.0')))
  // Fakt cədvəlindəki dövrlər də siyahıya girir — əks halda yalnız PRODMIX/ÇEK
  // yüklənmiş ay dropdown-da GÖRÜNMƏZ qalardı (iyul hadisəsinin eyni tələsi).
  let factPeriods: string[] = []
  try {
    const fp = await sqlClient.query(
      `select distinct to_char(business_date,'YYYY-MM') as p
       from analytics_daily_fact where tenant_id = $1`, [tenantId],
    )
    factPeriods = ((Array.isArray(fp) ? fp : (fp as { rows?: unknown[] }).rows ?? []) as Array<{ p: string }>)
      .map(r => String(r.p))
  } catch { /* cədvəl yoxdursa siyahı blob-dan qalır */ }
  const periods = [...new Set([
    ...periodRows.map(r => r.period).filter((p): p is string => !!p),
    ...factPeriods,
  ])].sort().reverse()

  // ── Diaqnostika: DB-də NƏ VAR (bütün engine_version-lar) ───────────────────
  // Niyə lazımdır: `analytics_ingest`-ə DÖRD fərqli yazıcı var, hər biri fərqli
  // `engine_version` qoyur, amma bu səhifə yalnız `panel-1.0` oxuyur. Nəticədə
  // başqa yolla yüklənən dövr DB-də QALIR, lakin heç yerdə GÖRÜNMÜR →
  // istifadəçi "ay itdi" deyir, halbuki data yerindədir, sadəcə oxunmur.
  // Bu siyahı görünməzliyi bitirir: super_admin DB-də nə olduğunu görür.
  const inventory = session.user.role === 'super_admin'
    ? await db.select({
        period: analytics_ingest.period,
        engine: analytics_ingest.engine_version,
        status: analytics_ingest.status,
        created: analytics_ingest.created_at,
      })
      .from(analytics_ingest)
      .where(eq(analytics_ingest.tenant_id, tenantId))
      .orderBy(desc(analytics_ingest.created_at))
      .limit(50)
      .then(rows => rows.map(r => ({
        period: r.period,
        engine: r.engine ?? '—',
        status: r.status,
        created: r.created ? new Date(r.created).toLocaleDateString('az') : '—',
        // Yalnız `panel-1.0` bu səhifədə göstərilə bilir — digərlərinin
        // `network` sxemi fərqlidir (məs. excel-upload-1.0 yalnız 3 ədəd saxlayır).
        readable: r.engine === 'panel-1.0',
      })))
      .catch(() => [])
    : []

  // Seçilən dövr (yoxdursa ən sonuncu) panel verisi
  const [latest] = await db.select({ network: analytics_ingest.network, gen: analytics_ingest.generated_at, period: analytics_ingest.period })
    .from(analytics_ingest)
    .where(and(
      eq(analytics_ingest.tenant_id, tenantId),
      eq(analytics_ingest.engine_version, 'panel-1.0'),
      ...(wantPeriod ? [eq(analytics_ingest.period, wantPeriod)] : []),
    ))
    .orderBy(desc(analytics_ingest.created_at)).limit(1)

  let initial: { daily: unknown; plan: unknown; yoy?: unknown } | null = null
  if (latest?.network) { try { initial = JSON.parse(latest.network) } catch { initial = null } }

  // ── FAKT CƏDVƏLİ ÜSTÜNLÜKLƏ OXUNUR ──────────────────────────────────────────
  // NİYƏ: PRODMIX/ÇEK yükləməsi `analytics_daily_fact`-a yazır, bu səhifə isə
  // ayrıca aylıq satış faylının JSON blob-unu oxuyurdu → istifadəçi iki fayl
  // yükləmək məcburiyyətində qalırdı. Fakt datası daha incə qranuldadır (gün ×
  // filial × ödəniş növü) və çek sayını da daşıyır, ona görə mövcud olduqda
  // ONDAN qurulur. Blob yolu SİLİNMİR — köhnə aylar (fakt yüklənməmiş dövrlər)
  // yenə görünür.
  let factSource = false
  try {
    const fr = await sqlClient.query(
      `select filial, business_date::text as business_date, payment_type,
              amount::float8 as amount, receipts
       from analytics_daily_fact
       where tenant_id = $1
         ${wantPeriod ? `and to_char(business_date,'YYYY-MM') = $2` : ''}`,
      wantPeriod ? [tenantId, wantPeriod] : [tenantId],
    )
    const rows = (Array.isArray(fr) ? fr : (fr as { rows?: unknown[] }).rows ?? []) as FactRow[]
    const built = factsToPanel(rows, wantPeriod)
    if (built) {
      // Plan/YoY blob-dan gəlməyə davam edir (fakt cədvəlində plan yoxdur).
      initial = { daily: built, plan: initial?.plan ?? null, yoy: initial?.yoy }
      factSource = true
    }
  } catch (err) {
    // Cədvəl yoxdursa (migration 0010 tətbiq olunmayıb) blob yolu işləyir.
    // Xəta UDULMUR — loga yazılır.
    console.error('Panel fact read error:', err)
  }

  const dailyObj = initial?.daily as { period?: string; branches?: Array<{ filial: string; total: number }> } | undefined
  const period = dailyObj?.period ?? latest?.period ?? null

  // ── RBAC: super_admin xaric, yalnız istifadəçinin əlçatan filialları göstər ──
  // (maliyyət sızıntısı olmasın — branch/region müdiri bütün şəbəkənin cirosunu görməməli)
  const role = session.user.role
  const canon = (s: string) => (normalizeFilial(s) ?? s).trim().toLowerCase()
  let allowedIds: string[] | null = null
  if (role !== 'super_admin') {
    allowedIds = await accessibleBranchIds({ id: session.user.id, tenant_id: tenantId, role })
    const brs = allowedIds.length
      ? await db.select({ name: branches.name }).from(branches).where(and(eq(branches.tenant_id, tenantId), inArray(branches.id, allowedIds)))
      : []
    const allowed = new Set(brs.map(b => canon(b.name)))
    const d = initial?.daily as DailyFull | undefined
    if (d?.branches) {
      const netTop = d.toplam || d.branches.reduce((s, b) => s + b.total, 0) || 1
      const fb = d.branches.filter(b => allowed.has(canon(b.filial)))
      const top = fb.reduce((s, b) => s + b.total, 0)
      const ratio = netTop ? top / netTop : 0
      const region: Record<string, number> = {}
      for (const b of fb) region[b.bolge ?? '?'] = (region[b.bolge ?? '?'] ?? 0) + b.total
      d.branches = fb
      d.regions = Object.entries(region).sort((a, b) => b[1] - a[1])
      d.toplam = Math.round(top)
      d.gedisat = Math.round((d.gedisat ?? 0) * ratio)
      d.pay = {
        nagd: Math.round((d.pay?.nagd ?? 0) * ratio), kart: Math.round((d.pay?.kart ?? 0) * ratio),
        wolt: fb.reduce((s, b) => s + b.wolt, 0), bolt: fb.reduce((s, b) => s + b.bolt, 0),
      }
      if (d.days?.length) {
        const nd: Record<string, { total: number; wolt: number; bolt: number }> = {}
        for (const day of d.days) { const x = d.daily[day]; if (x) nd[day] = { total: Math.round(x.total * ratio), wolt: Math.round(x.wolt * ratio), bolt: Math.round(x.bolt * ratio) } }
        d.daily = nd
      }
    }
    // Yüklənmiş YoY varsa onu da scope et
    const yy = initial?.yoy as { branches?: Record<string, { y2025: number; y2026: number }> } | undefined
    if (yy?.branches) {
      const fyb: Record<string, { y2025: number; y2026: number }> = {}
      let n25 = 0, n26 = 0
      for (const [f, v] of Object.entries(yy.branches)) if (allowed.has(canon(f))) { fyb[f] = v; n25 += v.y2025; n26 += v.y2026 }
      ;(initial as { yoy?: unknown }).yoy = { branches: fyb, network: { y2025: n25, y2026: n26 } }
    }
  }

  // Manuel satış hədəfləri (/sales-dən girilən, sales_targets) → dövrün ayı üçün (rol-scoped)
  const targets: Record<string, number> = {}
  if (period) {
    const rows = await db.select({ name: branches.name, amt: sales_targets.target_amount })
      .from(sales_targets)
      .innerJoin(branches, eq(sales_targets.branch_id, branches.id))
      .where(and(
        eq(sales_targets.tenant_id, tenantId),
        eq(sales_targets.month, `${period}-01`),
        ...(allowedIds ? [inArray(sales_targets.branch_id, allowedIds)] : []),
      ))
    for (const r of rows) targets[r.name.trim()] = Number(r.amt)
  }

  // Keçən il (2025) referansı qalıcı saxlanıbsa (PLAN.xlsx yüklənəndə) → YoY-u avtomatik qur.
  // Yüklənmiş faylda YoY yoxdursa referansdan sintez et (təkrar fayl yükləmə lazım deyil).
  if (initial && !initial.yoy && period && dailyObj?.branches?.length) {
    try {
      const [refRow] = await db.select({ net: analytics_ingest.network }).from(analytics_ingest)
        .where(and(eq(analytics_ingest.tenant_id, tenantId), eq(analytics_ingest.engine_version, 'yoyref-1.0'))).limit(1)
      const map = refRow?.net ? (JSON.parse(refRow.net) as Record<string, Record<string, number>>) : null
      const refMonth = map?.[period]
      if (refMonth) {
        const yb: Record<string, { y2025: number; y2026: number }> = {}
        let n25 = 0, n26 = 0
        for (const b of dailyObj.branches) {
          const y25 = refMonth[b.filial] ?? 0
          if (y25 > 0) { yb[b.filial] = { y2025: y25, y2026: b.total }; n25 += y25; n26 += b.total }
        }
        if (Object.keys(yb).length) initial.yoy = { branches: yb, network: { y2025: n25, y2026: n26 } }
      }
    } catch { /* referans oxuma xətası paneli pozmasın */ }
  }

  return (
    <PanelClient
      initial={initial}
      targets={targets}
      canUpload={session.user.role === 'super_admin'}
      savedAt={latest?.gen ? new Date(latest.gen).toLocaleDateString('az') : null}
      factSource={factSource}
      // `key` VACİBDİR: PanelClient state-ini `useState(initial...)` ilə qurur
      // (`panel-client.tsx:63-65`). `useState` başlanğıc dəyəri YALNIZ ilk
      // mount-da işlədir. Dövr dəyişdirildikdə `router.push` client-side
      // naviqasiya edir → server yeni `initial` göndərir, lakin komponent EYNİ
      // instance olduğu üçün state köhnə ayda qalırdı (iyul seçilir, avqust
      // görünür). `key` dəyişəndə React komponenti yenidən qurur → state təzə
      // prop-dan oxunur.
      key={wantPeriod ?? latest?.period ?? 'none'}
      periods={periods}
      // Dropdown istifadəçinin SEÇDİYİNİ göstərsin — həmin dövr üçün panel
      // verisi olmasa da (əks halda seçim "geri atlayır" kimi görünür).
      selectedPeriod={wantPeriod ?? latest?.period ?? null}
      inventory={inventory}
    />
  )
}
