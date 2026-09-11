import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { and, eq, ne, asc } from 'drizzle-orm'
import { db } from '@/db'
import { openings, opening_orders } from '@/db/schema/acilis'
import CapDugmesi from './cap-dugmesi'

export const metadata = { title: 'Sifariş siyahısı — çap' }
export const dynamic = 'force-dynamic'

/**
 * Çap / PDF görünüşü.
 *
 * NİYƏ PDF KİTABXANASI YOX: brauzerin «PDF olaraq saxla» funksiyası kifayətdir
 * və nəticə hər cihazda eyni açılır. Server tərəfdə PDF yaratmaq bir asılılıq,
 * bir şrift problemi və bir «ə hərfi çıxmır» xətası deməkdir.
 *
 * «lazım deyil» sətirləri çıxarılır — kağıza basılan siyahı sifariş sənədidir.
 */
export default async function SifarisCapPage(
  { params, searchParams }: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ dept?: string }>
  },
) {
  const session = await auth()
  if (!session) redirect('/login')
  const { id } = await params
  const sp = await searchParams

  const [op] = await db.select().from(openings)
    .where(and(eq(openings.id, id), eq(openings.tenant_id, session.user.tenant_id))).limit(1)
  if (!op) notFound()

  const rows = (await db.select().from(opening_orders)
    .where(and(eq(opening_orders.opening_id, id), ne(opening_orders.status, 'lazim_deyil')))
    .orderBy(asc(opening_orders.kat), asc(opening_orders.ad)))
    .filter(r => !sp?.dept || r.dept === sp.dept)

  const katlar = [...new Set(rows.map(r => r.kat))]
  const say = (v: string | null) => {
    if (v == null) return '—'
    const n = Number(v)
    return Number.isFinite(n) ? String(n) : v
  }
  const olcu = [
    op.table_count != null && `${op.table_count} masa`,
    op.seats != null && `${op.seats} oturacaq`,
    op.counter_len_m != null && `${Number(op.counter_len_m)} m banko`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-[820px] p-6 print:p-0 text-slate-900">
      <style>{`@media print {
        .gizle-cap { display: none !important }
        body { background: #fff }
        table { page-break-inside: auto }
        tr { page-break-inside: avoid }
        thead { display: table-header-group }
      }`}</style>

      <div className="gizle-cap mb-4 flex items-center gap-2">
        <CapDugmesi />
        <span className="text-xs text-slate-500">
          Çap pəncərəsində «Hədəf → PDF olaraq saxla» seçin.
        </span>
      </div>

      <h1 className="text-2xl font-bold">Yeni filial sifarişi — {op.name}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {[
          sp?.dept,
          op.planned_open_date && `planlanan açılış ${new Date(op.planned_open_date).toLocaleDateString('az-AZ')}`,
          olcu,
          `${rows.length} sətir`,
        ].filter(Boolean).join(' · ')}
      </p>

      {rows.some(r => r.qty == null) && (
        <p className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Diqqət: {rows.filter(r => r.qty == null).length} sətrin miqdarı boşdur — ölçü girilməyib.
        </p>
      )}

      {katlar.map(k => (
        <section key={k} className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {k} · {rows.filter(r => r.kat === k).length} sətir
          </h2>
          <table className="mt-1.5 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left">
                <th className="py-1.5 font-semibold">Məhsul</th>
                <th className="py-1.5 text-right font-semibold">Miqdar</th>
                <th className="py-1.5 pl-2 font-semibold">Vahid</th>
                <th className="py-1.5 pl-2 font-semibold">Departament</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter(r => r.kat === k).map(r => (
                <tr key={r.id} className="border-b border-slate-200">
                  <td className="py-1">{r.ad}
                    {r.qeyd && <span className="block text-xs text-slate-500">{r.qeyd}</span>}
                  </td>
                  <td className={`py-1 text-right font-mono tabular-nums ${r.qty == null ? 'text-rose-600' : ''}`}>
                    {say(r.qty)}
                  </td>
                  <td className="py-1 pl-2 text-xs text-slate-600">{r.vahid}</td>
                  <td className="py-1 pl-2 text-xs text-slate-600">{r.dept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <p className="mt-8 text-xs text-slate-400">
        OCAQ · {new Date().toLocaleDateString('az-AZ')} · {session.user.email}
      </p>
    </div>
  )
}
