import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Hər iki sahə tələb olunur' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Yeni şifrə minimum 8 simvol olmalıdır' }, { status: 400 })
  }

  // Mövcud istifadəçini tap
  const [user] = await db
    .select({ id: users.id, password_hash: users.password_hash })
    .from(users)
    .where(eq(users.id, session.user.id))

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
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ success: true })
}
