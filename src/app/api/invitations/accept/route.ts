import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { invitations, users, audit_logs } from '@/db/schema/auth'
import { regions } from '@/db/schema/regions'
import { branches } from '@/db/schema/branches'
import { staff_profiles } from '@/db/schema/staff'
import { eq, and, gt, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json()

  if (!token || !name || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Məlumatlar natamamdır. Şifrə minimum 8 simvol olmalıdır.' },
      { status: 400 }
    )
  }

  // Token tap
  const [invite] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.token, token),
        isNull(invitations.accepted_at),
        gt(invitations.expires_at, new Date())
      )
    )
    .limit(1)

  if (!invite) {
    return NextResponse.json(
      { error: 'Dəvət tapılmadı və ya müddəti bitib' },
      { status: 404 }
    )
  }

  // İstifadəçi yarat
  const password_hash = await bcrypt.hash(password, 12)

  const [newUser] = await db
    .insert(users)
    .values({
      tenant_id:         invite.tenant_id,
      email:             invite.email,
      name,
      password_hash,
      role:              invite.role,
      is_email_verified: true, // Dəvət linki = e-poçt doğrulaması
      email_verified_at: new Date(),
    })
    .returning({ id: users.id })

  // Roluna görə avtomatik əlaqələndirmə
  if (invite.role === 'region_manager' && invite.region_id) {
    await db
      .update(regions)
      .set({ manager_id: newUser.id, updated_at: new Date() })
      .where(eq(regions.id, invite.region_id))
  } else if (invite.role === 'branch_manager' && invite.branch_id) {
    await db
      .update(branches)
      .set({ manager_id: newUser.id, updated_at: new Date() })
      .where(eq(branches.id, invite.branch_id))
  } else if (invite.role === 'staff') {
    await db
      .insert(staff_profiles)
      .values({
        user_id:       newUser.id,
        tenant_id:     invite.tenant_id,
        branch_id:     invite.branch_id || null,
        status:        'active',
      })
  }

  // Dəvəti bağla
  await db
    .update(invitations)
    .set({ accepted_at: new Date() })
    .where(eq(invitations.id, invite.id))

  // Filial müdürü isə — filialın manager_id-ni yenilə
  if (invite.role === 'branch_manager' && invite.branch_id) {
    await db
      .update(branches)
      .set({ manager_id: newUser.id })
      .where(eq(branches.id, invite.branch_id))
  }

  // Hoş gəldiniz maili göndər 🎉
  await sendWelcomeEmail({
    email: invite.email,
    name,
    role: invite.role,
  })

  // Audit log yaz
  try {
    await db.insert(audit_logs).values({
      tenant_id:  invite.tenant_id,
      user_id:    newUser.id,
      action:     'user.register',
      entity:     'user',
      entity_id:  newUser.id,
      metadata:   JSON.stringify({ email: invite.email, role: invite.role }),
    })
  } catch (logErr) {
    console.error('Audit log onboarding write error:', logErr)
  }

  return NextResponse.json({ success: true, userId: newUser.id })
}
