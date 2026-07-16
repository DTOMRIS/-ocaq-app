import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { checklists } from '@/db/schema/checklists'
import { regions } from '@/db/schema/regions'
import {
  getBakuBusinessDate,
  isChecklistShift,
  isIdempotencyKey,
  validateChecklistAnswers,
} from '@/lib/checklist-validation'
import { privateObjectExists } from '@/lib/r2'

const MANAGER_ROLES = new Set(['super_admin', 'region_manager', 'branch_manager'])

async function accessibleBranchIds(session: Session): Promise<string[]> {
  const tenantId = session.user.tenant_id
  const role = session.user.role

  if (role === 'super_admin') {
    const rows = await db.select({ id: branches.id }).from(branches).where(and(
      eq(branches.tenant_id, tenantId),
      eq(branches.is_archived, false),
      eq(branches.is_active, true),
    ))
    return rows.map((row) => row.id)
  }

  if (role === 'region_manager') {
    const rows = await db
      .select({ id: branches.id })
      .from(branches)
      .innerJoin(regions, eq(branches.region_id, regions.id))
      .where(and(
        eq(branches.tenant_id, tenantId),
        eq(branches.is_archived, false),
        eq(branches.is_active, true),
        eq(regions.tenant_id, tenantId),
        eq(regions.manager_id, session.user.id),
      ))
    return rows.map((row) => row.id)
  }

  const rows = await db.select({ id: branches.id }).from(branches).where(and(
    eq(branches.tenant_id, tenantId),
    eq(branches.manager_id, session.user.id),
    eq(branches.is_archived, false),
    eq(branches.is_active, true),
  ))
  return rows.map((row) => row.id)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (session.user.role !== 'branch_manager') {
    return NextResponse.json({ error: 'Gündəlik checklist-i yalnız filial müdiri göndərə bilər' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Sorğu düzgün formatda deyil' }, { status: 400 })
  }

  const branchId = body.branch_id
  if (typeof branchId !== 'string' || !branchId) {
    return NextResponse.json({ error: 'Filial seçilməlidir' }, { status: 400 })
  }
  if (!isChecklistShift(body.shift)) {
    return NextResponse.json({ error: 'Vardiya düzgün deyil' }, { status: 400 })
  }
  if (!isIdempotencyKey(body.idempotency_key)) {
    return NextResponse.json({ error: 'Göndərmə açarı düzgün deyil' }, { status: 400 })
  }
  const shift = body.shift
  const idempotencyKey = body.idempotency_key

  try {
    const branchIds = await accessibleBranchIds(session)
    if (!branchIds.includes(branchId)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }

    const validation = validateChecklistAnswers(body.items, {
      tenantId: session.user.tenant_id,
      branchId,
      userId: session.user.id,
    })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const [priorSubmission] = await db.select().from(checklists).where(and(
      eq(checklists.tenant_id, session.user.tenant_id),
      eq(checklists.idempotency_key, idempotencyKey),
    )).limit(1)
    if (priorSubmission) {
      return NextResponse.json(priorSubmission)
    }

    const evidenceKeys = Object.values(validation.answers)
      .flatMap((answer) => answer.photoKey ? [answer.photoKey] : [])
    if (evidenceKeys.length > 0) {
      const evidenceChecks = await Promise.all(evidenceKeys.map((key) => privateObjectExists(key)))
      if (evidenceChecks.some((exists) => !exists)) {
        return NextResponse.json({ error: 'Checklist fotolarından biri tapılmadı' }, { status: 400 })
      }
    }

    const businessDate = getBakuBusinessDate()
    const managerName = session.user.name?.trim() || session.user.email?.trim() || session.user.id

    const rows = await sqlClient.query(`
      with created as (
        insert into checklists (
          tenant_id, branch_id, completed_by, checked_by, completed_by_user_id,
          business_date, idempotency_key, shift, score_pct, items_json
        ) values (
          $1::uuid, $2::uuid, $3::text, $3::text, $4::uuid,
          $5::date, $6::text, $7::text, $8::integer, $9::text
        )
        returning *
      ), audited as (
        insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
        select $1::uuid, $4::uuid, 'checklist.submit', 'checklist', created.id::text,
          jsonb_build_object(
            'branch_id', $2::uuid,
            'business_date', $5::date,
            'shift', $7::text,
            'score_pct', $8::integer,
            'checked_count', $10::integer
          )::text
        from created
      )
      select * from created
    `, [
      session.user.tenant_id,
      branchId,
      managerName,
      session.user.id,
      businessDate,
      idempotencyKey,
      shift,
      validation.scorePct,
      JSON.stringify(validation.answers),
      validation.checkedCount,
    ])
    const entry = rows[0]

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    const databaseError = error as { code?: string; constraint?: string }
    if (databaseError.code === '23505') {
      const [sameRequest] = await db.select().from(checklists).where(and(
        eq(checklists.tenant_id, session.user.tenant_id),
        eq(checklists.idempotency_key, body.idempotency_key as string),
      )).limit(1)
      if (sameRequest) return NextResponse.json(sameRequest)

      return NextResponse.json(
        { error: 'Bu filial və vardiya üçün bugünkü checklist artıq göndərilib' },
        { status: 409 },
      )
    }
    console.error('Checklist insert error:', error)
    return NextResponse.json({ error: 'Checklist yadda saxlanılmadı' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!MANAGER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: 'Checklist yalnız menecerlər üçündür' }, { status: 403 })
  }

  try {
    const branchIds = await accessibleBranchIds(session)
    if (branchIds.length === 0) return NextResponse.json([])

    if (req.nextUrl.searchParams.get('view') === 'branches') {
      const list = await db.select({
        id: branches.id,
        code: branches.code,
        name: branches.name,
      }).from(branches).where(and(
        eq(branches.tenant_id, session.user.tenant_id),
        inArray(branches.id, branchIds),
      )).orderBy(branches.code)
      return NextResponse.json(list)
    }

    const requestedBranchId = req.nextUrl.searchParams.get('branch_id')
    if (requestedBranchId && !branchIds.includes(requestedBranchId)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }

    const conditions = [
      eq(checklists.tenant_id, session.user.tenant_id),
      requestedBranchId
        ? eq(checklists.branch_id, requestedBranchId)
        : inArray(checklists.branch_id, branchIds),
    ]
    const list = await db.select().from(checklists)
      .where(and(...conditions))
      .orderBy(desc(checklists.created_at))
      .limit(200)

    return NextResponse.json(list)
  } catch (error) {
    console.error('Checklist fetch error:', error)
    return NextResponse.json({ error: 'Checklist-lər yüklənmədi' }, { status: 500 })
  }
}
