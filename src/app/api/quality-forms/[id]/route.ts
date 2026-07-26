import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { quality_form_submissions } from '@/db/schema/quality-forms'
import { accessibleBranchIds } from '@/lib/branch-access'
import { qualityFormBranchIds } from '@/lib/quality-form-scope'
import { canUseQualityForms } from '@/lib/quality-form-access'
import {
  isQualityFormIdempotencyKey,
  validateQualityFormPayload,
} from '@/lib/quality-form-validation'

type Context = { params: Promise<{ id: string }> }

const ACTION_FIELDS: Record<string, readonly string[]> = {
  save_draft: ['action', 'payload', 'expected_version'],
  submit: ['action', 'expected_version'],
  approve: ['action', 'reason', 'expected_version'],
  void: ['action', 'reason', 'expected_version'],
  correct: ['action', 'reason', 'payload', 'idempotency_key', 'expected_version'],
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const keys = new Set(allowed)
  return Object.keys(value).every((key) => keys.has(key))
}

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!canUseQualityForms(session.user.role, 'submission.view')) {
    return NextResponse.json({ error: 'Baxmaq icazəniz yoxdur' }, { status: 403 })
  }

  const { id } = await params
  const [record] = await db.select().from(quality_form_submissions).where(and(
    eq(quality_form_submissions.id, id),
    eq(quality_form_submissions.tenant_id, session.user.tenant_id),
  )).limit(1)
  if (!record) return NextResponse.json({ error: 'Forma qeydi tapılmadı' }, { status: 404 })

  const branchIds = await qualityFormBranchIds(session.user, 'history')
  if (!branchIds.includes(record.branch_id)) {
    return NextResponse.json({ error: 'Forma qeydi tapılmadı' }, { status: 404 })
  }
  return NextResponse.json({ ...record, payload: JSON.parse(record.payload_json) })
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const action = typeof body?.action === 'string' ? body.action : ''
  const allowedFields = ACTION_FIELDS[action]
  if (!body || !allowedFields || !hasOnlyKeys(body, allowedFields)) {
    return NextResponse.json({ error: 'Forma əməliyyatı düzgün deyil' }, { status: 400 })
  }

  const { id } = await params
  const [record] = await db.select().from(quality_form_submissions).where(and(
    eq(quality_form_submissions.id, id),
    eq(quality_form_submissions.tenant_id, session.user.tenant_id),
  )).limit(1)
  if (!record) return NextResponse.json({ error: 'Forma qeydi tapılmadı' }, { status: 404 })

  const branchIds = action === 'save_draft' || action === 'submit'
    ? await accessibleBranchIds(session.user)
    : await qualityFormBranchIds(session.user, 'history')
  if (!branchIds.includes(record.branch_id)) {
    return NextResponse.json({ error: 'Forma qeydi tapılmadı' }, { status: 404 })
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const expectedVersion = Number(body.expected_version)
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return NextResponse.json({ error: 'Qeyd versiyası tələb olunur' }, { status: 400 })
  }
  if (record.version !== expectedVersion) {
    return NextResponse.json(
      { code: 'FORM_VERSION_STALE', error: 'Forma başqa pəncərədə dəyişib; səhifəni yeniləyin' },
      { status: 409 },
    )
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null

  try {
    if (action === 'save_draft') {
      if (!canUseQualityForms(session.user.role, 'submission.create')) {
        return NextResponse.json({ error: 'Taslak saxlamaq icazəniz yoxdur' }, { status: 403 })
      }
      if (record.status !== 'draft') {
        return NextResponse.json({ error: 'Göndərilmiş forma dəyişdirilə bilməz' }, { status: 409 })
      }
      const validation = validateQualityFormPayload(record.form_key, body.payload, { final: false })
      if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

      const rows = await sqlClient.query(`
        with updated as (
          update quality_form_submissions set
            payload_json = $5::text,
            version = version + 1,
            updated_at = now()
          where id = $1::uuid and tenant_id = $2::uuid
            and status = 'draft' and version = $4::integer
          returning *
        ), event as (
          insert into quality_form_events (
            tenant_id, submission_id, actor_id, action, snapshot_json, ip
          )
          select $2::uuid, updated.id, $3::uuid, 'draft_updated', updated.payload_json, $6::text
          from updated
        )
        select * from updated
      `, [
        id,
        session.user.tenant_id,
        session.user.id,
        expectedVersion,
        JSON.stringify(validation.payload),
        ip,
      ])
      if (!rows[0]) {
        return NextResponse.json(
          { code: 'FORM_VERSION_STALE', error: 'Forma başqa pəncərədə dəyişib; səhifəni yeniləyin' },
          { status: 409 },
        )
      }
      return NextResponse.json(rows[0])
    }

    if (action === 'submit') {
      if (!canUseQualityForms(session.user.role, 'submission.create')) {
        return NextResponse.json({ error: 'Göndərmək icazəniz yoxdur' }, { status: 403 })
      }
      if (record.status !== 'draft') {
        return NextResponse.json({ error: 'Yalnız taslak forma göndərilə bilər' }, { status: 409 })
      }
      const validation = validateQualityFormPayload(
        record.form_key,
        JSON.parse(record.payload_json),
        { final: true },
      )
      if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

      const rows = await transition({
        id,
        tenantId: session.user.tenant_id,
        actorId: session.user.id,
        fromStatus: 'draft',
        toStatus: 'submitted',
        event: 'submitted',
        expectedVersion,
        ip,
      })
      if (!rows[0]) return NextResponse.json({ error: 'Forma vəziyyəti dəyişib' }, { status: 409 })
      return NextResponse.json(rows[0])
    }

    if (action === 'approve') {
      if (!canUseQualityForms(session.user.role, 'submission.approve')) {
        return NextResponse.json({ error: 'Təsdiq icazəniz yoxdur' }, { status: 403 })
      }
      if (record.status !== 'submitted') {
        return NextResponse.json({ error: 'Yalnız göndərilmiş forma təsdiqlənə bilər' }, { status: 409 })
      }
      if (!record.is_current) {
        return NextResponse.json({ error: 'Əvvəlki reviziya təsdiqlənə bilməz' }, { status: 409 })
      }
      if (record.submitted_by === session.user.id && session.user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Öz göndərdiyiniz formanı təsdiqləyə bilməzsiniz' }, { status: 409 })
      }
      if (record.submitted_by === session.user.id && reason.length < 5) {
        return NextResponse.json(
          { error: 'Süper admin öz göndərişini təsdiqləyirsə səbəb yazmalıdır' },
          { status: 400 },
        )
      }

      const rows = await transition({
        id,
        tenantId: session.user.tenant_id,
        actorId: session.user.id,
        fromStatus: 'submitted',
        toStatus: 'approved',
        event: 'approved',
        expectedVersion,
        reason: reason || null,
        ip,
      })
      if (!rows[0]) return NextResponse.json({ error: 'Forma vəziyyəti dəyişib' }, { status: 409 })
      return NextResponse.json(rows[0])
    }

    if (action === 'void') {
      if (!canUseQualityForms(session.user.role, 'submission.void')) {
        return NextResponse.json({ error: 'Ləğv icazəniz yoxdur' }, { status: 403 })
      }
      if (record.status === 'voided') return NextResponse.json(record)
      if (reason.length < 5) {
        return NextResponse.json({ error: 'Ləğv səbəbi ən az 5 simvol olmalıdır' }, { status: 400 })
      }
      const rows = await transition({
        id,
        tenantId: session.user.tenant_id,
        actorId: session.user.id,
        fromStatus: record.status,
        toStatus: 'voided',
        event: 'voided',
        expectedVersion,
        reason,
        ip,
      })
      if (!rows[0]) return NextResponse.json({ error: 'Forma vəziyyəti dəyişib' }, { status: 409 })
      return NextResponse.json(rows[0])
    }

    if (!canUseQualityForms(session.user.role, 'submission.correct')) {
      return NextResponse.json({ error: 'Düzəliş icazəniz yoxdur' }, { status: 403 })
    }
    if (!['submitted', 'approved'].includes(record.status)) {
      return NextResponse.json({ error: 'Yalnız göndərilmiş və ya təsdiqli forma düzəldilə bilər' }, { status: 409 })
    }
    if (!record.is_current) {
      return NextResponse.json({ error: 'Yalnız cari reviziya düzəldilə bilər' }, { status: 409 })
    }
    if (reason.length < 5) {
      return NextResponse.json({ error: 'Düzəliş səbəbi ən az 5 simvol olmalıdır' }, { status: 400 })
    }
    if (!isQualityFormIdempotencyKey(body.idempotency_key)) {
      return NextResponse.json({ error: 'Göndərmə açarı düzgün deyil' }, { status: 400 })
    }
    const validation = validateQualityFormPayload(record.form_key, body.payload, { final: false })
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

    const rows = await sqlClient.query(`
      with locked as (
        select * from quality_form_submissions
        where id = $1::uuid and tenant_id = $2::uuid and version = $8::integer
        for update
      ), retired as (
        update quality_form_submissions original set
          is_current = false,
          version = original.version + 1,
          updated_at = now()
        from locked
        where original.id = locked.id
        returning original.*
      ), created as (
        insert into quality_form_submissions (
          tenant_id, branch_id, form_key, document_number, form_variant,
          template_revision, template_sha256, record_revision,
          replaces_submission_id, correction_reason,
          period_start, period_end, status, payload_json, idempotency_key, created_by
        )
        select
          tenant_id, branch_id, form_key, document_number, form_variant,
          template_revision, template_sha256, record_revision + 1,
          id, $4::text,
          period_start, period_end, 'draft', $5::text, $6::text, $3::uuid
        from retired
        where status in ('submitted', 'approved')
        returning *
      ), old_event as (
        insert into quality_form_events (
          tenant_id, submission_id, actor_id, action, reason, snapshot_json, ip
        )
        select $2::uuid, retired.id, $3::uuid, 'superseded', $4::text, retired.payload_json, $7::text
        from retired
      ), new_event as (
        insert into quality_form_events (
          tenant_id, submission_id, actor_id, action, reason, snapshot_json, ip
        )
        select $2::uuid, created.id, $3::uuid, 'correction_created', $4::text, created.payload_json, $7::text
        from created
      )
      select * from created
    `, [
      id,
      session.user.tenant_id,
      session.user.id,
      reason,
      JSON.stringify(validation.payload),
      body.idempotency_key,
      ip,
      expectedVersion,
    ])
    if (!rows[0]) return NextResponse.json({ error: 'Forma vəziyyəti dəyişib' }, { status: 409 })
    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    const databaseError = error as { code?: string }
    if (databaseError.code === '23505') {
      return NextResponse.json({ error: 'Bu düzəliş artıq yaradılıb' }, { status: 409 })
    }
    console.error('Quality form transition error:', error)
    return NextResponse.json({ error: 'Forma əməliyyatı tamamlanmadı' }, { status: 500 })
  }
}

