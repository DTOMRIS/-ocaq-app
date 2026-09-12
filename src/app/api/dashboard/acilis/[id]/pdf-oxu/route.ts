import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/auth'
import { db } from '@/db'
import { opening_files } from '@/db/schema/acilis'
import { r2, R2_BUCKET, assertR2Configured } from '@/lib/r2'
import { pdfMetniCixar } from '@/lib/acilis/pdf-metn'
import { olculeriTap } from '@/lib/acilis/olcu-tap'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Böyük proyekt faylı serveri kilidləməsin — 25 MB-dan yuxarısı oxunmur. */
const MAX = 25 * 1024 * 1024

/**
 * PROYEKT PDF-İNDƏN ÖLÇÜ TƏKLİFİ.
 *
 * HEÇ NƏ YAZMIR. Yalnız oxuyur və təklif qaytarır — hər təklifin yanında onu
 * tapdığı CÜMLƏ var. İnsan görüb «tətbiq et» deyir.
 *
 * NİYƏ OCR YOX: mimari PDF ya CAD-dan ixrac olunub (içində əsl mətn var və
 * rəqəm dəqiqdir), ya da skandır (yalnız piksel). İkincidə OCR bəzən «24»-ü
 * «21» oxuyur və SƏHVİ HEÇ KİM GÖRMÜR — səhv masa sayı ilə sifariş gedir.
 * Ona görə: mətn qatı varsa oxuyuruq, yoxdursa açıq deyirik.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    assertR2Configured()
    const b = await req.json() as { fileId?: string }
    if (!b.fileId) return NextResponse.json({ error: 'fileId lazımdır' }, { status: 400 })

    const [f] = await db.select().from(opening_files).where(and(
      eq(opening_files.id, b.fileId),
      eq(opening_files.opening_id, id),
      eq(opening_files.tenant_id, session.user.tenant_id),
    )).limit(1)
    if (!f) return NextResponse.json({ error: 'Fayl tapılmadı' }, { status: 404 })

    const pdfDir = (f.mime ?? '').includes('pdf') || /\.pdf$/i.test(f.file_name)
    if (!pdfDir) return NextResponse.json({ error: 'Yalnız PDF oxunur' }, { status: 400 })
    if ((f.size ?? 0) > MAX) {
      return NextResponse.json({ error: `Fayl çox böyükdür (${Math.round((f.size ?? 0) / 1048576)} MB) — 25 MB-a qədər oxunur` }, { status: 413 })
    }

    const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: f.r2_key }))
    const bytes = await obj.Body?.transformToByteArray()
    if (!bytes) return NextResponse.json({ error: 'Fayl oxunmadı' }, { status: 502 })

    const { metn, metnQatiVar, axin } = pdfMetniCixar(Buffer.from(bytes))
    if (!metnQatiVar) {
      return NextResponse.json({
        ok: true, metnQatiVar: false, teklifler: [],
        qeyd: 'Bu PDF ÇİZİMDİR — içində mətn qatı yoxdur, yalnız şəkil var. '
            + 'Rəqəm çıxarıla bilməz; ölçüləri əl ilə girin. '
            + '(CAD-dan «PDF olaraq ixrac» edilmiş fayl oxunur, skan edilmiş fayl oxunmur.)',
      })
    }

    const teklifler = olculeriTap(metn)
    return NextResponse.json({
      ok: true, metnQatiVar: true, axin, teklifler,
      qeyd: teklifler.length
        ? 'Rəqəmlər TƏKLİFDİR — tapıldığı cümləyə baxıb təsdiqləyin.'
        : 'Mətn oxundu, lakin masa/oturacaq/banko ölçüsü tapılmadı — əl ilə girin.',
    })
  } catch (e) {
    // Xəta udulmur: səbəb istifadəçiyə çatır, yoxsa «niyə işləmir» sualı qalır
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
