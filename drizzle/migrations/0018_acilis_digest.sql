-- 0018 — Departament e-poçtları (həftəlik açılış xülasəsi üçün)
--
-- Yalnız CREATE — mövcud sətirlərə toxunmur.
--
-- NİYƏ AYRI CƏDVƏL, istifadəçiyə bağlı deyil: departament BİR NƏFƏR deyil.
-- «Satın Alma» ünvanı komanda qutusu ola bilər; adam dəyişəndə e-poçt
-- dəyişmir. İstifadəçiyə bağlasaq adam işdən çıxanda xülasə səssizcə dayanar.

create table if not exists "opening_dept_contacts" (
  "id"         uuid primary key default gen_random_uuid(),
  "tenant_id"  uuid not null references "tenants"("id"),
  "dept"       text not null,
  "email"      text not null,
  "is_active"  boolean not null default true,
  "created_at" timestamp not null default now()
);

create unique index if not exists "odc_uq" on "opening_dept_contacts" ("tenant_id","dept","email");
