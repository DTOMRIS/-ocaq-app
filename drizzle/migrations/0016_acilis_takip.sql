-- 0016 — Açılış takibi: yeni filial açılış layihəsi + profilə görə yaranan vəzifələr
--
-- Yalnız CREATE — mövcud sətirlərə toxunmur, geri alınması `drop table`-dir.
--
-- NİYƏ İKİ CƏDVƏL: `openings` layihənin PROFİLİDİR (format, teras, m², qapı),
-- `opening_tasks` isə həmin profildən YARADILMIŞ vəzifələrdir. Vəzifələr
-- şablondan KOPYALANIR, bağlı qalmır — şablon sonradan dəyişəndə keçmiş
-- açılışın siyahısı dəyişməməlidir, yoxsa «nə vaxt nə edildi» cavabı itir.
--
-- `cond` sütunu vəzifənin NİYƏ yarandığını saxlayır (məs. 'teras') — «bu vəzifə
-- niyə burada?» sualı mütləq soruşulur.

create table if not exists "openings" (
  "id"            uuid primary key default gen_random_uuid(),
  "tenant_id"     uuid not null references "tenants"("id"),
  -- Filial OCAQ-da yaradılana qədər (G0–G4) NULL qalır
  "branch_id"     uuid references "branches"("id"),

  "name"          text not null,
  "address"       text,
  "zone"          text,
  "city"          text not null default 'Bakı',

  -- profil — vəzifə siyahısını BU müəyyən edir
  "format"        text not null default 'kuce',
  "m2_inside"     numeric(8,1),
  "m2_terrace"    numeric(8,1),
  "m2_garden"     numeric(8,1),
  "seats"         integer,
  "has_terrace"   boolean not null default false,
  "has_garden"    boolean not null default false,
  "has_seating"   boolean not null default true,
  "has_pizza"     boolean not null default true,
  "has_delivery"  boolean not null default true,
  "has_gas"       boolean not null default false,
  "has_generator" boolean not null default false,
  "was_cafe"      boolean not null default false,
  -- 06.09.2026 lokasiyalarından çıxan tələblər
  "has_coffee"    boolean not null default true,
  "multi_floor"   boolean not null default false,
  "has_bar"       boolean not null default false,
  "is_merge"      boolean not null default false,
  "in_park"       boolean not null default false,

  "planned_open_date" date,
  "actual_open_date"  date,
  "gate"          text not null default 'G0',
  "status"        text not null default 'planlasdirilir',
  "decision_note" text,
  "score"         numeric(4,2),

  "created_by"    uuid references "users"("id"),
  "created_at"    timestamp not null default now(),
  "updated_at"    timestamp not null default now()
);

create index if not exists "op_tenant_idx" on "openings" ("tenant_id","status");
create index if not exists "op_date_idx"   on "openings" ("tenant_id","planned_open_date");

create table if not exists "opening_tasks" (
  "id"           uuid primary key default gen_random_uuid(),
  "tenant_id"    uuid not null references "tenants"("id"),
  "opening_id"   uuid not null references "openings"("id") on delete cascade,

  "gate"         text not null,
  "dept"         text not null,
  "task"         text not null,
  "note"         text,
  "cond"         text,
  "offset_days"  integer,
  "due_date"     date,

  "status"       text not null default 'gozleyir',
  "assignee_id"  uuid references "users"("id"),
  "completed_at" timestamp,
  "completed_by" uuid references "users"("id"),
  "comment"      text,

  "updated_at"   timestamp not null default now()
);

-- Təkrar generasiya eyni vəzifəni ikinci dəfə yaratmasın
create unique index if not exists "ot_uq"       on "opening_tasks" ("opening_id","gate","dept","task");
create index        if not exists "ot_open_idx" on "opening_tasks" ("opening_id","gate");
create index        if not exists "ot_dept_idx" on "opening_tasks" ("tenant_id","dept","status");
create index        if not exists "ot_due_idx"  on "opening_tasks" ("tenant_id","due_date","status");
