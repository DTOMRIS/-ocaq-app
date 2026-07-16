import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { staff_profiles } from '@/db/schema/staff'
import { users, audit_logs } from '@/db/schema/auth'
import { eq, and, inArray } from 'drizzle-orm'
import { encryptOrNull } from '@/lib/encryption'
import { accessibleBranchIds, canAccessBranch } from '@/lib/branch-access'

// GET — personel listini al (şifrəli sahələr göndərilmir)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rol yoxlaması — yalnız super_admin, region_manager və branch_manager görə bilər
  const role = session.user.role
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branch_id')

  const conditions = [
    eq(staff_profiles.tenant_id, session.user.tenant_id),
    eq(staff_profiles.is_archived, false),
  ]

  if (role !== 'super_admin') {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) return NextResponse.json([])
    if (branchId && !branchIds.includes(branchId)) {
      return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
    }
    conditions.push(branchId
      ? eq(staff_profiles.branch_id, branchId)
      : inArray(staff_profiles.branch_id, branchIds))
  } else if (branchId) {
    if (!await canAccessBranch(session.user, branchId)) {
      return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
    }
    conditions.push(eq(staff_profiles.branch_id, branchId))
  }

  const query = db
    .select({
      id:            staff_profiles.id,
      user_id:       staff_profiles.user_id,
      employee_code: staff_profiles.employee_code,
      position:      staff_profiles.position,
      department:    staff_profiles.department,
      status:        staff_profiles.status,
      branch_id:     staff_profiles.branch_id,
      avatar_url:    staff_profiles.avatar_url,
      hire_date:     staff_profiles.hire_date,
      contract_type: staff_profiles.contract_type,
      name:          users.name,
      email:         users.email,
      role:          users.role,
      is_active:     users.is_active,
    })
    .from(staff_profiles)
    .innerJoin(users, eq(staff_profiles.user_id, users.id))
    .where(and(...conditions))
    .orderBy(staff_profiles.employee_code)

  const list = await query

  return NextResponse.json(list)
}

// POST — yeni staff profili yarat
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['super_admin', 'region_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const body = await req.json()
  const {
    user_id, branch_id, employee_code, position, department,
    contract_type, hire_date, fin_number, iban,
    salary_gross, salary_net, bonus,
  } = body

  if (!user_id || !branch_id) {
    return NextResponse.json({ error: 'user_id və branch_id tələb olunur' }, { status: 400 })
  }

  if (!await canAccessBranch(session.user, branch_id)) {
    return NextResponse.json({ error: 'Bu filial üçün icazəniz yoxdur' }, { status: 403 })
  }

  const [targetUser] = await db.select({ id: users.id, role: users.role })
    .from(users)
    .where(and(
      eq(users.id, user_id),
      eq(users.tenant_id, session.user.tenant_id),
      eq(users.is_active, true),
    ))
    .limit(1)

  if (!targetUser || targetUser.role !== 'staff') {
    return NextResponse.json({ error: 'Aktiv işçi istifadəçisi tapılmadı' }, { status: 400 })
  }

  const [existingProfile] = await db.select({ id: staff_profiles.id })
    .from(staff_profiles)
    .where(and(
      eq(staff_profiles.tenant_id, session.user.tenant_id),
      eq(staff_profiles.user_id, user_id),
    ))
    .limit(1)

  if (existingProfile) {
    return NextResponse.json({ error: 'Bu istifadəçinin personal profili artıq mövcuddur' }, { status: 409 })
  }

  const [profile] = await db
    .insert(staff_profiles)
    .values({
      user_id,
      tenant_id:     session.user.tenant_id,
      branch_id,
      employee_code,
      position,
      department,
      contract_type,
      hire_date,
      fin_number:    encryptOrNull(fin_number),  // AES-256
      iban:          encryptOrNull(iban),        // AES-256
      salary_gross,
      salary_net,
      bonus,
    })
    .returning()

  // Audit log
  await db.insert(audit_logs).values({
    tenant_id: session.user.tenant_id,
    user_id:   session.user.id,
    action:    'staff.create',
    entity:    'staff_profile',
    entity_id: profile.id,
    metadata:  JSON.stringify({ position, branch_id }),
  })

  return NextResponse.json(profile, { status: 201 })
}
