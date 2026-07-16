import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { shift_briefings, shift_customer_conversations } from '@/db/schema/operations'
import { accessibleBranchIds } from '@/lib/message-audience'

type Context = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, context: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const { id } = await context.params
  const [briefing] = await db.select().from(shift_briefings).where(and(
    eq(shift_briefings.id, id),
    eq(shift_briefings.tenant_id, session.user.tenant_id),
  )).limit(1)
  if (!briefing) return NextResponse.json({ error: 'Toplantı tapılmadı' }, { status: 404 })
  const branches = await accessibleBranchIds({ id: session.user.id, tenant_id: session.user.tenant_id, role: session.user.role })
  if (!branches.includes(briefing.branch_id)) return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  if (briefing.status === 'completed') return NextResponse.json({ error: 'Tamamlanmış toplantı dəyişdirilə bilməz' }, { status: 409 })

  const body = await req.json().catch(() => null) as { notes?: unknown } | null
  if (!Array.isArray(body?.notes) || body.notes.length !== 5) {
    return NextResponse.json({ error: 'Tam olaraq 5 müştəri qeydi göndərilməlidir' }, { status: 400 })
  }
  const notes = body.notes.map((note) => typeof note === 'string' ? note.trim().slice(0, 1500) : '')

  try {
    await db.delete(shift_customer_conversations).where(and(
      eq(shift_customer_conversations.briefing_id, id),
      eq(shift_customer_conversations.tenant_id, session.user.tenant_id),
    ))
    const values = notes.map((note, index) => ({
      briefing_id: id,
      tenant_id: session.user.tenant_id,
      sequence: index + 1,
      note,
      created_by: session.user.id,
    })).filter((item) => item.note)
    const saved = values.length ? await db.insert(shift_customer_conversations).values(values).returning() : []
    await db.update(shift_briefings).set({ updated_at: new Date() }).where(eq(shift_briefings.id, id))
    return NextResponse.json(saved)
  } catch (error) {
    console.error('Customer conversation save error:', error)
    return NextResponse.json({ error: 'Müştəri qeydləri saxlanmadı' }, { status: 500 })
  }
}
