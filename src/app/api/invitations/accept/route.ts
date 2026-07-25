import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { db, sqlClient } from '@/db'
import { invitations, users, audit_logs, tenants } from '@/db/schema/auth'
import { regions } from '@/db/schema/regions'
import { branches } from '@/db/schema/branches'
import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'
import { oneTimeTokenCandidates } from '@/lib/one-time-token'
import { isBranchManagerInvitation } from '../_contract'

class AcceptError extends Error {
  constructor(public code: string) { super(code) }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!token || name.length < 2 || name.length > 120 || password.length < 8) {
    return NextResponse.json(
      { error: 'Məlumatlar natamamdır. Şifrə minimum 8 simvol olmalıdır.' },
      { status: 400 },
    )
  }

  const [candidate] = await db.select().from(invitations).where(and(
    inArray(invitations.token, oneTimeTokenCandidates(token)),
    isNull(invitations.accepted_at),
    isNull(invitations.revoked_at),
    gt(invitations.expires_at, new Date()),
  )).limit(1)
  if (!candidate) {
    return NextResponse.json({ error: 'Dəvət tapılmadı və ya müddəti bitib' }, { status: 404 })
  }

  const isDkOwnerInvitation = candidate.role === 'super_admin'
    && candidate.source === 'dk_provisioning'
    && !candidate.invited_by
    && !candidate.region_id
    && !candidate.branch_id
  if (!['region_manager', 'branch_manager'].includes(candidate.role) && !isDkOwnerInvitation) {
    return NextResponse.json({ error: 'Dəvət rolu etibarsızdır' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  if (isBranchManagerInvitation(candidate.role)) {
    if (!candidate.branch_id) {
      return NextResponse.json({ error: 'Dəvət filialı etibarsızdır' }, { status: 400 })
    }
    try {
      const accepted = await acceptBranchManagerInvitation({
        candidateTokens: oneTimeTokenCandidates(token),
        userId: randomUUID(),
        name,
        passwordHash,
      })
      if (!accepted) {
        return NextResponse.json(
          { code: 'INVITATION_STALE', error: 'Dəvət artıq istifadə edilib və ya filial müdiri təyinatı dəyişib' },
          { status: 409 },
        )
      }
      const welcomeDelivery = await sendWelcomeEmail({ email: candidate.email, name, role: candidate.role })
      if (welcomeDelivery.error) {
        console.error('Welcome mail göndərilmədi (qeydiyyat uğurlu):', welcomeDelivery.error)
      }
      return NextResponse.json({ success: true, userId: accepted.user_id })
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
      const message = error instanceof Error ? error.message : ''
      if (code === '23505' || message.includes('unique')) {
        return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatlıdır' }, { status: 409 })
      }
      console.error('Branch manager invitation accept error:', error)
      return NextResponse.json({ error: 'Qeydiyyat tamamlanmadı' }, { status: 500 })
    }
  }

  if (isDkOwnerInvitation) {
    const [tenant] = await db.select({ id: tenants.id }).from(tenants)
      .where(and(
        eq(tenants.id, candidate.tenant_id),
        eq(tenants.provisioned_by, 'dk_agency'),
        eq(tenants.is_active, true),
      ))
      .limit(1)
    if (!tenant) {
      return NextResponse.json({ error: 'Müştəri hesabı aktiv deyil' }, { status: 409 })
    }
  } else if (candidate.role === 'region_manager') {
    if (!candidate.region_id || candidate.branch_id) {
      return NextResponse.json({ error: 'Dəvət əhatəsi etibarsızdır' }, { status: 400 })
    }
    const [region] = await db.select({ id: regions.id, manager_id: regions.manager_id }).from(regions)
      .where(and(eq(regions.id, candidate.region_id), eq(regions.tenant_id, candidate.tenant_id)))
      .limit(1)
    if (!region || region.manager_id) {
      return NextResponse.json({ error: 'Bölgə tapılmadı və ya artıq müdiri var' }, { status: 409 })
    }
  } else {
    if (!candidate.branch_id) {
      return NextResponse.json({ error: 'Dəvət filialı etibarsızdır' }, { status: 400 })
    }
    const [branch] = await db.select({ id: branches.id, manager_id: branches.manager_id }).from(branches)
      .where(and(eq(branches.id, candidate.branch_id), eq(branches.tenant_id, candidate.tenant_id)))
      .limit(1)
    if (!branch) {
      return NextResponse.json({ error: 'Filial tapılmadı və ya artıq müdiri var' }, { status: 409 })
    }
  }

  const claimedAt = new Date()
  let createdUserId: string | null = null

  try {
    // neon-http interaktiv transaction dəstəkləmir. Əvvəl dəvəti şərtli update ilə
    // atomik götürürük; sonrakı addım alınmasa aşağıdakı kompensasiya hər şeyi geri açır.
    const [claimed] = await db.update(invitations)
      .set({ accepted_at: claimedAt })
      .where(and(
        eq(invitations.id, candidate.id),
        eq(invitations.token, candidate.token),
        isNull(invitations.accepted_at),
        isNull(invitations.revoked_at),
        gt(invitations.expires_at, new Date()),
      ))
      .returning()
    if (!claimed) throw new AcceptError('INVITE_CLAIMED')

    const [created] = await db.insert(users).values({
      tenant_id: claimed.tenant_id,
      email: claimed.email.trim().toLowerCase(),
      name,
      password_hash: passwordHash,
      role: claimed.role,
      is_email_verified: true,
      email_verified_at: new Date(),
    }).returning({ id: users.id })
    createdUserId = created.id

    if (claimed.role === 'super_admin' && claimed.source === 'dk_provisioning') {
      // DK tərəfindən yaradılan tenant-in ilk sahibi üçün ayrıca əhatə təyinatı yoxdur.
    } else if (claimed.role === 'region_manager' && claimed.region_id) {
      const assigned = await db.update(regions)
        .set({ manager_id: created.id, updated_at: new Date() })
        .where(and(
          eq(regions.id, claimed.region_id),
          eq(regions.tenant_id, claimed.tenant_id),
          isNull(regions.manager_id),
        )).returning({ id: regions.id })
      if (assigned.length === 0) throw new AcceptError('SCOPE_TAKEN')
    } else if (claimed.role === 'branch_manager' && claimed.branch_id) {
      const assigned = await db.update(branches)
        .set({ manager_id: created.id, updated_at: new Date() })
        .where(and(
          eq(branches.id, claimed.branch_id),
          eq(branches.tenant_id, claimed.tenant_id),
          isNull(branches.manager_id),
        )).returning({ id: branches.id })
      if (assigned.length === 0) throw new AcceptError('SCOPE_TAKEN')
    } else {
      throw new AcceptError('INVALID_SCOPE')
    }

    try {
      await db.insert(audit_logs).values({
        tenant_id: claimed.tenant_id,
        user_id: created.id,
        action: 'user.register',
        entity: 'user',
        entity_id: created.id,
        metadata: JSON.stringify({ email: claimed.email, role: claimed.role }),
      })
    } catch (error) {
      console.error('Audit log onboarding write error:', error)
    }

    const welcomeDelivery = await sendWelcomeEmail({ email: candidate.email, name, role: candidate.role })
    if (welcomeDelivery.error) {
      console.error('Welcome mail göndərilmədi (qeydiyyat uğurlu):', welcomeDelivery.error)
    }

    return NextResponse.json({ success: true, userId: created.id })
  } catch (error) {
    if (createdUserId) {
      await Promise.allSettled([
        db.update(regions).set({ manager_id: null, updated_at: new Date() })
          .where(eq(regions.manager_id, createdUserId)),
        db.update(branches).set({ manager_id: null, updated_at: new Date() })
          .where(eq(branches.manager_id, createdUserId)),
      ])
      await db.delete(users).where(eq(users.id, createdUserId)).catch(() => undefined)
    }
    await db.update(invitations).set({ accepted_at: null }).where(and(
      eq(invitations.id, candidate.id),
      eq(invitations.accepted_at, claimedAt),
    )).catch(() => undefined)

    if (error instanceof AcceptError && error.code === 'INVITE_CLAIMED') {
      return NextResponse.json({ error: 'Dəvət artıq istifadə edilib' }, { status: 409 })
    }
    if (error instanceof AcceptError) {
      return NextResponse.json({ error: 'Dəvətin filial və ya bölgə təyinatı dəyişib' }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : ''
    if (message.includes('unique')) {
      return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatlıdır' }, { status: 409 })
    }
    console.error('Invitation accept error:', error)
    return NextResponse.json({ error: 'Qeydiyyat tamamlanmadı' }, { status: 500 })
  }
}

async function acceptBranchManagerInvitation({
  candidateTokens,
  userId,
  name,
  passwordHash,
}: {
  candidateTokens: string[]
  userId: string
  name: string
  passwordHash: string
}) {
  const [hashedToken, legacyToken = hashedToken] = candidateTokens
  const rows = await sqlClient.query(`
    with candidate as materialized (
      select
        invitation.id as invitation_id,
        invitation.tenant_id,
        invitation.email,
        invitation.token as invitation_token,
        invitation.branch_id,
        invitation.replaces_manager_id,
        branch.manager_id as previous_manager_id,
        branch.version as previous_version
      from invitations invitation
      join branches branch
        on branch.id = invitation.branch_id
       and branch.tenant_id = invitation.tenant_id
      where invitation.token in ($1::text, $2::text)
        and invitation.role = 'branch_manager'
        and invitation.accepted_at is null
        and invitation.revoked_at is null
        and invitation.expires_at > now()
        and branch.is_archived = false
        and branch.manager_id is not distinct from invitation.replaces_manager_id
      limit 1
      for update of invitation, branch
    ), created_user as (
      insert into users (
        id, tenant_id, email, name, password_hash, role,
        is_active, is_email_verified, email_verified_at, created_at, updated_at
      )
      select
        $3::uuid, candidate.tenant_id, lower(trim(candidate.email)), $4::text, $5::text,
        'branch_manager', true, true, now(), now(), now()
      from candidate
      returning id
    ), assigned as (
      update branches branch
      set manager_id = created_user.id,
          version = branch.version + 1,
          updated_at = now()
      from candidate, created_user
      where branch.id = candidate.branch_id
        and branch.tenant_id = candidate.tenant_id
        and branch.manager_id is not distinct from candidate.replaces_manager_id
      returning
        branch.id as branch_id,
        branch.version as branch_version,
        candidate.invitation_id,
        candidate.tenant_id,
        candidate.email,
        candidate.invitation_token,
        candidate.previous_manager_id,
        candidate.previous_version
    ), claimed as (
      update invitations invitation
      set accepted_at = now()
      from assigned, created_user
      where invitation.id = assigned.invitation_id
        and invitation.token = assigned.invitation_token
        and invitation.accepted_at is null
        and invitation.revoked_at is null
        and invitation.expires_at > now()
      returning invitation.id, invitation.tenant_id
    ), registration_audit as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select claimed.tenant_id, created_user.id, 'user.register', 'user', created_user.id::text,
        jsonb_build_object('email', assigned.email, 'role', 'branch_manager')::text
      from claimed, created_user, assigned
    ), assignment_audit as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select claimed.tenant_id, created_user.id, 'branch.manager.accept', 'branch', assigned.branch_id::text,
        jsonb_build_object(
          'invitation_id', claimed.id,
          'previous_manager_id', assigned.previous_manager_id,
          'new_manager_id', created_user.id,
          'previous_version', assigned.previous_version,
          'new_version', assigned.branch_version
        )::text
      from claimed, created_user, assigned
    )
    select
      created_user.id as user_id,
      assigned.branch_id,
      assigned.branch_version
    from claimed, created_user, assigned
  `, [hashedToken, legacyToken, userId, name, passwordHash])
  return rows[0] as { user_id: string; branch_id: string; branch_version: number } | undefined
}
