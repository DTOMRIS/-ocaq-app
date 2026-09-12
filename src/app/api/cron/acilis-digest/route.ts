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
 * ── NİYƏ QURAŞDIRMA TƏLƏB ETMİR ──
 * İstifadəçi qərarı (12.09.2026): «cron işinə girməyəcəyəm». Yəni uc heç bir
 * env dəyişəni GÖZLƏMƏMƏLİDİR — quraşdırma tələb edən avtomatlaşdırma qurulmur
 * və heç olmayandan pis olur («var» sanılır, işləmir). İki yol qəbul edilir:
 *   ① `x-vercel-cron` başlığı — Vercel öz cron çağırışlarına bunu qoyur
 *   ② `Bearer <CRON_SECRET>` — sonradan sərtləşdirmək istəyən üçün, məcburi deyil
 *
 * BAŞLIQ SAXTALANA BİLƏR — bilirik. Zərər həddi ölçüldü:
 *   · uc heç bir MƏZMUN qaytarmır — nə vəzifə mətni, nə e-poçt ünvanı (yalnız say)
 *   · poçt YALNIZ artıq təyin edilmiş DAXİLİ departament ünvanlarına gedir
 *   · gecikən/yaxın iş yoxdursa ÜMUMİYYƏTLƏ susur (`digestHtml` boş qaytarır)
 *   · heç bir data DƏYİŞMİR — yalnız oxunur
 * Ən pis hal: kimsə şirkətin öz departamentinə artıq bir xülasə göndərir.
 * Sirr sızmır. Bunun qarşılığı: istifadəçidən heç nə istənilmir.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron') != null
  const bearerOk = !!secret && req.headers.get('authorization') === `Bearer ${secret}`
  if (!vercelCron && !bearerOk) {
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
