-- 0013 — Saatlıq satış: KUMULYATİV anlıq görüntü + ondan çıxarılan GÜNLÜK fakt
--
-- ⚠️ TƏTBİQDƏN ƏVVƏL NEON SNAPSHOT ALIN (CLAUDE.md §3, docs/DATA-PROTECTION.md).
-- Deploy migration-ları AVTOMATİK İŞLƏTMİR — bu fayl əl ilə tətbiq olunur.
--
-- TƏHLÜKƏSİZLİK: bu migration YALNIZ ƏLAVƏ EDİR (add-only).
--   • mövcud cədvəl/sütun DƏYİŞDİRİLMİR, SİLİNMİR
--   • hamısı IF NOT EXISTS → təkrar işlədilsə no-op
--   • heç bir DROP / ALTER COLUMN / DELETE yoxdur
--   • geri dönüş: iki cədvəli DROP etmək kifayətdir
--
-- ── NİYƏ İKİ CƏDVƏL ─────────────────────────────────────────────────────────
--
-- iiko-nun saatlıq hesabatında (`Doğan Tomris Rapor`) SƏTİR SƏVİYYƏSİNDƏ TARİX
-- YOXDUR — fayl ayın əvvəlindən bu günə qədərki KUMULYATİV cəmdir
-- («22 avqusta kimi, 21 avqust daxil»). İstifadəçi hər gün yenisini atır.
--
--   1. `analytics_hourly_cume` — faylın OLDUĞU KİMİ yazıldığı yer.
--      Açar dövrün SONUNU da daxil edir → eyni fayl təkrar atılsa üzərinə
--      yazılır, cəm ŞİŞMİR. «Toplamdan davam etsin» tələbi budur.
--
--   2. `analytics_hourly_fact` — iki ardıcıl kumulyativ görüntünün FƏRQİ.
--      21 günlük fayl + 22 günlük fayl → aradakı fərq məhz 22 avqustdur.
--      Beləliklə iiko-da HEÇ NƏ DƏYİŞDİRMƏDƏN gün-gün saatlıq data alınır.
--
-- 🔴 BİRİNCİ FAYLDAN GÜNLÜK FAKT ÇIXARILMIR. Əvvəlki görüntü yoxdursa fərq
-- hesablanmır — 21 günün cəmini tək günə yazmaq datanı korlayardı. Birinci
-- fayl yalnız BAZA olur; günlük fakt ikinci fayldan etibarən yaranır.

-- ── 1. Kumulyativ anlıq görüntü (faylın özü) ────────────────────────────────
create table if not exists "analytics_hourly_cume" (
  "id"            uuid primary key default gen_random_uuid(),
  "tenant_id"     uuid not null references "tenants"("id"),
  "branch_id"     uuid references "branches"("id"),
  "filial"        text not null,
  -- Dövr: `period_start` fayl başlığından (`Dövrün: əvvəli …`).
  -- `period_end` İSTİFADƏÇİDƏN alınır — başlıqdakı «sonu» dəyəri İSTƏNİLƏN
  -- aralığı göstərir (31.08 yazır, data isə 21.08-də bitir), ona görə ona
  -- GÜVƏNİLMİR. Bu, faylın ƏHATƏ ETDİYİ SON GÜNDÜR (həmin gün DAXİL).
  "period_start"  date not null,
  "period_end"    date not null,
  "pay_type"      text not null,
  "hour"          smallint not null,
  "net"           numeric(14,2) not null,
  "guests"        integer,
  "source"        text,                                   -- LINEAGE — filtr DEYİL
  "updated_at"    timestamp not null default now()
);

-- Eyni fayl iki dəfə atılsa üzərinə yazılır (idempotent).
create unique index if not exists "ahc_uq"
  on "analytics_hourly_cume" ("tenant_id", "period_start", "period_end", "filial", "pay_type", "hour");
-- Fərq hesablanarkən «eyni başlanğıclı ƏVVƏLKİ görüntü» axtarılır.
create index if not exists "ahc_period_idx"
  on "analytics_hourly_cume" ("tenant_id", "period_start", "period_end");

-- ── 2. Fərqdən çıxan günlük saatlıq fakt ────────────────────────────────────
create table if not exists "analytics_hourly_fact" (
  "id"            uuid primary key default gen_random_uuid(),
  "tenant_id"     uuid not null references "tenants"("id"),
  "branch_id"     uuid references "branches"("id"),
  "filial"        text not null,
  "business_date" date not null,
  "pay_type"      text not null,
  "hour"          smallint not null,
  "net"           numeric(14,2) not null,
  "guests"        integer,
  -- Bu sətir necə yarandı: 'delta' (iki kumulyativ görüntünün fərqi) və ya
  -- 'direct' (faylda `Uçot günü` sütunu VARSA — birbaşa oxunub).
  -- Dürüstlük sütunudur: `delta` sətirləri təxmin deyil, amma törəmədir.
  "derivation"    text not null default 'delta',
  "source"        text,
  "updated_at"    timestamp not null default now()
);

create unique index if not exists "ahf_uq"
  on "analytics_hourly_fact" ("tenant_id", "filial", "business_date", "pay_type", "hour");
create index if not exists "ahf_date_idx"
  on "analytics_hourly_fact" ("tenant_id", "business_date");
create index if not exists "ahf_branch_idx"
  on "analytics_hourly_fact" ("tenant_id", "branch_id", "business_date");
-- «Saat üzrə şəbəkə profili» sorğusu üçün.
create index if not exists "ahf_hour_idx"
  on "analytics_hourly_fact" ("tenant_id", "hour", "business_date");
