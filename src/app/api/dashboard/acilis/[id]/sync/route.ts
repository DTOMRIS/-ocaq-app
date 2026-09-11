import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { openings, opening_tasks } from '@/db/schema/acilis'
import { vezifeYarat, type AcilisProfil, type AcilisFormat } from '@/lib/acilis/template'

export const runtime = 'nodejs'

/**
 * Mövcud açılışın vəzifə siyahısını CARİ şablonla uyğunlaşdırır.
 *
 * NİYƏ LAZIMDIR: vəzifələr açılış yaradılanda şablondan KOPYALANIR (tarixçə
 * qorunsun deyə). Şablon sonradan düzəlsə — səhv söz, təkrar sətir, silinmiş
 * vəzifə — köhnə açılış həmin səhvi ekranda saxlayır. Bu düymə onu təmizləyir.
 *
 * QAYDALAR (data itkisi olmasın):
 *   · şablonda var, bazada yox   → ƏLAVƏ edilir
 *   · hər ikisində var           → note/cond/tarix YENİLƏNİR;
 *                                  status, şərh, məsul şəxs TOXUNULMUR
 *   · bazada var, şablonda yox:
 *       — üzərində iş YOXDUR (gözləyir, şərhsiz, məsulsuz) → SİLİNİR
 *       — üzərində iş VAR                                  → SAXLANILIR və
 *         cavabda ayrıca sadalanır ki, əl ilə baxılsın
 *
 * `?dryRun=1` → heç nə dəyişmir, yalnız nə olacağı qaytarılır.
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
    const tenantId = session.user.tenant_id
    const [op] = await db.select().from(openings)
      .where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId))).limit(1)
    if (!op) return NextResponse.json({ error: 'Açılış tapılmadı' }, { status: 404 })
    if (!op.planned_open_date) {
      return NextResponse.json({ error: 'Planlanan açılış tarixi yoxdur — geri sayım hesablana bilmir' }, { status: 400 })
    }

    const profil: AcilisProfil = {
      format: op.format as AcilisFormat,
      teras: op.has_terrace, bagca: op.has_garden, oturma: op.has_seating,
      pizza: op.has_pizza, catdirilma: op.has_delivery, qaz: op.has_gas,
      generator: op.has_generator, kofe: op.has_coffee, cok_kat: op.multi_floor,
      bar: op.has_bar, birlesme: op.is_merge, park_ici: op.in_park,
    }
    const teze = vezifeYarat(profil, op.planned_open_date)
    const movcud = await db.select().from(opening_tasks).where(eq(opening_tasks.opening_id, id))

    const acar = (g: string, d: string, t: string) => `${g}|${d}|${t}`
    const tezeMap = new Map(teze.map(v => [acar(v.gate, v.dept, v.task), v]))
    const movcudMap = new Map(movcud.map(r => [acar(r.gate, r.dept, r.task), r]))

    const elave = teze.filter(v => !movcudMap.has(acar(v.gate, v.dept, v.task)))

    const kohne = movcud.filter(r => !tezeMap.has(acar(r.gate, r.dept, r.task)))
    // «Üzərində iş var» = status dəyişib, şərh yazılıb, məsul təyin olunub və ya bitib
    const isVar = (r: typeof movcud[number]) =>
      r.status !== 'gozleyir' || !!r.comment || !!r.assignee_id || !!r.completed_at
    const silinecek = kohne.filter(r => !isVar(r))
    const saxlanilan = kohne.filter(isVar)

    // Mətn eynidirsə qeyd/şərt/tarix şablonla yenilənir — «UNUDULDU» belə silinir
    const yenilenecek = movcud.filter(r => {
      const v = tezeMap.get(acar(r.gate, r.dept, r.task))
      if (!v) return false
      return r.note !== v.note || r.cond !== v.cond || r.due_date !== v.due || r.offset_days !== v.offset
    })

    const xulase = {
      elave: elave.map(v => `${v.gate} · ${v.dept} · ${v.task}`),
      silinecek: silinecek.map(r => `${r.gate} · ${r.dept} · ${r.task}`),
      yenilenecek: yenilenecek.length,
      saxlanilan: saxlanilan.map(r => `${r.gate} · ${r.dept} · ${r.task} (${r.status})`),
    }
    if (dryRun) return NextResponse.json({ ok: true, dryRun: true, ...xulase })

    if (elave.length) {
      await db.insert(opening_tasks).values(elave.map(v => ({
        tenant_id: tenantId, opening_id: id,
        gate: v.gate, dept: v.dept, task: v.task, note: v.note, cond: v.cond,
        offset_days: v.offset, due_date: v.due,
      }))).onConflictDoNothing()
    }
    if (silinecek.length) {
      await db.delete(opening_tasks)
        .where(and(eq(opening_tasks.opening_id, id),
                   inArray(opening_tasks.id, silinecek.map(r => r.id))))
    }
    for (const r of yenilenecek) {
      const v = tezeMap.get(acar(r.gate, r.dept, r.task))!
      await db.update(opening_tasks)
        .set({ note: v.note, cond: v.cond, offset_days: v.offset, due_date: v.due, updated_at: new Date() })
        .where(eq(opening_tasks.id, r.id))
    }
    return NextResponse.json({ ok: true, ...xulase })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
