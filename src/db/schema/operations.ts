import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

export const shiftBriefingStatusEnum = pgEnum('shift_briefing_status', ['draft', 'completed'])
export const notificationTypeEnum = pgEnum('notification_type', ['urgent', 'info', 'task', 'promo'])
export const notificationAudienceEnum = pgEnum('notification_audience', [
  'all',
  'role',
  'region',
  'branch',
  'selected',
])

export const shift_briefings = pgTable('shift_briefings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id: uuid('branch_id').notNull().references(() => branches.id),
  shift_date: date('shift_date').notNull(),
  shift: text('shift').notNull(),
  status: shiftBriefingStatusEnum('status').notNull().default('draft'),
  service_focus: text('service_focus').notNull().default(''),
  sales_focus: text('sales_focus').notNull().default(''),
  sales_target: text('sales_target').notNull().default(''),
  quality_focus: text('quality_focus').notNull().default(''),
  training_completed_count: integer('training_completed_count').notNull().default(0),
  training_pending_count: integer('training_pending_count').notNull().default(0),
  manager_note: text('manager_note').notNull().default(''),
  handover_note: text('handover_note').notNull().default(''),
  created_by: uuid('created_by').notNull().references(() => users.id),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('shift_briefing_tenant_branch_date_shift_uq').on(
    table.tenant_id,
    table.branch_id,
    table.shift_date,
    table.shift,
  ),
  index('shift_briefing_tenant_date_idx').on(table.tenant_id, table.shift_date),
])

export const shift_customer_conversations = pgTable('shift_customer_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  briefing_id: uuid('briefing_id').notNull().references(() => shift_briefings.id, { onDelete: 'cascade' }),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  sequence: integer('sequence').notNull(),
  note: text('note').notNull(),
  created_by: uuid('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('shift_customer_conversation_sequence_uq').on(table.briefing_id, table.sequence),
  index('shift_customer_conversation_tenant_idx').on(table.tenant_id),
])

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  sender_id: uuid('sender_id').notNull().references(() => users.id),
  type: notificationTypeEnum('type').notNull().default('info'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  audience: notificationAudienceEnum('audience').notNull(),
  audience_ref: text('audience_ref'),
  requires_acknowledgement: boolean('requires_acknowledgement').notNull().default(false),
  idempotency_key: text('idempotency_key').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('notification_tenant_idempotency_uq').on(table.tenant_id, table.idempotency_key),
  index('notification_tenant_created_idx').on(table.tenant_id, table.created_at),
])

export const notification_recipients = pgTable('notification_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  notification_id: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  user_id: uuid('user_id').notNull().references(() => users.id),
  read_at: timestamp('read_at'),
  acknowledged_at: timestamp('acknowledged_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('notification_recipient_user_uq').on(table.notification_id, table.user_id),
  index('notification_recipient_inbox_idx').on(table.tenant_id, table.user_id, table.created_at),
])
