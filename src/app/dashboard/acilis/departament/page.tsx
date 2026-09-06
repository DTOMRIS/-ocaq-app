import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, and, ne } from 'drizzle-orm'
import { db } from '@/db'
import { openings, opening_tasks } from '@/db/schema/acilis'
import { avadanliqSiyahisi, type AcilisProfil, type AcilisFormat } from '@/lib/acilis/template'
import DeptClient, { type DeptSetir, type AvadSetir } from './dept-client'

export const metadata = { title: 'Departament siyahısı — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function DepartamentPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const tenantId = session.user.tenant_id

  let setirler: DeptSetir[] = []
  let avadanliq: AvadSetir[] = []

  try {
    // Yalnız DAVAM EDƏN açılışlar — bağlananın siyahısı iş yükü deyil
    const ops = await db.select().from(openings)
      .where(and(eq(openings.tenant_id, tenantId), ne(openings.status, 'dayandirildi')))

    const aktiv = ops.filter(o => o.status !== 'acildi')
    const opMap = new Map(ops.map(o => [o.id, o]))

    const tasks = await db.select().from(opening_tasks)
      .where(eq(opening_tasks.tenant_id, tenantId))

    setirler = tasks
      .filter(t => opMap.has(t.opening_id))
      .map(t => {
        const o = opMap.get(t.opening_id)!
        return {
          id: t.id, openingId: o.id, opening: o.name,
          openDate: o.planned_open_date,
          gate: t.gate, dept: t.dept, task: t.task, note: t.note, cond: t.cond,
          dueDate: t.due_date, status: t.status,
        }
      })

    // ── KONSOLİDƏ AVADANLIQ ─────────────────────────────────────────────────
    // Hər açılışın profilinə uyğun siyahı çıxarılır, sonra TOPLANIR.
    // Satın Alma beş ayrı siyahı deyil, BİR sifariş siyahısı istəyir.
    const topla = new Map<string, AvadSetir>()
    for (const o of aktiv) {
      const p: AcilisProfil = {
        format: o.format as AcilisFormat,
        teras: o.has_terrace, bagca: o.has_garden, oturma: o.has_seating,
        pizza: o.has_pizza, catdirilma: o.has_delivery, qaz: o.has_gas,
        generator: o.has_generator, kofe: o.has_coffee, cok_kat: o.multi_floor,
        bar: o.has_bar, birlesme: o.is_merge, park_ici: o.in_park,
      }
      for (const a of avadanliqSiyahisi(p)) {
        const key = `${a.kat}|${a.ad}`
        const e = topla.get(key) ?? { kat: a.kat, ad: a.ad, filiallar: [], sayPerFilial: a.say }
        e.filiallar.push(o.name)
        topla.set(key, e)
      }
    }
    avadanliq = [...topla.values()].sort((a, b) =>
      a.kat.localeCompare(b.kat) || a.ad.localeCompare(b.ad))
  } catch { setirler = []; avadanliq = [] }

  return <DeptClient setirler={setirler} avadanliq={avadanliq} />
}
