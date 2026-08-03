import { NextRequest, NextResponse } from 'next/server'
import { and, eq, desc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { promotions } from '@/db/schema/promotions'

export const runtime = 'nodejs'

// GET — tenant promosyonları (dashboard: ?active=1 yalnız aktivlər)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const onlyActive = new URL(req.url).searchParams.get('active') === '1'
  try {
    const rows = await db.select().from(promotions)
      .where(and(
        eq(promotions.tenant_id, session.user.tenant_id),
        ...(onlyActive ? [eq(promotions.is_active, true)] : []),
      ))
      .orderBy(desc(promotions.created_at))
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// POST — promosyon yarat (super_admin / region_manager)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  try {
    const b = await req.json()
    const title = String(b.title ?? '').trim()
    if (!title) return NextResponse.json({ error: 'Başlıq lazımdır' }, { status: 400 })
    const promoType = ['percent', 'bogo', 'fixed', 'gift'].includes(b.promo_type) ? b.promo_type : 'percent'
    const [row] = await db.insert(promotions).values({
      tenant_id:      session.user.tenant_id,
      title,
      description:    b.description ? String(b.description) : null,
      promo_type:     promoType,
      discount_value: b.discount_value != null && b.discount_value !== '' ? String(b.discount_value) : null,
      code:           b.code ? String(b.code).trim() : null,
      image_url:      b.image_url ? String(b.image_url) : null,
      badge:          b.badge ? String(b.badge) : 'AKTİV',
      valid_from:     b.valid_from || null,
      valid_until:    b.valid_until || null,
      is_active:      b.is_active !== false,
      branch_id:      b.branch_id || null,
      created_by:     session.user.id,
    }).returning()
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
