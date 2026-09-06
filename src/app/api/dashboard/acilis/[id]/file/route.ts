import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { and, eq, desc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { openings, opening_files } from '@/db/schema/acilis'
import { createOpeningFileUploadUrl, createFileDownloadUrl, deleteObject } from '@/lib/r2'

export const runtime = 'nodejs'

const KINDS = ['proyekt', 'smeta', 'teklif', 'olcu', 'foto', 'icaze', 'diger']
const MAX = 60 * 1024 * 1024   // 60 MB — mimari proyekt PDF-i böyük olur

async function sahib(openingId: string, tenantId: string) {
  const [o] = await db.select({ id: openings.id }).from(openings)
    .where(and(eq(openings.id, openingId), eq(openings.tenant_id, tenantId))).limit(1)
  return !!o
}

/** 1) Yükləmə linki al  2) yüklədikdən sonra qeydiyyata sal. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const tenantId = session.user.tenant_id
  if (!await sahib(id, tenantId)) return NextResponse.json({ error: 'Açılış tapılmadı' }, { status: 404 })

  try {
    const b = await req.json() as {
      step?: 'url' | 'confirm'
      fileName?: string; contentType?: string; size?: number
      kind?: string; note?: string; fileId?: string; key?: string
    }

    if (b.step === 'url') {
      const fileName = String(b.fileName ?? '').trim()
      if (!fileName) return NextResponse.json({ error: 'Fayl adı lazımdır' }, { status: 400 })
      if ((b.size ?? 0) > MAX) {
        return NextResponse.json({ error: `Fayl çox böyükdür (maks ${MAX / 1024 / 1024} MB)` }, { status: 400 })
      }
      const fileId = randomUUID()
      const { uploadUrl, key } = await createOpeningFileUploadUrl(
        tenantId, id, fileId, fileName, b.contentType || 'application/octet-stream')
      return NextResponse.json({ ok: true, fileId, key, uploadUrl })
    }

    // confirm — fayl R2-yə düşdü, indi qeydiyyat
    if (!b.key || !b.fileName) return NextResponse.json({ error: 'key və fileName lazımdır' }, { status: 400 })
    await db.insert(opening_files).values({
      tenant_id: tenantId, opening_id: id,
      kind: KINDS.includes(String(b.kind)) ? String(b.kind) : 'diger',
      file_name: String(b.fileName), r2_key: String(b.key),
      mime: b.contentType ?? null, size: b.size ?? null,
      note: (String(b.note ?? '').trim() || null),
      uploaded_by: session.user.id,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}

/** Fayl siyahısı — hər biri üçün müvəqqəti endirmə linki ilə. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await sahib(id, session.user.tenant_id)) return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })

  const rows = await db.select().from(opening_files)
    .where(eq(opening_files.opening_id, id)).orderBy(desc(opening_files.created_at))
  const files = await Promise.all(rows.map(async f => ({
    id: f.id, kind: f.kind, fileName: f.file_name, mime: f.mime, size: f.size,
    note: f.note, createdAt: f.created_at,
    url: await createFileDownloadUrl(f.r2_key, f.file_name).catch(() => null),
  })))
  return NextResponse.json({ ok: true, files })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  const { id } = await params
  try {
    const { fileId } = await req.json() as { fileId?: string }
    if (!fileId) return NextResponse.json({ error: 'fileId lazımdır' }, { status: 400 })
    const [f] = await db.select().from(opening_files)
      .where(and(eq(opening_files.id, fileId), eq(opening_files.opening_id, id),
                 eq(opening_files.tenant_id, session.user.tenant_id))).limit(1)
    if (!f) return NextResponse.json({ error: 'Fayl tapılmadı' }, { status: 404 })
    // Əvvəl DB sətri, sonra obyekt: obyekt silinməsi patlasa sətir qalmasın
    await db.delete(opening_files).where(eq(opening_files.id, fileId))
    await deleteObject(f.r2_key).catch(() => {})   // R2-də qalsa da siyahıda görünmür
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
