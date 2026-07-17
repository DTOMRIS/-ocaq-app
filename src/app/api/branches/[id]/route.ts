import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq, gt, inArray, isNull } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { invitations, users } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { complaints } from '@/db/schema/complaints'
import { shift_briefings } from '@/db/schema/operations'
import { regions } from '@/db/schema/regions'
import {
  hasOnlyKeys,
  isBranchAction,
  normalizeAzerbaijanPhone,
  normalizeBranchCode,
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeWorkTime,
} from '@/lib/branch-lifecycle'

type Context = { params: Promise<{ id: string }> }

const UPDATE_DETAIL_FIELDS = [
  'action', 'expected_version', 'name', 'region_id', 'city',
  'address', 'phone', 'open_time', 'close_time',
] as const

async function findBranch(id: string, tenantId: string) {
  const [branch] = await db.select().from(branches).where(and(
    eq(branches.id, id),
    eq(branches.tenant_id, tenantId),
  )).limit(1)
  return branch ?? null
}

async function operationBlockers(branchId: string, tenantId: string) {
  const [[pending], [draft], [open]] = await Promise.all([
    db.select({ value: count() }).from(invitations).where(and(
      eq(invitations.tenant_id, tenantId),
      eq(invitations.branch_id, branchId),
      isNull(invitations.accepted_at),
      isNull(invitations.revoked_at),
      gt(invitations.expires_at, new Date()),
    )),
    db.select({ value: count() }).from(shift_briefings).where(and(
      eq(shift_briefings.tenant_id, tenantId),
      eq(shift_briefings.branch_id, branchId),
      eq(shift_briefings.status, 'draft'),
    )),
    db.select({ value: count() }).from(complaints).where(and(
      eq(complaints.tenant_id, tenantId),
      eq(complaints.branch_id, branchId),
      inArray(complaints.status, ['new', 'in_review', 'sent_to_branch']),
    )),
  ])
  return {
    pending_invitations: pending.value,
    draft_shift_briefings: draft.value,
    open_complaints: open.value,
  }
}

function hasBlockers(blockers: Awaited<ReturnType<typeof operationBlockers>>) {
  return Object.values(blockers).some((value) => value > 0)
}

