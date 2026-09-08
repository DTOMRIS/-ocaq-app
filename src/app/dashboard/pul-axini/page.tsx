import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { sqlClient } from '@/db'
import PulClient, { type ItemRow, type AccRow, type DayRow, type BranchRow } from './pul-client'

export const metadata = { title: 'Pul Axını — OCAQ' }
export const dynamic = 'force-dynamic'

type R = Record<string, unknown>
const rowsOf = (r: unknown): R[] => (Array.isArray(r) ? r : (r as { rows?: R[] })?.rows ?? []) as R[]
const n = (v: unknown) => Number(v ?? 0)
const s = (v: unknown) => String(v ?? '')

/**
 * PUL AXINI — «pul haradan gəldi, hara getdi».
 *
 * `Kasa/Banka` ekranından FƏRQİ: o, «kart satışı bankaya düşübmü?» sualını
 * verir (bir mənbə, bir yoxlama). Bu isə BÜTÜN hərəkətdir — icarə, əmək haqqı,
 * kredit, təhtəlhesab. İkisi bir ekrana sığmaz, ona görə ayrıdır.
 */
export default async function PulAxiniPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin') redirect('/dashboard')
  const tid = session.user.tenant_id
  const sp = await searchParams

  try {
    const [rng] = rowsOf(await sqlClient.query(
      `select min(op_date)::text d0, max(op_date)::text d1, count(*)::int n from cashflow_lines where tenant_id=$1`, [tid],
    ))
    if (!n(rng?.n)) {
      return <PulClient empty="Pul axını hələ yüklənməyib. Günlük Panel → «CASH FLOW» faylını yükləyin." />
    }
    const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : s(rng?.d0).slice(0, 10)
    const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : s(rng?.d1).slice(0, 10)
    const a = [tid, from, to] as const

    const [sum] = rowsOf(await sqlClient.query(
      `select coalesce(sum(amount) filter (where amount>0),0)::float8 inflow,
              coalesce(sum(amount) filter (where amount<0),0)::float8 outflow,
              count(*)::int cnt, count(distinct op_date)::int days
       from cashflow_lines where tenant_id=$1 and op_date between $2 and $3`, [...a],
    ))
    const byItem: ItemRow[] = rowsOf(await sqlClient.query(
      `select item, sum(amount)::float8 amount, count(*)::int cnt
       from cashflow_lines where tenant_id=$1 and op_date between $2 and $3
       group by 1 order by abs(sum(amount)) desc`, [...a],
    )).map(r => ({ item: s(r.item), amount: n(r.amount), cnt: n(r.cnt) }))
    const byAccount: AccRow[] = rowsOf(await sqlClient.query(
      `select account, sum(amount)::float8 amount, count(*)::int cnt
       from cashflow_lines where tenant_id=$1 and op_date between $2 and $3
       group by 1 order by abs(sum(amount)) desc`, [...a],
    )).map(r => ({ account: s(r.account), amount: n(r.amount), cnt: n(r.cnt) }))
    const byDay: DayRow[] = rowsOf(await sqlClient.query(
      `select op_date::text d,
              coalesce(sum(amount) filter (where amount>0),0)::float8 inflow,
              coalesce(sum(amount) filter (where amount<0),0)::float8 outflow
       from cashflow_lines where tenant_id=$1 and op_date between $2 and $3
       group by 1 order by 1`, [...a],
    )).map(r => ({ date: s(r.d).slice(0, 10), inflow: n(r.inflow), outflow: n(r.outflow) }))
    // Bölmə YALNIZ «Baş kassa»da var — digər hesablarda filial məlumatı yoxdur
    const byBranch: BranchRow[] = rowsOf(await sqlClient.query(
      `select branch, sum(amount)::float8 amount, count(*)::int cnt
       from cashflow_lines where tenant_id=$1 and op_date between $2 and $3 and branch is not null
       group by 1 order by abs(sum(amount)) desc limit 25`, [...a],
    )).map(r => ({ branch: s(r.branch), amount: n(r.amount), cnt: n(r.cnt) }))

    return <PulClient from={from} to={to}
      inflow={n(sum?.inflow)} outflow={n(sum?.outflow)} cnt={n(sum?.cnt)} days={n(sum?.days)}
      byItem={byItem} byAccount={byAccount} byDay={byDay} byBranch={byBranch} />
  } catch (e) {
    return <PulClient empty={e instanceof Error && /cashflow_lines/.test(e.message)
      ? 'Pul axını cədvəli hələ qurulmayıb (migration 0021).'
      : 'Pul axını oxunmadı.'} />
  }
}
