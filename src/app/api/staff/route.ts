import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { staff_profiles } from '@/db/schema/staff'
import { users, audit_logs } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { eq, and, inArray } from 'drizzle-orm'
import { encryptOrNull } from '@/lib/encryption'

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

  // Branch manager yalnız öz filialının personalını
  if (role === 'branch_manager') {
    const myBranches = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(
        eq(branches.tenant_id, session.user.tenant_id),
        eq(branches.manager_id, session.user.id),
      ))
    
    if (myBranches.length === 0) {
      return NextResponse.json([])
    }
    conditions.push(eq(staff_profiles.branch_id, myBranches[0].id))
  }

  // Region manager yalnız öz bölgəsinin filiallarının personalını
  if (role === 'region_manager') {
    const myRegions = await db
      .select({ id: regions.id })
      .from(regions)
      .where(and(
        eq(regions.tenant_id, session.user.tenant_id),
        eq(regions.manager_id, session.user.id),
      ))
    
    if (myRegions.length === 0) {
      return NextResponse.json([])
    }
    
    const regionIds = myRegions.map(r => r.id)
    const myBranchesInRegions = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(
        eq(branches.tenant_id, session.user.tenant_id),
        inArray(branches.region_id, regionIds)
      ))
    
    if (myBranchesInRegions.length === 0) {
      return NextResponse.json([])
    }
    
    const branchIds = myBranchesInRegions.map(b => b.id)
    
    if (branchId) {
      if (!branchIds.includes(branchId)) {
        return NextResponse.json({ error: 'Bu filial sizin bölgənizə aid deyil' }, { status: 403 })
      }
      conditions.push(eq(staff_profiles.branch_id, branchId))
    } else {
      conditions.push(inArray(staff_profiles.branch_id, branchIds))
    }
  } else if (role === 'super_admin' && branchId) {
    // Super admin istənilən filialı süzgəcdən keçirə bilər
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
