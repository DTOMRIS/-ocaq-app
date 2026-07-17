import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, inArray, isNull, type SQL } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { invitations, users } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { accessibleBranchIds } from '@/lib/branch-access'
import {
  hasOnlyKeys,
  isBranchCode,
  isUniqueViolation,
  nextBranchCode,
  normalizeAzerbaijanPhone,
  normalizeBranchCode,
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeWorkTime,
} from '@/lib/branch-lifecycle'

const CREATE_FIELDS = [
  'code', 'name', 'region_id', 'city', 'address', 'phone',
  'open_time', 'close_time', 'manager_id',
] as const

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'staff') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const conditions: SQL[] = [eq(branches.tenant_id, session.user.tenant_id)]
  const status = req.nextUrl.searchParams.get('status') ?? 'current'

  if (session.user.role === 'super_admin') {
    if (status === 'active') conditions.push(eq(branches.is_active, true), eq(branches.is_archived, false))
    else if (status === 'inactive') conditions.push(eq(branches.is_active, false), eq(branches.is_archived, false))
    else if (status === 'archived') conditions.push(eq(branches.is_archived, true))
    else if (status !== 'all') conditions.push(eq(branches.is_archived, false))
  } else {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) return NextResponse.json([])
    conditions.push(inArray(branches.id, branchIds))
  }

  const list = await db.select({
    id: branches.id,
    region_id: branches.region_id,
    region_name: regions.name,
    code: branches.code,
    name: branches.name,
    city: branches.city,
    address: branches.address,
    phone: branches.phone,
    manager_id: branches.manager_id,
    manager_name: users.name,
    manager_email: users.email,
    open_time: branches.open_time,
    close_time: branches.close_time,
    is_active: branches.is_active,
    is_archived: branches.is_archived,
    version: branches.version,
    activated_at: branches.activated_at,
    archived_at: branches.archived_at,
    archive_reason: branches.archive_reason,
    created_at: branches.created_at,
    updated_at: branches.updated_at,
  }).from(branches)
    .leftJoin(regions, and(
      eq(regions.id, branches.region_id),
      eq(regions.tenant_id, branches.tenant_id),
    ))
    .leftJoin(users, and(
      eq(users.id, branches.manager_id),
      eq(users.tenant_id, branches.tenant_id),
    ))
    .where(and(...conditions))
    .orderBy(branches.code)

  const canViewPendingManagerInvitation = session.user.role === 'super_admin'
  const pending = list.length && canViewPendingManagerInvitation ? await db.select({
    id: invitations.id,
    branch_id: invitations.branch_id,
    email: invitations.email,
    expires_at: invitations.expires_at,
    replaces_manager_id: invitations.replaces_manager_id,
  }).from(invitations).where(and(
    eq(invitations.tenant_id, session.user.tenant_id),
    eq(invitations.role, 'branch_manager'),
    inArray(invitations.branch_id, list.map((branch) => branch.id)),
    isNull(invitations.accepted_at),
    isNull(invitations.revoked_at),
    gt(invitations.expires_at, new Date()),
  )) : []
  const pendingByBranch = new Map(pending.map((invitation) => [invitation.branch_id, invitation]))

  return NextResponse.json(list.map((branch) => ({
    ...branch,
    pending_manager_invitation: pendingByBranch.get(branch.id) ?? null,
  })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || !hasOnlyKeys(body, CREATE_FIELDS)) {
    return NextResponse.json({ error: 'Göndərilən filial sahələri etibarsızdır' }, { status: 400 })
  }

  try {
    const requestedCode = normalizeBranchCode(body.code)
    if (requestedCode && !isBranchCode(requestedCode)) {
      return NextResponse.json({ error: 'Kod formatı F-01, F-02 şəklində olmalıdır' }, { status: 400 })
    }
    const name = normalizeRequiredText(body.name, 2, 80)
    const city = normalizeRequiredText(body.city ?? 'Bakı', 2, 80)
    const address = normalizeOptionalText(body.address, 300)
    const phone = normalizeAzerbaijanPhone(body.phone)
    const openTime = normalizeWorkTime(body.open_time, '09:00')
    const closeTime = normalizeWorkTime(body.close_time, '23:00')
    if (openTime === closeTime) {
      return NextResponse.json({ error: 'Açılış və bağlanış saatı eyni ola bilməz' }, { status: 400 })
    }

    const regionId = typeof body.region_id === 'string' ? body.region_id : ''
    if (!regionId) return NextResponse.json({ error: 'Bölgə seçilməlidir' }, { status: 400 })
    const [region] = await db.select({ id: regions.id }).from(regions).where(and(
      eq(regions.id, regionId),
      eq(regions.tenant_id, session.user.tenant_id),
      eq(regions.is_active, true),
    )).limit(1)
    if (!region) return NextResponse.json({ error: 'Aktiv bölgə tapılmadı' }, { status: 400 })

    const managerId = typeof body.manager_id === 'string' && body.manager_id ? body.manager_id : null
    if (managerId) {
      const [manager] = await db.select({ id: users.id }).from(users).where(and(
        eq(users.id, managerId),
        eq(users.tenant_id, session.user.tenant_id),
        eq(users.role, 'branch_manager'),
        eq(users.is_active, true),
        eq(users.is_email_verified, true),
      )).limit(1)
      if (!manager) return NextResponse.json({ error: 'Aktiv filial müdiri hesabı tapılmadı' }, { status: 400 })
    }

    const createdRows = await sqlClient.query(`
      with locked as (
        select pg_advisory_xact_lock(hashtextextended($1::text, 0))
      ), candidate as (
        select coalesce(max(substring(code from 3)::bigint)
          filter (where code ~ '^F-[0-9]{2,6}$'), 0) + 1 as sequence
        from branches, locked
        where tenant_id = $1::uuid
      ), eligible as (
        select candidate.sequence
        from candidate
        inner join regions region on
          region.id = $3::uuid and
          region.tenant_id = $1::uuid and
          region.is_active = true
        where ($8::uuid is null or exists (
          select 1 from users manager
          where manager.id = $8::uuid
            and manager.tenant_id = $1::uuid
            and manager.role = 'branch_manager'
            and manager.is_active = true
            and manager.is_email_verified = true
        ))
          and ($2::text <> '' or candidate.sequence <= 999999)
      ), created as (
        insert into branches (
          tenant_id, region_id, code, name, city, address, phone, manager_id,
          open_time, close_time, is_active, is_archived
        )
        select $1::uuid, $3::uuid,
          coalesce(nullif($2::text, ''), 'F-' || lpad(eligible.sequence::text, 2, '0')),
          $4::text, $5::text, $6::text, $7::text, $8::uuid,
          $9::text, $10::text, false, false
        from eligible
        returning *
      ), audited as (
        insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
        select $1::uuid, $11::uuid, 'branch.create', 'branch', created.id::text,
          jsonb_build_object(
            'code', created.code,
            'region_id', created.region_id,
            'manager_id', created.manager_id,
            'is_active', created.is_active
          )::text
        from created
      )
      select * from created
    `, [
      session.user.tenant_id,
      requestedCode || null,
      regionId,
      name,
      city,
      address,
      phone,
      managerId,
      openTime,
      closeTime,
      session.user.id,
    ])
    const created = createdRows[0]
    if (!created) {
      if (!requestedCode) {
        const existingCodes = await db.select({ code: branches.code }).from(branches)
          .where(eq(branches.tenant_id, session.user.tenant_id))
        try {
          nextBranchCode(existingCodes.map((branch) => branch.code))
        } catch (error) {
          if (error instanceof Error && error.message === 'BRANCH_SEQUENCE_INVALID') {
            return NextResponse.json(
              { code: 'BRANCH_CODE_EXHAUSTED', error: 'Yeni filial kodu üçün sıra tükənib' },
              { status: 409 },
            )
          }
          throw error
        }
      }
      return NextResponse.json(
        { code: 'BRANCH_SETUP_CHANGED', error: 'Bölgə və ya filial müdiri məlumatı dəyişib' },
        { status: 409 },
      )
    }

    const [canonical] = await db.select({
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
      .where(and(eq(branches.id, String(created.id)), eq(branches.tenant_id, session.user.tenant_id)))
      .limit(1)
    if (!canonical) throw new Error('BRANCH_READBACK_FAILED')

    return NextResponse.json({ branch: { ...canonical, pending_manager_invitation: null } }, { status: 201 })
  } catch (error) {
    if (isUniqueViolation(error, 'branches_tenant_code_uq')) {
      return NextResponse.json({ code: 'BRANCH_CODE_CONFLICT', error: 'Bu filial kodu artıq istifadə olunur' }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : ''
    if (['TEXT_REQUIRED', 'TEXT_LENGTH_INVALID', 'TEXT_TOO_LONG', 'PHONE_INVALID', 'TIME_INVALID'].includes(message)) {
      return NextResponse.json({ error: 'Filial məlumatlarından biri düzgün deyil' }, { status: 400 })
    }
    console.error('Branch create error:', error)
    return NextResponse.json({ error: 'Filial yaradıla bilmədi' }, { status: 500 })
  }
}
