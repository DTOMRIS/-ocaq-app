-- 0023 — Sifariş ölçüləri: masa + oturacaq + banko
--
-- 0022-də sifariş yalnız MASA sayına bağlı idi. İstifadəçi qərarı (10.09.2026):
--   · menyu masaya yox, OTURACAĞA bağlıdır (stul sayının yarısı)
--   · menyu ekranı BANKO uzunluğuna bağlıdır (hər 1,2 m-ə 1 ekran)
--   · külqabı yalnız terası olan filiala, masa sayı + 4 ehtiyat
-- «masa × N» əvəzinə sərbəst izah lazım oldu → `per_masa` (numeric) yerinə
-- `olcu_etiket` (text): «masa × 1 + 4», «hər 1.2 banko» kimi.
--
-- TƏHLÜKƏSİZLİK: `opening_orders` 0022-də YENİ yaradılıb və boşdur, ona görə
-- `per_masa` sütununun silinməsi data itirmir. 0022 hələ işlədilməyibsə bu
-- fayl da problemsiz keçir (bütün əmrlər `if exists` / `if not exists`).
-- Sıra: ƏVVƏL 0022, SONRA 0023.

alter table "openings" add column if not exists "counter_len_m" numeric(6,2);

alter table "opening_orders" add column if not exists "olcu_etiket" text;
alter table "opening_orders" drop column if exists "per_masa";
