import { db } from '@/db'
import { field_permissions } from '@/db/schema/field-permissions'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'

export type FieldPerm = {
  can_view:     boolean
  can_edit:     boolean
  is_encrypted: boolean
  audit_log:    boolean
}

const DEFAULT_PERM: FieldPerm = {
  can_view: false, can_edit: false, is_encrypted: false, audit_log: false,
}

// Bir sahə üçün cari istifadəçinin icazəsini al
export async function getFieldPerm(
  entity: string,
  fieldName: string,
): Promise<FieldPerm> {
  const session = await auth()
  if (!session) return DEFAULT_PERM

  // Super admin hər şeyi görür
  if (session.user.role === 'super_admin') {
    return { can_view: true, can_edit: true, is_encrypted: false, audit_log: true }
  }

  const [perm] = await db
    .select()
    .from(field_permissions)
    .where(
      and(
        eq(field_permissions.tenant_id, session.user.tenant_id),
        eq(field_permissions.entity, entity),
        eq(field_permissions.field_name, fieldName),
        eq(field_permissions.role, session.user.role as 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'),
      )
    )
    .limit(1)

  return {
    can_view:     perm?.can_view     ?? false,
    can_edit:     perm?.can_edit     ?? false,
    is_encrypted: perm?.is_encrypted ?? false,
    audit_log:    perm?.audit_log    ?? false,
  }
}

// Bütün sahələr üçün icazə xəritəsi (profil səhifəsi üçün)
export async function getAllFieldPerms(
  entity: string,
): Promise<Record<string, FieldPerm>> {
  const session = await auth()
  if (!session) return {}

  // Super admin üçün — DB-yə getməyə ehtiyac yoxdur
  if (session.user.role === 'super_admin') {
    return new Proxy({} as Record<string, FieldPerm>, {
      get: () => ({ can_view: true, can_edit: true, is_encrypted: false, audit_log: true }),
    })
  }

  const perms = await db
    .select()
    .from(field_permissions)
    .where(
      and(
        eq(field_permissions.tenant_id, session.user.tenant_id),
        eq(field_permissions.entity, entity),
        eq(field_permissions.role, session.user.role as 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'),
      )
    )

  return Object.fromEntries(
    perms.map(p => [p.field_name, {
      can_view:     p.can_view,
      can_edit:     p.can_edit,
      is_encrypted: p.is_encrypted,
      audit_log:    p.audit_log,
    }])
  )
}
