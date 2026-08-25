import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, and, inArray } from 'drizzle-orm'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { accessibleBranchIds } from '@/lib/branch-access'
import { canonBranchKey } from '@/lib/analytics/filial-map'
import SilinmeClient from './silinme-client'

export const metadata = { title: 'Silinmə Nəzarəti — OCAQ' }
export const dynamic = 'force-dynamic'

/**
 * SİLİNMƏ NƏZARƏTİ — `analytics_deletion_fact`.
 *
 * NİYƏ AYRI EKRAN: silinmə faizi kasa nəzarətinin ƏSAS göstəricisidir, lakin
 * ciro ekranlarına qarışdırılsa görünməz olur. Burada TƏK SUAL var:
 * «hansı filialda ləğv/silinmə normadan yüksəkdir?»
 *
 * 🔴 ANOMALİYA AYRILIR (22.08.2026 dərsi): Amay-ın xam silinmə nisbəti %76,38
 * çıxmışdı — səbəb 2 səhv giriş idi («PİZZA SALAMİ 1 ədəd = 20 079,90 ₼»).
 * Anomaliyasız nisbət %1,95. Xam rəqəmə baxıb filiala haqsız ittiham
 * yönəltməmək üçün EKRAN HƏR İKİ RƏQƏMİ göstərir.
 */

const OUTLIER_MIN = 200   // bundan böyük TƏK silinmə anomaliya sayılır

type Row = Record<string, unknown>
const rowsOf = (r: unknown): Row[] => (Array.isArray(r) ? r : (r as { rows?: Row[] })?.rows ?? []) as Row[]
const n = (v: unknown) => Number(v ?? 0)
const s = (v: unknown) => String(v ?? '')

export default async function SilinmePage() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(role)) redirect('/dashboard')

  const tenantId = session.user.tenant_id

  // ── RBAC: super_admin şəbəkəni, digərləri yalnız öz filiallarını ───────────
  let canonAllowed: string[] | null = null
  if (role !== 'super_admin') {
    const ids = await accessibleBranchIds({ id: session.user.id, tenant_id: tenantId, role })
    const brs = ids.length
      ? await db.select({ name: branches.name }).from(branches)
        .where(and(eq(branches.tenant_id, tenantId), inArray(branches.id, ids)))
      : []
    canonAllowed = brs.map(b => canonBranchKey(b.name))
    if (!canonAllowed.length) {
      return <SilinmeClient empty="Sizə təyin edilmiş filial yoxdur." />
    }
  }

  const [info] = rowsOf(await sqlClient.query(
    `select min(business_date) as d0, max(business_date) as d1, count(*)::int as n
     from analytics_deletion_fact where tenant_id = $1`, [tenantId],
  ))
  if (!n(info?.n)) {
    return <SilinmeClient empty="Hələ silinmə hesabatı yüklənməyib. Günlük Panel → iiko faylını yükləyin («Silinme hesabati»)." />
  }
  const start = s(info?.d0).slice(0, 10)
  const end = s(info?.d1).slice(0, 10)

  const allF = rowsOf(await sqlClient.query(
    `select distinct filial from analytics_deletion_fact where tenant_id=$1`, [tenantId],
  )).map(r => s(r.filial))
  const scope = canonAllowed ? allF.filter(f => canonAllowed!.includes(canonBranchKey(f))) : allF
  if (!scope.length) return <SilinmeClient empty="Bu əhatədə silinmə datası yoxdur." />

  const args = [tenantId, scope, start, end] as const

  // ── Filial üzrə: XAM və ANOMALİYASIZ ayrı-ayrı ────────────────────────────
  // Ciro `analytics_daily_fact`-in `__day__` sətirlərindən gəlir — eyni dövr.
  const byBranch = rowsOf(await sqlClient.query(
    `with d as (
       select filial,
              sum(amount)::float8 total,
              sum(case when amount <  $5 then amount else 0 end)::float8 clean,
              sum(case when amount >= $5 then amount else 0 end)::float8 outlier,
              count(*)::int cnt,
              count(*) filter (where written_off)::int off_cnt,
              count(*) filter (where comment is null or comment = '')::int no_comment
       from analytics_deletion_fact
       where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       group by 1
     ), r as (
       select filial, sum(amount)::float8 revenue
       from analytics_daily_fact
       where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
         and payment_type='__day__'
       group by 1
     )
     select d.*, coalesce(r.revenue,0)::float8 revenue
     from d left join r on r.filial = d.filial
     order by d.clean desc`, [...args, OUTLIER_MIN],
  )).map(x => ({
    filial: s(x.filial), total: n(x.total), clean: n(x.clean), outlier: n(x.outlier),
    cnt: n(x.cnt), offCnt: n(x.off_cnt), noComment: n(x.no_comment), revenue: n(x.revenue),
  }))

  // ── Səbəb üzrə ────────────────────────────────────────────────────────────
  const byReason = rowsOf(await sqlClient.query(
    `select coalesce(reason,'—') reason, sum(amount)::float8 amount, count(*)::int cnt
     from analytics_deletion_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
     group by 1 order by 2 desc`, [...args],
  )).map(x => ({ reason: s(x.reason), amount: n(x.amount), cnt: n(x.cnt) }))

  // ── Gün üzrə (trend) ──────────────────────────────────────────────────────
  const byDay = rowsOf(await sqlClient.query(
    `select business_date,
            sum(case when amount < $5 then amount else 0 end)::float8 clean,
            sum(amount)::float8 total, count(*)::int cnt
     from analytics_deletion_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
     group by 1 order by 1`, [...args, OUTLIER_MIN],
  )).map(x => ({ date: s(x.business_date).slice(0, 10), clean: n(x.clean), total: n(x.total), cnt: n(x.cnt) }))

  // ── Anomaliyalar (səhv giriş ehtimalı) ────────────────────────────────────
  const outliers = rowsOf(await sqlClient.query(
    `select business_date, filial, item, receipt, coalesce(comment,'') comment, amount::float8 amount
     from analytics_deletion_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and amount >= $5
     order by amount desc limit 30`, [...args, OUTLIER_MIN],
  )).map(x => ({
    date: s(x.business_date).slice(0, 10), filial: s(x.filial), item: s(x.item),
    receipt: s(x.receipt), comment: s(x.comment), amount: n(x.amount),
  }))

  // ── Ən çox silinən məhsullar ──────────────────────────────────────────────
  const byItem = rowsOf(await sqlClient.query(
    `select item, sum(amount)::float8 amount, count(*)::int cnt
     from analytics_deletion_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and amount < $5
     group by 1 order by 3 desc limit 15`, [...args, OUTLIER_MIN],
  )).map(x => ({ item: s(x.item), amount: n(x.amount), cnt: n(x.cnt) }))

  return (
    <SilinmeClient
      start={start} end={end} outlierMin={OUTLIER_MIN}
      byBranch={byBranch} byReason={byReason} byDay={byDay}
      outliers={outliers} byItem={byItem}
    />
  )
}
