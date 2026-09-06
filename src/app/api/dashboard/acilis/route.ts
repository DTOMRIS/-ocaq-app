import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { openings, opening_tasks } from '@/db/schema/acilis'
import { vezifeYarat, type AcilisProfil, type AcilisFormat } from '@/lib/acilis/template'

export const runtime = 'nodejs'

const FORMATLAR: AcilisFormat[] = ['kuce', 'mall', 'flagship', 'kiosk']

/** Yeni açılış layihəsi + profilə görə vəzifələr. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  try {
    const b = await req.json() as Record<string, unknown>
    const name = String(b.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Filial adı lazımdır' }, { status: 400 })

    const planned = String(b.planned_open_date ?? '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planned)) {
      return NextResponse.json({ error: 'Açılış tarixi lazımdır (bütün geri sayım ondan hesablanır)' }, { status: 400 })
    }
    const format = FORMATLAR.includes(b.format as AcilisFormat) ? (b.format as AcilisFormat) : 'kuce'
    const bool = (k: string, d = false) => (typeof b[k] === 'boolean' ? b[k] as boolean : d)
    const num = (k: string) => (b[k] === '' || b[k] == null ? null : String(Number(b[k])))

    const profil: AcilisProfil = {
      format,
      teras: bool('has_terrace'), bagca: bool('has_garden'),
      oturma: bool('has_seating', true), pizza: bool('has_pizza', true),
      catdirilma: bool('has_delivery', true), qaz: bool('has_gas'),
      generator: bool('has_generator'),
      kofe: bool('has_coffee', true), cok_kat: bool('multi_floor'),
      bar: bool('has_bar'), birlesme: bool('is_merge'), park_ici: bool('in_park'),
    }
    const tenantId = session.user.tenant_id

    const [op] = await db.insert(openings).values({
      tenant_id: tenantId, name,
      address: (String(b.address ?? '').trim() || null),
      zone: (String(b.zone ?? '').trim() || null),
      format,
      m2_inside: num('m2_inside'), m2_terrace: num('m2_terrace'), m2_garden: num('m2_garden'),
      seats: b.seats ? Number(b.seats) : null,
      has_terrace: profil.teras, has_garden: profil.bagca, has_seating: profil.oturma,
      has_pizza: profil.pizza, has_delivery: profil.catdirilma, has_gas: profil.qaz,
      has_generator: profil.generator, was_cafe: bool('was_cafe'),
      has_coffee: profil.kofe, multi_floor: profil.cok_kat, has_bar: profil.bar,
      is_merge: profil.birlesme, in_park: profil.park_ici,
      planned_open_date: planned,
      created_by: session.user.id,
    }).returning({ id: openings.id })

    // Vəzifələr şablondan KOPYALANIR — şablon sonradan dəyişsə bu siyahı dəyişməz.
    const vez = vezifeYarat(profil, planned)
    if (vez.length) {
      await db.insert(opening_tasks).values(vez.map(v => ({
        tenant_id: tenantId, opening_id: op.id,
        gate: v.gate, dept: v.dept, task: v.task, note: v.note, cond: v.cond,
        offset_days: v.offset, due_date: v.due,
      }))).onConflictDoNothing()
    }
    return NextResponse.json({ ok: true, id: op.id, tasks: vez.length })
  } catch (e) {
    // Xəta udulmur (AGENTS.md) — istifadəçi səbəbi görsün
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}

/** Qapı və ya status yeniləmə. */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  try {
    const b = await req.json() as { id?: string; gate?: string; status?: string; decision_note?: string }
    if (!b.id) return NextResponse.json({ error: 'id lazımdır' }, { status: 400 })
    const patch: Record<string, unknown> = { updated_at: new Date() }
    if (b.gate) patch.gate = b.gate
    if (b.status) patch.status = b.status
    if (b.decision_note !== undefined) patch.decision_note = b.decision_note
    await db.update(openings).set(patch)
      .where(and(eq(openings.id, b.id), eq(openings.tenant_id, session.user.tenant_id)))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
