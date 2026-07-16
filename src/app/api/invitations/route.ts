import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { invitations, users, audit_logs } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { and, eq, gt, inArray, isNull, or } from 'drizzle-orm'
import { inviteRateLimit } from '@/lib/rate-limit'
import { sendInvitationEmail } from '@/lib/email'
import { accessibleBranchIds, accessibleRegionIds } from '@/lib/branch-access'
import { invitationScope, isInvitableRole } from './_scope'
import { createOneTimeToken, hashOneTimeToken } from '@/lib/one-time-token'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const filters = [eq(invitations.tenant_id, session.user.tenant_id)]
  if (session.user.role === 'region_manager') {
    const [branchIds, regionIds] = await Promise.all([
      accessibleBranchIds(session.user),
      accessibleRegionIds(session.user),
    ])
    const scopeFilters = [eq(invitations.invited_by, session.user.id)]
    if (branchIds.length > 0) scopeFilters.push(inArray(invitations.branch_id, branchIds))
    if (regionIds.length > 0) scopeFilters.push(inArray(invitations.region_id, regionIds))
    filters.push(or(...scopeFilters)!)
  }

  const list = await db.select({
    id: invitations.id,
    email: invitations.email,
    role: invitations.role,
    region_id: invitations.region_id,
    branch_id: invitations.branch_id,
    invited_by: invitations.invited_by,
    expires_at: invitations.expires_at,
    accepted_at: invitations.accepted_at,
    created_at: invitations.created_at,
  }).from(invitations).where(and(...filters)).orderBy(invitations.created_at)

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { success } = await inviteRateLimit.limit(session.user.id)
  if (!success) {
    return NextResponse.json({ error: 'Çox sayda sorğu. Bir saat sonra cəhd edin.' }, { status: 429 })
  }

  const body = await req.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !isInvitableRole(body.role)) {
    return NextResponse.json({ error: 'Düzgün e-poçt və rol tələb olunur' }, { status: 400 })
  }

  const scope = await invitationScope(session.user, body.role, body.region_id, body.branch_id)
  if ('error' in scope) return NextResponse.json({ error: scope.error }, { status: 403 })

  const [existingUser] = await db.select({ id: users.id }).from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (existingUser) return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatlıdır' }, { status: 409 })

  const [pending] = await db.select({ id: invitations.id }).from(invitations)
    .where(and(
      eq(invitations.tenant_id, session.user.tenant_id),
      eq(invitations.email, email),
      isNull(invitations.accepted_at),
      gt(invitations.expires_at, new Date()),
    )).limit(1)
  if (pending) return NextResponse.json({ error: 'Bu e-poçt üçün gözləyən dəvət artıq mövcuddur' }, { status: 409 })

  const token = createOneTimeToken()
  const [invitation] = await db.insert(invitations).values({
    tenant_id: session.user.tenant_id,
    email,
    role: body.role,
    token: hashOneTimeToken(token),
    invited_by: session.user.id,
    region_id: scope.regionId,
    branch_id: scope.branchId,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
  }).returning({ id: invitations.id })

  let branchName: string | undefined
  if (scope.branchId) {
    const [branch] = await db.select({ name: branches.name }).from(branches)
      .where(and(eq(branches.id, scope.branchId), eq(branches.tenant_id, session.user.tenant_id)))
      .limit(1)
    branchName = branch?.name
  }

  const { error } = await sendInvitationEmail({
    email,
    token,
    inviterName: session.user.name ?? 'Admin',
    recipientRole: body.role,
    branchName,
  })
  if (error) {
    await db.delete(invitations).where(and(
      eq(invitations.id, invitation.id),
      eq(invitations.tenant_id, session.user.tenant_id),
    ))
    console.error('Invitation mail error:', error)
    return NextResponse.json({ error: 'Dəvət e-poçtu göndərilə bilmədi' }, { status: 502 })
  }

  try {
    await db.insert(audit_logs).values({
      tenant_id: session.user.tenant_id,
      user_id: session.user.id,
      action: 'user.invite',
      entity: 'invitation',
      entity_id: invitation.id,
      metadata: JSON.stringify({ email, role: body.role, region_id: scope.regionId, branch_id: scope.branchId }),
    })
  } catch (error) {
    console.error('Audit log write error:', error)
  }

  return NextResponse.json({ success: true, id: invitation.id }, { status: 201 })
}
