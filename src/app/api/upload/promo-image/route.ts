import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { auth } from '@/auth'
import { uploadPrivateWebp, R2_PUBLIC } from '@/lib/r2'

// Promo görseli → R2 (public URL). super_admin/region_manager.
export const runtime = 'nodejs'
const MAX = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  let fd: FormData
  try { fd = await req.formData() } catch { return NextResponse.json({ error: 'Sorğu düzgün deyil' }, { status: 400 }) }
  const file = fd.get('file')
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Düzgün şəkil faylı seçin' }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX) {
    return NextResponse.json({ error: 'Şəkil 5 MB-dan böyük ola bilməz' }, { status: 413 })
  }
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const out = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1200, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    const key = `uploads/${session.user.tenant_id}/promos/${randomUUID()}.webp`
    await uploadPrivateWebp(key, out)
    return NextResponse.json({ url: `${R2_PUBLIC}/${key}` }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Şəkil emal edilə bilmədi', detail: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
