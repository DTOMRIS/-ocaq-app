-- 0014 — SİLİNMƏ (kasa nəzarəti) + KASA/BANKA MUTABAKATI saxlama cədvəlləri
--
-- ⚠️ TƏTBİQDƏN ƏVVƏL NEON SNAPSHOT ALIN (CLAUDE.md §3, docs/DATA-PROTECTION.md).
-- Deploy migration-ları AVTOMATİK İŞLƏTMİR — bu fayl əl ilə tətbiq olunur.
--
-- TƏHLÜKƏSİZLİK: YALNIZ ƏLAVƏ EDİR (add-only).
--   • mövcud cədvəl/sütun DƏYİŞDİRİLMİR, SİLİNMİR
--   • hamısı IF NOT EXISTS → təkrar işlədilsə no-op
--   • heç bir DROP / ALTER COLUMN / DELETE yoxdur
--   • geri dönüş: iki cədvəli DROP etmək kifayətdir
--
-- ── NİYƏ BU CƏDVƏLLƏR ───────────────────────────────────────────────────────
--
-- Hər ikisi üçün parser/hesablama ARTIQ YAZILMIŞDI, lakin heç yerə YAZILMIRDI:
--   • «Silinme hesabati» → `parseDeletions` yazılıb, testlidir, HEÇ BİR EKRANA
--     BAĞLI DEYİL. Faylı açıb baxmaqla qalırdı, tarix boyu izləmək mümkün deyildi.
--   • Kasa/Banka mutabakatı → brauzerdə hesablanıb ekranda göstərilirdi, səhifə
--     bağlananda İTİRDİ. Keçmiş yığılmırdı, «bu filial hər ay əskik verir»
--     sualı cavablana bilmirdi.
-- Yazma olmadan oxuma da yoxdur — iyul hadisəsinin eyni sinfi.

-- ── 1. Silinən sətirlər (kasa nəzarəti) ─────────────────────────────────────
--
-- UNİKAL AÇAR QOYULMUR. Səbəb: eyni qəbzdə eyni məhsul İKİ DƏFƏ silinə bilər
-- (məsələn 2 ədəd ayrı-ayrı ləğv olunub) — unikal açar onları BİRLƏŞDİRİB
-- sayı azaldardı. Bunun əvəzinə yükləmə «gün əvəzləmə» ilə işləyir: fayl əhatə
-- etdiyi günlərin sətirlərini silib yenidən yazır (bax `deletion-save` route).
create table if not exists "analytics_deletion_fact" (
  "id"            uuid primary key default gen_random_uuid(),
  "tenant_id"     uuid not null references "tenants"("id"),
  "branch_id"     uuid references "branches"("id"),
  "filial"        text not null,
  "business_date" date not null,
  "receipt"       text,                                  -- Qəbzin nömrəsi
  "item"          text not null,                         -- silinən məhsul
  "reason"        text,                                  -- Item deleted (without) write-off
  "comment"       text,                                  -- kassirin şərhi (çox vaxt boş)
  "amount"        numeric(14,2) not null,
  -- Anbardan da silinibmi, yoxsa yalnız hesabdan çıxarılıb?
  -- «written off» = məhsul hazırlanıb və atılıb (real itki).
  -- «without write-off» = səhv vurulub, məhsul hazırlanmayıb.
  "written_off"   boolean not null default false,
  "source"        text,                                  -- LINEAGE — filtr DEYİL
  "updated_at"    timestamp not null default now()
);

create index if not exists "adel_date_idx"   on "analytics_deletion_fact" ("tenant_id", "business_date");
create index if not exists "adel_branch_idx" on "analytics_deletion_fact" ("tenant_id", "branch_id", "business_date");
create index if not exists "adel_filial_idx" on "analytics_deletion_fact" ("tenant_id", "filial", "business_date");

-- ── 2. Kasa/Banka mutabakatı ────────────────────────────────────────────────
--
-- Banka çıxarışı DÖVR üzrə gəlir (gün-gün deyil), ona görə açar dövrdür.
-- Eyni dövr təkrar yüklənsə ÜZƏRİNƏ yazılır — cəm şişmir.
create table if not exists "kasa_banka_recon" (
  "id"            uuid primary key default gen_random_uuid(),
  "tenant_id"     uuid not null references "tenants"("id"),
  "branch_id"     uuid references "branches"("id"),
  "filial"        text not null,
  "period_start"  date not null,
  "period_end"    date not null,
  "card_sales"    numeric(14,2) not null default 0,      -- iiko kart satışı
  "unibank"       numeric(14,2) not null default 0,
  "atb"           numeric(14,2) not null default 0,
  "kapital"       numeric(14,2) not null default 0,
  "bank_total"    numeric(14,2) not null default 0,
  -- kart satışı − bankaya düşən. MÜSBƏT = bankaya düşməyib (araşdırılmalı).
  "diff"          numeric(14,2) not null default 0,
  "status"        text not null,                         -- full/partial/missing/over/closed
  "source"        text,
  "updated_at"    timestamp not null default now()
);

create unique index if not exists "kbr_uq"
  on "kasa_banka_recon" ("tenant_id", "period_start", "period_end", "filial");
create index if not exists "kbr_period_idx"
  on "kasa_banka_recon" ("tenant_id", "period_end");
