import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { staff_profiles } from '@/db/schema/staff'
import { users, audit_logs } from '@/db/schema/auth'
import { eq, and } from 'drizzle-orm'
import { encryptOrNull } from '@/lib/encryption'

// GET — personel listini al (şifrəli sahələr göndərilmir)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branch_id')

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
      // users cədvəlindən
      name:          users.name,
      email:         users.email,
      role:          users.role,
      is_active:     users.is_active,
    })
    .from(staff_profiles)
    .innerJoin(users, eq(staff_profiles.user_id, users.id))
    .where(
      and(
        eq(staff_profiles.tenant_id, session.user.tenant_id),
        eq(staff_profiles.is_archived, false),
        ...(branchId ? [eq(staff_profiles.branch_id, branchId)] : []),
      )
    )
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

  if (!user_id) {
    return NextResponse.json({ error: 'user_id tələb olunur' }, { status: 400 })
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
