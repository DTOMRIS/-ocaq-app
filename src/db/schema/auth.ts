import {
  pgTable, uuid, text, timestamp, boolean, pgEnum,
} from 'drizzle-orm/pg-core'

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
  role:              roleEnum('role').notNull().default('staff'),
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
  role:        roleEnum('role').notNull().default('staff'),
  token:       text('token').notNull().unique(),    // crypto.randomBytes(32)
  invited_by:  uuid('invited_by').references(() => users.id),
  expires_at:  timestamp('expires_at').notNull(),   // +48 saat
  accepted_at: timestamp('accepted_at'),
  created_at:  timestamp('created_at').notNull().defaultNow(),
})

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
