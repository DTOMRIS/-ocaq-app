import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { openings, opening_tasks } from '@/db/schema/acilis'
import AcilisClient, { type AcilisSatir } from './acilis-client'

export const metadata = { title: 'Açılış Takibi — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function AcilisPage() {
  const session = await auth()
  if (!session) redirect('/login')

  let rows: AcilisSatir[] = []
  try {
    const ops = await db.select().from(openings)
      .where(eq(openings.tenant_id, session.user.tenant_id))
      .orderBy(desc(openings.planned_open_date))

    // Vəzifə sayğacları — bir sorğuda, açılış üzrə qruplaşdırılmış
    const say = await db.select({
      opening_id: opening_tasks.opening_id,
      hamisi: sql<number>`count(*)::int`,
      bitdi: sql<number>`count(*) filter (where ${opening_tasks.status} = 'bitdi')::int`,
      gecikdi: sql<number>`count(*) filter (where ${opening_tasks.status} <> 'bitdi'
        and ${opening_tasks.status} <> 'tetbiq_olunmur'
        and ${opening_tasks.due_date} is not null
        and ${opening_tasks.due_date} < current_date)::int`,
    }).from(opening_tasks)
      .where(eq(opening_tasks.tenant_id, session.user.tenant_id))
      .groupBy(opening_tasks.opening_id)
    const m = new Map(say.map(s => [s.opening_id, s]))

    rows = ops.map(o => {
      const s = m.get(o.id)
      return {
        id: o.id, name: o.name, address: o.address, zone: o.zone,
        format: o.format, gate: o.gate, status: o.status,
        plannedOpenDate: o.planned_open_date,
        m2Inside: o.m2_inside, hasTerrace: o.has_terrace, hasSeating: o.has_seating,
        total: s?.hamisi ?? 0, done: s?.bitdi ?? 0, late: s?.gecikdi ?? 0,
      }
    })
  } catch { rows = [] }   // cədvəl hələ yoxdursa boş göstər (500 vermə)

  return <AcilisClient rows={rows} canManage={session.user.role === 'super_admin'} />
}
