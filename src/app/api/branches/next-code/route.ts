import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { nextBranchCode } from '@/lib/branch-lifecycle'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const rows = await db.select({ code: branches.code }).from(branches)
    .where(eq(branches.tenant_id, session.user.tenant_id))
  try {
    return NextResponse.json(
      { code: nextBranchCode(rows.map((branch) => branch.code)) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'BRANCH_SEQUENCE_INVALID') {
      return NextResponse.json(
        { code: 'BRANCH_CODE_EXHAUSTED', error: 'Yeni filial kodu üçün sıra tükənib' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    throw error
  }
}
