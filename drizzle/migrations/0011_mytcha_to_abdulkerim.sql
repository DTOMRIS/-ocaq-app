-- 0011 — F-31 filial adı köçürməsi: 'Mytcha' → 'Abdülkerim Alizadə'
--
-- ⚠️ BU MIGRATION MÖVCUD SƏTİRLƏRİ DƏYİŞİR (UPDATE) → NEON SNAPSHOT ALIN.
-- Deploy migration işlətmir (bax docs/DATA-PROTECTION.md §3.1).
--
-- NİYƏ: F-31 OCAQ-da ünvana görə «Abdülkerim Alizadə» adlandırıldı, iiko isə
-- hələ «Mytcha» yazır. `filial-map.ts`-də kanonik ad OCAQ adı oldu, iiko adı
-- alias-a çevrildi (kanonik ad `branches.name` ilə eyni olmalıdır, yoxsa
-- `branch_id` bağlantısı qurulmur və bölgə/filial müdiri datanı görmür).
--
-- 09.08.2026-dan ƏVVƏL yüklənmiş sətirlərdə `filial='Mytcha'` qalıb. Fakt
-- cədvəllərinin unique açarı `filial` MƏTNİDİR → köçürmə edilməsə avqust datası
-- İKİ ADA BÖLÜNƏR (yeni yükləmələr 'Abdülkerim Alizadə', köhnələr 'Mytcha') və
-- filial hesabatı yarımçıq görünər.
--
-- TƏHLÜKƏSİZLİK:
--   • `not exists` şərti unique açar toqquşmasının qarşısını alır — hədəf adla
--     həmin gün/məhsul üçün sətir varsa köhnə sətir OLDUĞU KİMİ QALIR (silinmir).
--     Belə hal qalarsa §3-dəki yoxlama sorğusu onu göstərir.
--   • Təkrar işlədilsə no-op (ikinci dəfə uyğun sətir qalmır).
--   • Heç bir sətir SİLİNMİR.

-- ── 1) Gün/ödəniş fakt cədvəli ──────────────────────────────────────────────
update "analytics_daily_fact" d set "filial" = 'Abdülkerim Alizadə'
where d."filial" = 'Mytcha'
  and not exists (
    select 1 from "analytics_daily_fact" x
    where x."tenant_id" = d."tenant_id"
      and x."filial" = 'Abdülkerim Alizadə'
      and x."business_date" = d."business_date"
      and x."payment_type" = d."payment_type"
  );

-- ── 2) Məhsul fakt cədvəli ──────────────────────────────────────────────────
update "analytics_item_fact" i set "filial" = 'Abdülkerim Alizadə'
where i."filial" = 'Mytcha'
  and not exists (
    select 1 from "analytics_item_fact" x
    where x."tenant_id" = i."tenant_id"
      and x."filial" = 'Abdülkerim Alizadə'
      and x."business_date" = i."business_date"
      and x."item_code" = i."item_code"
  );

-- ── 3) `branch_id` bağlantısını doldur ──────────────────────────────────────
-- Filial OCAQ-da yaradılıb (F-31), lakin əvvəlki yükləmədə ad uyğunlaşmadığı
-- üçün `branch_id` boş qaldı. Növbəti yükləmə də bunu doldurur, amma indi
-- doldurmaq bölgə/filial müdirinin datanı DƏRHAL görməsini təmin edir.
update "analytics_daily_fact" d set "branch_id" = b."id"
from "branches" b
where d."branch_id" is null
  and b."tenant_id" = d."tenant_id"
  and lower(btrim(b."name")) = lower(btrim(d."filial"));

update "analytics_item_fact" i set "branch_id" = b."id"
from "branches" b
where i."branch_id" is null
  and b."tenant_id" = i."tenant_id"
  and lower(btrim(b."name")) = lower(btrim(i."filial"));
