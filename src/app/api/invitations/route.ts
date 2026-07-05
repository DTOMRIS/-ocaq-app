import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { invitations, users } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'
import { inviteRateLimit } from '@/lib/rate-limit'
import { sendInvitationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  // 1. Auth yoxla
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Yalnız super_admin və region_manager dəvət edə bilər
  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Rate limit
  const { success } = await inviteRateLimit.limit(session.user.id)
  if (!success) {
    return NextResponse.json(
      { error: 'Çox sayda sorğu. Bir saat sonra cəhd edin.' },
      { status: 429 }
    )
  }

  const { email, role } = await req.json()

  // 4. Rol yoxlaması — öz rolundan yuxarı dəvət edə bilməz
  const roleHierarchy = ['staff', 'branch_manager', 'region_manager', 'super_admin']
  const myRankIndex    = roleHierarchy.indexOf(session.user.role)
  const targetRankIndex = roleHierarchy.indexOf(role)
  if (targetRankIndex >= myRankIndex) {
    return NextResponse.json(
      { error: 'Bu rol üçün dəvət göndərə bilməzsiniz' },
      { status: 403 }
    )
  }

  // 5. Artıq qeydiyyatda varmı?
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.tenant_id, session.user.tenant_id)))

  if (existing) {
    return NextResponse.json(
      { error: 'Bu e-poçt artıq qeydiyyatlıdır' },
      { status: 409 }
    )
  }

  // 6. Token yarat, dəvəti bazaya yaz
  const token = crypto.randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 saat

  await db.insert(invitations).values({
    tenant_id:  session.user.tenant_id,
    email,
    role,
    token,
    invited_by: session.user.id,
    expires_at,
  })

  // 7. Mail göndər
  await sendInvitationEmail({
    email,
    token,
    inviterName: session.user.name ?? 'Admin',
    recipientRole: role,
  })

  return NextResponse.json({ success: true })
}
