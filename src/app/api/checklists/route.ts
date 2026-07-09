import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { checklists } from '@/db/schema/checklists'
import { audit_logs } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { branch_id, completed_by, checked_by, shift, score_pct, items } = body

  if (!completed_by || !checked_by || !shift || score_pct === undefined || !items) {
    return NextResponse.json({ error: 'Məlumatlar natamamdır' }, { status: 400 })
  }

  try {
    const [entry] = await db
      .insert(checklists)
      .values({
        tenant_id:    session.user.tenant_id,
        branch_id:    branch_id || null,
        completed_by,
        checked_by,
        shift,
        score_pct:    Number(score_pct),
        items_json:   JSON.stringify(items),
      })
      .returning()

    // Audit log yaz
    await db.insert(audit_logs).values({
      tenant_id:  session.user.tenant_id,
      user_id:    session.user.id,
      action:     'checklist.submit',
      entity:     'checklist',
      entity_id:  entry.id,
      metadata:   JSON.stringify({ branch_id, shift, score_pct }),
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    console.error('Checklist insert error:', err)
    return NextResponse.json({ error: 'Server xətası baş verdi' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branch_id = searchParams.get('branch_id')

  const conditions = [eq(checklists.tenant_id, session.user.tenant_id)]
  if (branch_id) conditions.push(eq(checklists.branch_id, branch_id))

  try {
    const list = await db
      .select()
      .from(checklists)
      .where(and(...conditions))
      .orderBy(checklists.created_at)

    return NextResponse.json(list)
  } catch (err) {
    console.error('Checklist fetch error:', err)
    return NextResponse.json({ error: 'Server xətası' }, { status: 500 })
  }
}
