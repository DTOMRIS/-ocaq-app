import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { password_reset_tokens, users, audit_logs } from '@/db/schema/auth'
import { eq, and, gt, inArray, isNull } from 'drizzle-orm'
import { resetRateLimit } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { createOneTimeToken, hashOneTimeToken, oneTimeTokenCandidates } from '@/lib/one-time-token'
import { isOperationalRole } from '@/lib/operational-roles'

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
    .select({ id: users.id, role: users.role, is_active: users.is_active, tenant_id: users.tenant_id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // Güvənlik: istifadəçi tapılmasa belə, eyni cavab ver
  if (!user || !user.is_active || !isOperationalRole(user.role)) {
    return NextResponse.json({ success: true })
  }

  // Token yarat
  const token = createOneTimeToken()
  const expires_at = new Date(Date.now() + 60 * 60 * 1000) // 1 saat

  await db.insert(password_reset_tokens).values({
    user_id: user.id,
    token: hashOneTimeToken(token),
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

  // Jurnala yaz: «şifrəmi unutdum» sorğusu təhlükəsizlik hadisəsidir. Kiminsə
  // hesabına təkrar-təkrar sıfırlama sorğusu gəlirsə bunu görmək lazımdır.
  // Xəta sıfırlamanı BLOKLAMIR (bax `auth.ts`-dəki eyni qayda).
  try {
    await db.insert(audit_logs).values({
      tenant_id: user.tenant_id, user_id: user.id,
      action: 'user.password.reset.request', entity: 'user', entity_id: user.id,
      metadata: JSON.stringify({ device }), ip,
    })
  } catch (e) { console.error('[reset] jurnal qeydi yazılmadı:', e) }

  const delivery = await sendPasswordResetEmail({ email, token, ip, device })
  if (delivery.error) {
    console.error('Password reset mail göndərilmədi:', delivery.error)
    return NextResponse.json(
      { error: 'E-poçt göndərilə bilmədi. Bir az sonra yenidən cəhd edin.' },
      { status: 502 },
    )
  }

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
      inArray(password_reset_tokens.token, oneTimeTokenCandidates(token)),
      isNull(password_reset_tokens.used_at),
      gt(password_reset_tokens.expires_at, new Date()),
    ))
    .returning()

  if (!record) {
    return NextResponse.json(
      {
        error: 'Bu link artıq işləmir — ya istifadə olunub, ya da 1 saatlıq '
             + 'müddəti bitib. Aşağıdan yenidən sıfırlama istəyin, yeni link göndəriləcək.',
        yeniden: true,
      },
      { status: 404 }
    )
  }

  // Şifrəni yenilə
  const password_hash = await bcrypt.hash(password, 12)

  try {
    // `must_change_password` DA TƏMİZLƏNİR.
    // Əvvəl belə idi: admin şifrəni sıfırlayır → bayraq `true` olur → istifadəçi
    // müvəqqəti şifrə əvəzinə «şifrəmi unutdum» ilə ÖZ şifrəsini qoyur → bayraq
    // hələ `true` qalır → sistem onu yenidən «şifrəni dəyiş» ekranına atırdı.
    // İnsan öz şifrəsini indicə seçdi; bir daha soruşmaq mənasızdır.
    await db.update(users)
      .set({ password_hash, must_change_password: false, updated_at: new Date() })
      .where(eq(users.id, record.user_id))

    try {
      const [u] = await db.select({ tenant_id: users.tenant_id }).from(users)
        .where(eq(users.id, record.user_id)).limit(1)
      await db.insert(audit_logs).values({
        tenant_id: u?.tenant_id ?? null, user_id: record.user_id,
        action: 'user.password.reset.done', entity: 'user', entity_id: record.user_id,
      })
    } catch (e) { console.error('[reset] jurnal qeydi yazılmadı:', e) }
  } catch (error) {
    await db.update(password_reset_tokens).set({ used_at: null })
      .where(and(eq(password_reset_tokens.id, record.id), eq(password_reset_tokens.used_at, record.used_at!)))
      .catch(() => undefined)
    throw error
  }

  return NextResponse.json({ success: true })
}
