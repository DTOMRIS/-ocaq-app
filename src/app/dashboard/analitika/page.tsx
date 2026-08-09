import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, and, inArray } from 'drizzle-orm'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { accessibleBranchIds } from '@/lib/branch-access'
import { canonBranchKey } from '@/lib/analytics/filial-map'
import AnalitikaClient from './analitika-client'

export const metadata = { title: 'Məhsul Analizi — OCAQ' }
export const dynamic = 'force-dynamic'

/**
 * MƏHSUL ANALİZİ — `analytics_item_fact` + `analytics_daily_fact` üzərində.
 *
 * NİYƏ BU SƏHİFƏ: yükləmə datanı bazaya yazır, lakin heç bir ekran onu
 * OXUMURDU — istifadəçi «detay almadıq, excel-də detay çoxdu» dedi və haqlıydı.
 * Dashboard-daki 3 kart (ort. çek, müştəri, çek sayı) faylın içindəki
 * məhsul-səviyyəli detayın yalnız kiçik bir hissəsidir.
 *
 * Əvvəl bu route `/dashboard/panel`-ə YÖNLƏNDİRMƏ idi (sidebar-da «Analitika»
 * və «Günlük Panel» eyni yerə gedirdi). Heç nə silinmir — ölü stub real
 * səhifəyə çevrilir; Günlük Panel-ə keçid səhifənin başında qalır.
 *
 * Aqreqasiya SQL-də edilir: 36 975 sətri brauzerə daşımaq mənasızdır.
 */

const MONTH = /^\d{4}-\d{2}$/
type Row = Record<string, unknown>
const rowsOf = (r: unknown): Row[] => (Array.isArray(r) ? r : (r as { rows?: Row[] })?.rows ?? []) as Row[]
const n = (v: unknown) => Number(v ?? 0)
const s = (v: unknown) => String(v ?? '')

