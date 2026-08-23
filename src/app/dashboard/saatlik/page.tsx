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
 * SAATLIQ SATIŞ ekranı — `analytics_hourly_cume` + `analytics_hourly_fact`.
 *
 * 🔴 NİYƏ BU SƏHİFƏ VAR: yükləmə qurulmuşdu, EKRAN QURULMAMIŞDI. İstifadəçi
 * faylı yüklədi və «çıxmadı» dedi — haqlıydı, datanı göstərən heç bir yer yox
 * idi. Eyni səhv iyulda da olmuşdu (yazılan data görünmürdü). Yazma ilə OXUMA
 * eyni anda gəlməlidir.
 *
 * İKİ MƏNBƏ, İKİ SUAL:
 *   • `analytics_hourly_cume` → «DÖVR boyu saat profili» (fayl nə deyirsə o).
 *     Birinci fayldan etibarən DOLU olur — istifadəçi dərhal nəticə görür.
 *   • `analytics_hourly_fact` → «GÜN-GÜN saat profili» (iki görüntünün fərqi).
 *     İkinci fayldan etibarən dolur.
 * İkisi qarışdırılmır; hansının nə olduğu ekranda yazılır.
 *
 * Aqreqasiya SQL-dədir — 3 900 sətri hər açılışda brauzerə daşımırıq.
 */

type Row = Record<string, unknown>
const rowsOf = (r: unknown): Row[] => (Array.isArray(r) ? r : (r as { rows?: Row[] })?.rows ?? []) as Row[]
const n = (v: unknown) => Number(v ?? 0)
const s = (v: unknown) => String(v ?? '')
const ISO = /^\d{4}-\d{2}-\d{2}$/

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
  // super_admin şəbəkəni görür. Digərləri YALNIZ öz filiallarını; adı
  // uyğunlaşmayan sətirlər onlara görünmür (ciro sızıntısı olmasın).
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

  // ── Mövcud kumulyativ görüntülər ───────────────────────────────────────────
  const snapshots = rowsOf(await sqlClient.query(
    `select period_start, period_end,
            sum(net)::float8 net, sum(guests)::int guests,
            count(distinct filial)::int branches, count(*)::int rows
     from analytics_hourly_cume where tenant_id = $1
     group by 1,2 order by period_end desc`, [tenantId],
  )).map(r => ({
    start: s(r.period_start).slice(0, 10), end: s(r.period_end).slice(0, 10),
    net: n(r.net), guests: n(r.guests), branches: n(r.branches), rows: n(r.rows),
  }))

  if (!snapshots.length) {
    return <SaatlikClient
      empty="Hələ saatlıq hesabat yüklənməyib. Günlük Panel → «Saatlıq satış» bölməsindən iiko hesabatını yükləyin."
      snapshots={[]} days={[]} filials={[]} />
  }

  const latest = snapshots[0]

  // Bu görüntüdəki filiallar → RBAC süzgəci JS-də (filial sayı 30-dur, ucuz).
  const canonAllowed = allowedNames?.map(canonBranchKey) ?? null
  const allFilials = rowsOf(await sqlClient.query(
    `select distinct filial from analytics_hourly_cume
     where tenant_id=$1 and period_start=$2 and period_end=$3`,
    [tenantId, latest.start, latest.end],
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

  // ── DÖVR profili (kumulyativ görüntüdən) ───────────────────────────────────
  const cumeHours = rowsOf(await sqlClient.query(
    `select hour, sum(net)::float8 net, sum(guests)::int guests
     from analytics_hourly_cume
     where tenant_id=$1 and period_start=$2 and period_end=$3 and filial=any($4::text[])
     group by 1 order by 1`,
    [tenantId, latest.start, latest.end, scope],
  )).map(r => ({ hour: n(r.hour), net: n(r.net), guests: n(r.guests) }))

  const cumePay = rowsOf(await sqlClient.query(
    `select pay_type, sum(net)::float8 net, sum(guests)::int guests
     from analytics_hourly_cume
     where tenant_id=$1 and period_start=$2 and period_end=$3 and filial=any($4::text[])
     group by 1 order by 2 desc`,
    [tenantId, latest.start, latest.end, scope],
  )).map(r => ({ payType: s(r.pay_type), net: n(r.net), guests: n(r.guests) }))

  // PİK SAAT: əvvəlcə filial × saat səviyyəsində ÖDƏNİŞ NÖVLƏRİ TOPLANIR,
  // sonra ən güclü saat seçilir. Toplamadan seçilsə «ən böyük tək sətir»in
  // saatı çıxardı (məsələn yalnız nağdın pik saatı) — filialın həqiqi pik
  // saatı deyil.
  const cumeBranch = rowsOf(await sqlClient.query(
    `with h as (
       select filial, hour, sum(net)::float8 net, sum(guests)::int guests
       from analytics_hourly_cume
       where tenant_id=$1 and period_start=$2 and period_end=$3 and filial=any($4::text[])
       group by 1,2
     ), b as (
       select filial, sum(net)::float8 net, sum(guests)::int guests from h group by 1
     ), p as (
       select distinct on (filial) filial, hour from h order by filial, net desc, hour
     )
     select b.filial, b.net, b.guests, p.hour::int peak
     from b join p on p.filial = b.filial
     order by b.net desc`,
    [tenantId, latest.start, latest.end, scope],
  )).map(r => ({ filial: s(r.filial), net: n(r.net), guests: n(r.guests), peak: n(r.peak) }))

  // ── GÜN-GÜN (fərqdən çıxan fakt) ───────────────────────────────────────────
  const days = rowsOf(await sqlClient.query(
    `select business_date, sum(net)::float8 net, sum(guests)::int guests,
            min(derivation) as derivation
     from analytics_hourly_fact
     where tenant_id=$1 and filial=any($2::text[])
     group by 1 order by 1 desc limit 60`,
    [tenantId, scope],
  )).map(r => ({
    date: s(r.business_date).slice(0, 10), net: n(r.net), guests: n(r.guests),
    derivation: s(r.derivation),
  }))

  // Seçilmiş günün saat profili (yalnız gün seçilibsə).
  const pickedDay = wantGun && days.some(d => d.date === wantGun) ? wantGun : null
  const dayHours = pickedDay
    ? rowsOf(await sqlClient.query(
      `select hour, sum(net)::float8 net, sum(guests)::int guests
       from analytics_hourly_fact
       where tenant_id=$1 and filial=any($2::text[]) and business_date=$3
       group by 1 order by 1`,
      [tenantId, scope, pickedDay],
    )).map(r => ({ hour: n(r.hour), net: n(r.net), guests: n(r.guests) }))
    : []

  return (
    <SaatlikClient
      snapshots={snapshots}
      latest={latest}
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
