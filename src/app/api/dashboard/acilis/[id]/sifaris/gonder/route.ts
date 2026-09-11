import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, asc, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { openings, opening_orders, opening_dept_contacts } from '@/db/schema/acilis'
import { sendBulkEmail } from '@/lib/email'
import { sifarisMailHtml } from '@/lib/acilis/sifaris-mail'

export const runtime = 'nodejs'
const BASE = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'https://ocaq.dkagency.com.tr'

/**
 * Bir departamentin sifariş siyahısını e-poçtla göndərir və sətirləri
 * «sifariş verildi» edir.
 *
 * BLOKLAR (səssiz keçmir — səbəb qaytarılır):
 *   · miqdarı boş sətir varsa → ölçü girilməyib, göndəriş dayanır
 *   · departamentin e-poçtu yoxdursa → kimə getdiyi bilinməyən poçt olmaz
 *
 * `?dryRun=1` → göndərmədən nə gedəcəyini qaytarır.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const { id } = await params
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  try {
    const b = await req.json() as { dept?: string }
    const dept = String(b.dept ?? '').trim()
    if (!dept) return NextResponse.json({ error: 'dept lazımdır' }, { status: 400 })

    const tenantId = session.user.tenant_id
    const [op] = await db.select().from(openings)
      .where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId))).limit(1)
    if (!op) return NextResponse.json({ error: 'Açılış tapılmadı' }, { status: 404 })

    const rows = await db.select().from(opening_orders)
      .where(and(eq(opening_orders.opening_id, id), eq(opening_orders.dept, dept),
                 ne(opening_orders.status, 'lazim_deyil')))
      .orderBy(asc(opening_orders.kat), asc(opening_orders.ad))
    if (!rows.length) {
      return NextResponse.json({ error: `${dept} üçün göndəriləcək sətir yoxdur` }, { status: 400 })
    }

    // Miqdarsız sətir getsə anbar «neçə?» deyə geri yazır və bir gün itir
    const eksik = rows.filter(r => r.qty == null)
    if (eksik.length) {
      return NextResponse.json({
        error: `${eksik.length} sətrin miqdarı boşdur — ölçüləri doldurun: ${eksik.map(r => r.ad).join(', ')}`,
      }, { status: 400 })
    }

    const contacts = await db.select().from(opening_dept_contacts)
      .where(and(eq(opening_dept_contacts.tenant_id, tenantId),
                 eq(opening_dept_contacts.dept, dept),
                 eq(opening_dept_contacts.is_active, true)))
    const emails = contacts.map(c => c.email)
    if (!emails.length) {
      return NextResponse.json({
        error: `«${dept}» üçün e-poçt təyin edilməyib — Açılış → Departament səhifəsindən əlavə edin`,
      }, { status: 400 })
    }

    const html = sifarisMailHtml({
      filial: op.name, dept, baseUrl: BASE, openingId: id,
      acilisTarixi: op.planned_open_date,
      setirler: rows.map(r => ({ kat: r.kat, ad: r.ad, qty: r.qty, vahid: r.vahid, qeyd: r.qeyd })),
    })
    const subject = `Yeni filial sifarişi — ${op.name} · ${dept} (${rows.length} sətir)`

    if (dryRun) return NextResponse.json({ ok: true, dryRun: true, dept, emails, setir: rows.length })

    // Poçt uğursuz olsa status DƏYİŞMİR — «göndərildi» yazıb göndərməmək ən pisidir
    await sendBulkEmail({ emails, subject, html })

    await db.update(opening_orders)
      .set({ status: 'sifaris_verildi', updated_at: new Date() })
      .where(and(eq(opening_orders.opening_id, id),
                 inArray(opening_orders.id, rows.map(r => r.id))))

    return NextResponse.json({ ok: true, dept, emails, setir: rows.length })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
