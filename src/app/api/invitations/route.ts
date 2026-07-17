import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { invitations, users, audit_logs } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { and, eq, gt, inArray, isNull, or } from 'drizzle-orm'
import { inviteRateLimit } from '@/lib/rate-limit'
import { sendInvitationEmail } from '@/lib/email'
import { accessibleBranchIds, accessibleRegionIds } from '@/lib/branch-access'
import { invitationScope, isInvitableRole } from './_scope'
import { createOneTimeToken, hashOneTimeToken } from '@/lib/one-time-token'
import { isBranchManagerInvitation } from './_contract'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const filters = [eq(invitations.tenant_id, session.user.tenant_id)]
  if (session.user.role === 'region_manager') {
    const [branchIds, regionIds] = await Promise.all([
      accessibleBranchIds(session.user),
      accessibleRegionIds(session.user),
    ])
    const scopeFilters = [eq(invitations.invited_by, session.user.id)]
    if (branchIds.length > 0) scopeFilters.push(inArray(invitations.branch_id, branchIds))
    if (regionIds.length > 0) scopeFilters.push(inArray(invitations.region_id, regionIds))
    filters.push(or(...scopeFilters)!)
  }

  const list = await db.select({
    id: invitations.id,
    email: invitations.email,
    role: invitations.role,
    region_id: invitations.region_id,
    branch_id: invitations.branch_id,
    invited_by: invitations.invited_by,
    expires_at: invitations.expires_at,
    accepted_at: invitations.accepted_at,
    revoked_at: invitations.revoked_at,
    revoked_reason: invitations.revoked_reason,
    replaces_manager_id: invitations.replaces_manager_id,
    created_at: invitations.created_at,
  }).from(invitations).where(and(...filters)).orderBy(invitations.created_at)

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { success } = await inviteRateLimit.limit(session.user.id)
  if (!success) {
    return NextResponse.json({ error: 'Çox sayda sorğu. Bir saat sonra cəhd edin.' }, { status: 429 })
  }

  const body = await req.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !isInvitableRole(body.role)) {
    return NextResponse.json({ error: 'Düzgün e-poçt və rol tələb olunur' }, { status: 400 })
  }

  if (isBranchManagerInvitation(body.role)) {
    return NextResponse.json(
      { code: 'USE_BRANCH_MANAGER_FLOW', error: 'Filial müdiri dəvəti filial idarəetmə axınından göndərilməlidir' },
      { status: 409 },
    )
  }

  const scope = await invitationScope(session.user, body.role, body.region_id, body.branch_id)
  if ('error' in scope) return NextResponse.json({ error: scope.error }, { status: 403 })

  const [existingUser] = await db.select({ id: users.id }).from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (existingUser) return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatlıdır' }, { status: 409 })

  const [pending] = await db.select({ id: invitations.id }).from(invitations)
    .where(and(
      eq(invitations.tenant_id, session.user.tenant_id),
      eq(invitations.email, email),
      isNull(invitations.accepted_at),
      isNull(invitations.revoked_at),
      gt(invitations.expires_at, new Date()),
    )).limit(1)
  if (pending) return NextResponse.json({ error: 'Bu e-poçt üçün gözləyən dəvət artıq mövcuddur' }, { status: 409 })

  const token = createOneTimeToken()
  const tokenHash = hashOneTimeToken(token)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  let invitation: { id: string }
  let auditWritten = false
  if (scope.branchId) {
    const rows = await sqlClient.query(`
      with locked as (
        select pg_advisory_xact_lock(hashtextextended($1::text, 1))
      ), eligible as (
        select branch.id, branch.region_id from branches branch, locked
        where branch.id = $1::uuid
          and branch.tenant_id = $2::uuid
          and branch.is_active = true
          and branch.is_archived = false
      ), created as (
        insert into invitations (
          tenant_id, email, role, token, invited_by, region_id, branch_id, expires_at
        )
        select $2::uuid, $3::text, $4::role, $5::text, $6::uuid,
          eligible.region_id, eligible.id, $7::timestamp
        from eligible
        returning id
      ), audited as (
        insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
        select $2::uuid, $6::uuid, 'user.invite', 'invitation', created.id::text,
          jsonb_build_object('email', $3::text, 'role', $4::text, 'branch_id', $1::uuid)::text
        from created
        returning id
      )
      select created.id from created, audited
    `, [scope.branchId, session.user.tenant_id, email, body.role, tokenHash, session.user.id, expiresAt])
    if (!rows[0]) {
      return NextResponse.json({ error: 'Filial artıq aktiv deyil' }, { status: 409 })
    }
    invitation = { id: String(rows[0].id) }
    auditWritten = true
  } else {
    const [created] = await db.insert(invitations).values({
      tenant_id: session.user.tenant_id,
      email,
      role: body.role,
      token: tokenHash,
      invited_by: session.user.id,
      region_id: scope.regionId,
      branch_id: null,
      expires_at: expiresAt,
    }).returning({ id: invitations.id })
    invitation = created
  }

  let branchName: string | undefined
  if (scope.branchId) {
    const [branch] = await db.select({ name: branches.name }).from(branches)
      .where(and(eq(branches.id, scope.branchId), eq(branches.tenant_id, session.user.tenant_id)))
      .limit(1)
    branchName = branch?.name
  }

  const { error } = await sendInvitationEmail({
    email,
    token,
    inviterName: session.user.name ?? 'Admin',
    recipientRole: body.role,
    branchName,
  })
  if (error) {
    await sqlClient.query(`
      with revoked as (
        update invitations set revoked_at = now(), revoked_by = $3::uuid,
          revoked_reason = 'Dəvət e-poçtu göndərilə bilmədi'
        where id = $1::uuid and tenant_id = $2::uuid
          and accepted_at is null and revoked_at is null
        returning id
      )
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $2::uuid, $3::uuid, 'user.invite.delivery_failed', 'invitation', revoked.id::text,
        jsonb_build_object('email', $4::text, 'role', $5::text)::text
      from revoked
    `, [invitation.id, session.user.tenant_id, session.user.id, email, body.role])
    console.error('Invitation mail error:', error)
    return NextResponse.json({ error: 'Dəvət e-poçtu göndərilə bilmədi' }, { status: 502 })
  }

  try {
    if (!auditWritten) {
      await db.insert(audit_logs).values({
        tenant_id: session.user.tenant_id,
        user_id: session.user.id,
        action: 'user.invite',
        entity: 'invitation',
        entity_id: invitation.id,
        metadata: JSON.stringify({ email, role: body.role, region_id: scope.regionId, branch_id: scope.branchId }),
      })
    }
  } catch (error) {
    console.error('Audit log write error:', error)
  }

  return NextResponse.json({ success: true, id: invitation.id }, { status: 201 })
}
