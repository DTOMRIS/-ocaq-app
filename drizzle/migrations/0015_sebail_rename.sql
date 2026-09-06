-- 0015 — filial adı köçürməsi: 'Corner' → 'Səbail 2' · 'Abdülkerim Alizadə' → 'Səbail 3'
--
-- ⚠️ BU MIGRATION MÖVCUD SƏTİRLƏRİ DƏYİŞİR (UPDATE) → NEON SNAPSHOT ALIN.
-- Deploy migration işlətmir (bax docs/DATA-PROTECTION.md §3.1) — ƏL İLƏ işlədilir.
--
-- NİYƏ: istifadəçi qərarı 06.09.2026. `filial-map.ts`-də kanonik adlar dəyişdi,
-- köhnə adlar ALİAS oldu. Kanonik ad `branches.name` ilə eyni olmalıdır, yoxsa
-- `branch_id` bağlantısı qurulmur və bölgə/filial müdiri datanı görmür.
--
-- 0011-dəki eyni səbəb: fakt cədvəllərinin unique açarı `filial` MƏTNİDİR →
-- köçürmə edilməsə data İKİ ADA BÖLÜNƏR (yeni yükləmələr 'Səbail 2', köhnələr
-- 'Corner') və filial hesabatı yarımçıq görünər.
--
-- 0011-dən FƏRQİ: o vaxt yalnız iki fakt cədvəli vardı. İndi saatlıq (0013),
-- silinmə və kasa/banka (0014) da var — hamısı köçürülür.
--
-- TƏHLÜKƏSİZLİK:
--   • `not exists` şərti unique açar toqquşmasının qarşısını alır — hədəf adla
--     eyni açarda sətir varsa köhnə sətir OLDUĞU KİMİ QALIR (silinmir).
--   • Təkrar işlədilsə no-op.
--   • Heç bir sətir SİLİNMİR.
--   • `analytics_deletion_fact`-də unique açar YOXDUR → düz update.

-- ── 1) branches.name — kanonik ad ───────────────────────────────────────────
update "branches" set "name" = 'Səbail 2', "updated_at" = now() where "name" = 'Corner';
update "branches" set "name" = 'Səbail 3', "updated_at" = now() where "name" = 'Abdülkerim Alizadə';

-- ── 2) Gün/ödəniş fakt ──────────────────────────────────────────────────────
update "analytics_daily_fact" d set "filial" = 'Səbail 2'
where d."filial" = 'Corner'
  and not exists (select 1 from "analytics_daily_fact" x
    where x."tenant_id" = d."tenant_id" and x."filial" = 'Səbail 2'
      and x."business_date" = d."business_date" and x."payment_type" = d."payment_type");

update "analytics_daily_fact" d set "filial" = 'Səbail 3'
where d."filial" = 'Abdülkerim Alizadə'
  and not exists (select 1 from "analytics_daily_fact" x
    where x."tenant_id" = d."tenant_id" and x."filial" = 'Səbail 3'
      and x."business_date" = d."business_date" and x."payment_type" = d."payment_type");

-- ── 3) Məhsul fakt ──────────────────────────────────────────────────────────
update "analytics_item_fact" i set "filial" = 'Səbail 2'
where i."filial" = 'Corner'
  and not exists (select 1 from "analytics_item_fact" x
    where x."tenant_id" = i."tenant_id" and x."filial" = 'Səbail 2'
      and x."business_date" = i."business_date" and x."item_code" = i."item_code");

update "analytics_item_fact" i set "filial" = 'Səbail 3'
where i."filial" = 'Abdülkerim Alizadə'
  and not exists (select 1 from "analytics_item_fact" x
    where x."tenant_id" = i."tenant_id" and x."filial" = 'Səbail 3'
      and x."business_date" = i."business_date" and x."item_code" = i."item_code");

-- ── 4) Saatlıq kumulyativ görüntü ───────────────────────────────────────────
update "analytics_hourly_cume" c set "filial" = 'Səbail 2'
where c."filial" = 'Corner'
  and not exists (select 1 from "analytics_hourly_cume" x
    where x."tenant_id" = c."tenant_id" and x."filial" = 'Səbail 2'
      and x."period_start" = c."period_start" and x."period_end" = c."period_end"
      and x."pay_type" = c."pay_type" and x."hour" = c."hour");

