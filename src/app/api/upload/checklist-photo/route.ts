import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { and, eq } from 'drizzle-orm'
import sharp from 'sharp'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import {
  checklistEvidencePrefix,
  isOfficialChecklistItem,
  itemRequiresPhoto,
} from '@/lib/checklist-validation'
import { uploadPrivateWebp } from '@/lib/r2'
import { checklistPhotoRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MANAGER_ROLES = new Set(['super_admin', 'region_manager', 'branch_manager'])
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

async function canAccessBranch(
  session: Session,
  branchId: string,
): Promise<boolean> {
  const common = [
    eq(branches.id, branchId),
    eq(branches.tenant_id, session.user.tenant_id),
    eq(branches.is_active, true),
    eq(branches.is_archived, false),
  ]

  if (session.user.role === 'super_admin') {
    const [row] = await db.select({ id: branches.id }).from(branches).where(and(...common)).limit(1)
    return Boolean(row)
  }

  if (session.user.role === 'region_manager') {
    const [row] = await db
      .select({ id: branches.id })
      .from(branches)
      .innerJoin(regions, eq(branches.region_id, regions.id))
      .where(and(
        ...common,
        eq(regions.tenant_id, session.user.tenant_id),
        eq(regions.manager_id, session.user.id),
      ))
      .limit(1)
    return Boolean(row)
  }

  const [row] = await db.select({ id: branches.id }).from(branches).where(and(
    ...common,
    eq(branches.manager_id, session.user.id),
  )).limit(1)
  return Boolean(row)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Giriş tələb olunur' }, { status: 401 })
  if (!MANAGER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: 'Foto yalnız menecerlər tərəfindən əlavə edilə bilər' }, { status: 403 })
  }

  const limit = await checklistPhotoRateLimit.limit(`${session.user.tenant_id}:${session.user.id}`)
  if (!limit.success) {
    return NextResponse.json({ error: 'Çox sayda foto göndərildi. Bir az sonra yenidən yoxlayın' }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Foto sorğusu düzgün deyil' }, { status: 400 })
  }

  const branchId = formData.get('branch_id')
  const itemId = formData.get('item_id')
  const file = formData.get('file')

  if (typeof branchId !== 'string' || !branchId) {
    return NextResponse.json({ error: 'Filial seçilməlidir' }, { status: 400 })
  }
  if (typeof itemId !== 'string' || !isOfficialChecklistItem(itemId) || !itemRequiresPhoto(itemId)) {
    return NextResponse.json({ error: 'Bu checklist maddəsi foto qəbul etmir' }, { status: 400 })
  }
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Düzgün şəkil faylı seçin' }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Foto 5 MB-dan böyük ola bilməz' }, { status: 413 })
  }

  try {
    if (!(await canAccessBranch(session, branchId))) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }

    const input = Buffer.from(await file.arrayBuffer())
    const image = sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate()
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Şəkil oxunmadı' }, { status: 400 })
    }

    const output = await image
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const key = `${checklistEvidencePrefix({
      tenantId: session.user.tenant_id,
      branchId,
      userId: session.user.id,
    }, itemId)}${randomUUID()}.webp`
    await uploadPrivateWebp(key, output)

    return NextResponse.json(
      { key, width: metadata.width, height: metadata.height },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Checklist photo upload error:', error)
    return NextResponse.json({ error: 'Foto emal edilə bilmədi' }, { status: 400 })
  }
}
