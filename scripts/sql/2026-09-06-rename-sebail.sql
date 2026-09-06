-- Filial adı dəyişikliyi — 06.09.2026 (istifadəçi qərarı)
--   Corner              → Səbail 2
--   Abdülkerim Alizadə  → Səbail 3   (iiko hələ «Mytcha» göndərir — alias kodda)
--
-- NİYƏ LAZIMDIR: `filial-map.ts`-dəki KANONİK ad `branches.name` ilə EYNİ
-- olmalıdır — `branchIdOf` bağlantısı bu adla qurulur. Kod tərəfi artıq
-- dəyişdi; baza dəyişməzsə fakt sətirləri `branch_id`-siz qalar.
--
-- TARİXİ DATA: `analytics_*` cədvəllərindəki `filial` mətn sütunu KÖHNƏ adı
-- saxlayır və toxunulmur — oxucu alias ilə normalize edir. Yalnız `branches`
-- cədvəli yenilənir.
--
-- ƏVVƏL: snapshot al (docs/DATA-PROTECTION.md). Sonra əvvəlcə SELECT ilə yoxla.

-- 1) YOXLA — nə dəyişəcək?
SELECT id, code, name FROM branches WHERE name IN ('Corner', 'Abdülkerim Alizadə');

-- 2) TƏTBİQ ET (yalnız yuxarıdakı nəticə gözlədiyin kimidirsə)
BEGIN;

UPDATE branches SET name = 'Səbail 2', updated_at = now()
WHERE name = 'Corner';

UPDATE branches SET name = 'Səbail 3', updated_at = now()
WHERE name = 'Abdülkerim Alizadə';

-- 3) TƏSDİQ — iki sətir qayıtmalıdır
SELECT id, code, name FROM branches WHERE name IN ('Səbail 2', 'Səbail 3');

-- Hər şey qaydasındadırsa:
COMMIT;
-- Səhv varsa: ROLLBACK;
