import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'

// ─── Bölgələr ─────────────────────────────────────────────────────────────────
export const regions = pgTable('regions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id),
  name:       text('name').notNull(),              // Bakı Mərkəz, Abşeron...
  manager_id: uuid('manager_id').references(() => users.id),
  is_active:  boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})