export default async function AnalitikaPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(role)) redirect('/dashboard')

  const tenantId = session.user.tenant_id
  const sp = await searchParams
  const wantPeriod = sp?.period && MONTH.test(sp.period) ? sp.period : null

  // ── RBAC ────────────────────────────────────────────────────────────────────
  // super_admin şəbəkəni görür. Digər rollar YALNIZ öz filiallarını; adı
  // uyğunlaşmayan (branch_id boş) sətirlər onlara GÖRÜNMÜR — hansı filiala aid
  // olduğu təsdiqlənməmişdir, ciro sızıntısı olmasın.
  let allowedNames: string[] | null = null
  if (role !== 'super_admin') {
    const ids = await accessibleBranchIds({ id: session.user.id, tenant_id: tenantId, role })
    const brs = ids.length
      ? await db.select({ name: branches.name }).from(branches)
        .where(and(eq(branches.tenant_id, tenantId), inArray(branches.id, ids)))
      : []
    // Fakt cədvəllərində açar `filial` mətnidir; ad müqayisəsi kanonik açarla
    // aparılır (İ/ı tələsi — bax `canonBranchKey`).
    allowedNames = brs.map(b => b.name)
    if (allowedNames.length === 0) {
      return <AnalitikaClient empty="Sizə təyin edilmiş filial yoxdur. Bölgə/filial təyinatı üçün sistem admini ilə əlaqə saxlayın." periods={[]} />
    }
  }

  // Filial süzgəci SQL-ə kanonik açar üzrə verilir (adların yazılışı fərqli
  // ola bilər, ona görə `=` yerinə kanonik siyahı ilə müqayisə edirik).
  const canonAllowed = allowedNames?.map(canonBranchKey) ?? null
  // Postgres tərəfində eyni qatlanmanı təkrar etmirik — filial adlarını əvvəlcə
  // fakt cədvəlindən çəkib JS-də süzürük (filial sayı 30-dur, ucuz).
  const allFilials = rowsOf(await sqlClient.query(
    `select distinct filial from analytics_daily_fact where tenant_id = $1`, [tenantId],
  )).map(r => s(r.filial))
  const scopeFilials = canonAllowed
    ? allFilials.filter(f => canonAllowed.includes(canonBranchKey(f)))
    : allFilials

  if (scopeFilials.length === 0) {
    return <AnalitikaClient empty="Hələ məhsul/çek datası yüklənməyib. Günlük Panel → «Günlük detay» bölməsindən PRODMIX və ÇEK faylını yükləyin." periods={[]} />
  }

  // ── Mövcud dövrlər ─────────────────────────────────────────────────────────
  const periods = rowsOf(await sqlClient.query(
    `select distinct to_char(business_date, 'YYYY-MM') as p
     from analytics_daily_fact where tenant_id = $1 and filial = any($2::text[])
     order by 1 desc`, [tenantId, scopeFilials],
  )).map(r => s(r.p))

  const period = wantPeriod && periods.includes(wantPeriod) ? wantPeriod : periods[0] ?? null
  if (!period) {
    return <AnalitikaClient empty="Bu əhatədə hələ data yoxdur." periods={periods} />
  }
  const from = `${period}-01`
  const to = `${period}-${new Date(+period.slice(0, 4), +period.slice(5, 7), 0).getDate()}`
  const args = [tenantId, scopeFilials, from, to] as const

  // ── Özet (gün cəmi sətri) ──────────────────────────────────────────────────
  const [sum] = rowsOf(await sqlClient.query(
    `select coalesce(sum(amount),0)::float8 amount, coalesce(sum(receipts),0)::int receipts,
            count(distinct business_date)::int days
     from analytics_daily_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and payment_type='__day__'`, [...args],
  ))

  // ── Ödəniş qarışığı ────────────────────────────────────────────────────────
  const pay = rowsOf(await sqlClient.query(
    `select payment_type, sum(amount)::float8 amount
     from analytics_daily_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and payment_type <> '__day__'
     group by 1 order by 2 desc`, [...args],
  )).map(r => ({ kind: s(r.payment_type), amount: n(r.amount) }))

  // ── Məhsullar (yalnız `product` — gəlir gətirən sətirlər) ───────────────────
  // Qruplaşma `item_name` üzrədir: eyni məhsulun bir neçə kodu ola bilər,
  // menyu qərarı ad səviyyəsində verilir.
  const products = rowsOf(await sqlClient.query(
    `select item_name,
            sum(qty)::float8 qty, sum(amount)::float8 amount,
            count(distinct filial)::int branches,
            count(distinct item_code)::int codes
     from analytics_item_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and line_kind='product'
     group by 1 order by 3 desc`, [...args],
  )).map(r => ({
    name: s(r.item_name), qty: n(r.qty), amount: n(r.amount),
    branches: n(r.branches), codes: n(r.codes),
  }))

  // ── Gəlir gətirməyən sətirlər — silinmir, ayrıca göstərilir ─────────────────
  const nonRevenue = rowsOf(await sqlClient.query(
    `select line_kind, sum(qty)::float8 qty, count(distinct item_name)::int items
     from analytics_item_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and line_kind<>'product'
     group by 1 order by 2 desc`, [...args],
  )).map(r => ({ kind: s(r.line_kind), qty: n(r.qty), items: n(r.items) }))

  // ── Filiallar: ciro, çek, ort. çek, delivery payı ───────────────────────────
  const branchRows = rowsOf(await sqlClient.query(
    `with d as (
       select filial,
              sum(case when payment_type='__day__' then amount else 0 end)::float8 amount,
              sum(case when payment_type='__day__' then receipts else 0 end)::int receipts,
              sum(case when payment_type in ('wolt','bolt','own_delivery') then amount else 0 end)::float8 delivery
       from analytics_daily_fact
       where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       group by 1
     )
     select * from d order by amount desc`, [...args],
  )).map(r => ({
    filial: s(r.filial), amount: n(r.amount), receipts: n(r.receipts), delivery: n(r.delivery),
  }))

  // ── UPSELL FIRSATI: çek başına ədəd (attach rate) filial vs şəbəkə ──────────
  // Menyu mühəndisliyinin ən dəyərli çıxışı: yüksək cirolu məhsulu şəbəkə
  // ortalamasından AŞAĞI satan filial. «Nə qədər pul qalır» sualının cavabı.
  const TOP_N = 8
  const topNames = products.slice(0, TOP_N).map(p => p.name)
  const attach = topNames.length ? rowsOf(await sqlClient.query(
    `select filial, item_name, sum(qty)::float8 qty
     from analytics_item_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and line_kind='product' and item_name = any($5::text[])
     group by 1,2`, [...args, topNames],
  )).map(r => ({ filial: s(r.filial), name: s(r.item_name), qty: n(r.qty) })) : []

  // ── Günlük seriya (qrafik) ─────────────────────────────────────────────────
  const daily = rowsOf(await sqlClient.query(
    `select business_date::text d,
            sum(amount)::float8 amount, sum(receipts)::int receipts
     from analytics_daily_fact
     where tenant_id=$1 and filial=any($2::text[]) and business_date between $3 and $4
       and payment_type='__day__'
     group by 1 order by 1`, [...args],
  )).map(r => ({ date: s(r.d), amount: n(r.amount), receipts: n(r.receipts) }))

  return (
    <AnalitikaClient
      period={period}
      periods={periods}
      summary={{ amount: n(sum?.amount), receipts: n(sum?.receipts), days: n(sum?.days) }}
      pay={pay}
      products={products}
      nonRevenue={nonRevenue}
      branchRows={branchRows}
      attach={attach}
      topNames={topNames}
      daily={daily}
      isNetwork={role === 'super_admin'}
    />
  )
}
