import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users, audit_logs } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { and, eq, ne } from 'drizzle-orm'
import { isOperationalRole } from '@/lib/operational-roles'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PATCH — mövcud istifadəçinin ROLUNU və ƏHATƏSİNİ dəyiş.
 *
 * Niyə lazımdır: əvvəl belə bir endpoint YOX idi (`api/users` yalnız GET).
 * Nəticədə dairəvi tələ yaranırdı — bölgə müdiri olmaq üçün artıq bölgə müdiri
 * olmaq lazım idi (`regions/page.tsx:35` dropdown-u yalnız mövcud
 * `region_manager`-ləri gətirir), dəvət isə bölgənin müdiri varsa bloklanırdı
 * (`invitations/_scope.ts:44`). Bu endpoint o dairəni qırır.
 *
 * Təhlükəsizlik: yalnız `super_admin`; son aktiv super admini düşürmək qadağan
 * (özünü sistemdən kilidləmə qorunması); hər dəyişiklik audit-ə yazılır.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Yalnız super admin rol dəyişə bilər' }, { status: 403 })
  }

  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Yanlış istifadəçi ID' }, { status: 400 })

  const tenantId = session.user.tenant_id
  const [target] = await db.select({
    id: users.id, email: users.email, name: users.name,
    role: users.role, is_active: users.is_active,
  }).from(users).where(and(eq(users.id, id), eq(users.tenant_id, tenantId))).limit(1)
  if (!target) return NextResponse.json({ error: 'İstifadəçi tapılmadı' }, { status: 404 })

  const body = await req.json().catch(() => null) as {
    role?: unknown; region_id?: unknown; branch_id?: unknown; is_active?: unknown
  } | null
  if (!body) return NextResponse.json({ error: 'Giriş formatı düzgün deyil' }, { status: 400 })

  const nextRole = body.role === undefined ? null : body.role
  if (nextRole !== null && (typeof nextRole !== 'string' || !isOperationalRole(nextRole))) {
    return NextResponse.json({ error: 'Rol super_admin / region_manager / branch_manager olmalıdır' }, { status: 400 })
  }
  const nextActive = typeof body.is_active === 'boolean' ? body.is_active : null

  // ── Kilidlənmə qoruması ──────────────────────────────────────────────────
  // Son aktiv super admin rolunu itirə və ya deaktiv edilə bilməz — əks halda
  // tenant-da heç kim istifadəçi/rol idarə edə bilməz.
  const losesSuperAdmin = target.role === 'super_admin'
    && ((nextRole !== null && nextRole !== 'super_admin') || nextActive === false)
  if (losesSuperAdmin) {
    const others = await db.select({ id: users.id }).from(users).where(and(
      eq(users.tenant_id, tenantId),
      eq(users.role, 'super_admin'),
      eq(users.is_active, true),
      ne(users.id, id),
    ))
    if (others.length === 0) {
      return NextResponse.json({
        error: 'Sistemdəki son aktiv super admin dəyişdirilə bilməz — əvvəlcə başqa super admin təyin edin',
      }, { status: 409 })
    }
  }

  const regionId = typeof body.region_id === 'string' && body.region_id ? body.region_id : null
  const branchId = typeof body.branch_id === 'string' && body.branch_id ? body.branch_id : null
  if (regionId) {
    const [region] = await db.select({ id: regions.id }).from(regions)
      .where(and(eq(regions.id, regionId), eq(regions.tenant_id, tenantId))).limit(1)
    if (!region) return NextResponse.json({ error: 'Bölgə tapılmadı' }, { status: 404 })
  }
  if (branchId) {
    const [branch] = await db.select({ id: branches.id }).from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.tenant_id, tenantId))).limit(1)
    if (!branch) return NextResponse.json({ error: 'Filial tapılmadı' }, { status: 404 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date() }
  if (nextRole !== null) patch.role = nextRole
  if (nextActive !== null) patch.is_active = nextActive
  if (Object.keys(patch).length === 1 && !regionId && !branchId) {
    return NextResponse.json({ error: 'Dəyişdiriləcək sahə göstərilməyib' }, { status: 400 })
  }

  await db.update(users).set(patch)
    .where(and(eq(users.id, id), eq(users.tenant_id, tenantId)))

  // Əhatə göstəriciləri — yeni rola görə təyin et.
  const effectiveRole = nextRole ?? target.role
  let replacedRegionManager: string | null = null
  let replacedBranchManager: string | null = null
  if (effectiveRole === 'region_manager' && regionId) {
    const [prev] = await db.update(regions).set({ manager_id: id })
      .where(and(eq(regions.id, regionId), eq(regions.tenant_id, tenantId)))
      .returning({ previous: regions.manager_id })
    replacedRegionManager = prev?.previous ?? null
  }
  if (effectiveRole === 'branch_manager' && branchId) {
    const [prev] = await db.update(branches).set({ manager_id: id })
      .where(and(eq(branches.id, branchId), eq(branches.tenant_id, tenantId)))
      .returning({ previous: branches.manager_id })
    replacedBranchManager = prev?.previous ?? null
  }

  try {
    await db.insert(audit_logs).values({
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'user.role.change',
      entity: 'user',
      entity_id: id,
      metadata: JSON.stringify({
        email: target.email,
        from_role: target.role, to_role: nextRole ?? target.role,
        from_active: target.is_active, to_active: nextActive ?? target.is_active,
        region_id: regionId, branch_id: branchId,
        replaced_region_manager: replacedRegionManager,
        replaced_branch_manager: replacedBranchManager,
      }),
    })
  } catch (auditError) {
    console.error('Audit log write error:', auditError)
  }

  // Qeyd: `auth.ts` session callback-i rolu HƏR yoxlamada DB-dən oxuyur
  // (`auth.ts:85-108`) → dəyişiklik istifadəçinin növbəti sorğusunda dərhal
  // qüvvəyə minir, yenidən giriş tələb olunmur.
  return NextResponse.json({
    ok: true,
    id,
    email: target.email,
    role: nextRole ?? target.role,
    is_active: nextActive ?? target.is_active,
  })
}
