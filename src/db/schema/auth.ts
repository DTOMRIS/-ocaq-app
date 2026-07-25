import {
  pgTable, uuid, text, timestamp, boolean, pgEnum, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { regions } from './regions'
import { branches } from './branches'

// ─── Rollər ───────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('role', [
  'super_admin',    // Bütün tenant-lara görə
  'region_manager', // Bir neçə filial
  'branch_manager', // Bir filial
  'staff'           // Yalnız öz məlumatlarını görür
])

// ─── Tenant (brend/şirkət) ───────────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),
  slug:        text('slug').notNull().unique(),     // ocaq, brand-x
  external_customer_id: text('external_customer_id').unique(), // DK Agency müştəri ID-si
  plan_code:   text('plan_code'),
  provisioned_by: text('provisioned_by'),
  provisioned_at: timestamp('provisioned_at'),
  iiko_org_id: text('iiko_org_id'),                 // iiko inteqrasiyası üçün
  is_active:   boolean('is_active').notNull().default(true),
  created_at:  timestamp('created_at').notNull().defaultNow(),
})

// ─── İstifadəçilər ───────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:                uuid('id').primaryKey().defaultRandom(),
  tenant_id:         uuid('tenant_id').notNull().references(() => tenants.id),
  email:             text('email').notNull().unique(),
  name:              text('name'),
  password_hash:     text('password_hash'),           // bcrypt
  must_change_password: boolean('must_change_password').notNull().default(false),
  role:              roleEnum('role').notNull(),
  is_active:         boolean('is_active').notNull().default(true),
  is_email_verified: boolean('is_email_verified').notNull().default(false),
  email_verified_at: timestamp('email_verified_at'),
  avatar_url:        text('avatar_url'),
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
  last_login_at:     timestamp('last_login_at'),
})

// ─── Dəvət tokenləri ─────────────────────────────────────────────────────────
export const invitations = pgTable('invitations', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenant_id:   uuid('tenant_id').notNull().references(() => tenants.id),
  email:       text('email').notNull(),
  role:        roleEnum('role').notNull(),
  token:       text('token').notNull().unique(),    // crypto.randomBytes(32)
  invited_by:  uuid('invited_by').references(() => users.id),
  region_id:   uuid('region_id').references(() => regions.id),
  branch_id:   uuid('branch_id').references(() => branches.id),
  expires_at:  timestamp('expires_at').notNull(),   // +48 saat
  accepted_at: timestamp('accepted_at'),
  revoked_at:  timestamp('revoked_at'),
  revoked_by:  uuid('revoked_by').references(() => users.id),
  revoked_reason: text('revoked_reason'),
  replaces_manager_id: uuid('replaces_manager_id').references(() => users.id),
  source:      text('source').notNull().default('manual'),
  created_at:  timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('invitations_live_branch_manager_uq')
    .on(table.tenant_id, table.branch_id)
    .where(sql`${table.role} = 'branch_manager' AND ${table.accepted_at} IS NULL AND ${table.revoked_at} IS NULL`),
])

// ─── E-poçt doğrulama tokenləri ──────────────────────────────────────────────
export const email_verification_tokens = pgTable('email_verification_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  user_id:    uuid('user_id').notNull().references(() => users.id),
  token:      text('token').notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),   // +24 saat
  used_at:    timestamp('used_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

// ─── Şifrə sıfırlama tokenləri ───────────────────────────────────────────────
export const password_reset_tokens = pgTable('password_reset_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  user_id:    uuid('user_id').notNull().references(() => users.id),
  token:      text('token').notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),   // +1 saat
  used_at:    timestamp('used_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

// ─── Audit log ───────────────────────────────────────────────────────────────
export const audit_logs = pgTable('audit_logs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').references(() => tenants.id),
  user_id:    uuid('user_id').references(() => users.id),
  action:     text('action').notNull(),      // 'user.login', 'user.invite', ...
  entity:     text('entity'),               // 'user', 'invitation', ...
  entity_id:  text('entity_id'),
  metadata:   text('metadata'),             // JSON string
  ip:         text('ip'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})
