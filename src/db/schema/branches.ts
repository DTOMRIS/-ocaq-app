import { pgTable, uuid, text, boolean, timestamp, date, uniqueIndex, index, integer } from 'drizzle-orm/pg-core'
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
  // ── HƏYAT DÖVRÜ ───────────────────────────────────────────────────────────
  // `activated_at`/`archived_at` SİSTEMDƏ qeydin yaradılma/arxiv vaxtıdır.
  // Bunlar isə filialın QAPISININ açıldığı/bağlandığı gündür — böyümə hesabı
  // bunlara baxır. İkisi qarışdırılmamalıdır.
  opened_at:   date('opened_at'),
  closed_at:   date('closed_at'),
  // İki filial bir-birinə çox yaxındırsa (Səbail 2 ↔ Səbail 3, 140 m) eyni
  // zonadadır və AYRI müqayisə edilməməlidir — biri «çökdü», digəri «yeni»
  // görünür, halbuki eyni qonaq kütləsidir.
  trade_zone:  text('trade_zone'),

  is_active:   boolean('is_active').notNull().default(true),
  is_archived: boolean('is_archived').notNull().default(false),
  version:     integer('version').notNull().default(1),
  activated_at: timestamp('activated_at'),
  archived_at: timestamp('archived_at'),
  archived_by: uuid('archived_by').references(() => users.id),
  archive_reason: text('archive_reason'),
  created_at:  timestamp('created_at').notNull().defaultNow(),
  updated_at:  timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('branches_tenant_code_uq').on(table.tenant_id, table.code),
  index('branches_zone_idx').on(table.tenant_id, table.trade_zone),
])
