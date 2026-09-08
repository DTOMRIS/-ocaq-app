-- 0021 — Pul axını (CASH FLOW): kassa + bank hesablarının hərəkəti
--
-- Yalnız CREATE — mövcud sətirlərə toxunmur.
--
-- NİYƏ `kasa_banka_recon`-dan AYRI CƏDVƏL: o, BİR sual verir — «iiko kart
-- satışı bankaya düşübmü?». Bu isə BÜTÜN pul hərəkətidir: icarə, əmək haqqı,
-- mal alışı, kredit, təhtəlhesab, komissiya. İkisi fərqli suallardır.
--
-- UNİKAL AÇAR YOXDUR — QƏSDƏN: eyni gün/hesab/maddə/məbləğ iki dəfə ola bilər
-- (iki ayrı ödəniş). Açar qoysaydıq onlar birləşər və pul AZ görünərdi.
-- Yükləmə dövr əvəzləmə ilə işləyir (əvvəl yaz, sonra köhnəni süpür).
--
-- Real fayl (20.08–07.09.2026): 9 vərəq · 75 265 sətir · 52 maddə.
-- Vərəqlərin BAŞLIQLARI FƏRQLİDİR, ortaq olan tək sütun `Maddə`-dir —
-- model onun üzərinə qurulub (bax `parse-cashflow.ts`).

create table if not exists "cashflow_lines" (
  "id"         uuid primary key default gen_random_uuid(),
  "tenant_id"  uuid not null references "tenants"("id"),

  "item"       text not null,
  "account"    text not null,
  "op_date"    date not null,
  "amount"     numeric(14,2) not null,
  "branch"     text,
  "branch_id"  uuid references "branches"("id"),
  "note"       text,

  "source"     text,
  "updated_at" timestamp not null default now()
);

create index if not exists "cfl_date_idx" on "cashflow_lines" ("tenant_id","op_date");
create index if not exists "cfl_item_idx" on "cashflow_lines" ("tenant_id","item","op_date");
create index if not exists "cfl_acc_idx"  on "cashflow_lines" ("tenant_id","account","op_date");
