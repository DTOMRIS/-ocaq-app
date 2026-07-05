import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { regions } from './regions'

export const branches = pgTable('branches', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenant_id:   uuid('tenant_id').notNull().references(() => tenants.id),
  region_id:   uuid('region_id').references(() => regions.id),  // Bölgə
  code:        text('code').notNull(),              // F-01, F-02...
  name:        text('name').notNull(),              // Nərimanov, Xətai...
  city:        text('city').notNull().default('Bakı'),
  address:     text('address'),
  phone:       text('phone'),
  manager_id:  uuid('manager_id').references(() => users.id),
  iiko_org_id: text('iiko_org_id'),                // POS inteqrasiyası
  open_time:   text('open_time').default('09:00'),
  close_time:  text('close_time').default('23:00'),
  is_active:   boolean('is_active').notNull().default(true),
  is_archived: boolean('is_archived').notNull().default(false),
  created_at:  timestamp('created_at').notNull().defaultNow(),
  updated_at:  timestamp('updated_at').notNull().defaultNow(),
})
