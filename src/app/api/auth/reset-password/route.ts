import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { password_reset_tokens, users } from '@/db/schema/auth'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { resetRateLimit } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// POST — Şifrə sıfırlama tələbi (e-poçta link göndər)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return NextResponse.json({ error: 'E-poçt daxil edin' }, { status: 400 })
  }

  // Rate limit
  const { success } = await resetRateLimit.limit(email)
  if (!success) {
    return NextResponse.json(
      { error: 'Çox sayda sorğu. 1 saat sonra cəhd edin.' },
      { status: 429 }
    )
  }

  // İstifadəçini tap
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // Güvənlik: istifadəçi tapılmasa belə, eyni cavab ver
  if (!user) {
    return NextResponse.json({ success: true })
  }

  // Token yarat
  const token = crypto.randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + 60 * 60 * 1000) // 1 saat

  await db.insert(password_reset_tokens).values({
    user_id: user.id,
    token,
    expires_at,
  })

  // IP və cihaz məlumatını götür
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'Bilinmir'
  const userAgent = req.headers.get('user-agent') ?? 'Bilinmir'
  const device = userAgent.includes('Chrome') ? 'Chrome'
    : userAgent.includes('Firefox') ? 'Firefox'
    : userAgent.includes('Safari') ? 'Safari'
    : userAgent.includes('Edge') ? 'Edge'
    : 'Bilinmir'

  await sendPasswordResetEmail({ email, token, ip, device })

  return NextResponse.json({ success: true })
}

// PUT — Yeni şifrə təyin et
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!token || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Məlumatlar natamamdır' },
      { status: 400 }
    )
  }

  // Tokeni atomik olaraq istifadədə işarələ; paralel sorğulardan yalnız biri qazanır.
  const [record] = await db.update(password_reset_tokens)
    .set({ used_at: new Date() })
    .where(and(
      eq(password_reset_tokens.token, token),
      isNull(password_reset_tokens.used_at),
      gt(password_reset_tokens.expires_at, new Date()),
    ))
    .returning()

  if (!record) {
    return NextResponse.json(
      { error: 'Link etibarsızdır və ya müddəti bitib' },
      { status: 404 }
    )
  }

  // Şifrəni yenilə
  const password_hash = await bcrypt.hash(password, 12)

  try {
    await db.update(users)
      .set({ password_hash, updated_at: new Date() })
      .where(eq(users.id, record.user_id))
  } catch (error) {
    await db.update(password_reset_tokens).set({ used_at: null })
      .where(and(eq(password_reset_tokens.id, record.id), eq(password_reset_tokens.used_at, record.used_at!)))
      .catch(() => undefined)
    throw error
  }

  return NextResponse.json({ success: true })
}
