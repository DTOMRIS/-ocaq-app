import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { email_verification_tokens, users } from '@/db/schema/auth'
import { eq, and, gt, isNull } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?error=invalid', req.url))

  const [record] = await db.update(email_verification_tokens)
    .set({ used_at: new Date() })
    .where(and(
      eq(email_verification_tokens.token, token),
      isNull(email_verification_tokens.used_at),
      gt(email_verification_tokens.expires_at, new Date()),
    ))
    .returning()

  if (!record) return NextResponse.redirect(new URL('/login?error=expired', req.url))

  // Token istifadə edildi, istifadəçini doğrula
  try {
    await db.update(users)
      .set({ is_email_verified: true, email_verified_at: new Date(), updated_at: new Date() })
      .where(eq(users.id, record.user_id))
  } catch (error) {
    await db.update(email_verification_tokens).set({ used_at: null })
      .where(and(eq(email_verification_tokens.id, record.id), eq(email_verification_tokens.used_at, record.used_at!)))
      .catch(() => undefined)
    throw error
  }

  return NextResponse.redirect(new URL('/login?verified=true', req.url))
}
