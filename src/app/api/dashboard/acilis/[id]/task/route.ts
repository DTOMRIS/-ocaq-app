import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { opening_tasks } from '@/db/schema/acilis'

export const runtime = 'nodejs'

const STATUSLAR = ['gozleyir', 'davam_edir', 'bitdi', 'gecikdi', 'tetbiq_olunmur']

/** Vəzifə statusu/qeydi. Departament öz sətrini bağlayır. */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const b = await req.json() as { taskId?: string; status?: string; comment?: string }
    if (!b.taskId) return NextResponse.json({ error: 'taskId lazımdır' }, { status: 400 })
    if (b.status && !STATUSLAR.includes(b.status)) {
      return NextResponse.json({ error: 'Naməlum status' }, { status: 400 })
    }
    const patch: Record<string, unknown> = { updated_at: new Date() }
    if (b.status) {
      patch.status = b.status
      // «bitdi» olduqda kim/nə vaxt yazılır — sonra mütləq soruşulur
      patch.completed_at = b.status === 'bitdi' ? new Date() : null
      patch.completed_by = b.status === 'bitdi' ? session.user.id : null
    }
    if (b.comment !== undefined) patch.comment = b.comment
    await db.update(opening_tasks).set(patch)
      .where(and(eq(opening_tasks.id, b.taskId), eq(opening_tasks.tenant_id, session.user.tenant_id)))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
