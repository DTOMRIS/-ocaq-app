import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { email_verification_tokens, users } from '@/db/schema/auth'
import { eq, and, gt, isNull } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?error=invalid', req.url))

  const [record] = await db
    .select()
    .from(email_verification_tokens)
    .where(
      and(
        eq(email_verification_tokens.token, token),
        isNull(email_verification_tokens.used_at),
        gt(email_verification_tokens.expires_at, new Date())
      )
    )
    .limit(1)

  if (!record) return NextResponse.redirect(new URL('/login?error=expired', req.url))

  // Token istifadə edildi, istifadəçini doğrula
  await Promise.all([
    db
      .update(email_verification_tokens)
      .set({ used_at: new Date() })
      .where(eq(email_verification_tokens.id, record.id)),
    db
      .update(users)
      .set({ is_email_verified: true, email_verified_at: new Date() })
      .where(eq(users.id, record.user_id)),
  ])

  return NextResponse.redirect(new URL('/login?verified=true', req.url))
}
