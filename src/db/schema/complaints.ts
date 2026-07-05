import {
  pgTable, uuid, text, timestamp, pgEnum, numeric, integer,
} from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

export const complaintChannelEnum = pgEnum('complaint_channel', [
  'wolt',
  'bolt',
  'phone',
  'whatsapp',
  'instagram',
  'in_store',
  'other',
])

export const complaintCategoryEnum = pgEnum('complaint_category', [
  'late_delivery',
  'missing_item',
  'wrong_item',
  'cold_food',
  'packaging',
  'courier_behavior',
  'food_quality',
  'refund',
  'pricing',
  'other',
])

export const complaintPriorityEnum = pgEnum('complaint_priority', [
  'low',
  'normal',
  'high',
  'critical',
])

export const complaintStatusEnum = pgEnum('complaint_status', [
  'new',
  'in_review',
  'sent_to_branch',
  'resolved',
  'closed',
])

export const complaintFaultEnum = pgEnum('complaint_fault', [
  'unknown',
  'restaurant',
  'platform',
  'courier',
  'customer',
])

export const complaints = pgTable('complaints', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenant_id:       uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:       uuid('branch_id').references(() => branches.id),
  created_by:      uuid('created_by').references(() => users.id),
  assigned_to:     uuid('assigned_to').references(() => users.id),

  channel:         complaintChannelEnum('channel').notNull(),
  category:        complaintCategoryEnum('category').notNull(),
  priority:        complaintPriorityEnum('priority').notNull().default('normal'),
  status:          complaintStatusEnum('status').notNull().default('new'),
  fault:           complaintFaultEnum('fault').notNull().default('unknown'),

  customer_name:   text('customer_name'),
  customer_phone:  text('customer_phone'),
  platform_order_id: text('platform_order_id'),
  order_total:     numeric('order_total', { precision: 10, scale: 2 }),
  refund_amount:   numeric('refund_amount', { precision: 10, scale: 2 }),

  title:           text('title').notNull(),
  description:     text('description').notNull(),
  action_taken:    text('action_taken'),
  resolution_note: text('resolution_note'),

  response_due_at: timestamp('response_due_at'),
  resolved_at:     timestamp('resolved_at'),
  closed_at:       timestamp('closed_at'),
  rating:          integer('rating'),

  created_at:      timestamp('created_at').notNull().defaultNow(),
  updated_at:      timestamp('updated_at').notNull().defaultNow(),
})
