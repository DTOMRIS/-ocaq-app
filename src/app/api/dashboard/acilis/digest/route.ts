import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { opening_dept_contacts } from '@/db/schema/acilis'
import { xulaseGonder } from '@/lib/acilis/digest'

export const runtime = 'nodejs'
const BASE = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'https://ocaq.dkagency.com.tr'

/**
 * Həftəlik departament xülasəsi.
 *
 * İki yolla çağırılır:
 *   · panel düyməsi (super_admin sessiyası)
 *   · cron → `Authorization: Bearer <CRON_SECRET>`
 *
 * `?dryRun=1` göndərmədən nə gedəcəyini qaytarır — kor-koranə spam olmasın.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const cronIle = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  let tenantId: string | null = null
  if (!cronIle) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
    tenantId = session.user.tenant_id
  } else {
    const b = await req.json().catch(() => ({})) as { tenantId?: string }
    tenantId = b.tenantId ?? null
    if (!tenantId) return NextResponse.json({ error: 'cron üçün tenantId lazımdır' }, { status: 400 })
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'

  try {
    // Məntiq `lib/acilis/digest.ts`-dədir — eyni iş cron ucundan da çağırılır.
    // Burada saxlasaydıq iki nüsxə ayrı-ayrı köhnələrdi.
    const n = await xulaseGonder(tenantId, BASE, dryRun)
    return NextResponse.json({ ok: true, dryRun, ...n })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}

/** Departament e-poçtlarını oxu/yaz. */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db.select().from(opening_dept_contacts)
    .where(eq(opening_dept_contacts.tenant_id, session.user.tenant_id))
  return NextResponse.json({ ok: true, contacts: rows.map(r => ({ id: r.id, dept: r.dept, email: r.email, active: r.is_active })) })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  try {
    const b = await req.json() as { dept?: string; email?: string; remove?: boolean }
    const dept = String(b.dept ?? '').trim(), email = String(b.email ?? '').trim().toLowerCase()
    if (!dept || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Departament və düzgün e-poçt lazımdır' }, { status: 400 })
    }
    if (b.remove) {
      await db.delete(opening_dept_contacts).where(and(
        eq(opening_dept_contacts.tenant_id, session.user.tenant_id),
        eq(opening_dept_contacts.dept, dept), eq(opening_dept_contacts.email, email)))
    } else {
      await db.insert(opening_dept_contacts)
        .values({ tenant_id: session.user.tenant_id, dept, email })
        .onConflictDoNothing()
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
