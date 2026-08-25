import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, and, inArray } from 'drizzle-orm'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { accessibleBranchIds } from '@/lib/branch-access'
import { canonBranchKey } from '@/lib/analytics/filial-map'
import SaatlikClient from './saatlik-client'

export const metadata = { title: 'Saatlıq Satış — OCAQ' }
export const dynamic = 'force-dynamic'

/**
 * SAATLIQ SATIŞ ekranı.
 *
 * 🔴 MƏNBƏ SIRASI (24.08.2026-da düzəldildi):
 *   1. `analytics_hourly_fact` — GÜN-GÜN data. «Satış ay və gün» faylında
 *      `Uçot günü` olduğu üçün sətirlər birbaşa öz gününə yazılır. **ƏSAS
 *      MƏNBƏ BUDUR** və varsa səhifə ONU göstərir.
 *   2. `analytics_hourly_cume` — köhnə KUMULYATİV görüntü («Doğan Tomris
 *      Rapor», gün sütunu olmayan fayl). Yalnız fakt cədvəli BOŞDURSA əsas
 *      mənbə olur; əks halda aşağıda arxiv kimi görünür.
 *
 * Əvvəl səhifə HƏMİŞƏ kumulyativ görüntü ilə başlayırdı: yeni tarixli fayl
 * yazılsa belə yuxarıdakı böyük rəqəm KÖHNƏ qalırdı (01–21.08 · 2 691 753 ₼)
 * və istifadəçi «yüklədim, dəyişmədi» görürdü. İndi tarixli data varsa o
 * başdadır və hansı mənbədən gəldiyi ekranda yazılır.
 *
 * Aqreqasiya SQL-dədir — 43 000 sətri hər açılışda brauzerə daşımırıq.
 */

type Row = Record<string, unknown>
const rowsOf = (r: unknown): Row[] => (Array.isArray(r) ? r : (r as { rows?: Row[] })?.rows ?? []) as Row[]
const n = (v: unknown) => Number(v ?? 0)
const s = (v: unknown) => String(v ?? '')
const ISO = /^\d{4}-\d{2}-\d{2}$/
const d10 = (v: unknown) => s(v).slice(0, 10)

