import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { notification_recipients, notifications } from '@/db/schema/operations'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (session.user.role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const { id } = await context.params
  const body = await req.json().catch(() => null) as { action?: unknown } | null
  if (body?.action !== 'read' && body?.action !== 'acknowledge') {
    return NextResponse.json({ error: 'Əməliyyat düzgün deyil' }, { status: 400 })
  }

  const [receipt] = await db.select({
    id: notification_recipients.id,
    requires_acknowledgement: notifications.requires_acknowledgement,
  }).from(notification_recipients).innerJoin(notifications, and(
    eq(notifications.id, notification_recipients.notification_id),
    eq(notifications.tenant_id, session.user.tenant_id),
  )).where(and(
    eq(notification_recipients.notification_id, id),
    eq(notification_recipients.tenant_id, session.user.tenant_id),
    eq(notification_recipients.user_id, session.user.id),
  )).limit(1)
  if (!receipt) return NextResponse.json({ error: 'Bildiriş tapılmadı' }, { status: 404 })
  if (body.action === 'acknowledge' && !receipt.requires_acknowledgement) {
    return NextResponse.json({ error: 'Bu bildiriş təsdiq tələb etmir' }, { status: 400 })
  }

  const now = new Date()
  const [updated] = await db.update(notification_recipients).set(body.action === 'read'
    ? { read_at: now }
    : { read_at: now, acknowledged_at: now }
  ).where(and(
    eq(notification_recipients.id, receipt.id),
    eq(notification_recipients.tenant_id, session.user.tenant_id),
    eq(notification_recipients.user_id, session.user.id),
  )).returning()
  return NextResponse.json(updated)
}
