# Changelog

Bu faylın formatı [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
əsasındadır və layihə [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
istifadə edir. Girişlər **insan tərəfindən** yazılır (git log-dan avtomatik yox).

## [Unreleased]

### Added
- `src/db/schema/auth.ts` — Added `region_id` and `branch_id` relations to the `invitations` table schema.
- `src/components/staff-list.tsx` — Added a "+ Yeni Dəvət" button and an invitation modal for Super Admins and Region Managers to invite members with specific roles, regions, and branches.
- `src/app/api/invitations/route.ts` & `accept/route.ts` — Implemented audit logging by writing records to the `audit_logs` table on user invitation and user registration.
- `src/app/dashboard/settings/page.tsx` — Created settings page with persistent configurations stored in localStorage.
- `drizzle/migrations/0002_polite_songbird.sql` — Generated and pushed migration to database for region/branch invitations.

### Changed
- `src/app/dashboard/page.tsx` — Customized dashboard welcome views: staff roles see a mobile-friendly welcome screen with only two direct cards (KXT yoxlama and incident reporting), and managers see metrics dynamically counted by their assigned branches and regions.
- `src/app/api/staff/route.ts` & `branches/route.ts` — Added server-side role security checks. Staff are blocked, while region/branch managers can only access staff/branches details belonging to their regions/branches.
- `src/app/dashboard/branches/branches-client.tsx` — Connected the Branch name in the list as a direct clickable anchor linking to `/dashboard/vardiya-checklist`.
- `src/emails/ChecklistReminderEmail.tsx` & `src/lib/email.ts` — Re-pointed out-of-date `/dashboard/checklists` links to the functional `/dashboard/vardiya-checklist`.

### Fixed
- Fixed email error swallowing; the Resend client now properly throws/logs API errors on failure.
- Removed duplicate keys and resolved conflicts in `/accept` onboarding API and invitations schema definition.

---

_Qeyd: bu ilk changelog girişi keçmiş dəyişiklikləri geriyə doğru toplayır.
Bundan sonra hər dəyişiklik burada `[Unreleased]` altında qeyd olunmalıdır._
