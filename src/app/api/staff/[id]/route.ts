import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { staff_profiles } from '@/db/schema/staff'
import { users, audit_logs } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'
import { encryptOrNull, decryptOrNull } from '@/lib/encryption'
import { getAllFieldPerms } from '@/lib/permissions'

// GET — tek personel profili (field permission ilə)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile] = await db
    .select()
    .from(staff_profiles)
    .where(
      and(
        eq(staff_profiles.id, id),
        eq(staff_profiles.tenant_id, session.user.tenant_id),
      )
    )
    .limit(1)

  if (!profile) {
    return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })
  }

  // User məlumatı
  const [user] = await db
    .select({ name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, profile.user_id))
    .limit(1)

  // Field permissions
  const perms = await getAllFieldPerms('staff_profile')

  // Şifrəli sahələri yalnız icazəli rollara göstər
  const result: Record<string, unknown> = {
    ...profile,
    name:  user?.name,
    email: user?.email,
    user_role: user?.role,
  }

  // FİN
  if (perms['fin_number']?.can_view) {
    result.fin_number = decryptOrNull(profile.fin_number)
  } else {
    result.fin_number = profile.fin_number ? '••••••••' : null
  }

  // IBAN
  if (perms['iban']?.can_view) {
    result.iban = decryptOrNull(profile.iban)
  } else {
    result.iban = profile.iban ? '••••••••••••' : null
  }

  // Maaş
  if (!perms['salary_gross']?.can_view) {
    result.salary_gross = null
    result.salary_net   = null
    result.bonus        = null
  }

  return NextResponse.json({ profile: result, permissions: perms })
}

// PATCH — personel profilini yenilə
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Profili yoxla
  const [existing] = await db
    .select({ id: staff_profiles.id })
    .from(staff_profiles)
    .where(
      and(
        eq(staff_profiles.id, id),
        eq(staff_profiles.tenant_id, session.user.tenant_id),
      )
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date() }

  // Şifrələnəcək sahələr
  if (body.fin_number !== undefined) updates.fin_number = encryptOrNull(body.fin_number)
  if (body.iban !== undefined)       updates.iban       = encryptOrNull(body.iban)

  // Digər sahələr
  const allowedFields = [
    'branch_id', 'employee_code', 'position', 'department',
    'contract_type', 'status', 'hire_date', 'termination_date',
    'salary_gross', 'salary_net', 'bonus', 'avatar_url',
  ]
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  // Arşiv əməliyyatı
  if (body.is_archived !== undefined) {
    updates.is_archived = body.is_archived
    if (body.is_archived) {
      updates.archived_at = new Date()
      updates.archived_by = session.user.id
      updates.archive_reason = body.archive_reason ?? null
    }
  }

  await db
    .update(staff_profiles)
    .set(updates)
    .where(eq(staff_profiles.id, id))

  // Audit log
  await db.insert(audit_logs).values({
    tenant_id: session.user.tenant_id,
    user_id:   session.user.id,
    action:    body.is_archived ? 'staff.archive' : 'staff.update',
    entity:    'staff_profile',
    entity_id: id,
    metadata:  JSON.stringify(Object.keys(body)),
  })

  return NextResponse.json({ success: true })
}
