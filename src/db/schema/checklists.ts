import { pgTable, uuid, text, integer, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

export const checklists = pgTable('checklists', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenant_id:    uuid('tenant_id').notNull().references(() => tenants.id),
  // Tarixi qeydlərdə filial boş ola bilər; yeni yazılar API tərəfindən filial tələb edir.
  branch_id:    uuid('branch_id').references(() => branches.id),
  completed_by: text('completed_by').notNull(),
  checked_by:   text('checked_by').notNull(),
  completed_by_user_id: uuid('completed_by_user_id').references(() => users.id),
  shift:        text('shift').notNull(),              // 'sabah' | 'axsam'
  business_date: date('business_date').notNull(),     // Asia/Baku iş günü
  idempotency_key: text('idempotency_key').notNull(),
  score_pct:    integer('score_pct').notNull(),
  items_json:   text('items_json').notNull(),         // JSON string storing answer states
  created_at:   timestamp('created_at').notNull().defaultNow(),
  updated_at:   timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('checklists_branch_date_shift_unique').on(
    table.tenant_id,
    table.branch_id,
    table.business_date,
    table.shift,
  ),
  uniqueIndex('checklists_idempotency_unique').on(table.tenant_id, table.idempotency_key),
])