async function transition({
  id,
  tenantId,
  actorId,
  fromStatus,
  toStatus,
  event,
  expectedVersion,
  reason = null,
  ip,
}: {
  id: string
  tenantId: string
  actorId: string
  fromStatus: string
  toStatus: string
  event: string
  expectedVersion: number
  reason?: string | null
  ip: string | null
}) {
  return sqlClient.query(`
    with updated as (
      update quality_form_submissions set
        status = $5::text,
        submitted_by = case when $5::text = 'submitted' then $3::uuid else submitted_by end,
        submitted_at = case when $5::text = 'submitted' then now() else submitted_at end,
        approved_by = case when $5::text = 'approved' then $3::uuid else approved_by end,
        approved_at = case when $5::text = 'approved' then now() else approved_at end,
        voided_by = case when $5::text = 'voided' then $3::uuid else voided_by end,
        voided_at = case when $5::text = 'voided' then now() else voided_at end,
        void_reason = case when $5::text = 'voided' then $7::text else void_reason end,
        version = version + 1,
        updated_at = now()
      where id = $1::uuid and tenant_id = $2::uuid and status = $4::text
        and version = $9::integer
      returning *
    ), event as (
      insert into quality_form_events (
        tenant_id, submission_id, actor_id, action, reason, snapshot_json, ip
      )
      select $2::uuid, updated.id, $3::uuid, $6::text, $7::text, updated.payload_json, $8::text
      from updated
    )
    select * from updated
  `, [id, tenantId, actorId, fromStatus, toStatus, event, reason, ip, expectedVersion])
}
