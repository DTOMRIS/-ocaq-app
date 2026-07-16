import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { invitations, audit_logs } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { and, eq, isNull } from 'drizzle-orm'
import { sendInvitationEmail } from '@/lib/email'
import { canManageInvitation } from '../_scope'
import crypto from 'crypto'

async function invitationForActor(id: string, tenantId: string) {
  const [invitation] = await db.select().from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.tenant_id, tenantId)))
    .limit(1)
  return invitation
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const invitation = await invitationForActor(id, session.user.tenant_id)
  if (!invitation) return NextResponse.json({ error: 'Dəvət tapılmadı' }, { status: 404 })
  if (!await canManageInvitation(session.user, invitation)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'Qəbul edilmiş dəvət yenidən göndərilə bilməz' }, { status: 409 })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const [rotated] = await db.update(invitations).set({ token, expires_at: expiresAt })
    .where(and(eq(invitations.id, id), isNull(invitations.accepted_at)))
    .returning({ id: invitations.id })
  if (!rotated) {
    return NextResponse.json({ error: 'Dəvət artıq qəbul edilib' }, { status: 409 })
  }

  let branchName: string | undefined
  if (invitation.branch_id) {
    const [branch] = await db.select({ name: branches.name }).from(branches)
      .where(and(
        eq(branches.id, invitation.branch_id),
        eq(branches.tenant_id, session.user.tenant_id),
      )).limit(1)
    branchName = branch?.name
  }

  const { error } = await sendInvitationEmail({
    email: invitation.email,
    token,
    inviterName: session.user.name ?? 'Admin',
    recipientRole: invitation.role,
    branchName,
  })
  if (error) {
    await db.update(invitations).set({ token: invitation.token, expires_at: invitation.expires_at })
      .where(and(eq(invitations.id, id), eq(invitations.token, token)))
    console.error('Invitation resend mail error:', error)
    return NextResponse.json({ error: 'Dəvət e-poçtu göndərilə bilmədi' }, { status: 502 })
  }

  await db.insert(audit_logs).values({
    tenant_id: session.user.tenant_id,
    user_id: session.user.id,
    action: 'user.invite.resend',
    entity: 'invitation',
    entity_id: id,
  })
  return NextResponse.json({ success: true, expires_at: expiresAt })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const invitation = await invitationForActor(id, session.user.tenant_id)
  if (!invitation) return NextResponse.json({ error: 'Dəvət tapılmadı' }, { status: 404 })
  if (!await canManageInvitation(session.user, invitation)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'Qəbul edilmiş dəvət ləğv edilə bilməz' }, { status: 409 })
  }

  await db.delete(invitations).where(and(
    eq(invitations.id, id),
    eq(invitations.tenant_id, session.user.tenant_id),
    isNull(invitations.accepted_at),
  ))
  await db.insert(audit_logs).values({
    tenant_id: session.user.tenant_id,
    user_id: session.user.id,
    action: 'user.invite.cancel',
    entity: 'invitation',
    entity_id: id,
  })
  return NextResponse.json({ success: true })
}
