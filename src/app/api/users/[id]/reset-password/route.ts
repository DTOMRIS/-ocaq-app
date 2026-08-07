import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { db } from '@/db'
import { users, audit_logs } from '@/db/schema/auth'
import { and, eq } from 'drizzle-orm'

/**
 * POST — istifadəçiyə YENİ müvəqqəti parol təyin et və BİR DƏFƏ göstər.
 *
 * Niyə lazımdır: hesab yaradılarkən parol yalnız o cavabda görünür. Ekran
 * bağlanarsa parol itir və hesab əlçatmaz qalır — e-poçt sınıq olduğu üçün
 * "şifrəmi unutdum" axını da işləmir. Bu endpoint TQTA-dakı "parolu dəyiş"
 * düyməsinin qarşılığıdır: idarəçi bir tıkla yeni parol alır və çatdırır.
 *
 * Təhlükəsizlik:
 *  • yalnız `super_admin`
 *  • parol crypto ilə təsadüfi 16 simvol — sabit parol yoxdur
 *  • DB-də yalnız bcrypt(12) hash; açıq parol YALNIZ bu cavabda
 *  • `must_change_password = true` → istifadəçi ilk girişdə öz parolunu qoyur
 *  • audit-ə yazılır (kim, kimə, nə vaxt)
 *
 * ⚠️ Yan təsir (bilərəkdən): `updated_at` yenilənir → həmin istifadəçinin
 * mövcud bütün sessiyaları `auth.ts`-in session_version yoxlaması ilə ləğv
 * olunur. Parol sıfırlananda köhnə sessiyanın davam etməsi TƏHLÜKƏLİ olardı.
 */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%+='
function temporaryPassword() {
  return Array.from({ length: 16 }, () => PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)]).join('')
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Yalnız super admin parol sıfırlaya bilər' }, { status: 403 })
  }

  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Yanlış istifadəçi ID' }, { status: 400 })

  const tenantId = session.user.tenant_id
  const [target] = await db.select({ id: users.id, email: users.email, name: users.name })
    .from(users).where(and(eq(users.id, id), eq(users.tenant_id, tenantId))).limit(1)
  if (!target) return NextResponse.json({ error: 'İstifadəçi tapılmadı' }, { status: 404 })

  const password = temporaryPassword()
  const passwordHash = await bcrypt.hash(password, 12)

  await db.update(users)
    .set({ password_hash: passwordHash, must_change_password: true, updated_at: new Date() })
    .where(and(eq(users.id, id), eq(users.tenant_id, tenantId)))

  try {
    await db.insert(audit_logs).values({
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'user.password.reset_by_admin',
      entity: 'user',
      entity_id: id,
      metadata: JSON.stringify({ email: target.email }),
    })
  } catch (auditError) {
    console.error('Audit log write error:', auditError)
  }

  return NextResponse.json({
    ok: true,
    email: target.email,
    name: target.name,
    temporaryPassword: password,
    note: 'Parolu istifadəçiyə çatdırın. İlk girişdə dəyişdirməsi tələb olunacaq. Köhnə sessiyaları ləğv edildi.',
  })
}
