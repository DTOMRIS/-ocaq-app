import {
  pgTable, uuid, text, boolean, timestamp, date,
  numeric, pgEnum
} from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

export const contractTypeEnum = pgEnum('contract_type', [
  'full_time', 'part_time', 'casual', 'intern'
])

export const staffStatusEnum = pgEnum('staff_status', [
  'active', 'on_leave', 'suspended', 'terminated'
])

export const staff_profiles = pgTable('staff_profiles', {
  id:              uuid('id').primaryKey().defaultRandom(),
  user_id:         uuid('user_id').notNull().references(() => users.id),
  tenant_id:       uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:       uuid('branch_id').references(() => branches.id),

  // ─── İstihdam ──────────────────────────────────────────────────────────
  employee_code:   text('employee_code'),           // P-001, P-002...
  position:        text('position'),               // kassir, aşpaz, kuryyer...
  department:      text('department'),
  contract_type:   contractTypeEnum('contract_type').default('full_time'),
  status:          staffStatusEnum('status').default('active'),
  hire_date:       date('hire_date'),
  termination_date: date('termination_date'),

  // ─── Şifrəli sahələr (AES-256) ─────────────────────────────────────────
  fin_number:      text('fin_number'),             // şifrəli
  iban:            text('iban'),                   // şifrəli

  // ─── Maliyyə ───────────────────────────────────────────────────────────
  salary_gross:    numeric('salary_gross', { precision: 10, scale: 2 }),
  salary_net:      numeric('salary_net',   { precision: 10, scale: 2 }),
  bonus:           numeric('bonus',        { precision: 10, scale: 2 }),

  // ─── Media ─────────────────────────────────────────────────────────────
  avatar_url:      text('avatar_url'),             // R2 URL

  // ─── Arşiv ─────────────────────────────────────────────────────────────
  is_archived:     boolean('is_archived').notNull().default(false),
  archived_at:     timestamp('archived_at'),
  archived_by:     uuid('archived_by').references(() => users.id),
  archive_reason:  text('archive_reason'),

  created_at:      timestamp('created_at').notNull().defaultNow(),
  updated_at:      timestamp('updated_at').notNull().defaultNow(),
})
