-- 0022 — Açılış sifariş siyahısı (yeni filial malzeməsi)
--
-- TƏHLÜKƏSİZLİK: bu migration YALNIZ ƏLAVƏ EDİR.
--   · `openings.table_count` — YENİ sütun, NULL qəbul edir → mövcud sətirlər
--     dəyişmir, heç bir UPDATE yoxdur.
--   · `opening_orders` — YENİ cədvəl.
-- Heç bir sətir silinmir/yenilənmir → snapshot MƏCBURİ deyil.
-- Deploy migration işlətmir → bunu ƏL İLƏ işlədin (docs/DATA-PROTECTION.md §3.1).

alter table "openings" add column if not exists "table_count" integer;

create table if not exists "opening_orders" (
  "id"         uuid primary key default gen_random_uuid(),
  "tenant_id"  uuid not null references "tenants"("id"),
  "opening_id" uuid not null references "openings"("id") on delete cascade,

  "kat"   text not null,
  "ad"    text not null,
  "vahid" text not null default 'əd',
  "dept"  text not null default 'Satın Alma',

  "qty"        numeric(12,2),
  "per_masa"   numeric(6,2),
  "qty_manual" boolean not null default false,

  "status" text not null default 'planlandi',
  "qeyd"   text,

  "updated_at" timestamp not null default now()
);

create unique index if not exists "oo_uq"       on "opening_orders" ("opening_id","kat","ad");
create index        if not exists "oo_open_idx" on "opening_orders" ("opening_id","kat");
create index        if not exists "oo_dept_idx" on "opening_orders" ("tenant_id","dept","status");
