import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { invitations, audit_logs } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { and, eq, isNull, sql, type SQL } from 'drizzle-orm'
import { sendInvitationEmail } from '@/lib/email'
import { canManageInvitation } from '../_scope'
import { createOneTimeToken, hashOneTimeToken } from '@/lib/one-time-token'
import { isBranchManagerInvitation, managerScopeMatches } from '../_contract'

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
  if (invitation.revoked_at) {
    return NextResponse.json({ error: 'Ləğv edilmiş dəvət yenidən göndərilə bilməz' }, { status: 409 })
  }
  if (!['branch_manager', 'region_manager'].includes(invitation.role)) {
    return NextResponse.json(
      { code: 'ROLE_NOT_ALLOWED', error: 'Köhnə əməkdaş dəvəti yenidən göndərilə bilməz' },
      { status: 410 },
    )
  }

  if (isBranchManagerInvitation(invitation.role)) {
    if (!invitation.branch_id) {
      return NextResponse.json({ code: 'INVITATION_STALE', error: 'Dəvətin filial əhatəsi etibarsızdır' }, { status: 409 })
    }
    const [branch] = await db.select({
      name: branches.name,
      manager_id: branches.manager_id,
      is_archived: branches.is_archived,
    }).from(branches).where(and(
      eq(branches.id, invitation.branch_id),
      eq(branches.tenant_id, session.user.tenant_id),
    )).limit(1)
    if (!branch || branch.is_archived || !managerScopeMatches(branch.manager_id, invitation.replaces_manager_id)) {
      await revokeInvitation({
        id,
        tenantId: session.user.tenant_id,
        actorId: session.user.id,
        reason: 'scope_changed',
        action: 'user.invite.stale',
      })
      return NextResponse.json({ code: 'INVITATION_STALE', error: 'Filial müdiri təyinatı dəyişib' }, { status: 409 })
    }
  }

  const token = createOneTimeToken()
  const tokenHash = hashOneTimeToken(token)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const rotateConditions: SQL[] = [
    eq(invitations.id, id),
    eq(invitations.tenant_id, session.user.tenant_id),
    isNull(invitations.accepted_at),
    isNull(invitations.revoked_at),
  ]
  if (isBranchManagerInvitation(invitation.role)) {
    rotateConditions.push(sql`exists (
      select 1 from branches branch_scope
      where branch_scope.id = ${invitations.branch_id}
        and branch_scope.tenant_id = ${invitations.tenant_id}
        and branch_scope.is_archived = false
        and branch_scope.manager_id is not distinct from ${invitations.replaces_manager_id}
    )`)
  }
  const [rotated] = await db.update(invitations).set({ token: tokenHash, expires_at: expiresAt })
    .where(and(...rotateConditions))
    .returning({ id: invitations.id })
  if (!rotated) {
    if (isBranchManagerInvitation(invitation.role)) {
      const revoked = await revokeInvitation({
        id,
        tenantId: session.user.tenant_id,
        actorId: session.user.id,
        reason: 'scope_changed',
        action: 'user.invite.stale',
      })
      if (revoked) {
        return NextResponse.json({ code: 'INVITATION_STALE', error: 'Filial müdiri təyinatı dəyişib' }, { status: 409 })
      }
    }
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
      .where(and(
        eq(invitations.id, id),
        eq(invitations.tenant_id, session.user.tenant_id),
        eq(invitations.token, tokenHash),
        isNull(invitations.accepted_at),
        isNull(invitations.revoked_at),
      ))
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
  req: NextRequest,
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
  if (invitation.revoked_at) {
    return NextResponse.json({ error: 'Dəvət artıq ləğv edilib' }, { status: 409 })
  }

  const body = await req.json().catch(() => null) as { reason?: unknown } | null
  const requestedReason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
  const revoked = await revokeInvitation({
    id,
    tenantId: session.user.tenant_id,
    actorId: session.user.id,
    reason: requestedReason || 'admin_cancelled',
    action: 'user.invite.cancel',
  })
  if (!revoked) return NextResponse.json({ error: 'Dəvət artıq dəyişib' }, { status: 409 })
  return NextResponse.json({ success: true })
}

async function revokeInvitation({
  id,
  tenantId,
  actorId,
  reason,
  action,
}: {
  id: string
  tenantId: string
  actorId: string
  reason: string
  action: string
}) {
  const rows = await sqlClient.query(`
    with revoked as (
      update invitations
      set revoked_at = now(), revoked_by = $3::uuid, revoked_reason = $4::text
      where id = $1::uuid
        and tenant_id = $2::uuid
        and accepted_at is null
        and revoked_at is null
      returning id
    ), audited as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $2::uuid, $3::uuid, $5::text, 'invitation', revoked.id::text,
        jsonb_build_object('reason', $4::text)::text
      from revoked
    )
    select id from revoked
  `, [id, tenantId, actorId, reason, action])
  return Boolean(rows[0])
}
