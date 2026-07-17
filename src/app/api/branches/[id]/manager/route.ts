import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { invitations, users } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { hasOnlyKeys, isUniqueViolation } from '@/lib/branch-lifecycle'
import { sendInvitationEmail } from '@/lib/email'
import { createOneTimeToken, hashOneTimeToken } from '@/lib/one-time-token'
import { inviteRateLimit } from '@/lib/rate-limit'

type Context = { params: Promise<{ id: string }> }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function readBranch(id: string, tenantId: string) {
  const [branch] = await db.select({
    id: branches.id,
    code: branches.code,
    name: branches.name,
    region_id: branches.region_id,
    region_name: regions.name,
    city: branches.city,
    address: branches.address,
    phone: branches.phone,
    open_time: branches.open_time,
    close_time: branches.close_time,
    manager_id: branches.manager_id,
    manager_name: users.name,
    manager_email: users.email,
    is_active: branches.is_active,
    is_archived: branches.is_archived,
    version: branches.version,
    activated_at: branches.activated_at,
    archived_at: branches.archived_at,
    archive_reason: branches.archive_reason,
    created_at: branches.created_at,
    updated_at: branches.updated_at,
  }).from(branches)
    .leftJoin(regions, and(eq(regions.id, branches.region_id), eq(regions.tenant_id, branches.tenant_id)))
    .leftJoin(users, and(eq(users.id, branches.manager_id), eq(users.tenant_id, branches.tenant_id)))
    .where(and(eq(branches.id, id), eq(branches.tenant_id, tenantId)))
    .limit(1)
  if (!branch) return null

  const [pending] = await db.select({
    id: invitations.id,
    branch_id: invitations.branch_id,
    email: invitations.email,
    expires_at: invitations.expires_at,
    replaces_manager_id: invitations.replaces_manager_id,
  }).from(invitations).where(and(
    eq(invitations.tenant_id, tenantId),
    eq(invitations.branch_id, id),
    eq(invitations.role, 'branch_manager'),
    isNull(invitations.accepted_at),
    isNull(invitations.revoked_at),
    gt(invitations.expires_at, new Date()),
  )).limit(1)

  return { ...branch, pending_manager_invitation: pending ?? null }
}

function parseExpectedManager(body: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(body, 'expected_manager_id')) return { valid: false, value: null }
  if (body.expected_manager_id !== null && (
    typeof body.expected_manager_id !== 'string' || !UUID_PATTERN.test(body.expected_manager_id)
  )) {
    return { valid: false, value: null }
  }
  return { valid: true, value: body.expected_manager_id as string | null }
}

function conflict() {
  return NextResponse.json({
    code: 'BRANCH_VERSION_CONFLICT',
    error: 'Filial və ya müdür məlumatı dəyişib. Səhifəni yeniləyin.',
  }, { status: 409 })
}

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
  const branch = await readBranch(id, session.user.tenant_id)
  if (!branch) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })

  const candidates = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    is_active: users.is_active,
    is_email_verified: users.is_email_verified,
  }).from(users).where(and(
    eq(users.tenant_id, session.user.tenant_id),
    eq(users.role, 'branch_manager'),
    eq(users.is_active, true),
    eq(users.is_email_verified, true),
  )).orderBy(users.name)

  const assignments = candidates.length ? await db.select({
    id: branches.id,
    code: branches.code,
    name: branches.name,
    manager_id: branches.manager_id,
  }).from(branches).where(and(
    eq(branches.tenant_id, session.user.tenant_id),
    eq(branches.is_archived, false),
  )) : []
  const byManager = new Map<string, Array<{ id: string; code: string; name: string }>>()
  for (const assigned of assignments) {
    if (!assigned.manager_id) continue
    const list = byManager.get(assigned.manager_id) ?? []
    list.push({ id: assigned.id, code: assigned.code, name: assigned.name })
    byManager.set(assigned.manager_id, list)
  }

  return NextResponse.json({
    branch,
    candidates: candidates.map((candidate) => {
      const assigned_branches = byManager.get(candidate.id) ?? []
      return { ...candidate, assigned_branch_count: assigned_branches.length, assigned_branches }
    }),
  })
}