export default async function SaatlikPage({ searchParams }: {
  searchParams: Promise<{ filial?: string; gun?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(role)) redirect('/dashboard')

  const tenantId = session.user.tenant_id
  const sp = await searchParams
  const wantFilial = sp?.filial?.trim() || null
  const wantGun = sp?.gun && ISO.test(sp.gun) ? sp.gun : null

  // ── RBAC ───────────────────────────────────────────────────────────────────
  let allowedNames: string[] | null = null
  if (role !== 'super_admin') {
    const ids = await accessibleBranchIds({ id: session.user.id, tenant_id: tenantId, role })
    const brs = ids.length
      ? await db.select({ name: branches.name }).from(branches)
        .where(and(eq(branches.tenant_id, tenantId), inArray(branches.id, ids)))
      : []
    allowedNames = brs.map(b => b.name)
    if (!allowedNames.length) {
      return <SaatlikClient empty="Sizə təyin edilmiş filial yoxdur." snapshots={[]} days={[]} filials={[]} />
    }
  }
  const canonAllowed = allowedNames?.map(canonBranchKey) ?? null

  // ── Hansı mənbə? Tarixli fakt varsa O əsasdır. ─────────────────────────────
  const [factInfo] = rowsOf(await sqlClient.query(
    `select min(business_date) as d0, max(business_date) as d1, count(*)::int as n
     from analytics_hourly_fact where tenant_id = $1`, [tenantId],
  ))
  const hasFact = n(factInfo?.n) > 0

  // Kumulyativ görüntülər — arxiv siyahısı üçün həmişə oxunur.
  const snapshots = rowsOf(await sqlClient.query(
    `select period_start, period_end,
            sum(net)::float8 net, sum(guests)::int guests,
            count(distinct filial)::int branches, count(*)::int rows
     from analytics_hourly_cume where tenant_id = $1
     group by 1,2 order by period_end desc`, [tenantId],
  )).map(r => ({
    start: d10(r.period_start), end: d10(r.period_end),
    net: n(r.net), guests: n(r.guests), branches: n(r.branches), rows: n(r.rows),
  }))

  if (!hasFact && !snapshots.length) {
    return <SaatlikClient
      empty="Hələ saatlıq hesabat yüklənməyib. Günlük Panel → iiko faylını yükləyin («Satış ay və gün»)."
      snapshots={[]} days={[]} filials={[]} />
  }

  // Əsas mənbənin cədvəli və dövr açarı.
  const src = hasFact ? 'fact' : 'cume'
  const legacy = snapshots[0] ?? null
  const start = hasFact ? d10(factInfo?.d0) : legacy!.start
  const end = hasFact ? d10(factInfo?.d1) : legacy!.end

  // Mənbəyə görə WHERE bəndi və parametrləri. İki cədvəlin sütun adları eynidir
  // (`filial`, `pay_type`, `hour`, `net`, `guests`) — yalnız süzgəc fərqlidir.
  const from = hasFact ? 'analytics_hourly_fact' : 'analytics_hourly_cume'
  const dateWhere = hasFact
    ? 'business_date between $2::date and $3::date'
    : 'period_start = $2::date and period_end = $3::date'

  const allFilials = rowsOf(await sqlClient.query(
    `select distinct filial from ${from} where tenant_id=$1 and ${dateWhere}`,
    [tenantId, start, end],
  )).map(r => s(r.filial)).sort((a, b) => a.localeCompare(b, 'az'))
  const rbacFilials = canonAllowed
    ? allFilials.filter(f => canonAllowed.includes(canonBranchKey(f)))
    : allFilials

  if (!rbacFilials.length) {
    return <SaatlikClient empty="Bu əhatədə saatlıq data yoxdur." snapshots={snapshots} days={[]} filials={[]} />
  }

  // Drill-down: seçim RBAC əhatəsindən kənardırsa NƏZƏRƏ ALINMIR.
  const hit = wantFilial ? rbacFilials.find(f => canonBranchKey(f) === canonBranchKey(wantFilial)) : null
  const scope = hit ? [hit] : rbacFilials
  const args = [tenantId, start, end, scope] as const

  // ── Saat profili ───────────────────────────────────────────────────────────
  const cumeHours = rowsOf(await sqlClient.query(
    `select hour, sum(net)::float8 net, sum(guests)::int guests
     from ${from} where tenant_id=$1 and ${dateWhere} and filial=any($4::text[])
     group by 1 order by 1`, [...args],
  )).map(r => ({ hour: n(r.hour), net: n(r.net), guests: n(r.guests) }))

  // ── Ödəniş qarışığı ────────────────────────────────────────────────────────
  const cumePay = rowsOf(await sqlClient.query(
    `select pay_type, sum(net)::float8 net, sum(guests)::int guests
     from ${from} where tenant_id=$1 and ${dateWhere} and filial=any($4::text[])
     group by 1 order by 2 desc`, [...args],
  )).map(r => ({ payType: s(r.pay_type), net: n(r.net), guests: n(r.guests) }))

  // ── Filial cədvəli ─────────────────────────────────────────────────────────
  // PİK SAAT: əvvəlcə filial × saat səviyyəsində ÖDƏNİŞ NÖVLƏRİ TOPLANIR,
  // sonra ən güclü saat seçilir. Toplamadan seçilsə «ən böyük tək sətrin»
  // saatı çıxardı (məsələn yalnız nağdın piki) — filialın həqiqi piki deyil.
  const cumeBranch = rowsOf(await sqlClient.query(
    `with h as (
       select filial, hour, sum(net)::float8 net, sum(guests)::int guests
       from ${from} where tenant_id=$1 and ${dateWhere} and filial=any($4::text[])
       group by 1,2
     ), b as (
       select filial, sum(net)::float8 net, sum(guests)::int guests from h group by 1
     ), p as (
       select distinct on (filial) filial, hour from h order by filial, net desc, hour
     )
     select b.filial, b.net, b.guests, p.hour::int peak
     from b join p on p.filial = b.filial
     order by b.net desc`, [...args],
  )).map(r => ({ filial: s(r.filial), net: n(r.net), guests: n(r.guests), peak: n(r.peak) }))

  // ── GÜN-GÜN (yalnız fakt cədvəlində var) ───────────────────────────────────
  const days = hasFact ? rowsOf(await sqlClient.query(
    `select business_date, sum(net)::float8 net, sum(guests)::int guests,
            min(derivation) as derivation
     from analytics_hourly_fact
     where tenant_id=$1 and filial=any($2::text[])
     group by 1 order by 1 desc limit 60`, [tenantId, scope],
  )).map(r => ({
    date: d10(r.business_date), net: n(r.net), guests: n(r.guests), derivation: s(r.derivation),
  })) : []

  const pickedDay = wantGun && days.some(d => d.date === wantGun) ? wantGun : null
  const dayHours = pickedDay
    ? rowsOf(await sqlClient.query(
      `select hour, sum(net)::float8 net, sum(guests)::int guests
       from analytics_hourly_fact
       where tenant_id=$1 and filial=any($2::text[]) and business_date=$3
       group by 1 order by 1`, [tenantId, scope, pickedDay],
    )).map(r => ({ hour: n(r.hour), net: n(r.net), guests: n(r.guests) }))
    : []

  return (
    <SaatlikClient
      source={src}
      snapshots={snapshots}
      latest={{
        start, end,
        net: cumeHours.reduce((a, h) => a + h.net, 0),
        guests: cumeHours.reduce((a, h) => a + h.guests, 0),
        branches: cumeBranch.length,
        rows: 0,
      }}
      filials={rbacFilials}
      drillFilial={hit ?? null}
      cumeHours={cumeHours}
      cumePay={cumePay}
      cumeBranch={cumeBranch}
      days={days}
      pickedDay={pickedDay}
      dayHours={dayHours}
      canDrill={role === 'super_admin' || rbacFilials.length > 1}
    />
  )
}
