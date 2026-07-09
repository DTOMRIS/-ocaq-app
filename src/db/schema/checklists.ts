import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './auth'
import { branches } from './branches'

export const checklists = pgTable('checklists', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenant_id:    uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:    uuid('branch_id').references(() => branches.id),
  completed_by: text('completed_by').notNull(),
  checked_by:   text('checked_by').notNull(),
  shift:        text('shift').notNull(),              // 'sabah' | 'axsam'
  score_pct:    integer('score_pct').notNull(),
  items_json:   text('items_json').notNull(),         // JSON string storing answer states
  created_at:   timestamp('created_at').notNull().defaultNow(),
  updated_at:   timestamp('updated_at').notNull().defaultNow(),
})