function staleVersion() {
  return NextResponse.json(
    { code: 'BRANCH_VERSION_CONFLICT', error: 'Filial məlumatı dəyişib. Səhifəni yeniləyib yenidən cəhd edin.' },
    { status: 409 },
  )
}

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  const { id } = await params
  const branch = await findBranch(id, session.user.tenant_id)
  if (!branch) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
  return NextResponse.json({ branch, blockers: await operationBlockers(id, session.user.tenant_id) })
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || !isBranchAction(body.action)) {
    return NextResponse.json({ error: 'Filial əməliyyatı düzgün seçilməyib' }, { status: 400 })
  }
  const expectedVersion = Number(body.expected_version)
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return NextResponse.json({ error: 'Filial versiyası tələb olunur' }, { status: 400 })
  }

  const existing = await findBranch(id, session.user.tenant_id)
  if (!existing) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
  if (existing.version !== expectedVersion) return staleVersion()

  try {
    if (body.action === 'update_details') {
      if (!hasOnlyKeys(body, UPDATE_DETAIL_FIELDS)) {
        return NextResponse.json({ error: 'Bu əməliyyat üçün artıq sahə göndərilib' }, { status: 400 })
      }
      const updates: Record<string, unknown> = {}
      if ('name' in body) updates.name = normalizeRequiredText(body.name, 2, 80)
      if ('city' in body) updates.city = normalizeRequiredText(body.city, 2, 80)
      if ('address' in body) updates.address = normalizeOptionalText(body.address, 300)
      if ('phone' in body) updates.phone = normalizeAzerbaijanPhone(body.phone)
      if ('open_time' in body) updates.open_time = normalizeWorkTime(body.open_time, existing.open_time ?? '09:00')
      if ('close_time' in body) updates.close_time = normalizeWorkTime(body.close_time, existing.close_time ?? '23:00')
      if ('region_id' in body) {
        const regionId = typeof body.region_id === 'string' ? body.region_id : ''
        const [region] = await db.select({ id: regions.id }).from(regions).where(and(
          eq(regions.id, regionId),
          eq(regions.tenant_id, session.user.tenant_id),
          eq(regions.is_active, true),
        )).limit(1)
        if (!region) return NextResponse.json({ error: 'Aktiv bölgə tapılmadı' }, { status: 400 })
        updates.region_id = regionId
      }
      if (!Object.keys(updates).length) return NextResponse.json({ error: 'Dəyişiklik göndərilməyib' }, { status: 400 })
      const openTime = String(updates.open_time ?? existing.open_time ?? '09:00')
      const closeTime = String(updates.close_time ?? existing.close_time ?? '23:00')
      if (openTime === closeTime) return NextResponse.json({ error: 'Açılış və bağlanış saatı eyni ola bilməz' }, { status: 400 })
      return mutateBranch({
        id,
        tenantId: session.user.tenant_id,
        userId: session.user.id,
        expectedVersion,
        action: 'branch.update',
        existing,
        updates,
      })
    }

    if (!hasOnlyKeys(body, ['action', 'expected_version'])) {
      return NextResponse.json({ error: 'Bu əməliyyat üçün artıq sahə göndərilib' }, { status: 400 })
    }

    if (body.action === 'activate') {
      if (existing.is_archived) return NextResponse.json({ error: 'Arxiv filial əvvəlcə bərpa edilməlidir' }, { status: 409 })
      if (existing.is_active) return NextResponse.json({ branch: existing })
      if (!existing.region_id || !existing.manager_id) {
        return NextResponse.json({ code: 'BRANCH_NOT_READY', error: 'Aktivləşdirmək üçün bölgə və filial müdiri tələb olunur' }, { status: 409 })
      }
      const [[region], [manager]] = await Promise.all([
        db.select({ id: regions.id }).from(regions).where(and(
          eq(regions.id, existing.region_id), eq(regions.tenant_id, session.user.tenant_id), eq(regions.is_active, true),
        )).limit(1),
        db.select({ id: users.id }).from(users).where(and(
          eq(users.id, existing.manager_id), eq(users.tenant_id, session.user.tenant_id),
          eq(users.role, 'branch_manager'), eq(users.is_active, true), eq(users.is_email_verified, true),
        )).limit(1),
      ])
      if (!region || !manager) {
        return NextResponse.json({ code: 'BRANCH_NOT_READY', error: 'Bölgə və ya filial müdiri aktiv deyil' }, { status: 409 })
      }
      return mutateBranch({
        id,
        tenantId: session.user.tenant_id,
        userId: session.user.id,
        expectedVersion,
        action: 'branch.activate',
        existing,
        updates: { is_active: true, activated_at: existing.activated_at ?? new Date() },
      })
    }

    if (body.action === 'deactivate') {
      if (existing.is_archived) return NextResponse.json({ error: 'Arxiv filial deaktiv edilə bilməz' }, { status: 409 })
      if (!existing.is_active) return NextResponse.json({ branch: existing })
      const blockers = await operationBlockers(id, session.user.tenant_id)
      if (hasBlockers(blockers)) {
        return NextResponse.json({ code: 'BRANCH_HAS_ACTIVE_OPERATIONS', error: 'Filialda açıq əməliyyatlar var', blockers }, { status: 409 })
      }
      return mutateBranch({
        id,
        tenantId: session.user.tenant_id,
        userId: session.user.id,
        expectedVersion,
        action: 'branch.deactivate',
        existing,
        updates: { is_active: false },
        requireNoBlockers: true,
      })
    }

    if (!existing.is_archived) return NextResponse.json({ error: 'Filial arxivdə deyil' }, { status: 409 })
    return mutateBranch({
      id,
      tenantId: session.user.tenant_id,
      userId: session.user.id,
      expectedVersion,
      action: 'branch.restore',
      existing,
      updates: { is_active: false, is_archived: false, archived_at: null, archived_by: null, archive_reason: null },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (['TEXT_REQUIRED', 'TEXT_LENGTH_INVALID', 'TEXT_TOO_LONG', 'PHONE_INVALID', 'TIME_INVALID'].includes(message)) {
      return NextResponse.json({ error: 'Filial məlumatlarından biri düzgün deyil' }, { status: 400 })
    }
    console.error('Branch update error:', error)
    return NextResponse.json({ error: 'Filial yenilənə bilmədi' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || !hasOnlyKeys(body, ['confirmation_code', 'reason', 'expected_version'])) {
    return NextResponse.json({ error: 'Arxiv məlumatları düzgün deyil' }, { status: 400 })
  }
  const expectedVersion = Number(body.expected_version)
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return NextResponse.json({ error: 'Filial versiyası tələb olunur' }, { status: 400 })
  }
  const confirmationCode = normalizeBranchCode(body.confirmation_code)
  let reason: string
  try {
    reason = normalizeRequiredText(body.reason, 5, 500)
  } catch {
    return NextResponse.json({ error: 'Arxiv səbəbi 5–500 simvol olmalıdır' }, { status: 400 })
  }

  const existing = await findBranch(id, session.user.tenant_id)
  if (!existing) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
  if (existing.version !== expectedVersion) return staleVersion()
  if (existing.is_archived) return NextResponse.json({ branch: existing })
  if (confirmationCode !== existing.code) {
    return NextResponse.json({ error: 'Təsdiq üçün filial kodunu düzgün yazın' }, { status: 400 })
  }
  const blockers = await operationBlockers(id, session.user.tenant_id)
  if (hasBlockers(blockers)) {
    return NextResponse.json({ code: 'BRANCH_HAS_ACTIVE_OPERATIONS', error: 'Filialda açıq əməliyyatlar var', blockers }, { status: 409 })
  }

  return mutateBranch({
    id,
    tenantId: session.user.tenant_id,
    userId: session.user.id,
    expectedVersion,
    action: 'branch.archive',
    existing,
    updates: {
      is_active: false,
      is_archived: true,
      archived_at: new Date(),
      archived_by: session.user.id,
      archive_reason: reason,
    },
    requireNoBlockers: true,
  })
}

async function mutateBranch({
  id,
  tenantId,
  userId,
  expectedVersion,
  action,
  existing,
  updates,
  requireNoBlockers = false,
}: {
  id: string
  tenantId: string
  userId: string
  expectedVersion: number
  action: string
  existing: typeof branches.$inferSelect
  updates: Record<string, unknown>
  requireNoBlockers?: boolean
}) {
  void existing
  const rows = await sqlClient.query(`
    with locked as (
      select pg_advisory_xact_lock(hashtextextended($1::text, 1))
    ), payload as (
      select $5::jsonb value
    ), before as (
      select branches.* from branches, locked
      where id = $1::uuid and tenant_id = $2::uuid and version = $3::integer
    ), blockers as (
      select
        (select count(*) from invitations invitation
          where invitation.tenant_id = $2::uuid
            and invitation.branch_id = $1::uuid
            and invitation.accepted_at is null
            and invitation.revoked_at is null
            and invitation.expires_at > now()) as pending_invitations,
        (select count(*) from shift_briefings briefing
          where briefing.tenant_id = $2::uuid
            and briefing.branch_id = $1::uuid
            and briefing.status = 'draft') as draft_shift_briefings,
        (select count(*) from complaints complaint
          where complaint.tenant_id = $2::uuid
            and complaint.branch_id = $1::uuid
            and complaint.status in ('new', 'in_review', 'sent_to_branch')) as open_complaints
    ), updated as (
      update branches branch set
        name = case when payload.value ? 'name' then payload.value ->> 'name' else branch.name end,
        region_id = case when payload.value ? 'region_id' then (payload.value ->> 'region_id')::uuid else branch.region_id end,
        city = case when payload.value ? 'city' then payload.value ->> 'city' else branch.city end,
        address = case when payload.value ? 'address' then payload.value ->> 'address' else branch.address end,
        phone = case when payload.value ? 'phone' then payload.value ->> 'phone' else branch.phone end,
        open_time = case when payload.value ? 'open_time' then payload.value ->> 'open_time' else branch.open_time end,
        close_time = case when payload.value ? 'close_time' then payload.value ->> 'close_time' else branch.close_time end,
        is_active = case when payload.value ? 'is_active' then (payload.value ->> 'is_active')::boolean else branch.is_active end,
        is_archived = case when payload.value ? 'is_archived' then (payload.value ->> 'is_archived')::boolean else branch.is_archived end,
        activated_at = case when payload.value ? 'activated_at' then (payload.value ->> 'activated_at')::timestamp else branch.activated_at end,
        archived_at = case when payload.value ? 'archived_at' then (payload.value ->> 'archived_at')::timestamp else branch.archived_at end,
        archived_by = case when payload.value ? 'archived_by' then (payload.value ->> 'archived_by')::uuid else branch.archived_by end,
        archive_reason = case when payload.value ? 'archive_reason' then payload.value ->> 'archive_reason' else branch.archive_reason end,
        version = branch.version + 1,
        updated_at = now()
      from before, payload, blockers
      where branch.id = before.id
        and (
          not ($7::boolean) or (
            blockers.pending_invitations = 0 and
            blockers.draft_shift_briefings = 0 and
            blockers.open_complaints = 0
          )
        )
      returning branch.*
    ), audited as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $2::uuid, $6::uuid, $4::text, 'branch', updated.id::text,
        jsonb_build_object(
          'before', jsonb_build_object(
            'region_id', before.region_id,
            'manager_id', before.manager_id,
            'is_active', before.is_active,
            'is_archived', before.is_archived,
            'activated_at', before.activated_at,
            'archived_at', before.archived_at,
            'archived_by', before.archived_by,
            'archive_reason', before.archive_reason,
            'version', before.version
          ),
          'after', jsonb_build_object(
            'region_id', updated.region_id,
            'manager_id', updated.manager_id,
            'is_active', updated.is_active,
            'is_archived', updated.is_archived,
            'activated_at', updated.activated_at,
            'archived_at', updated.archived_at,
            'archived_by', updated.archived_by,
            'archive_reason', updated.archive_reason,
            'version', updated.version
          )
        )::text
      from before join updated on true
    )
    select * from updated
  `, [id, tenantId, expectedVersion, action, JSON.stringify(updates), userId, requireNoBlockers])
  const updated = rows[0] ?? null
  if (!updated && requireNoBlockers) {
    const current = await findBranch(id, tenantId)
    if (!current || current.version !== expectedVersion) return staleVersion()
    const blockers = await operationBlockers(id, tenantId)
    if (hasBlockers(blockers)) {
      return NextResponse.json(
        { code: 'BRANCH_HAS_ACTIVE_OPERATIONS', error: 'Filialda açıq əməliyyatlar var', blockers },
        { status: 409 },
      )
    }
  }
  if (!updated) return staleVersion()
  return NextResponse.json({ branch: updated })
}
