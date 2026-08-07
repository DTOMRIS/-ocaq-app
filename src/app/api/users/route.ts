import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { db } from '@/db'
import { users, audit_logs } from '@/db/schema/auth'
import { staff_profiles } from '@/db/schema/staff'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { eq, and, inArray } from 'drizzle-orm'
import { accessibleBranchIds } from '@/lib/branch-access'
import { isOperationalRole } from '@/lib/operational-roles'

// GET — istifadəçi listini al (role filter ilə)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'super_admin' && session.user.role !== 'region_manager') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  const conditions = [
    eq(users.tenant_id, session.user.tenant_id),
    eq(users.is_active, true),
  ]

  const validRoles = ['super_admin', 'region_manager', 'branch_manager', 'staff'] as const
  if (role && !validRoles.includes(role as typeof validRoles[number])) {
    return NextResponse.json({ error: 'Yanlış rol' }, { status: 400 })
  }
  if (role) {
    conditions.push(eq(users.role, role as 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'))
  }

  if (session.user.role === 'region_manager') {
    const branchIds = await accessibleBranchIds(session.user)
    if (branchIds.length === 0) {
      return NextResponse.json([])
    }

    const [profileRows, branchRows] = await Promise.all([
      db.select({ user_id: staff_profiles.user_id }).from(staff_profiles)
        .where(and(
          eq(staff_profiles.tenant_id, session.user.tenant_id),
          inArray(staff_profiles.branch_id, branchIds),
          eq(staff_profiles.is_archived, false),
        )),
      db.select({ manager_id: branches.manager_id }).from(branches)
        .where(and(
          eq(branches.tenant_id, session.user.tenant_id),
          inArray(branches.id, branchIds),
        )),
    ])

    const userIds = [...new Set([
      session.user.id,
      ...profileRows.map(row => row.user_id),
      ...branchRows.flatMap(row => row.manager_id ? [row.manager_id] : []),
    ])]
    conditions.push(inArray(users.id, userIds))
  }

  const list = await db
    .select({
      id:    users.id,
      name:  users.name,
      email: users.email,
      role:  users.role,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name)

  return NextResponse.json(list)
}

// ─── POST — birbaşa istifadəçi yarat (dəvət/e-poçt olmadan) ──────────────────
// Niyə: dəvət axını e-poçtdan asılıdır. SMTP sınıq olanda idarəçi HEÇ KİMİ
// sistemə əlavə edə bilmirdi. Bu endpoint hesabı DƏRHAL yaradır və müvəqqəti
// şifrəni BİR DƏFƏ cavabda qaytarır — idarəçi WhatsApp ilə çatdırır.
//
// Təhlükəsizlik (danışıqsız):
//  • yalnız `super_admin` çağıra bilər
//  • şifrə crypto ilə təsadüfi 16 simvol — sabit/təxmin edilən şifrə YOXDUR
//  • `must_change_password = true` → istifadəçi ilk girişdə öz şifrəsini qoyur
//  • şifrə YALNIZ bu cavabda görünür, DB-də yalnız bcrypt hash saxlanılır
//  • hər yaradılış audit-ə yazılır
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%+='
function temporaryPassword() {
  return Array.from({ length: 16 }, () => PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)]).join('')
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Yalnız super admin istifadəçi yarada bilər' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as {
    email?: unknown; name?: unknown; role?: unknown
    region_id?: unknown; region_ids?: unknown; branch_id?: unknown
  } | null
  if (!body) return NextResponse.json({ error: 'Giriş formatı düzgün deyil' }, { status: 400 })

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const role = body.role

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Düzgün e-poçt daxil edin' }, { status: 400 })
  }
  if (!name) return NextResponse.json({ error: 'Ad daxil edin' }, { status: 400 })
  if (typeof role !== 'string' || !isOperationalRole(role)) {
    // Əməkdaş OCAQ-a girmir (CANONICAL-PRODUCT-SCOPE) — yalnız 3 idarəçi rolu.
    return NextResponse.json({ error: 'Rol super_admin / region_manager / branch_manager olmalıdır' }, { status: 400 })
  }

  const tenantId = session.user.tenant_id
  const [existing] = await db.select({ id: users.id }).from(users)
    .where(eq(users.email, email)).limit(1)
  if (existing) {
    return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatlıdır' }, { status: 409 })
  }

  // Əhatə yoxlaması — verilibsə bu tenant-a aid olmalıdır (cross-tenant bağlanmasın)
  //
  // ÇOX BÖLGƏ dəstəyi: `regions.manager_id` hər bölgə üçün ayrı sahədir, yəni
  // EYNİ istifadəçi bir neçə bölgəyə müdir təyin edilə bilər.
  // `accessibleRegionIds` (`branch-access.ts:22-30`) `manager_id = user.id`
  // olan BÜTÜN bölgələri qaytarır → bir nəfər bütün şəbəkəni görə bilər,
  // amma `super_admin` səlahiyyətləri OLMADAN (hesab yaratma / rol dəyişdirmə
  // yalnız super_admin-dir). Ofis işçiləri üçün nəzərdə tutulan model budur.
  const regionIdsRaw = Array.isArray(body.region_ids)
    ? body.region_ids.filter((r): r is string => typeof r === 'string' && !!r)
    : (typeof body.region_id === 'string' && body.region_id ? [body.region_id] : [])
  const regionIds = [...new Set(regionIdsRaw)]
  const branchId = typeof body.branch_id === 'string' && body.branch_id ? body.branch_id : null
  if (regionIds.length) {
    const found = await db.select({ id: regions.id }).from(regions)
      .where(and(inArray(regions.id, regionIds), eq(regions.tenant_id, tenantId)))
    if (found.length !== regionIds.length) {
      return NextResponse.json({ error: 'Bölgə tapılmadı (və ya bu tenant-a aid deyil)' }, { status: 404 })
    }
  }
  if (branchId) {
    const [branch] = await db.select({ id: branches.id }).from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.tenant_id, tenantId))).limit(1)
    if (!branch) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
  }

  const password = temporaryPassword()
  const passwordHash = await bcrypt.hash(password, 12)

  const [created] = await db.insert(users).values({
    tenant_id: tenantId,
    email,
    name,
    password_hash: passwordHash,
    must_change_password: true,
    role,
    is_active: true,
    // İdarəçi hesabı özü yaratdığı üçün e-poçt doğrulanmış sayılır —
    // əks halda `auth.ts:36` EMAIL_NOT_VERIFIED ilə girişi bloklayır.
    is_email_verified: true,
  }).returning({ id: users.id })

  // Əhatə təyinatı: müdirin bölgəsi/filialı varsa göstərici yenilənir.
  // Köhnə müdir varsa DƏYİŞDİRİLİR (super_admin qərarı) və audit-ə yazılır.
  let replacedRegionManager: string | null = null
  let replacedBranchManager: string | null = null
  if (role === 'region_manager' && regionIds.length) {
    const prevRows = await db.update(regions).set({ manager_id: created.id })
      .where(and(inArray(regions.id, regionIds), eq(regions.tenant_id, tenantId)))
      .returning({ previous: regions.manager_id })
    replacedRegionManager = prevRows.map(r => r.previous).filter(Boolean).join(', ') || null
  }
  if (role === 'branch_manager' && branchId) {
    const [prev] = await db.update(branches).set({ manager_id: created.id })
      .where(and(eq(branches.id, branchId), eq(branches.tenant_id, tenantId)))
      .returning({ previous: branches.manager_id })
    replacedBranchManager = prev?.previous ?? null
  }

  try {
    await db.insert(audit_logs).values({
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'user.create.direct',
      entity: 'user',
      entity_id: created.id,
      metadata: JSON.stringify({
        email, name, role, region_ids: regionIds, branch_id: branchId,
        replaced_region_manager: replacedRegionManager,
        replaced_branch_manager: replacedBranchManager,
      }),
    })
  } catch (auditError) {
    console.error('Audit log write error:', auditError)
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    email,
    name,
    role,
    // BİR DƏFƏLİK — bu cavabdan sonra şifrə heç yerdən oxuna bilməz.
    temporaryPassword: password,
    mustChangePassword: true,
    note: 'Şifrəni istifadəçiyə çatdırın. İlk girişdə dəyişdirməsi tələb olunacaq.',
  }, { status: 201 })
}