export async function PUT(req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.operation !== 'string') {
    return NextResponse.json({ error: 'Müdür əməliyyatı düzgün deyil' }, { status: 400 })
  }
  const expected = parseExpectedManager(body)
  const expectedVersion = Number(body.expected_version)
  if (!expected.valid || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return NextResponse.json({ error: 'Filialın cari versiyası və müdürü tələb olunur' }, { status: 400 })
  }

  if (body.operation === 'invite_new') {
    if (!hasOnlyKeys(body, ['operation', 'email', 'expected_version', 'expected_manager_id'])) {
      return NextResponse.json({ error: 'Dəvət məlumatları düzgün deyil' }, { status: 400 })
    }
    return inviteManager({ id, expectedVersion, expectedManagerId: expected.value, email: body.email, session })
  }

  if (body.operation !== 'assign_existing' && body.operation !== 'unassign') {
    return NextResponse.json({ error: 'Müdür əməliyyatı düzgün deyil' }, { status: 400 })
  }
  const allowed = body.operation === 'assign_existing'
    ? ['operation', 'user_id', 'expected_version', 'expected_manager_id']
    : ['operation', 'expected_version', 'expected_manager_id']
  if (!hasOnlyKeys(body, allowed)) {
    return NextResponse.json({ error: 'Müdür əməliyyatı üçün artıq sahə göndərilib' }, { status: 400 })
  }
  const userId = body.operation === 'assign_existing' && typeof body.user_id === 'string' && body.user_id
    ? body.user_id
    : null
  if (body.operation === 'assign_existing' && !userId) {
    return NextResponse.json({ error: 'Filial müdiri seçilməlidir' }, { status: 400 })
  }
  if (userId && !UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: 'Filial müdiri seçimi düzgün deyil' }, { status: 400 })
  }

  const rows = await sqlClient.query(`
    with locked as (
      select pg_advisory_xact_lock(hashtextextended($1::text, 1))
    ), before as (
      select branch.* from branches branch, locked
      where branch.id = $1::uuid and branch.tenant_id = $2::uuid
        and branch.version = $3::integer and not branch.is_archived
        and branch.manager_id is not distinct from $4::uuid
    ), candidate as (
      select account.id from users account
      where $5::text = 'assign_existing'
        and account.id = $6::uuid
        and account.tenant_id = $2::uuid
        and account.role = 'branch_manager'
        and account.is_active
        and account.is_email_verified
    ), revoked as (
      update invitations invitation set
        revoked_at = now(), revoked_by = $7::uuid,
        revoked_reason = case when $5::text = 'unassign'
          then 'Filial müdiri ayrıldı' else 'Mövcud hesab filial müdiri kimi təyin edildi' end
      from before
      where invitation.tenant_id = $2::uuid
        and invitation.branch_id = before.id
        and invitation.role = 'branch_manager'
        and invitation.accepted_at is null
        and invitation.revoked_at is null
      returning invitation.id
    ), updated as (
      update branches branch set
        manager_id = case when $5::text = 'unassign' then null else $6::uuid end,
        version = branch.version + 1,
        updated_at = now()
      from before
      where branch.id = before.id
        and ($5::text = 'unassign' or exists (select 1 from candidate where candidate.id = $6::uuid))
        and ((select count(*) from revoked) >= 0)
      returning branch.*
    ), audited as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $2::uuid, $7::uuid,
        case when $5::text = 'unassign' then 'branch.manager.unassign' else 'branch.manager.assign' end,
        'branch', updated.id::text,
        jsonb_build_object(
          'old_manager_id', before.manager_id,
          'new_manager_id', updated.manager_id,
          'revoked_invitation_count', (select count(*) from revoked),
          'before_version', before.version,
          'after_version', updated.version
        )::text
      from before join updated on true
      returning id
    )
    select updated.id from updated, audited
  `, [id, session.user.tenant_id, expectedVersion, expected.value, body.operation, userId, session.user.id])

  if (!rows[0]) {
    const current = await readBranch(id, session.user.tenant_id)
    if (!current) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
    if (current.is_archived) return NextResponse.json({ error: 'Arxiv filialda müdür dəyişdirilə bilməz' }, { status: 409 })
    if (current.version !== expectedVersion || current.manager_id !== expected.value) return conflict()
    return NextResponse.json({ error: 'Aktiv və təsdiqlənmiş filial müdiri hesabı tapılmadı' }, { status: 400 })
  }

  return NextResponse.json({ branch: await readBranch(id, session.user.tenant_id) })
}

