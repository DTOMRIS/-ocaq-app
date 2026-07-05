import {
  pgTable, uuid, text, boolean, integer, unique
} from 'drizzle-orm/pg-core'
import { tenants, roleEnum } from './auth'

export const field_permissions = pgTable('field_permissions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id),
  entity:        text('entity').notNull(),         // 'staff_profile', 'branch'...
  field_name:    text('field_name').notNull(),     // 'salary_gross', 'fin_number'...
  role:          roleEnum('role').notNull(),
  can_view:      boolean('can_view').notNull().default(false),
  can_edit:      boolean('can_edit').notNull().default(false),
  is_required:   boolean('is_required').notNull().default(false),
  is_encrypted:  boolean('is_encrypted').notNull().default(false),
  audit_log:     boolean('audit_log').notNull().default(false),
  display_order: integer('display_order').default(0),
}, (t) => ({
  // Tenant + entity + field + role kombinasiyası unikaldır
  uniq: unique().on(t.tenant_id, t.entity, t.field_name, t.role),
}))

// ─── Default permission seed ──────────────────────────────────────────────
// Bu funksiyayı yeni tenant yaradılanda çağır
export const DEFAULT_STAFF_PERMISSIONS = [
  // AD / SOYAD
  { field_name: 'name',         role: 'super_admin',    can_view: true,  can_edit: true,  is_encrypted: false, audit_log: true  },
  { field_name: 'name',         role: 'region_manager', can_view: true,  can_edit: true,  is_encrypted: false, audit_log: true  },
  { field_name: 'name',         role: 'branch_manager', can_view: true,  can_edit: true,  is_encrypted: false, audit_log: true  },
  { field_name: 'name',         role: 'staff',          can_view: true,  can_edit: false, is_encrypted: false, audit_log: false },
  // MAAŞ
  { field_name: 'salary_gross', role: 'super_admin',    can_view: true,  can_edit: true,  is_encrypted: true,  audit_log: true  },
  { field_name: 'salary_gross', role: 'region_manager', can_view: true,  can_edit: false, is_encrypted: true,  audit_log: true  },
  { field_name: 'salary_gross', role: 'branch_manager', can_view: false, can_edit: false, is_encrypted: true,  audit_log: true  },
  { field_name: 'salary_gross', role: 'staff',          can_view: false, can_edit: false, is_encrypted: true,  audit_log: false },
  // FİN
  { field_name: 'fin_number',   role: 'super_admin',    can_view: true,  can_edit: true,  is_encrypted: true,  audit_log: true  },
  { field_name: 'fin_number',   role: 'region_manager', can_view: true,  can_edit: false, is_encrypted: true,  audit_log: true  },
  { field_name: 'fin_number',   role: 'branch_manager', can_view: false, can_edit: false, is_encrypted: true,  audit_log: true  },
  { field_name: 'fin_number',   role: 'staff',          can_view: false, can_edit: false, is_encrypted: true,  audit_log: false },
  // IBAN
  { field_name: 'iban',         role: 'super_admin',    can_view: true,  can_edit: true,  is_encrypted: true,  audit_log: true  },
  { field_name: 'iban',         role: 'region_manager', can_view: true,  can_edit: false, is_encrypted: true,  audit_log: true  },
  { field_name: 'iban',         role: 'branch_manager', can_view: false, can_edit: false, is_encrypted: true,  audit_log: true  },
  { field_name: 'iban',         role: 'staff',          can_view: false, can_edit: false, is_encrypted: true,  audit_log: false },
] as const
