-- ============================================================
-- OCAQ Etap 2 CUTOVER PREFLIGHT  (yalnız SELECT — heç nə dəyişmir)
-- Production migration 0004 → 0005 → 0006 -dən ƏVVƏL çalışdırılır.
-- Neon SQL Editor-də Production DB üzərində icra et.
--
-- QAYDA: [KRİTİK] bölmələrindən hər hansı biri SƏTİR QAYTARIRSA
--        migration PARTLAYACAQ — əvvəlcə həmin data təmizlənməlidir.
--        [MƏLUMAT] bölmələri məlumat üçündür (migration-u bloklamır).
-- ============================================================


-- ============ [KRİTİK 1] Mükərrər filial kodu ============
-- 0005: CREATE UNIQUE INDEX branches_tenant_code_uq ON branches(tenant_id, code)
-- (arxivli filiallar DA daxil — WHERE yoxdur). Nəticə sıfır sətir OLMALIDIR.
select tenant_id, code, count(*) as n, array_agg(id) as branch_ids
from branches
group by tenant_id, code
having count(*) > 1;


-- ============ [KRİTİK 2] Eyni filial/gün/növbə üçün mükərrər checklist ============
-- 0004: CREATE UNIQUE INDEX checklists_branch_date_shift_unique
--       ON checklists(tenant_id, branch_id, business_date, shift)
-- business_date backfill = (created_at AT TIME ZONE 'Asia/Baku')::date
-- (branch_id NULL sətirlər Postgres-də münaqişə yaratmır — kənarda saxlanır.)
-- Nəticə sıfır sətir OLMALIDIR.
select tenant_id, branch_id,
       (created_at at time zone 'Asia/Baku')::date as business_date,
       shift, count(*) as n
from checklists
where branch_id is not null
group by tenant_id, branch_id, (created_at at time zone 'Asia/Baku')::date, shift
having count(*) > 1;


-- ============ [KRİTİK 3] Eyni filiala 2+ canlı branch_manager dəvəti ============
-- 0005: CREATE UNIQUE INDEX invitations_live_branch_manager_uq
--       ON invitations(tenant_id, branch_id)
--       WHERE role='branch_manager' AND accepted_at IS NULL AND revoked_at IS NULL
-- (revoked_at bu migration-da əlavə olunur → index yaranarkən hamısı NULL-dır,
--  yəni effektiv şərt: role='branch_manager' AND accepted_at IS NULL.)
-- Nəticə sıfır sətir OLMALIDIR.
select tenant_id, branch_id, count(*) as n, array_agg(id) as invitation_ids
from invitations
where role = 'branch_manager' and accepted_at is null and branch_id is not null
group by tenant_id, branch_id
having count(*) > 1;


-- ============ [MƏLUMAT 4] Kanonik olmayan filial kodları ============
-- Format: ^F-[0-9]{2,6}$  (migration-u bloklamır, amma next-code məntiqi üçün vacib)
select id, tenant_id, code, name, is_archived
from branches
where code !~ '^F-[0-9]{2,6}$'
order by tenant_id, code;


-- ============ [MƏLUMAT 5] Bölgəsiz aktiv/hazırlıq filialı ============
select id, tenant_id, code, name, is_active
from branches
where region_id is null and is_archived = false;


-- ============ [MƏLUMAT 6] Etibarsız/deaktiv müdürə bağlı filial ============
select b.id, b.tenant_id, b.code, b.manager_id,
       case when u.id is null then 'user_yoxdur' else 'deaktiv' end as problem
from branches b
left join users u on u.id = b.manager_id
where b.manager_id is not null and (u.id is null or u.is_active = false);


-- ============ [MƏLUMAT 7] Boş kod və ya ad ============
select id, tenant_id, code, name
from branches
where trim(coalesce(code, '')) = '' or trim(coalesce(name, '')) = '';


-- ============ [MƏLUMAT 8] Filial başına müdür sayı (vekalet nəzarəti) ============
select manager_id, count(*) as filial_sayi, array_agg(code) as kodlar
from branches
where manager_id is not null and is_archived = false
group by manager_id
having count(*) > 1;
