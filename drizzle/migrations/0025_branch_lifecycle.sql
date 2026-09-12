-- 0025 — Filialın AÇILIŞ/BAĞLANIŞ tarixi və TİCARƏT ZONASI
--
-- NİYƏ: böyümə hesabı indi yanlış oxunur. Masazır avqustda bağlandığı üçün
-- «−100%» görünür, Səbail 3 yeni açıldığı üçün «+∞» görünür. İkisi də şəbəkənin
-- performansı deyil — biri bağlanış, digəri yeni investisiyadır. Rəqəmi dörd
-- sətrə ayırmadan «şəbəkə böyüdümü?» sualına cavab yoxdur:
--   ① eyni filial (like-for-like)  ② yeni filial  ③ bağlanan  ④ xalis
--
-- `activated_at`/`archived_at` VAR, amma onlar SİSTEMDƏ qeydin yaradılma/arxiv
-- vaxtıdır — filialın QAPISININ açıldığı gün deyil. Filial sistemə sonradan
-- girə bilər; tarixlər fərqlidir və qarışdırılmamalıdır.
--
-- `trade_zone`: iki filial bir-birinə çox yaxındırsa ayrı müqayisə edilməməlidir
-- (Səbail 2 ↔ Səbail 3 arası 140 m). Kodda `filial-map.ts`-də sabit siyahı var;
-- bu sütun onu FİLİALIN ÖZÜNDƏ saxlayır ki, yeni filial əlavə ediləndə kod
-- dəyişdirmək lazım olmasın.
--
-- TƏHLÜKƏSİZLİK: yalnız ƏLAVƏ EDİR (3 nullable sütun). Heç bir sətir
-- yenilənmir/silinmir → snapshot məcburi deyil.

alter table "branches" add column if not exists "opened_at"  date;
alter table "branches" add column if not exists "closed_at"  date;
alter table "branches" add column if not exists "trade_zone" text;

create index if not exists "branches_zone_idx" on "branches" ("tenant_id","trade_zone");
