import {
  pgTable, uuid, text, numeric, boolean, timestamp, unique, index, date, integer, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants } from './auth'
import { branches } from './branches'

// ─── Analiz motorlarından ingest (server-to-server; iiko OLAP → bundle) ──────
// Add-only: mövcud auth/permission modelinə toxunmur. Yalnız yeni cədvəllər.
export const analytics_ingest = pgTable('analytics_ingest', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenant_id:        uuid('tenant_id').notNull().references(() => tenants.id),
  period:           text('period').notNull(),                          // 'YYYY-MM'
  engine_version:   text('engine_version'),
  source_sha256:    text('source_sha256').notNull(),                   // idempotency açarı
  iiko_total:       numeric('iiko_total', { precision: 14, scale: 2 }),
  imported_total:   numeric('imported_total', { precision: 14, scale: 2 }),
  reconciled:       boolean('reconciled'),
  quality_status:   text('quality_status'),                            // pass/warn/fail
  quality_warnings: text('quality_warnings'),                          // json
  network:          text('network'),                                   // json
  actions:          text('actions'),                                   // json
  briefings:        text('briefings'),                                 // json
  status:           text('status').notNull().default('draft'),         // draft/published
  generated_at:     timestamp('generated_at'),
  created_at:       timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  idem: unique('analytics_ingest_idem_uq').on(t.tenant_id, t.period, t.source_sha256),
}))

// ─── Ingest başına filial metrikleri ─────────────────────────────────────────
export const analytics_branch = pgTable('analytics_branch', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id),
  ingest_id:  uuid('ingest_id').notNull().references(() => analytics_ingest.id),
  filial:     text('filial').notNull(),
  bolge:      text('bolge'),
  branch_id:  uuid('branch_id').references(() => branches.id),          // isimle eşleşince dolar
  metrics:    text('metrics'),                                         // json
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  scope: index('analytics_branch_ingest_idx').on(t.tenant_id, t.ingest_id),
}))

// ─── FACT CƏDVƏLLƏRİ ─────────────────────────────────────────────────────────
// Niyə blob deyil, cədvəl:
//   • Həcm: 7 günlük data 83 361 sətir (39 549 prodmix + 43 812 çek).
//     Bir ay ≈ 350 000. JSON blob-a sığmaz və sorğulanmazdır.
//   • İyul hadisəsi (bax docs/DENETIM-2026-08-04.md §1): blob deseni + oxuma
//     filtri kimi işlədilən `engine_version` datanı GÖRÜNMƏZ etdi. Burada
//     `source` yalnız LINEAGE sütunudur — oxuma filtri kimi İŞLƏDİLMİR.
//   • Ay-üstü-ay məhsul müqayisəsi JSON içində mümkün deyil, SQL-də trivialdır.
//
// UPSERT semantikası MƏCBURİDİR (insert yox): fayllar hər gün atılır və son gün
// natamam ola bilər (08.08.2026: çek faylının 7 avqustu 40 652 ₼ əskik idi).
// Unique açar üzrə ON CONFLICT DO UPDATE → sabah tam gün gələndə üzərinə yazılır,
// gün İKİ DƏFƏ sayılmır.

/** filial × gün × ödəniş növü. Çek sayı gün başına bir dəfə (payment_type='__day__'). */
export const analytics_daily_fact = pgTable('analytics_daily_fact', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:     uuid('branch_id').references(() => branches.id),   // ad uyğunlaşanda dolar
  filial:        text('filial').notNull(),                          // kanonik ad (normalizeFilial)
  business_date: date('business_date').notNull(),
  payment_type:  text('payment_type').notNull(),                    // nagd/kart/wolt/bolt/own_delivery/yango_legacy
  amount:        numeric('amount', { precision: 14, scale: 2 }).notNull(),
  receipts:      integer('receipts'),                               // unikal qəbz sayı (yalnız gün cəmi sətrində)
  source:        text('source'),                                    // LINEAGE — filtr DEYİL
  updated_at:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('adf_uq').on(t.tenant_id, t.filial, t.business_date, t.payment_type),
  index('adf_date_idx').on(t.tenant_id, t.business_date),
  index('adf_branch_idx').on(t.tenant_id, t.branch_id, t.business_date),
])

/** filial × gün × məhsul. `line_kind` = product/service/packaging/modifier/included. */
export const analytics_item_fact = pgTable('analytics_item_fact', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:     uuid('branch_id').references(() => branches.id),
  filial:        text('filial').notNull(),
  business_date: date('business_date').notNull(),
  item_code:     text('item_code').notNull(),
  item_name:     text('item_name').notNull(),
  qty:           numeric('qty', { precision: 14, scale: 3 }).notNull(),
  amount:        numeric('amount', { precision: 14, scale: 2 }).notNull(),
  // Menyu mühəndisliyi YALNIZ 'product' sətirlərini işlədir. Qalanları silinmir —
  // «service» vs «packaging» zalda/götür-apar qarışığını verir.
  line_kind:     text('line_kind').notNull(),
  source:        text('source'),
  updated_at:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('aif_uq').on(t.tenant_id, t.filial, t.business_date, t.item_code),
  index('aif_date_idx').on(t.tenant_id, t.business_date),
  index('aif_item_idx').on(t.tenant_id, t.item_name),
  index('aif_kind_idx').on(t.tenant_id, t.line_kind, t.business_date),
])
