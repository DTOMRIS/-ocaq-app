import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Hər iki sahə tələb olunur' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Yeni şifrə minimum 8 simvol olmalıdır' }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'Yeni şifrə mövcud şifrədən fərqli olmalıdır' }, { status: 400 })
  }

  // Mövcud istifadəçini tap
  const [user] = await db
    .select({ id: users.id, password_hash: users.password_hash })
    .from(users)
    .where(and(eq(users.id, session.user.id), eq(users.tenant_id, session.user.tenant_id)))

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: 'İstifadəçi tapılmadı' }, { status: 404 })
  }

  // Köhnə şifrəni yoxla
  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Mövcud şifrə yanlışdır' }, { status: 403 })
  }

  // Yeni şifrəni hash et və yenilə
  const newHash = await bcrypt.hash(newPassword, 12)
  await db
    .update(users)
    .set({ password_hash: newHash, updated_at: new Date() })
    .where(and(eq(users.id, session.user.id), eq(users.tenant_id, session.user.tenant_id)))

  return NextResponse.json({ success: true })
}
