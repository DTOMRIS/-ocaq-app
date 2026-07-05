import {
  pgTable, uuid, text, date, numeric, timestamp, integer, smallint,
} from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

// ─── Aylıq satış hədəfləri ──────────────────────────────────────────────────
export const sales_targets = pgTable('sales_targets', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:     uuid('branch_id').notNull().references(() => branches.id),
  month:         date('month').notNull(),           // Ayın 1-i: '2026-07-01'
  target_amount: numeric('target_amount', { precision: 12, scale: 2 }).notNull(),
  created_by:    uuid('created_by').references(() => users.id),
  created_at:    timestamp('created_at').notNull().defaultNow(),
  updated_at:    timestamp('updated_at').notNull().defaultNow(),
})

// ─── Gündəlik satış daxiletmələri ────────────────────────────────────────────
export const daily_sales = pgTable('daily_sales', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenant_id:   uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:   uuid('branch_id').notNull().references(() => branches.id),
  sale_date:   date('sale_date').notNull(),         // '2026-07-03'
  amount:      numeric('amount', { precision: 12, scale: 2 }).notNull(),
  day_of_week: smallint('day_of_week'),             // 0=Bazar, 1=B.e. ... 6=Şənbə (gələcək: h/s katsayı)
  notes:       text('notes'),
  entered_by:  uuid('entered_by').references(() => users.id),
  created_at:  timestamp('created_at').notNull().defaultNow(),
  updated_at:  timestamp('updated_at').notNull().defaultNow(),
})