async function inviteManager({
  id,
  expectedVersion,
  expectedManagerId,
  email: rawEmail,
  session,
}: {
  id: string
  expectedVersion: number
  expectedManagerId: string | null
  email: unknown
  session: Session
}) {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Düzgün e-poçt tələb olunur' }, { status: 400 })
  }
  const { success } = await inviteRateLimit.limit(session.user.id)
  if (!success) return NextResponse.json({ error: 'Çox sayda sorğu. Bir saat sonra cəhd edin.' }, { status: 429 })

  const token = createOneTimeToken()
  const tokenHash = hashOneTimeToken(token)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  let rows: Record<string, unknown>[]
  try {
    rows = await sqlClient.query(`
      with locked as (
        select pg_advisory_xact_lock(hashtextextended($1::text, 1))
      ), before as (
        select branch.* from branches branch, locked
        where branch.id = $1::uuid and branch.tenant_id = $2::uuid
          and branch.version = $3::integer and not branch.is_archived
          and branch.manager_id is not distinct from $4::uuid
      ), expired as (
        update invitations invitation set
          revoked_at = now(), revoked_by = $5::uuid, revoked_reason = 'Dəvətin müddəti bitib'
        from before
        where invitation.tenant_id = $2::uuid
          and invitation.branch_id = before.id
          and invitation.role = 'branch_manager'
          and invitation.accepted_at is null and invitation.revoked_at is null
          and invitation.expires_at <= now()
        returning invitation.id
      ), inserted as (
        insert into invitations (
          tenant_id, email, role, token, invited_by, branch_id, expires_at, replaces_manager_id
        )
        select $2::uuid, $6::text, 'branch_manager', $7::text, $5::uuid,
          before.id, $8::timestamp, before.manager_id
        from before
        where not exists (select 1 from users account where lower(account.email) = lower($6::text))
          and not exists (
            select 1 from invitations live
            where live.tenant_id = $2::uuid and live.branch_id = before.id
              and live.role = 'branch_manager' and live.accepted_at is null
              and live.revoked_at is null and live.expires_at > now()
          )
          and (select count(*) from expired) >= 0
        returning *
      ), updated as (
        update branches branch set version = branch.version + 1, updated_at = now()
        from before, inserted
        where branch.id = before.id
        returning branch.id, branch.version
      ), audited as (
        insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
        select $2::uuid, $5::uuid, 'branch.manager.invite', 'invitation', inserted.id::text,
          jsonb_build_object(
            'branch_id', inserted.branch_id,
            'email', inserted.email,
            'replaces_manager_id', inserted.replaces_manager_id,
            'before_version', before.version,
            'after_version', updated.version
          )::text
        from inserted, before, updated
        returning id
      )
      select inserted.id, updated.version from inserted, updated, audited
    `, [id, session.user.tenant_id, expectedVersion, expectedManagerId, session.user.id, email, tokenHash, expiresAt]) as Record<string, unknown>[]
  } catch (error) {
    if (isUniqueViolation(error, 'invitations_live_branch_manager_uq')) {
      return NextResponse.json({ code: 'PENDING_MANAGER_INVITATION_EXISTS', error: 'Bu filial üçün gözləyən müdür dəvəti var' }, { status: 409 })
    }
    throw error
  }

  if (!rows[0]) {
    const current = await readBranch(id, session.user.tenant_id)
    if (!current) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
    if (current.is_archived) return NextResponse.json({ error: 'Arxiv filiala müdür dəvət edilə bilməz' }, { status: 409 })
    if (current.version !== expectedVersion || current.manager_id !== expectedManagerId) return conflict()
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing) return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatlıdır' }, { status: 409 })
    return NextResponse.json({ code: 'PENDING_MANAGER_INVITATION_EXISTS', error: 'Bu filial üçün gözləyən müdür dəvəti var' }, { status: 409 })
  }

  const current = await readBranch(id, session.user.tenant_id)
  const { error } = await sendInvitationEmail({
    email,
    token,
    inviterName: session.user.name ?? 'Admin',
    recipientRole: 'branch_manager',
    branchName: current?.name,
  })
  if (error) {
    await sqlClient.query(`
      with revoked as (
        update invitations set revoked_at = now(), revoked_by = $1::uuid,
          revoked_reason = 'Dəvət e-poçtu göndərilə bilmədi'
        where token = $2::text and tenant_id = $3::uuid
          and accepted_at is null and revoked_at is null
        returning id, branch_id
      )
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $3::uuid, $1::uuid, 'branch.manager.invite.delivery_failed',
        'invitation', revoked.id::text, jsonb_build_object('branch_id', revoked.branch_id)::text
      from revoked
    `, [session.user.id, tokenHash, session.user.tenant_id])
    console.error('Manager invitation mail error:', error)
    return NextResponse.json({ error: 'Dəvət e-poçtu göndərilə bilmədi' }, { status: 502 })
  }

  return NextResponse.json({ branch: current }, { status: 201 })
}
