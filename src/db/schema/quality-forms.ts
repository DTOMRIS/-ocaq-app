import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

/**
 * Göndərilmiş rəsmi forma dəyişdirilmir. Düzəliş yeni revision sətri yaradır,
 * əvvəlki sətrə `replaces_submission_id` ilə bağlanır və köhnə sətr çap edilə bilir.
 */
export const quality_form_submissions = pgTable('quality_form_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id: uuid('branch_id').notNull().references(() => branches.id),
  form_key: text('form_key').notNull(),
  document_number: text('document_number').notNull(),
  form_variant: text('form_variant'),
  template_revision: text('template_revision').notNull(),
  template_sha256: text('template_sha256').notNull(),
  record_revision: integer('record_revision').notNull().default(1),
  replaces_submission_id: uuid('replaces_submission_id'),
  correction_reason: text('correction_reason'),
  period_start: date('period_start').notNull(),
  period_end: date('period_end').notNull(),
  status: text('status').notNull().default('draft'),
  payload_json: text('payload_json').notNull(),
  idempotency_key: text('idempotency_key').notNull(),
  created_by: uuid('created_by').notNull().references(() => users.id),
  submitted_by: uuid('submitted_by').references(() => users.id),
  submitted_at: timestamp('submitted_at'),
  approved_by: uuid('approved_by').references(() => users.id),
  approved_at: timestamp('approved_at'),
  voided_by: uuid('voided_by').references(() => users.id),
  voided_at: timestamp('voided_at'),
  void_reason: text('void_reason'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('quality_form_submission_idempotency_uq').on(table.tenant_id, table.idempotency_key),
  uniqueIndex('quality_form_submission_revision_uq').on(
    table.tenant_id,
    table.branch_id,
    table.form_key,
    table.period_start,
    table.period_end,
    table.record_revision,
  ),
  index('quality_form_submission_scope_idx').on(
    table.tenant_id,
    table.branch_id,
    table.form_key,
    table.period_start,
  ),
  index('quality_form_submission_status_idx').on(table.tenant_id, table.status, table.created_at),
])

/**
 * Append-only hadisə jurnalı. Forma silinsə belə (məhsul axınında fiziki DELETE
 * yoxdur) kim, nə vaxt, nə edib və səbəbi nə olub cavabı saxlanır.
 */
export const quality_form_events = pgTable('quality_form_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  submission_id: uuid('submission_id').notNull().references(() => quality_form_submissions.id),
  actor_id: uuid('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  reason: text('reason'),
  snapshot_json: text('snapshot_json').notNull(),
  ip: text('ip'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('quality_form_event_timeline_idx').on(table.tenant_id, table.submission_id, table.created_at),
])
