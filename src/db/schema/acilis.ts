// ─── AÇILIŞ TAKİBİ ──────────────────────────────────────────────────────────
//
// Yeni filial açılışı bir LAYİHƏDİR: profil girilir → vəzifələr avtomatik
// yaranır → departamentlər öz siyahısını görür → qapılardan (G0–G6) keçilir.
//
// NİYƏ VƏZİFƏLƏR CƏDVƏLDƏ SAXLANILIR (şablondan hər dəfə hesablanmır):
// açılış boyu status, məsul şəxs, tamamlanma tarixi yığılır — bu TARİXÇƏDİR.
// Şablon sonradan dəyişəndə keçmiş açılışın siyahısı dəyişməməlidir, yoxsa
// «nə vaxt nə edildi» sualının cavabı itir.

import { pgTable, uuid, text, numeric, boolean, timestamp, date, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants, users } from './auth'
import { branches } from './branches'

/** Bir açılış layihəsi. `branch_id` NULL — filial hələ yaradılmayıb (G0–G4). */
export const openings = pgTable('openings', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id),
  // Açılış təsdiqlənəndə (G5) `branches` sətri yaradılır və buraya bağlanır.
  branch_id:  uuid('branch_id').references(() => branches.id),

  name:       text('name').notNull(),              // «Səbail 4»
  address:    text('address'),
  zone:       text('zone'),                        // rayon / ticarət zonası
  city:       text('city').notNull().default('Bakı'),

  // ── PROFİL — vəzifə siyahısını BU müəyyən edir ────────────────────────────
  format:     text('format').notNull().default('kuce'),   // kuce|mall|flagship|kiosk
  m2_inside:  numeric('m2_inside',  { precision: 8, scale: 1 }),
  m2_terrace: numeric('m2_terrace', { precision: 8, scale: 1 }),
  m2_garden:  numeric('m2_garden',  { precision: 8, scale: 1 }),
  seats:      integer('seats'),
  has_terrace:   boolean('has_terrace').notNull().default(false),
  has_garden:    boolean('has_garden').notNull().default(false),
  has_seating:   boolean('has_seating').notNull().default(true),
  has_pizza:     boolean('has_pizza').notNull().default(true),
  has_delivery:  boolean('has_delivery').notNull().default(true),
  has_gas:       boolean('has_gas').notNull().default(false),
  has_generator: boolean('has_generator').notNull().default(false),
  // Keçmiş kafe/restoran binası → MEP retrofit riski (G3-də kritik)
  was_cafe:      boolean('was_cafe').notNull().default(false),
  // ── 06.09.2026 lokasiyalarından çıxan tələblər ────────────────────────────
  has_coffee:  boolean('has_coffee').notNull().default(true),    // Metropark: NO
  multi_floor: boolean('multi_floor').notNull().default(false),  // Səbail 1, Qala
  has_bar:     boolean('has_bar').notNull().default(false),      // Qala, Ciabatta
  is_merge:    boolean('is_merge').notNull().default(false),     // Hüseyn Cavid 2
  in_park:     boolean('in_park').notNull().default(false),      // Hüseyn Cavid 2

  // ── QAPI VƏ STATUS ────────────────────────────────────────────────────────
  planned_open_date: date('planned_open_date'),
  actual_open_date:  date('actual_open_date'),
  gate:   text('gate').notNull().default('G0'),          // G0…G6
  status: text('status').notNull().default('planlasdirilir'),
  // planlasdirilir | davam_edir | acildi | dayandirildi

  // G4 qərar qeydi — «niyə açdıq/açmadıq» sualı sonra mütləq soruşulur
  decision_note: text('decision_note'),
  score:         numeric('score', { precision: 4, scale: 2 }),   // çəkili skor

  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('op_tenant_idx').on(t.tenant_id, t.status),
  index('op_date_idx').on(t.tenant_id, t.planned_open_date),
])

/** Profilə görə yaradılmış vəzifə. Şablondan KOPYALANIR, bağlı qalmır. */
export const opening_tasks = pgTable('opening_tasks', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id),
  opening_id: uuid('opening_id').notNull().references(() => openings.id, { onDelete: 'cascade' }),

  gate:    text('gate').notNull(),
  dept:    text('dept').notNull(),
  task:    text('task').notNull(),
  note:    text('note'),
  // Hansı şərtə görə yarandı — «bu vəzifə niyə burada?» sualının cavabı
  cond:    text('cond'),
  offset_days: integer('offset_days'),
  due_date:    date('due_date'),

  status: text('status').notNull().default('gozleyir'),
  // gozleyir | davam_edir | bitdi | gecikdi | tetbiq_olunmur
  assignee_id:  uuid('assignee_id').references(() => users.id),
  completed_at: timestamp('completed_at'),
  completed_by: uuid('completed_by').references(() => users.id),
  comment:      text('comment'),

  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  // Eyni açılışda eyni vəzifə iki dəfə yaranmasın (təkrar generasiya qorunması)
  uniqueIndex('ot_uq').on(t.opening_id, t.gate, t.dept, t.task),
  index('ot_open_idx').on(t.opening_id, t.gate),
  index('ot_dept_idx').on(t.tenant_id, t.dept, t.status),
  index('ot_due_idx').on(t.tenant_id, t.due_date, t.status),
])

/**
 * Açılışa bağlı fayllar: mimari proyekt, smeta, təklif, ölçü cədvəli, foto.
 *
 * NİYƏ FAYLDAN RƏQƏM ÇIXARILMIR: mimari proyekt PDF-i ÇİZGİDİR, mətn deyil.
 * «Masa sayısı 24» rəqəmi orada yazı kimi yox, rəsm kimi durur. OCR bəzən
 * düz oxuyur, bəzən səhv — və səhv oxuduğunu heç kim görmür, sifariş səhv
 * gedir. Ona görə fayl SAXLANILIR və AÇILIR; rəqəmlər profil formunda ƏL İLƏ
 * girilir (m², oturacaq sayı). Mətn qatlı cədvəl PDF-i gələrsə ayrıca oxunur.
 */
export const opening_files = pgTable('opening_files', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id),
  opening_id: uuid('opening_id').notNull().references(() => openings.id, { onDelete: 'cascade' }),

  kind:      text('kind').notNull().default('diger'),
  // proyekt | smeta | teklif | olcu | foto | icaze | diger
  file_name: text('file_name').notNull(),
  r2_key:    text('r2_key').notNull(),
  mime:      text('mime'),
  size:      integer('size'),
  note:      text('note'),

  uploaded_by: uuid('uploaded_by').references(() => users.id),
  created_at:  timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('of_open_idx').on(t.opening_id, t.kind),
])
