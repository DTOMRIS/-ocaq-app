import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { openings, opening_tasks, opening_dept_contacts } from '@/db/schema/acilis'
import { sendBulkEmail } from '@/lib/email'
import { digestHtml, type DigestVezife } from '@/lib/acilis/digest'

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
    const ops = await db.select().from(openings)
      .where(and(eq(openings.tenant_id, tenantId), ne(openings.status, 'dayandirildi'), ne(openings.status, 'acildi')))
    const opMap = new Map(ops.map(o => [o.id, o.name]))
    if (!ops.length) return NextResponse.json({ ok: true, gonderilen: 0, qeyd: 'Aktiv açılış yoxdur' })

    const tasks = await db.select().from(opening_tasks).where(eq(opening_tasks.tenant_id, tenantId))
    const contacts = await db.select().from(opening_dept_contacts)
      .where(and(eq(opening_dept_contacts.tenant_id, tenantId), eq(opening_dept_contacts.is_active, true)))
    if (!contacts.length) return NextResponse.json({ ok: true, gonderilen: 0, qeyd: 'Departament e-poçtu təyin edilməyib' })

    const bugun = new Date().toISOString().slice(0, 10)
    const hefteSonu = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

    const byDept = new Map<string, { gecikmis: DigestVezife[]; buHefte: DigestVezife[]; acik: number }>()
    for (const t of tasks) {
      const ad = opMap.get(t.opening_id)
      if (!ad) continue
      if (t.status === 'bitdi' || t.status === 'tetbiq_olunmur') continue
      const e = byDept.get(t.dept) ?? { gecikmis: [], buHefte: [], acik: 0 }
      e.acik++
      const v: DigestVezife = { opening: ad, task: t.task, dueDate: t.due_date, gate: t.gate }
      if (t.due_date && t.due_date < bugun) e.gecikmis.push(v)
      else if (t.due_date && t.due_date <= hefteSonu) e.buHefte.push(v)
      byDept.set(t.dept, e)
    }
    for (const e of byDept.values()) {
      e.gecikmis.sort((a, b) => (a.dueDate ?? '') < (b.dueDate ?? '') ? -1 : 1)
      e.buHefte.sort((a, b) => (a.dueDate ?? '') < (b.dueDate ?? '') ? -1 : 1)
    }

    const netice: Array<{ dept: string; alicilar: number; gecikmis: number; buHefte: number }> = []
    for (const [dept, e] of byDept) {
      const html = digestHtml({ dept, gecikmis: e.gecikmis, buHefte: e.buHefte, acikCemi: e.acik, baseUrl: BASE })
      if (!html) continue                                    // gecikən/yaxın iş yoxdursa SUSUR
      const alicilar = contacts.filter(c => c.dept === dept).map(c => c.email)
      if (!alicilar.length) continue
      netice.push({ dept, alicilar: alicilar.length, gecikmis: e.gecikmis.length, buHefte: e.buHefte.length })
      if (!dryRun) {
        await sendBulkEmail({ emails: alicilar, subject: `Açılış — ${dept} · həftəlik xülasə`, html })
      }
    }
    return NextResponse.json({ ok: true, dryRun, gonderilen: netice.length, netice })
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
