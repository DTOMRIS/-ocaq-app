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
  // ── İSTƏYƏ BAĞLI (iiko export-una əlavə olunanda dolur) ───────────────────
  // `cost` = SƏTİR CƏMİ maya (ədəd × 1 ədədin mayası). Marja = amount − cost.
  // Bu gəldikdə menyu mühəndisliyi CİRO payından MARJA payına keçir — «çox
  // satılır, amma pul qazandırmır» məhsulu yalnız bununla görmək olar.
  // Nullable: köhnə sətirlər boş qalır, hesablama `null`-ı dürüst göstərir.
  cost:          numeric('cost', { precision: 14, scale: 2 }),
  // Klassik Kasavana-Smith KATEQORİYA daxilində tətbiq olunur (əsas yemək,
  // içki, desert ayrı-ayrı) — bu sütun onu mümkün edir.
  category:      text('category'),
  source:        text('source'),
  updated_at:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('aif_uq').on(t.tenant_id, t.filial, t.business_date, t.item_code),
  index('aif_date_idx').on(t.tenant_id, t.business_date),
  index('aif_item_idx').on(t.tenant_id, t.item_name),
  index('aif_kind_idx').on(t.tenant_id, t.line_kind, t.business_date),
])

// ─── SAATLIQ SATIŞ ──────────────────────────────────────────────────────────
//
// iiko-nun saatlıq hesabatında sətir səviyyəsində TARİX YOXDUR — fayl ayın
// əvvəlindən bu günə qədərki KUMULYATİV cəmdir. İstifadəçi hər gün yenisini
// atır; iki ardıcıl görüntünün FƏRQİ aradakı gündür (bax `hourly-delta.ts`).
// Ona görə iki cədvəl var: xam görüntü + ondan çıxarılan günlük fakt.

/** Faylın olduğu kimi yazıldığı KUMULYATİV görüntü. Təkrar yükləmə üzərinə yazır. */
export const analytics_hourly_cume = pgTable('analytics_hourly_cume', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenant_id:    uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:    uuid('branch_id').references(() => branches.id),
  filial:       text('filial').notNull(),
  period_start: date('period_start').notNull(),
  // Faylın ƏHATƏ ETDİYİ son gün (daxil). Başlıqdakı «sonu» İSTƏNİLƏN aralığı
  // göstərir (31.08 yazır, data 21.08-də bitir) → ona GÜVƏNİLMİR, istifadəçidən
  // alınır.
  period_end:   date('period_end').notNull(),
  pay_type:     text('pay_type').notNull(),
  hour:         integer('hour').notNull(),                 // 0–23
  net:          numeric('net', { precision: 14, scale: 2 }).notNull(),
  guests:       integer('guests'),
  source:       text('source'),                            // LINEAGE — filtr DEYİL
  updated_at:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('ahc_uq').on(t.tenant_id, t.period_start, t.period_end, t.filial, t.pay_type, t.hour),
  index('ahc_period_idx').on(t.tenant_id, t.period_start, t.period_end),
])

/** İki kumulyativ görüntünün fərqindən çıxan GÜNLÜK saatlıq fakt. */
export const analytics_hourly_fact = pgTable('analytics_hourly_fact', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id),
  branch_id:     uuid('branch_id').references(() => branches.id),
  filial:        text('filial').notNull(),
  business_date: date('business_date').notNull(),
  pay_type:      text('pay_type').notNull(),
  hour:          integer('hour').notNull(),
  net:           numeric('net', { precision: 14, scale: 2 }).notNull(),
  guests:        integer('guests'),
  // 'delta' = iki kumulyativ görüntünün fərqi; 'direct' = faylda `Uçot günü`
  // sütunu olduğu üçün birbaşa oxunub. Dürüstlük sütunu: `delta` təxmin deyil,
  // amma törəmədir — mənbəyi gizlətmirik.
  derivation:    text('derivation').notNull().default('delta'),
  source:        text('source'),
  updated_at:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('ahf_uq').on(t.tenant_id, t.filial, t.business_date, t.pay_type, t.hour),
  index('ahf_date_idx').on(t.tenant_id, t.business_date),
  index('ahf_branch_idx').on(t.tenant_id, t.branch_id, t.business_date),
  index('ahf_hour_idx').on(t.tenant_id, t.hour, t.business_date),
])
