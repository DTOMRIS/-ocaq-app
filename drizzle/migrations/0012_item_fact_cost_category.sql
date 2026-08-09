-- 0012 — `analytics_item_fact`-a maya və kateqoriya sütunları
--
-- TƏHLÜKƏSİZLİK: bu migration YALNIZ ƏLAVƏ EDİR (add-only).
--   • mövcud sütun/data DƏYİŞDİRİLMİR, SİLİNMİR
--   • `if not exists` → təkrar işlədilsə no-op
--   • yeni sütunlar NULLABLE → mövcud sətirlər olduğu kimi qalır
--   • geri dönüş: iki sütunu DROP etmək kifayətdir
--
-- NİYƏ İNDİ (data hələ gəlmir): analitika şöbəsindən `Maya dəyəri` və
-- `Kateqoriya` sütunları istənildi (docs/IIKO-GUNLUK-EXPORT.md §7). Fayl
-- gələn gün İKİNCİ DEPLOY GÖZLƏNMƏSİN — parser, endpoint və cədvəl artıq
-- hazırdır; sütun gəldiyi anda avtomatik dolur.
--
-- `cost` = SƏTİR CƏMİ maya (ədəd × 1 ədədin mayası), `amount` ilə eyni qranulda.
-- Marja = amount − cost. Bu, menyu mühəndisliyini CİRO payından MARJA payına
-- keçirir — «çox satılır, amma pul qazandırmır» məhsulu yalnız bununla görmək olar.

alter table "analytics_item_fact" add column if not exists "cost"     numeric(14,2);
alter table "analytics_item_fact" add column if not exists "category" text;

-- Kateqoriya daxilində menyu mühəndisliyi üçün indeks (yalnız 'product' oxunur).
create index if not exists "aif_cat_idx"
  on "analytics_item_fact" ("tenant_id", "category", "business_date");
