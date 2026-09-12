-- 0024 — `promotions` cədvəli migration-a köçürüldü
--
-- NİYƏ: cədvəl `src/db/schema/promotions.ts`-də təyin olunub, lakin heç bir
-- migration-da yox idi. Yalnız iki ad-hoc skriptlə qurulurdu:
--   scripts/create-promotions.mjs · scripts/alter-promotions.mjs
-- Bu skriptlər `.env.local`-ı birbaşa oxuyur və `apply-migration.mjs`-in
-- dry-run / destruktiv yoxlamalarından KEÇMİR. Sıfırdan qurulan mühitdə
-- (preview branch, bərpa) `/dashboard/promosyonlar` və `/api/promotions` sınır.
--
-- TƏHLÜKƏSİZLİK: `if not exists` — cədvəl artıq varsa heç nə dəyişmir,
-- data itmir. Mövcud prod-da bu migration NO-OP-dur.

create table if not exists "promotions" (
  "id"             uuid primary key default gen_random_uuid(),
  "tenant_id"      uuid not null references "tenants"("id"),
  "title"          text not null,
  "description"    text,
  "promo_type"     text not null default 'percent',   -- percent | bogo | fixed | gift
  "discount_value" text,
  "code"           text,
  "image_url"      text,
  "badge"          text default 'AKTİV',
  "valid_from"     date,
  "valid_until"    date,
  "start_time"     text,
  "end_time"       text,
  "active_days"    text,
  "location"       text,
  "is_active"      boolean not null default true,
  "branch_id"      uuid references "branches"("id"),
  "created_by"     uuid references "users"("id"),
  "created_at"     timestamp not null default now(),
  "updated_at"     timestamp not null default now()
);

-- Skriptlə qurulmuş köhnə cədvəldə bu sütunlar olmaya bilər
alter table "promotions" add column if not exists "start_time"  text;
alter table "promotions" add column if not exists "end_time"    text;
alter table "promotions" add column if not exists "active_days" text;
alter table "promotions" add column if not exists "location"    text;

create index if not exists "promo_tenant_idx" on "promotions" ("tenant_id","is_active");
create index if not exists "promo_branch_idx" on "promotions" ("branch_id");
