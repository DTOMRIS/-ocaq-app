import { NextRequest, NextResponse } from 'next/server'
import { isNotNull, ne, and } from 'drizzle-orm'
import { db } from '@/db'
import { openings } from '@/db/schema/acilis'
import { xulaseGonder } from '@/lib/acilis/digest'

export const runtime = 'nodejs'
export const maxDuration = 60

const BASE = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'https://ocaq.dkagency.com.tr'

/**
 * HƏFTƏLİK AÇILIŞ XÜLASƏSİ — cron ucu.
 *
 * Vercel cron **GET** göndərir və gövdə YOLLAYA BİLMİR. Mövcud
 * `/api/dashboard/acilis/digest` isə POST-dur və gövdədə `tenantId` gözləyir;
 * onun GET-i tamam başqa iş görür (departament e-poçtlarını qaytarır).
 * Ona görə cron üçün AYRI uc lazımdır — köhnəsini cron-a uyğunlaşdırmaq
 * panel düyməsini sındırardı.
 *
 * Cədvəl: `vercel.json` → hər bazar ertəsi 06:00 UTC (Bakı 10:00).
 *
 * TƏNZİMLƏNMƏYİBSƏ SƏSSİZ KEÇMİR: `CRON_SECRET` yoxdursa 503 qaytarır.
 * «İşləyir» sanıb heç nə göndərməmək ən pis haldır.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({
      error: 'CRON_SECRET təyin edilməyib — həftəlik xülasə göndərilmir. Vercel env-də əlavə edin.',
    }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Yalnız AKTİV açılışı olan tenant-lar — boşuna sorğu atılmır
    const rows = await db.selectDistinct({ tenant_id: openings.tenant_id }).from(openings)
      .where(and(
        isNotNull(openings.tenant_id),
        ne(openings.status, 'dayandirildi'),
        ne(openings.status, 'acildi'),
      ))

    const hesabat: Array<{ tenant: string; gonderilen: number; qeyd?: string; xeta?: string }> = []
    for (const r of rows) {
      try {
        const n = await xulaseGonder(r.tenant_id, BASE)
        hesabat.push({ tenant: r.tenant_id, gonderilen: n.gonderilen, qeyd: n.qeyd })
      } catch (e) {
        // Bir tenant sınsa QALANLARI dayandırmır — səbəb hesabatda qalır
        hesabat.push({ tenant: r.tenant_id, gonderilen: 0, xeta: e instanceof Error ? e.message : 'xəta' })
      }
    }
    const cem = hesabat.reduce((s, h) => s + h.gonderilen, 0)
    return NextResponse.json({ ok: true, tenant: rows.length, gonderilen: cem, hesabat })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
