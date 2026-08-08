-- 0010 — Analitika FACT cədvəlləri (prodmix + çek)
--
-- ⚠️ TƏTBİQDƏN ƏVVƏL NEON SNAPSHOT ALIN (CLAUDE.md §3, docs/DATA-PROTECTION.md).
-- Deploy migration-ları AVTOMATİK İŞLƏTMİR — bu fayl əl ilə tətbiq olunur
-- (bax docs/OCAQ-MIMARI-DEPLOY-FAZ3.md).
--
-- TƏHLÜKƏSİZLİK: bu migration YALNIZ ƏLAVƏ EDİR (add-only).
--   • mövcud cədvəl/sütun DƏYİŞDİRİLMİR, SİLİNMİR
--   • hamısı IF NOT EXISTS → təkrar işlədilsə no-op, zərər vermir
--   • heç bir DROP / ALTER COLUMN / DELETE yoxdur
--   • geri dönüş: iki cədvəli DROP etmək kifayətdir (mövcud data təsirlənmir)
--
-- Niyə fact cədvəli: 7 günlük export 83 361 sətirdir (bir ay ≈ 350 000).
-- JSON blob-a sığmaz və sorğulanmazdır; üstəlik blob deseni iyulda datanı
-- görünməz etmişdi (docs/DENETIM-2026-08-04.md §1).

-- ── filial × gün × ödəniş növü ───────────────────────────────────────────────
create table if not exists "analytics_daily_fact" (
  "id"            uuid primary key default gen_random_uuid(),
  "tenant_id"     uuid not null references "tenants"("id"),
  "branch_id"     uuid references "branches"("id"),
  "filial"        text not null,
  "business_date" date not null,
  "payment_type"  text not null,
  "amount"        numeric(14,2) not null,
  "receipts"      integer,
  "source"        text,
  "updated_at"    timestamp not null default now()
);

-- UPSERT açarı. Fayllar hər gün atılır və son gün natamam ola bilər →
-- ON CONFLICT DO UPDATE ilə üzərinə yazılır, gün iki dəfə sayılmır.
create unique index if not exists "adf_uq"
  on "analytics_daily_fact" ("tenant_id", "filial", "business_date", "payment_type");
create index if not exists "adf_date_idx"
  on "analytics_daily_fact" ("tenant_id", "business_date");
create index if not exists "adf_branch_idx"
  on "analytics_daily_fact" ("tenant_id", "branch_id", "business_date");

-- ── filial × gün × məhsul (PRODMIX) ──────────────────────────────────────────
create table if not exists "analytics_item_fact" (
  "id"            uuid primary key default gen_random_uuid(),
  "tenant_id"     uuid not null references "tenants"("id"),
  "branch_id"     uuid references "branches"("id"),
  "filial"        text not null,
  "business_date" date not null,
  "item_code"     text not null,
  "item_name"     text not null,
  "qty"           numeric(14,3) not null,
  "amount"        numeric(14,2) not null,
  "line_kind"     text not null,
  "source"        text,
  "updated_at"    timestamp not null default now()
);

create unique index if not exists "aif_uq"
  on "analytics_item_fact" ("tenant_id", "filial", "business_date", "item_code");
create index if not exists "aif_date_idx"
  on "analytics_item_fact" ("tenant_id", "business_date");
create index if not exists "aif_item_idx"
  on "analytics_item_fact" ("tenant_id", "item_name");
-- Menyu mühəndisliyi yalnız line_kind='product' oxuyur → ayrıca indeks.
create index if not exists "aif_kind_idx"
  on "analytics_item_fact" ("tenant_id", "line_kind", "business_date");
