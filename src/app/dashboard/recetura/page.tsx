import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { sqlClient } from '@/db'
import ReceturaClient, { type MaterialUse, type ProductRow } from './recetura-client'

export const metadata = { title: 'Reçetura — OCAQ' }
export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>
const rowsOf = (r: unknown): Row[] => (Array.isArray(r) ? r : (r as { rows?: Row[] })?.rows ?? []) as Row[]
const n = (v: unknown) => Number(v ?? 0)
const s = (v: unknown) => String(v ?? '')

/**
 * REÇETURA — «nə qədər olmalıydı» ekranı.
 *
 * Bir sual verir: satılan məhsullara görə hansı xammaldan NƏ QƏDƏR getməliydi?
 * Ət üçün bu hesab artıq aparılıb (32 788 kq gəlib, reçetura 16 022 kq deyir).
 * Burada eyni hesab BÜTÜN 242 xammala genişlənir.
 *
 * Faktiki istifadə ilə tutuşdurma anbar qalıqları gələndə tam olur; hələlik
 * ekran «tələb olunan miqdar»ı verir — sifariş planlaması üçün onsuz da lazımdır.
 */
export default async function ReceturaPage({ searchParams }:
  { searchParams: Promise<{ period?: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['super_admin', 'region_manager'].includes(session.user.role)) redirect('/dashboard')
  const tenantId = session.user.tenant_id
  const sp = await searchParams

  let empty: string | null = null
  let periods: string[] = []
  let period: string | null = null
  let products: ProductRow[] = []
  let materials: MaterialUse[] = []
  const stats = { products: 0, materials: 0, semi: 0, covered: 0, soldItems: 0, coveredAmount: 0, totalAmount: 0 }

  try {
    const [cnt] = rowsOf(await sqlClient.query(
      `select count(*)::int n, count(distinct product)::int p, count(distinct material)::int m,
              count(*) filter (where is_semi)::int semi
       from recipe_lines where tenant_id = $1`, [tenantId],
    ))
    if (!n(cnt?.n)) {
      return <ReceturaClient empty="Reçetura hələ yüklənməyib. Günlük Panel → «Tərkiblər.xlsx» faylını yükləyin." />
    }
    stats.products = n(cnt?.p); stats.materials = n(cnt?.m); stats.semi = n(cnt?.semi)

    periods = rowsOf(await sqlClient.query(
      `select distinct to_char(business_date,'YYYY-MM') p from analytics_item_fact
       where tenant_id=$1 order by 1 desc`, [tenantId],
    )).map(r => s(r.p))
    period = sp.period && periods.includes(sp.period) ? sp.period : periods[0] ?? null
    if (!period) {
      return <ReceturaClient empty="Məhsul satışı yüklənməyib — tələb olunan miqdar hesablana bilmir." />
    }
    const from = `${period}-01`
    const to = `${period}-${new Date(+period.slice(0, 4), +period.slice(5, 7), 0).getDate()}`

    // ── Reçeturası OLAN / OLMAYAN məhsullar ─────────────────────────────────
    // Örtüşmə DÜRÜST göstərilir: 46 məhsulun reçeturası yoxdur (kombo/set),
    // onların xammalı hesaba GİRMİR və bu, ekranda yazılır.
    const prod = rowsOf(await sqlClient.query(
      `with sold as (
         select item_name, sum(qty)::float8 qty, sum(amount)::float8 amount
         from analytics_item_fact
         where tenant_id=$1 and business_date between $2 and $3 and line_kind='product'
         group by 1
       )
       select s.item_name, s.qty, s.amount,
              (exists (select 1 from recipe_lines r
                       where r.tenant_id=$1 and r.product = s.item_name))::boolean has_recipe
       from sold s order by s.amount desc`, [tenantId, from, to],
    )).map(r => ({ item: s(r.item_name), qty: n(r.qty), amount: n(r.amount), hasRecipe: !!r.has_recipe }))
    products = prod
    stats.soldItems = prod.length
    stats.covered = prod.filter(p => p.hasRecipe).length
    stats.totalAmount = prod.reduce((a, p) => a + p.amount, 0)
    stats.coveredAmount = prod.filter(p => p.hasRecipe).reduce((a, p) => a + p.amount, 0)

    // ── TƏLƏB OLUNAN XAMMAL ─────────────────────────────────────────────────
    // satılan ədəd × norma. Yarım mamullar AÇILMIR (bu sorğuda) — onlar ayrıca
    // xammal kimi görünür; açılma UI-da göstərilir.
    materials = rowsOf(await sqlClient.query(
      `select r.material, r.unit,
              sum(r.norm * s.qty)::float8 need,
              count(distinct r.product)::int in_products,
              bool_or(r.is_semi) is_semi
       from recipe_lines r
       join (
         select item_name, sum(qty)::float8 qty
         from analytics_item_fact
         where tenant_id=$1 and business_date between $2 and $3 and line_kind='product'
         group by 1
       ) s on s.item_name = r.product
       where r.tenant_id=$1
       group by 1,2 order by 3 desc`, [tenantId, from, to],
    )).map(r => ({
      material: s(r.material), unit: s(r.unit), need: n(r.need),
      inProducts: n(r.in_products), isSemi: !!r.is_semi,
    }))
  } catch (e) {
    // Cədvəl hələ yaradılmayıbsa (migration 0020) səhifə AÇILMAĞA DAVAM EDİR
    empty = e instanceof Error && /recipe_lines/.test(e.message)
      ? 'Reçetura cədvəli hələ qurulmayıb (migration 0020).'
      : 'Reçetura oxunmadı.'
  }

  if (empty) return <ReceturaClient empty={empty} />
  return <ReceturaClient period={period} periods={periods}
                         products={products} materials={materials} stats={stats} />
}
