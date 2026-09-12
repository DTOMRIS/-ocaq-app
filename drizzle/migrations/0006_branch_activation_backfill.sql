-- 0006 — filial aktivləşmə tarixinin backfill-i
--
-- ⚠️ BU MIGRATION MÖVCUD SƏTİRLƏRİ DƏYİŞİR (UPDATE) → SNAPSHOT ALIN.
-- Aktiv filiallara `activated_at = created_at` yazılır. Şərtli olduğu üçün
-- təkrar işlədilməsi zərərsizdir.
-- Başlıq 12.09.2026-da əlavə edildi (SQL DƏYİŞMƏDİ, yalnız şərh).

UPDATE "branches"
SET
	"activated_at" = "created_at",
	"updated_at" = now(),
	"version" = "version" + 1
WHERE
	"is_active" = true
	AND "is_archived" = false
	AND "activated_at" IS NULL;
