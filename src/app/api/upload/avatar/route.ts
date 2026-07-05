import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAvatarUploadUrl } from '@/lib/r2'
import { db } from '@/db'
import { staff_profiles } from '@/db/schema/staff'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { staffId } = await req.json()

  if (!staffId) {
    return NextResponse.json({ error: 'staffId tələb olunur' }, { status: 400 })
  }

  // Tenant yoxlaması — həmin staff bu tenant-a məxsusdurmu?
  const [profile] = await db
    .select({ id: staff_profiles.id })
    .from(staff_profiles)
    .where(
      and(
        eq(staff_profiles.id, staffId),
        eq(staff_profiles.tenant_id, session.user.tenant_id),
      )
    )
    .limit(1)

  if (!profile) {
    return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })
  }

  // Presigned URL yarat (400px + 150px)
  const [large, thumb] = await Promise.all([
    createAvatarUploadUrl(session.user.tenant_id, staffId, 400),
    createAvatarUploadUrl(session.user.tenant_id, staffId, 150),
  ])

  return NextResponse.json({
    large: { uploadUrl: large.uploadUrl, publicUrl: large.publicUrl },
    thumb: { uploadUrl: thumb.uploadUrl, publicUrl: thumb.publicUrl },
  })
}
