import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { audit_logs } from '@/db/schema/auth'
import { desc, eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const list = await db
      .select()
      .from(audit_logs)
      .where(eq(audit_logs.tenant_id, session.user.tenant_id))
      .orderBy(desc(audit_logs.created_at))
      .limit(100)

    return NextResponse.json(list)
  } catch (err) {
    console.error('Fetch audit logs error:', err)
    return NextResponse.json({ error: 'Server xətası' }, { status: 500 })
  }
}
