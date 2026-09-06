import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { and, eq, asc, desc } from 'drizzle-orm'
import { db } from '@/db'
import { openings, opening_tasks, opening_files } from '@/db/schema/acilis'
import { createFileDownloadUrl } from '@/lib/r2'
import DetayClient, { type Vezife, type Layihe } from './detay-client'
import { type Fayl } from './fayllar'

export const metadata = { title: 'Açılış detayı — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function AcilisDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  const { id } = await params

  const [op] = await db.select().from(openings)
    .where(and(eq(openings.id, id), eq(openings.tenant_id, session.user.tenant_id))).limit(1)
  if (!op) notFound()

  const rows = await db.select().from(opening_tasks)
    .where(eq(opening_tasks.opening_id, id))
    .orderBy(asc(opening_tasks.gate), asc(opening_tasks.due_date), asc(opening_tasks.dept))

  const layihe: Layihe = {
    id: op.id, name: op.name, address: op.address, zone: op.zone, format: op.format,
    gate: op.gate, status: op.status, plannedOpenDate: op.planned_open_date,
    m2Inside: op.m2_inside, m2Terrace: op.m2_terrace, m2Garden: op.m2_garden, seats: op.seats,
    hasTerrace: op.has_terrace, hasGarden: op.has_garden, hasSeating: op.has_seating,
    hasPizza: op.has_pizza, hasDelivery: op.has_delivery, hasGas: op.has_gas,
    hasGenerator: op.has_generator, wasCafe: op.was_cafe, decisionNote: op.decision_note,
  }
  // Fayllar serverdə oxunur — brauzerdə effekt ilə çəkmək kaskad render yaradır
  // və siyahı bir anlıq boş görünür. Endirmə linki 5 dəqiqəlikdir, səhifə
  // yenilənəndə təzələnir.
  let fayllar: Fayl[] = []
  try {
    const fs = await db.select().from(opening_files)
      .where(eq(opening_files.opening_id, id)).orderBy(desc(opening_files.created_at))
    fayllar = await Promise.all(fs.map(async f => ({
      id: f.id, kind: f.kind, fileName: f.file_name, mime: f.mime, size: f.size,
      note: f.note, createdAt: f.created_at.toISOString(),
      url: await createFileDownloadUrl(f.r2_key, f.file_name).catch(() => null),
    })))
  } catch { fayllar = [] }   // R2 və ya cədvəl yoxdursa səhifə sınmasın

  const vezifeler: Vezife[] = rows.map(r => ({
    id: r.id, gate: r.gate, dept: r.dept, task: r.task, note: r.note, cond: r.cond,
    dueDate: r.due_date, status: r.status, comment: r.comment,
  }))

  return <DetayClient layihe={layihe} vezifeler={vezifeler} fayllar={fayllar}
                      canManage={session.user.role === 'super_admin'} />
}
