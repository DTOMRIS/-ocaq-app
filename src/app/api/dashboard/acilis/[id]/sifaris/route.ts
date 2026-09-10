import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { openings, opening_orders } from '@/db/schema/acilis'
import { type AcilisProfil, type AcilisFormat } from '@/lib/acilis/template'
import { sifarisYarat } from '@/lib/acilis/sifaris'

export const runtime = 'nodejs'

const STATUSLAR = ['planlandi', 'sifaris_verildi', 'geldi', 'lazim_deyil']

type OpRow = typeof openings.$inferSelect
function profilCixar(op: OpRow): AcilisProfil {
  return {
    format: op.format as AcilisFormat,
    teras: op.has_terrace, bagca: op.has_garden, oturma: op.has_seating,
    pizza: op.has_pizza, catdirilma: op.has_delivery, qaz: op.has_gas,
    generator: op.has_generator, kofe: op.has_coffee, cok_kat: op.multi_floor,
    bar: op.has_bar, birlesme: op.is_merge, park_ici: op.in_park,
  }
}

/**
 * Masa sayını yaz və sifariş siyahısını yarat/yenilə.
 *
 * TƏKRAR ÇAĞIRILA BİLƏR: masa sayı dəyişəndə yalnız `per_masa` sətirlərinin
 * miqdarı yenilənir. Əl ilə düzəldilmiş sətirə (`qty_manual`) TOXUNULMUR —
 * anbarın verdiyi rəqəm səssizcə silinməməlidir. Statusu/qeydi də qorunur.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const b = await req.json() as { masaSayi?: number | string | null }
    const raw = b.masaSayi
    let masaSayi: number | null = null
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0 || n > 500) {
        return NextResponse.json({ error: 'Masa sayı 0–500 aralığında olmalıdır' }, { status: 400 })
      }
      masaSayi = Math.round(n)
    }

    const tenantId = session.user.tenant_id
    const [op] = await db.select().from(openings)
      .where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId))).limit(1)
    if (!op) return NextResponse.json({ error: 'Açılış tapılmadı' }, { status: 404 })

    await db.update(openings).set({ table_count: masaSayi, updated_at: new Date() })
      .where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId)))

    const setirler = sifarisYarat(profilCixar(op), masaSayi)
    if (setirler.length) {
      await db.insert(opening_orders).values(setirler.map(r => ({
        tenant_id: tenantId, opening_id: id,
        kat: r.kat, ad: r.ad, vahid: r.vahid, dept: r.dept,
        qty: r.qty == null ? null : String(r.qty),
        per_masa: r.perMasa == null ? null : String(r.perMasa),
        qeyd: r.qeyd,
      }))).onConflictDoUpdate({
        target: [opening_orders.opening_id, opening_orders.kat, opening_orders.ad],
        // Yalnız masa-asılı və əl ilə toxunulmamış sətir yenilənir.
        set: {
          qty: sql`case when ${opening_orders.qty_manual} then ${opening_orders.qty}
                        when excluded.per_masa is null then ${opening_orders.qty}
                        else excluded.qty end`,
          per_masa: sql`excluded.per_masa`,
          updated_at: new Date(),
        },
      })
    }
    const eksik = setirler.filter(r => r.qty == null).length
    return NextResponse.json({ ok: true, setir: setirler.length, masaSayi, eksik })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}

/** Bir sətrin miqdarı / statusu / qeydi. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const b = await req.json() as { rowId?: string; qty?: number | string | null; status?: string; qeyd?: string }
    if (!b.rowId) return NextResponse.json({ error: 'rowId lazımdır' }, { status: 400 })
    if (b.status && !STATUSLAR.includes(b.status)) {
      return NextResponse.json({ error: 'Naməlum status' }, { status: 400 })
    }
    const patch: Record<string, unknown> = { updated_at: new Date() }
    if (b.qty !== undefined) {
      if (b.qty === null || String(b.qty).trim() === '') { patch.qty = null; patch.qty_manual = true }
      else {
        const n = Number(b.qty)
        if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'Miqdar düzgün deyil' }, { status: 400 })
        patch.qty = String(n)
        // Əl ilə dəyişildi → masa sayı yenilənəndə bu sətir qorunur
        patch.qty_manual = true
      }
    }
    if (b.status) patch.status = b.status
    if (b.qeyd !== undefined) patch.qeyd = b.qeyd.trim() || null

    await db.update(opening_orders).set(patch)
      .where(and(eq(opening_orders.id, b.rowId), eq(opening_orders.opening_id, id),
                 eq(opening_orders.tenant_id, session.user.tenant_id)))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
