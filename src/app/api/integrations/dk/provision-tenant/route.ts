import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { audit_logs, invitations, tenants, users } from '@/db/schema/auth'
import { createOneTimeToken, hashOneTimeToken } from '@/lib/one-time-token'
import { sendInvitationEmail } from '@/lib/email'
import {
  DK_PROVISIONING_SOURCE,
  isValidProvisioningSecret,
  normalizeProvisioningEmail,
  normalizeTenantSlug,
} from '@/lib/dk-provisioning'

export async function POST(req: NextRequest) {
  if (!isValidProvisioningSecret(
    req.headers.get('authorization'),
    process.env.DK_PROVISIONING_SECRET,
  )) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const externalCustomerId = typeof body?.externalCustomerId === 'string'
    ? body.externalCustomerId.trim()
    : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const slug = normalizeTenantSlug(body?.slug)
  const ownerEmail = normalizeProvisioningEmail(body?.ownerEmail)
  const planCode = typeof body?.planCode === 'string' && body.planCode.trim()
    ? body.planCode.trim().slice(0, 80)
    : 'standard'

  if (
    !externalCustomerId
    || externalCustomerId.length > 120
    || name.length < 2
    || name.length > 160
    || !slug
    || !ownerEmail
  ) {
    return NextResponse.json(
      { error: 'externalCustomerId, name, slug və ownerEmail etibarlı olmalıdır' },
      { status: 400 },
    )
  }

  let [tenant] = await db.select().from(tenants)
    .where(eq(tenants.external_customer_id, externalCustomerId))
    .limit(1)
  let createdTenant = false

  if (!tenant) {
    try {
      const [created] = await db.insert(tenants).values({
        name,
        slug,
        external_customer_id: externalCustomerId,
        plan_code: planCode,
        provisioned_by: 'dk_agency',
        provisioned_at: new Date(),
      }).returning()
      tenant = created
      createdTenant = true
    } catch {
      // Paralel eyni DK sorğusundan yalnız biri tenant yaradır.
      ;[tenant] = await db.select().from(tenants)
        .where(eq(tenants.external_customer_id, externalCustomerId))
        .limit(1)
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant slug artıq istifadə olunur və ya tenant yaradıla bilmədi' },
          { status: 409 },
        )
      }
    }
  } else {
    const [updated] = await db.update(tenants)
      .set({ name, plan_code: planCode })
      .where(eq(tenants.id, tenant.id))
      .returning()
    tenant = updated
  }

  if (tenant.provisioned_by !== 'dk_agency') {
    return NextResponse.json({ error: 'Bu müştəri DK tərəfindən idarə edilmir' }, { status: 409 })
  }

  const [existingUser] = await db.select({
    id: users.id,
    tenant_id: users.tenant_id,
    role: users.role,
    is_active: users.is_active,
  }).from(users).where(eq(users.email, ownerEmail)).limit(1)

  if (existingUser) {
    if (
      existingUser.tenant_id === tenant.id
      && existingUser.role === 'super_admin'
      && existingUser.is_active
    ) {
      return NextResponse.json({
        status: 'already_active',
        tenant: { id: tenant.id, slug: tenant.slug, externalCustomerId },
        ownerUserId: existingUser.id,
      })
    }
    return NextResponse.json({ error: 'Owner e-poçtu artıq başqa hesabda istifadə olunur' }, { status: 409 })
  }

  const [otherPendingOwner] = await db.select({
    id: invitations.id,
    email: invitations.email,
  }).from(invitations).where(and(
    eq(invitations.tenant_id, tenant.id),
    eq(invitations.role, 'super_admin'),
    eq(invitations.source, DK_PROVISIONING_SOURCE),
    isNull(invitations.accepted_at),
    isNull(invitations.revoked_at),
  )).limit(1)
  if (otherPendingOwner && otherPendingOwner.email !== ownerEmail) {
    return NextResponse.json(
      { error: 'Bu tenant üçün başqa owner dəvəti gözləyir' },
      { status: 409 },
    )
  }

  const token = createOneTimeToken()
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  let invitationId: string
  if (otherPendingOwner) {
    const [renewed] = await db.update(invitations).set({
      token: hashOneTimeToken(token),
      expires_at: expiresAt,
    }).where(eq(invitations.id, otherPendingOwner.id)).returning({ id: invitations.id })
    invitationId = renewed.id
  } else {
    const [invitation] = await db.insert(invitations).values({
      tenant_id: tenant.id,
      email: ownerEmail,
      role: 'super_admin',
      token: hashOneTimeToken(token),
      invited_by: null,
      region_id: null,
      branch_id: null,
      source: DK_PROVISIONING_SOURCE,
      expires_at: expiresAt,
    }).returning({ id: invitations.id })
    invitationId = invitation.id
  }

  const delivery = await sendInvitationEmail({
    email: ownerEmail,
    token,
    inviterName: 'DK Agency',
    recipientRole: 'super_admin',
  })

  await db.insert(audit_logs).values({
    tenant_id: tenant.id,
    action: delivery.error ? 'tenant.provision.delivery_failed' : 'tenant.provision',
    entity: 'tenant',
    entity_id: tenant.id,
    metadata: JSON.stringify({
      external_customer_id: externalCustomerId,
      plan_code: planCode,
      owner_email: ownerEmail,
      invitation_id: invitationId,
      created_tenant: createdTenant,
    }),
  }).catch(error => console.error('DK provision audit error:', error))

  if (delivery.error) {
    console.error('DK owner invitation mail error:', delivery.error)
    return NextResponse.json(
      {
        error: 'Tenant yaradıldı, amma owner dəvət e-poçtu göndərilə bilmədi',
        retryable: true,
        tenant: { id: tenant.id, slug: tenant.slug, externalCustomerId },
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    status: createdTenant ? 'created' : 'invitation_renewed',
    tenant: { id: tenant.id, slug: tenant.slug, externalCustomerId, planCode },
    invitationId,
  }, { status: createdTenant ? 201 : 200 })
}
