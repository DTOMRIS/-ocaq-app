import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, count } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { openings, opening_tasks, opening_files, opening_orders } from '@/db/schema/acilis'

export const runtime = 'nodejs'

const FORMATLAR = ['kuce', 'mall', 'flagship', 'kiosk']

/**
 * PROFİL REDAKTƏSİ.
 *
 * NİYƏ LAZIMDIR: profil indiyə qədər YALNIZ yaradılışda girilirdi. Ad səhv
 * yazılsa, m² dəqiqləşsə, teras qərarı dəyişsə geri dönüş yox idi — yeni açılış
 * yaratmaqdan başqa yol qalmırdı və köhnəsi siyahıda zibil kimi qalırdı.
 *
 * VƏZİFƏLƏRƏ TOXUNMUR: profil dəyişəndə vəzifə siyahısı avtomatik yenilənmir,
 * çünki üzərində iş görülmüş sətri səssizcə silmək tarixçəni pozar. Cavabda
 * `sablonYenilensin` bayrağı qaytarılır və UI «Şablonla uyğunlaşdır» düyməsini
 * göstərir — qərar insanındır.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const { id } = await params
  try {
    const b = await req.json() as Record<string, unknown>
    const tenantId = session.user.tenant_id

    const [op] = await db.select().from(openings)
      .where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId))).limit(1)
    if (!op) return NextResponse.json({ error: 'Açılış tapılmadı' }, { status: 404 })

    const patch: Record<string, unknown> = { updated_at: new Date() }

    if (typeof b.name === 'string') {
      const ad = b.name.trim()
      if (!ad) return NextResponse.json({ error: 'Filial adı boş ola bilməz' }, { status: 400 })
      patch.name = ad
    }
    for (const k of ['address', 'zone', 'decision_note'] as const) {
      if (typeof b[k] === 'string') patch[k] = (b[k] as string).trim() || null
    }
    if (typeof b.format === 'string') {
      if (!FORMATLAR.includes(b.format)) {
        return NextResponse.json({ error: 'Naməlum format' }, { status: 400 })
      }
      patch.format = b.format
    }
    for (const k of ['m2_inside', 'm2_terrace', 'm2_garden'] as const) {
      if (b[k] !== undefined) {
        const raw = b[k]
        if (raw === null || String(raw).trim() === '') { patch[k] = null; continue }
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: `${k} düzgün deyil` }, { status: 400 })
        }
        patch[k] = String(n)
      }
    }
    if (b.planned_open_date !== undefined) {
      const d = String(b.planned_open_date ?? '').trim()
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return NextResponse.json({ error: 'Tarix formatı YYYY-MM-DD olmalıdır' }, { status: 400 })
      }
      // Tarix bütün geri sayımın təməlidir — boşaldılmasına icazə verilmir
      if (!d) return NextResponse.json({ error: 'Açılış tarixi silinə bilməz — geri sayım ondan hesablanır' }, { status: 400 })
      patch.planned_open_date = d
    }

    const BAYRAQLAR = ['has_terrace', 'has_garden', 'has_seating', 'has_pizza',
      'has_delivery', 'has_gas', 'has_generator', 'was_cafe', 'has_coffee',
      'multi_floor', 'has_bar', 'is_merge', 'in_park'] as const
    let profilDeyisdi = false
    for (const k of BAYRAQLAR) {
      if (typeof b[k] === 'boolean') {
        patch[k] = b[k]
        if (op[k] !== b[k]) profilDeyisdi = true
      }
    }
    if (patch.format && patch.format !== op.format) profilDeyisdi = true
    if (patch.planned_open_date && patch.planned_open_date !== op.planned_open_date) profilDeyisdi = true

    await db.update(openings).set(patch)
      .where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId)))

    return NextResponse.json({ ok: true, sablonYenilensin: profilDeyisdi })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}

/**
 * SİLMƏ — yalnız ÜZƏRİNDƏ İŞ GÖRÜLMƏMİŞ açılış silinir.
 *
 * NİYƏ ŞƏRTLİ: səhvən yaradılmış boş açılış siyahıda zibildir və silinməlidir.
 * Amma vəzifəsi bağlanmış, faylı yüklənmiş və ya sifarişi verilmiş açılış
 * TARİXÇƏDİR — silinsə «nə vaxt nə edildi» sualının cavabı itir.
 *
 * İş görülübsə silmə RƏDD edilir və səbəb sayılarla qaytarılır; əvəzinə
 * `status='dayandirildi'` təklif olunur (geri qaytarıla bilər).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  const { id } = await params
  try {
    const tenantId = session.user.tenant_id
    const [op] = await db.select().from(openings)
      .where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId))).limit(1)
    if (!op) return NextResponse.json({ error: 'Açılış tapılmadı' }, { status: 404 })

    const [gorulen] = await db.select({ n: count() }).from(opening_tasks)
      .where(and(eq(opening_tasks.opening_id, id), ne(opening_tasks.status, 'gozleyir')))
    const [fayl] = await db.select({ n: count() }).from(opening_files)
      .where(eq(opening_files.opening_id, id))
    let sifaris = 0
    try {
      const [s] = await db.select({ n: count() }).from(opening_orders)
        .where(and(eq(opening_orders.opening_id, id), ne(opening_orders.status, 'planlandi')))
      sifaris = s?.n ?? 0
    } catch { /* 0022 işlədilməyibsə sifariş yoxdur */ }

    const iz = (gorulen?.n ?? 0) + (fayl?.n ?? 0) + sifaris
    if (iz > 0) {
      return NextResponse.json({
        error: 'Bu açılış silinmir — üzərində iş görülüb və bu, tarixçədir.',
        detay: { vezife: gorulen?.n ?? 0, fayl: fayl?.n ?? 0, sifaris },
        teklif: 'Əvəzinə «Dayandırıldı» statusuna keçirin — geri qaytarıla bilər.',
      }, { status: 409 })
    }

    // `on delete cascade` vəzifə/fayl/sifariş sətirlərini də aparır
    await db.delete(openings).where(and(eq(openings.id, id), eq(openings.tenant_id, tenantId)))
    return NextResponse.json({ ok: true, silindi: op.name })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
