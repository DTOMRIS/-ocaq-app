import {
  pgTable, uuid, text, numeric, boolean, timestamp, unique, index,
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
