import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { notification_recipients, notifications } from '@/db/schema/operations'
import { AudienceSelection, resolveAudience } from '@/lib/message-audience'

const TYPES = new Set(['urgent', 'info', 'task', 'promo'])

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  const mode = req.nextUrl.searchParams.get('mode') === 'sent' ? 'sent' : 'inbox'

  if (mode === 'sent') {
    if (session.user.role === 'staff') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
    const sent = await db.select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      audience: notifications.audience,
      audience_ref: notifications.audience_ref,
      requires_acknowledgement: notifications.requires_acknowledgement,
      created_at: notifications.created_at,
      recipient_count: sql<number>`count(${notification_recipients.id})::int`,
      read_count: sql<number>`count(${notification_recipients.read_at})::int`,
      acknowledged_count: sql<number>`count(${notification_recipients.acknowledged_at})::int`,
    }).from(notifications).leftJoin(notification_recipients, eq(notification_recipients.notification_id, notifications.id)).where(and(
      eq(notifications.tenant_id, session.user.tenant_id),
      eq(notifications.sender_id, session.user.id),
    )).groupBy(notifications.id).orderBy(desc(notifications.created_at)).limit(100)
    return NextResponse.json(sent)
  }

  const inbox = await db.select({
    id: notifications.id,
    receipt_id: notification_recipients.id,
    type: notifications.type,
    title: notifications.title,
    message: notifications.message,
    requires_acknowledgement: notifications.requires_acknowledgement,
    created_at: notifications.created_at,
    read_at: notification_recipients.read_at,
    acknowledged_at: notification_recipients.acknowledged_at,
    sender_name: users.name,
  }).from(notification_recipients).innerJoin(notifications, eq(notifications.id, notification_recipients.notification_id)).innerJoin(users, eq(users.id, notifications.sender_id)).where(and(
    eq(notification_recipients.tenant_id, session.user.tenant_id),
    eq(notification_recipients.user_id, session.user.id),
  )).orderBy(desc(notification_recipients.created_at)).limit(100)
  return NextResponse.json(inbox)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const title = cleanText(body?.title, 160)
  const message = cleanText(body?.message, 5000)
  const type = typeof body?.type === 'string' && TYPES.has(body.type) ? body.type as 'urgent' | 'info' | 'task' | 'promo' : 'info'
  const idempotencyKey = cleanText(body?.idempotency_key, 160)
  const audience = parseAudience(body?.audience)
  if (!title || !message || !idempotencyKey || !audience) {
    return NextResponse.json({ error: 'Başlıq, mətn, alıcı və əməliyyat açarı tələb olunur' }, { status: 400 })
  }

  const existing = await db.select({ id: notifications.id }).from(notifications).where(and(
    eq(notifications.tenant_id, session.user.tenant_id),
    eq(notifications.idempotency_key, idempotencyKey),
  )).limit(1)
  if (existing.length) return NextResponse.json({ id: existing[0].id, duplicate: true })

  let recipientIds: string[]
  try {
    recipientIds = await resolveAudience(
      { id: session.user.id, tenant_id: session.user.tenant_id, role: session.user.role },
      audience,
    )
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: code === 'FORBIDDEN' ? 'Bu auditoriyaya göndərmək icazəniz yoxdur' : 'Alıcı seçimi düzgün deyil' }, { status: code === 'FORBIDDEN' ? 403 : 400 })
  }
  recipientIds = [...new Set(recipientIds)]
  if (!recipientIds.length) return NextResponse.json({ error: 'Seçilmiş auditoriyada aktiv alıcı yoxdur' }, { status: 400 })

  let createdId: string | null = null
  try {
    const [created] = await db.insert(notifications).values({
      tenant_id: session.user.tenant_id,
      sender_id: session.user.id,
      type,
      title,
      message,
      audience: audience.kind,
      audience_ref: audience.kind === 'selected' ? null : audience.value ?? null,
      requires_acknowledgement: body?.requires_acknowledgement === true,
      idempotency_key: idempotencyKey,
    }).returning({ id: notifications.id })
    createdId = created.id
    await db.insert(notification_recipients).values(recipientIds.map((userId) => ({
      notification_id: created.id,
      tenant_id: session.user.tenant_id,
      user_id: userId,
    })))
    return NextResponse.json({ id: created.id, recipient_count: recipientIds.length }, { status: 201 })
  } catch (error) {
    if (createdId) await db.delete(notifications).where(and(eq(notifications.id, createdId), eq(notifications.tenant_id, session.user.tenant_id))).catch(() => undefined)
    if (isUniqueViolation(error)) {
      const duplicate = await db.select({ id: notifications.id }).from(notifications).where(and(
        eq(notifications.tenant_id, session.user.tenant_id),
        eq(notifications.idempotency_key, idempotencyKey),
      )).limit(1)
      if (duplicate.length) return NextResponse.json({ id: duplicate[0].id, duplicate: true })
    }
    console.error('Notification send error:', error)
    return NextResponse.json({ error: 'Bildiriş göndərilə bilmədi' }, { status: 500 })
  }
}

function parseAudience(value: unknown): AudienceSelection | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (!['all', 'role', 'region', 'branch', 'selected'].includes(String(item.kind))) return null
  return {
    kind: item.kind as AudienceSelection['kind'],
    value: typeof item.value === 'string' ? item.value : undefined,
    user_ids: Array.isArray(item.user_ids) ? item.user_ids.filter((id): id is string => typeof id === 'string') : undefined,
  }
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
