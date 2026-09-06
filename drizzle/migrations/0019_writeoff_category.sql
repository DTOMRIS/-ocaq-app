-- 0019 — Anbar silinməsi: kateqoriya və miqdar sütunları
--
-- Yalnız ADD COLUMN (nullable) — mövcud sətirlərə toxunmur, heç nə silinmir.
--
-- NİYƏ: «Silinmə <ay>.xlsx» faylı çek bazlı silinmədən FƏRQLİ mənbədir.
-- Orada qəbz nömrəsi və silinmə səbəbi var; burada ANBAR kateqoriyası var:
--   QİDA · QEYRİ QİDA · İSTEHSALAT
-- Food cost ayrımı YALNIZ bu sütundan çıxır. Avqust 2026 real fayl:
--   QİDA 49 144 ₼ · QEYRİ QİDA 42 723 ₼ · İSTEHSALAT 1 049 ₼ → 92 916 ₼ (%2,42)
--   «Personal ...» kalemləri 21 374 ₼ — personal yeməyi, ayrıca izlənməlidir.

alter table "analytics_deletion_fact" add column if not exists "category" text;
alter table "analytics_deletion_fact" add column if not exists "qty" numeric(14,3);

create index if not exists "adel_cat_idx"
  on "analytics_deletion_fact" ("tenant_id","category","business_date");