update "analytics_hourly_cume" c set "filial" = 'Səbail 3'
where c."filial" = 'Abdülkerim Alizadə'
  and not exists (select 1 from "analytics_hourly_cume" x
    where x."tenant_id" = c."tenant_id" and x."filial" = 'Səbail 3'
      and x."period_start" = c."period_start" and x."period_end" = c."period_end"
      and x."pay_type" = c."pay_type" and x."hour" = c."hour");

-- ── 5) Saatlıq günlük fakt ──────────────────────────────────────────────────
update "analytics_hourly_fact" h set "filial" = 'Səbail 2'
where h."filial" = 'Corner'
  and not exists (select 1 from "analytics_hourly_fact" x
    where x."tenant_id" = h."tenant_id" and x."filial" = 'Səbail 2'
      and x."business_date" = h."business_date" and x."pay_type" = h."pay_type" and x."hour" = h."hour");

update "analytics_hourly_fact" h set "filial" = 'Səbail 3'
where h."filial" = 'Abdülkerim Alizadə'
  and not exists (select 1 from "analytics_hourly_fact" x
    where x."tenant_id" = h."tenant_id" and x."filial" = 'Səbail 3'
      and x."business_date" = h."business_date" and x."pay_type" = h."pay_type" and x."hour" = h."hour");

-- ── 6) Silinmə (unique açar yoxdur — düz update) ────────────────────────────
update "analytics_deletion_fact" set "filial" = 'Səbail 2' where "filial" = 'Corner';
update "analytics_deletion_fact" set "filial" = 'Səbail 3' where "filial" = 'Abdülkerim Alizadə';

-- ── 7) Kasa/banka mutabakatı ────────────────────────────────────────────────
update "kasa_banka_recon" k set "filial" = 'Səbail 2'
where k."filial" = 'Corner'
  and not exists (select 1 from "kasa_banka_recon" x
    where x."tenant_id" = k."tenant_id" and x."filial" = 'Səbail 2'
      and x."period_start" = k."period_start" and x."period_end" = k."period_end");

update "kasa_banka_recon" k set "filial" = 'Səbail 3'
where k."filial" = 'Abdülkerim Alizadə'
  and not exists (select 1 from "kasa_banka_recon" x
    where x."tenant_id" = k."tenant_id" and x."filial" = 'Səbail 3'
      and x."period_start" = k."period_start" and x."period_end" = k."period_end");

-- ── 8) `branch_id` bağlantısını doldur ──────────────────────────────────────
update "analytics_daily_fact" d set "branch_id" = b."id"
from "branches" b
where d."branch_id" is null and b."tenant_id" = d."tenant_id"
  and lower(btrim(b."name")) = lower(btrim(d."filial"));

update "analytics_item_fact" i set "branch_id" = b."id"
from "branches" b
where i."branch_id" is null and b."tenant_id" = i."tenant_id"
  and lower(btrim(b."name")) = lower(btrim(i."filial"));

update "analytics_hourly_fact" h set "branch_id" = b."id"
from "branches" b
where h."branch_id" is null and b."tenant_id" = h."tenant_id"
  and lower(btrim(b."name")) = lower(btrim(h."filial"));

-- ── 9) YOXLAMA — işlətdikdən sonra bu sorğu BOŞ qayıtmalıdır ────────────────
-- select 'daily' t, filial, count(*) from analytics_daily_fact
--   where filial in ('Corner','Abdülkerim Alizadə') group by 1,2
-- union all select 'item', filial, count(*) from analytics_item_fact
--   where filial in ('Corner','Abdülkerim Alizadə') group by 1,2
-- union all select 'hourly', filial, count(*) from analytics_hourly_fact
--   where filial in ('Corner','Abdülkerim Alizadə') group by 1,2
-- union all select 'branches', name, count(*) from branches
--   where name in ('Corner','Abdülkerim Alizadə') group by 1,2;
