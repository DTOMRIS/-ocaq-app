import { pgTable, uuid, text, date, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

// Promosyonlar / kampanyalar — dashboard promo grid + QR; admin CRUD.
export const promotions = pgTable('promotions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenant_id:      uuid('tenant_id').notNull().references(() => tenants.id),
  title:          text('title').notNull(),
  description:    text('description'),
  promo_type:     text('promo_type').notNull().default('percent'), // percent | bogo | fixed | gift
  discount_value: text('discount_value'),                          // "20" / "5 AZN" / hədiyyə mətni
  code:           text('code'),                                    // AILE20
  image_url:      text('image_url'),
  badge:          text('badge').default('AKTİV'),                  // AKTİV | YENİ
  valid_from:     date('valid_from'),
  valid_until:    date('valid_until'),
  is_active:      boolean('is_active').notNull().default(true),
  branch_id:      uuid('branch_id').references(() => branches.id), // null = bütün filiallar
  created_by:     uuid('created_by').references(() => users.id),
  created_at:     timestamp('created_at').notNull().defaultNow(),
  updated_at:     timestamp('updated_at').notNull().defaultNow(),
})
