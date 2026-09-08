-- 0020 — Reçetura (Tərkiblər.xlsx): məhsul → xammal normaları
--
-- Yalnız CREATE — mövcud sətirlərə toxunmur.
--
-- NİYƏ AYRI CƏDVƏL: `analytics_item_fact.cost` FAKTİKİ mayadır (iiko-nun
-- sildiyi), bu isə NORMA. İkisinin FƏRQİ əsas nəzarət göstəricisidir; eyni
-- sütuna yazılsa fərq görünməz olardı.
--
-- `valid_from` VACİBDİR: reçetura dəyişir. Versiyasız saxlansa keçən ayın
-- teorik mayası bugünkü norma ilə yenidən hesablanar və KEÇMİŞ SƏSSİZCƏ DƏYİŞƏR.
--
-- Real fayl (08.09.2026): 277 məhsul · 990 sətir · 242 xammal · 36 yarım mamul.
-- Şaurma əti normaları XAM kq-dır: 60/100/160 q (Balaca/Orta/Böyük), Qabda 300 q.
-- Standart sənəddəki 30/50/80 q BİŞMİŞ çəkidir — ziddiyyət yox, iki fərqli ölçü.

create table if not exists "recipe_lines" (
  "id"         uuid primary key default gen_random_uuid(),
  "tenant_id"  uuid not null references "tenants"("id"),

  "product"    text not null,
  "category"   text,
  "material"   text not null,
  "code"       text,
  "norm"       numeric(14,6) not null,
  "unit"       text,
  "is_semi"    boolean not null default false,

  "valid_from" date not null,
  "source"     text,
  "updated_at" timestamp not null default now()
);

create unique index if not exists "rcl_uq"       on "recipe_lines" ("tenant_id","product","material","valid_from");
create index        if not exists "rcl_prod_idx" on "recipe_lines" ("tenant_id","product");
create index        if not exists "rcl_mat_idx"  on "recipe_lines" ("tenant_id","material");
