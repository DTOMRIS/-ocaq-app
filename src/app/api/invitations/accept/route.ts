import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { invitations, users, audit_logs } from '@/db/schema/auth'
import { regions } from '@/db/schema/regions'
import { branches } from '@/db/schema/branches'
import { staff_profiles } from '@/db/schema/staff'
import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'
import { oneTimeTokenCandidates } from '@/lib/one-time-token'

class AcceptError extends Error {
  constructor(public code: string) { super(code) }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!token || name.length < 2 || name.length > 120 || password.length < 8) {
    return NextResponse.json(
      { error: 'Məlumatlar natamamdır. Şifrə minimum 8 simvol olmalıdır.' },
      { status: 400 },
    )
  }

  const [candidate] = await db.select().from(invitations).where(and(
    inArray(invitations.token, oneTimeTokenCandidates(token)),
    isNull(invitations.accepted_at),
    gt(invitations.expires_at, new Date()),
  )).limit(1)
  if (!candidate) {
    return NextResponse.json({ error: 'Dəvət tapılmadı və ya müddəti bitib' }, { status: 404 })
  }

  if (!['region_manager', 'branch_manager', 'staff'].includes(candidate.role)) {
    return NextResponse.json({ error: 'Dəvət rolu etibarsızdır' }, { status: 400 })
  }

  if (candidate.role === 'region_manager') {
    if (!candidate.region_id || candidate.branch_id) {
      return NextResponse.json({ error: 'Dəvət əhatəsi etibarsızdır' }, { status: 400 })
    }
    const [region] = await db.select({ id: regions.id, manager_id: regions.manager_id }).from(regions)
      .where(and(eq(regions.id, candidate.region_id), eq(regions.tenant_id, candidate.tenant_id)))
      .limit(1)
    if (!region || region.manager_id) {
      return NextResponse.json({ error: 'Bölgə tapılmadı və ya artıq müdiri var' }, { status: 409 })
    }
  } else {
    if (!candidate.branch_id) {
      return NextResponse.json({ error: 'Dəvət filialı etibarsızdır' }, { status: 400 })
    }
    const [branch] = await db.select({ id: branches.id, manager_id: branches.manager_id }).from(branches)
      .where(and(eq(branches.id, candidate.branch_id), eq(branches.tenant_id, candidate.tenant_id)))
      .limit(1)
    if (!branch || (candidate.role === 'branch_manager' && branch.manager_id)) {
      return NextResponse.json({ error: 'Filial tapılmadı və ya artıq müdiri var' }, { status: 409 })
    }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const claimedAt = new Date()
  let createdUserId: string | null = null

  try {
    // neon-http interaktiv transaction dəstəkləmir. Əvvəl dəvəti şərtli update ilə
    // atomik götürürük; sonrakı addım alınmasa aşağıdakı kompensasiya hər şeyi geri açır.
    const [claimed] = await db.update(invitations)
      .set({ accepted_at: claimedAt })
      .where(and(
        eq(invitations.id, candidate.id),
        eq(invitations.token, candidate.token),
        isNull(invitations.accepted_at),
        gt(invitations.expires_at, new Date()),
      ))
      .returning()
    if (!claimed) throw new AcceptError('INVITE_CLAIMED')

    const [created] = await db.insert(users).values({
      tenant_id: claimed.tenant_id,
      email: claimed.email.trim().toLowerCase(),
      name,
      password_hash: passwordHash,
      role: claimed.role,
      is_email_verified: true,
      email_verified_at: new Date(),
    }).returning({ id: users.id })
    createdUserId = created.id

    if (claimed.role === 'region_manager' && claimed.region_id) {
      const assigned = await db.update(regions)
        .set({ manager_id: created.id, updated_at: new Date() })
        .where(and(
          eq(regions.id, claimed.region_id),
          eq(regions.tenant_id, claimed.tenant_id),
          isNull(regions.manager_id),
        )).returning({ id: regions.id })
      if (assigned.length === 0) throw new AcceptError('SCOPE_TAKEN')
    } else if (claimed.role === 'branch_manager' && claimed.branch_id) {
      const assigned = await db.update(branches)
        .set({ manager_id: created.id, updated_at: new Date() })
        .where(and(
          eq(branches.id, claimed.branch_id),
          eq(branches.tenant_id, claimed.tenant_id),
          isNull(branches.manager_id),
        )).returning({ id: branches.id })
      if (assigned.length === 0) throw new AcceptError('SCOPE_TAKEN')
    } else if (claimed.role === 'staff' && claimed.branch_id) {
      await db.insert(staff_profiles).values({
        user_id: created.id,
        tenant_id: claimed.tenant_id,
        branch_id: claimed.branch_id,
        status: 'active',
      })
    } else {
      throw new AcceptError('INVALID_SCOPE')
    }

    try {
      await db.insert(audit_logs).values({
        tenant_id: claimed.tenant_id,
        user_id: created.id,
        action: 'user.register',
        entity: 'user',
        entity_id: created.id,
        metadata: JSON.stringify({ email: claimed.email, role: claimed.role }),
      })
    } catch (error) {
      console.error('Audit log onboarding write error:', error)
    }

    try {
      await sendWelcomeEmail({ email: candidate.email, name, role: candidate.role })
    } catch (error) {
      console.error('Welcome mail göndərilmədi (qeydiyyat uğurlu):', error)
    }

    return NextResponse.json({ success: true, userId: created.id })
  } catch (error) {
    if (createdUserId) {
      await Promise.allSettled([
        db.update(regions).set({ manager_id: null, updated_at: new Date() })
          .where(eq(regions.manager_id, createdUserId)),
        db.update(branches).set({ manager_id: null, updated_at: new Date() })
          .where(eq(branches.manager_id, createdUserId)),
      ])
      await db.delete(staff_profiles).where(eq(staff_profiles.user_id, createdUserId)).catch(() => undefined)
      await db.delete(users).where(eq(users.id, createdUserId)).catch(() => undefined)
    }
    await db.update(invitations).set({ accepted_at: null }).where(and(
      eq(invitations.id, candidate.id),
      eq(invitations.accepted_at, claimedAt),
    )).catch(() => undefined)

    if (error instanceof AcceptError && error.code === 'INVITE_CLAIMED') {
      return NextResponse.json({ error: 'Dəvət artıq istifadə edilib' }, { status: 409 })
    }
    if (error instanceof AcceptError) {
      return NextResponse.json({ error: 'Dəvətin filial və ya bölgə təyinatı dəyişib' }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : ''
    if (message.includes('unique')) {
      return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatlıdır' }, { status: 409 })
    }
    console.error('Invitation accept error:', error)
    return NextResponse.json({ error: 'Qeydiyyat tamamlanmadı' }, { status: 500 })
  }
}
