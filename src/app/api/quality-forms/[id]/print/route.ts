import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { quality_form_events, quality_form_submissions } from '@/db/schema/quality-forms'
import { canUseQualityForms } from '@/lib/quality-form-access'
import { qualityFormBranchIds } from '@/lib/quality-form-scope'

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!canUseQualityForms(session.user.role, 'submission.print')) {
    return NextResponse.json({ error: 'Çap icazəniz yoxdur' }, { status: 403 })
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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null
  await db.insert(quality_form_events).values({
    tenant_id: session.user.tenant_id,
    submission_id: record.id,
    actor_id: session.user.id,
    action: 'printed',
    snapshot_json: record.payload_json,
    ip,
  })

  return NextResponse.json({
    success: true,
    print_url: `/dashboard/quality-forms/records/${record.id}/print`,
  })
}
