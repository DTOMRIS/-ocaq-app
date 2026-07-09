# Changelog

Bu faylın formatı [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
əsasındadır və layihə [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
istifadə edir. Girişlər **insan tərəfindən** yazılır (git log-dan avtomatik yox).

## [Unreleased]

### Added
- `docs/ENGINEERING-GUARDRAILS.md` — production-u qorumaq üçün mühəndislik qaydaları.
- `docs/ROADMAP.md` — kövrək vəziyyətdən qorunan vəziyyətə keçid yol xəritəsi.
- `CHANGELOG.md` — bu fayl (Keep a Changelog formatı).
- Filial gerçəkləşmə hesabatı (`/dashboard/reports`): 2025→2026 iyul müqayisəsi,
  Grand Total, bölgə müdiri xülasəsi, ≥100% yaşıl vurğu.
- `db:reset-admin` skripti — super admin-i məcburi yaradır/bərpa edir.

### Changed
- Kök səhifə (`/`) create-next-app boilerplate yerinə sessiyaya görə
  `/dashboard` və ya `/login`-ə yönləndirir.
- Sidebar "KXT yoxlama" menyusu boş placeholder yerinə işlək
  `/dashboard/vardiya-checklist` səhifəsinə yönləndirir.

### Fixed
- 3 lint xətası (let→const; effekt daxilində setState → render zamanı hesablama /
  lazy initializer) həll edildi.
- `package-lock.json` `package.json` ilə sinxronlaşdırıldı (CI/Vercel `npm ci`).

### Known Issues / TODO
- Davət maili getmir (`ocaq.app` Resend-də doğrulanmayıb) və xəta **udulur** —
  UI səhvən "getdi" deyir. Bax `docs/ROADMAP.md` Faz 0.
- Production məlumatı ad-hoc skriptlə girildi — versiyalı seed-ə köçürülməli.
- Guardrail-lər (branch protection, CI, staging) hələ qurulmayıb — Faz 0.

---

_Qeyd: bu ilk changelog girişi keçmiş dəyişiklikləri geriyə doğru toplayır.
Bundan sonra hər dəyişiklik burada `[Unreleased]` altında qeyd olunmalıdır._
