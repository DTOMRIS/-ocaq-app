# Etap 2B / 2C Denetim Raporu

Tarih: 17 iyul 2026. Salt-okunur inceleme, commit `090786c` (yedek dal `codex/etap-2bc-wip-backup-20260717`).
Bu rapor cutover öncesi kalan işleri kaydeder. Kod DEĞİŞDİRİLMƏYİB.

## Xülasə

2B/2C **funksional olaraq kod-tam və memarlıq baxımından sağlam** — amma spec-in (`ETAP-2-PLAN.md` bölmə 10) qəbul qapısı bağlanmayıb. Yəni: kod işləyir, lakin cutover-a HAZIR DEYİL.

## Tamamlanan (təsdiqləndi)

- **Müdür ata/dəyiş/ayır** (`api/branches/[id]/manager/route.ts`): advisory lock + compare-and-swap (`manager_id is not distinct from`), namizəd doğrulaması (aktiv+təsdiqli branch_manager), audit.
- **Tək-canlı-dəvət** üç qatlı zəmanət: `not exists live invitation` + insert öncəsi expired-revoke CTE + DB partial unique index `invitations_live_branch_manager_uq`.
- **Compare-and-swap yetki devri** (`invitations/accept/route.ts`): `FOR UPDATE`, `branch.manager_id is not distinct from replaces_manager_id`, atomik user-create + branch swap + version++ + audit; şərt tutmazsa `INVITATION_STALE 409`.
- **revoke/resend** (`invitations/[id]/route.ts`): DELETE (revoke+reason), PATCH (resend+scope yenidən doğrulama+token rotation).
- **2C UI tam** (`branches-client.tsx`): bütün action-lar bağlı; otomatik kod, müdür/dəvət/status kolonları, `⋯` menyu, arxiv filtri, create→müdür addımı, mobil bottom-sheet modal.
- **Yetki/IDOR/optimistic-lock**: bütün mutasiyalar super_admin+tenant-scoped, UUID doğrulaması, `expected_version`+`expected_manager_id`, TOCTOU yox. Kritik güvenlik açığı TAPILMADI.

## Migration 0006_branch_activation_backfill

`is_active AND NOT is_archived AND activated_at IS NULL` filiallara `activated_at=created_at`, `version++`. **Idempotent** (təkrar no-op), veri kaybı yox, Production riski DÜŞÜK.

## ⚠️ Cutover öncesi BLOKLAYICI işlər

1. **API inteqrasiya testləri yoxdur** (spec bölmə 9). Mövcud yalnız saf-funksiya unit testləri. Yazılmalı: compare-and-swap devir, tək-canlı-dəvət yarışı, IDOR 404, duplicate code 409, blocker saylarının real DB ilə uyğunluğu, deaktiv/arxiv dəvət qəbulu no-op.
2. **Preflight SELECT-ləri** (duplicate kod, format-dışı kod, müdürsüz/bölgəsiz filial) Prod+Preview-da çalışdırılıb qeyd edilməlidir. **KRİTİK: 0005-dəki `branches_tenant_code_uq` unique index Prod-da mükərrər kod varsa PARTLAYIR.**
3. **Qəbul qoşusu**: typecheck + lint + build + Preview 4-rol testi bu yedekdə çalışdırılmayıb. (Qeyd: typecheck/test(24)/build ayrıca yaşıl keçdi; lint + Preview 4-rol qalır.)
4. **(Düşük)** `branches/route.ts` `eligible` CTE operator precedence: `where $8 is null or exists(...) and (<=999999)`. AND OR-dan əvvəl bağlandığı üçün müdür null olanda sequence sərhədi atlanır — nəzəri `F-1000000`. Parantez lazım.
5. **(Onay)** Production migration yalnız açıq təsdiqlə + öncə Neon snapshot.

## Hüküm

Cutover-a hazır DEYİL. Sıra: (1) inteqrasiya testləri → (2) preflight SELECT + duplicate kod təmizliyi → (3) lint + Preview 4-rol → (4) CTE parantez → (5) təsdiqlə Prod migration+deploy.
