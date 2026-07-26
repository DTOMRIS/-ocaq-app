import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { quality_form_submissions } from '@/db/schema/quality-forms'
import { accessibleBranchIds } from '@/lib/branch-access'
import { qualityFormBranchIds } from '@/lib/quality-form-scope'
import { canUseQualityForms } from '@/lib/quality-form-access'
import { getQualityFormDefinition } from '@/data/quality-form-catalog'
import {
  isIsoDate,
  isQualityFormIdempotencyKey,
  validateQualityFormPayload,
  validateQualityFormPeriod,
} from '@/lib/quality-form-validation'

const CREATE_FIELDS = [
  'branch_id',
  'form_key',
  'period_start',
  'period_end',
  'payload',
  'idempotency_key',
  'submit',
] as const

const STATUSES = new Set(['draft', 'submitted', 'approved', 'voided'])

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const keys = new Set(allowed)
  return Object.keys(value).every((key) => keys.has(key))
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!canUseQualityForms(session.user.role, 'submission.view')) {
    return NextResponse.json({ error: 'Keyfiyyət formalarına baxmaq icazəniz yoxdur' }, { status: 403 })
  }

  try {
    const branchIds = await qualityFormBranchIds(session.user, 'history')
    if (branchIds.length === 0) return NextResponse.json([])

    const branchId = req.nextUrl.searchParams.get('branch_id')
    const formKey = req.nextUrl.searchParams.get('form_key')
    const status = req.nextUrl.searchParams.get('status')
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')
    const includeHistory = req.nextUrl.searchParams.get('history') === 'all'

    if (branchId && !branchIds.includes(branchId)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }
    if (formKey && !getQualityFormDefinition(formKey)) {
      return NextResponse.json({ error: 'Forma tapılmadı' }, { status: 400 })
    }
    if (status && !STATUSES.has(status)) {
      return NextResponse.json({ error: 'Status düzgün deyil' }, { status: 400 })
    }
    if ((from && !isIsoDate(from)) || (to && !isIsoDate(to))) {
      return NextResponse.json({ error: 'Tarix filtri düzgün deyil' }, { status: 400 })
    }

    const conditions: SQL[] = [
      eq(quality_form_submissions.tenant_id, session.user.tenant_id),
      branchId
        ? eq(quality_form_submissions.branch_id, branchId)
        : inArray(quality_form_submissions.branch_id, branchIds),
    ]
    if (formKey) conditions.push(eq(quality_form_submissions.form_key, formKey))
    if (status) conditions.push(eq(quality_form_submissions.status, status))
    if (from) conditions.push(gte(quality_form_submissions.period_start, from))
    if (to) conditions.push(lte(quality_form_submissions.period_end, to))
    if (!includeHistory) conditions.push(eq(quality_form_submissions.is_current, true))

    const rows = await db.select({
      id: quality_form_submissions.id,
      branch_id: quality_form_submissions.branch_id,
      branch_code: branches.code,
      branch_name: branches.name,
      form_key: quality_form_submissions.form_key,
      document_number: quality_form_submissions.document_number,
      form_variant: quality_form_submissions.form_variant,
      template_revision: quality_form_submissions.template_revision,
      record_revision: quality_form_submissions.record_revision,
      is_current: quality_form_submissions.is_current,
      replaces_submission_id: quality_form_submissions.replaces_submission_id,
      correction_reason: quality_form_submissions.correction_reason,
      period_start: quality_form_submissions.period_start,
      period_end: quality_form_submissions.period_end,
      status: quality_form_submissions.status,
      created_by: quality_form_submissions.created_by,
      submitted_by: quality_form_submissions.submitted_by,
      submitted_at: quality_form_submissions.submitted_at,
      approved_by: quality_form_submissions.approved_by,
      approved_at: quality_form_submissions.approved_at,
      voided_at: quality_form_submissions.voided_at,
      created_at: quality_form_submissions.created_at,
    }).from(quality_form_submissions)
      .innerJoin(branches, and(
        eq(branches.id, quality_form_submissions.branch_id),
        eq(branches.tenant_id, quality_form_submissions.tenant_id),
      ))
      .where(and(...conditions))
      .orderBy(desc(quality_form_submissions.created_at))
      .limit(500)

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Quality form list error:', error)
    return NextResponse.json({ error: 'Keyfiyyət formaları yüklənmədi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!canUseQualityForms(session.user.role, 'submission.create')) {
    return NextResponse.json({ error: 'Yeni forma yaratmaq icazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || !hasOnlyKeys(body, CREATE_FIELDS)) {
    return NextResponse.json({ error: 'Forma sorğusu düzgün deyil' }, { status: 400 })
  }

  const branchId = typeof body.branch_id === 'string' ? body.branch_id : ''
  const formKey = typeof body.form_key === 'string' ? body.form_key : ''
  const definition = getQualityFormDefinition(formKey)
  if (!branchId || !definition) {
    return NextResponse.json({ error: 'Filial və forma seçilməlidir' }, { status: 400 })
  }
  if (!isQualityFormIdempotencyKey(body.idempotency_key)) {
    return NextResponse.json({ error: 'Göndərmə açarı düzgün deyil' }, { status: 400 })
  }

  const periodError = validateQualityFormPeriod(formKey, body.period_start, body.period_end)
  if (periodError) return NextResponse.json({ error: periodError }, { status: 400 })
  const final = body.submit === true
  const payloadValidation = validateQualityFormPayload(formKey, body.payload, { final })
  if (!payloadValidation.ok) {
    return NextResponse.json({ error: payloadValidation.error }, { status: 400 })
  }

  try {
    const branchIds = await accessibleBranchIds(session.user)
    if (!branchIds.includes(branchId)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }

    const [prior] = await db.select().from(quality_form_submissions).where(and(
      eq(quality_form_submissions.tenant_id, session.user.tenant_id),
      eq(quality_form_submissions.idempotency_key, body.idempotency_key),
    )).limit(1)
    if (prior) return NextResponse.json(prior)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? null
    const status = final ? 'submitted' : 'draft'
    const rows = await sqlClient.query(`
      with created as (
        insert into quality_form_submissions (
          tenant_id, branch_id, form_key, document_number, form_variant,
          template_revision, template_sha256, record_revision,
          period_start, period_end, status, payload_json, idempotency_key,
          created_by, submitted_by, submitted_at
        ) values (
          $1::uuid, $2::uuid, $3::text, $4::text, $5::text,
          $6::text, $7::text, 1,
          $8::date, $9::date, $10::text, $11::text, $12::text,
          $13::uuid,
          case when $10::text = 'submitted' then $13::uuid else null end,
          case when $10::text = 'submitted' then now() else null end
        )
        returning *
      ), events as (
        insert into quality_form_events (
          tenant_id, submission_id, actor_id, action, snapshot_json, ip
        )
        select $1::uuid, created.id, $13::uuid, event.action, created.payload_json, $14::text
        from created
        cross join lateral (
          select 'created'::text as action
          union all
          select 'submitted'::text where created.status = 'submitted'
        ) event
      )
      select * from created
    `, [
      session.user.tenant_id,
      branchId,
      definition.key,
      definition.documentNumber,
      definition.variant,
      definition.revision,
      definition.sourceSha256,
      body.period_start,
      body.period_end,
      status,
      JSON.stringify(payloadValidation.payload),
      body.idempotency_key,
      session.user.id,
      ip,
    ])

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    const databaseError = error as { code?: string; constraint?: string }
    if (databaseError.code === '23505') {
      const [sameRequest] = await db.select().from(quality_form_submissions).where(and(
        eq(quality_form_submissions.tenant_id, session.user.tenant_id),
        eq(quality_form_submissions.idempotency_key, body.idempotency_key as string),
      )).limit(1)
      if (sameRequest) return NextResponse.json(sameRequest)
      return NextResponse.json(
        { error: 'Bu filial, forma və dövr üçün qeyd artıq mövcuddur' },
        { status: 409 },
      )
    }
    console.error('Quality form create error:', error)
    return NextResponse.json({ error: 'Forma yadda saxlanılmadı' }, { status: 500 })
  }
}
