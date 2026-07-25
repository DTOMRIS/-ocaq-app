# Changelog

Bu faylın formatı [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
əsasındadır və layihə [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
istifadə edir. Girişlər **insan tərəfindən** yazılır (git log-dan avtomatik yox).

## [Unreleased]

### Added
- Shaurma No1 müşteri markası için ortak auth marka bileşeni eklendi; mevcut
  logo giriş, davet kabulü ve şifre sıfırlama ekranlarında OCAQ ürün
  kimliğiyle birlikte gösteriliyor.
- **DK Agency → OCAQ ticari ürün temeli:** idempotent
  `POST /api/integrations/dk/provision-tenant` endpoint'i, harici DK müşteri
  kimliği, paket kodu, provisyon kaynağı/tarihi ve ilk süper yönetici davet
  akışı eklendi.
- `docs/SYSTEM-TREE.md` — DK Agency, OCAQ ve TQTA arasındaki ürün sınırları,
  tek veri sahibi kuralı, canlı altyapı ve satıştan tenant açılışına kadar
  sistem ağacı belgelendi.
- `drizzle/migrations/0008_dk_commercial_foundation.sql` — tenant provisyon
  alanları, benzersiz harici müşteri indeksi ve davet kaynağı eklendi.
- `src/app/dashboard/checklists/page.tsx` — **Çekirdek akışı tamamlayan görünüm:** bölgə müdiri/filial müdiri göndərilmiş vardiya checklist nəticələrini (filial, vardiya, skor, dolduran, tarix) görür. Rol əhatəsinə görə scoped (region_manager yalnız öz bölgəsi). Əvvəl boş placeholder idi.
- `src/db/schema/checklists.ts` — Created checklists table schema for persisting vardiya checklist responses.
- `src/app/api/checklists/route.ts` — Implemented GET/POST endpoints for checklists with automatic audit logging on submit.
- `src/app/api/audit-logs/route.ts` — Added super_admin restricted endpoint for fetching latest 100 system audit logs.
- `drizzle/migrations/0003_black_whistler.sql` — Generated and pushed database migration for checklists table.

### Changed
- Giriş, davet, parola sıfırlama ve markalı e-posta şablonlarındaki geçici
  Shaurma görseli, restoranın onaylı dairesel “Shaurma Restoran & Café”
  logosuyla değiştirildi.
- Şifrə sıfırlama ekranı artıq təhlükəsiz hesab-enumerasiyasını qoruyaraq
  istifadəçiyə açıq şəkildə bildirir: link yalnız aktiv idarəçi hesabına
  göndərilir; mail gəlməzsə Spam yoxlanmalı və hesabın hələ yaradılmamış
  ola biləcəyi nəzərə alınmalıdır. İlk giriş üçün dəvət axını göstərilir.
- **OCAQ yönetici erişimi:** oturum açma, davet, parola sıfırlama ve session
  akışları yalnız `super_admin`, `region_manager` ve `branch_manager`
  rollerine sınırlandı; personel için OCAQ hesabı açılması engellendi.
- Canlı ürün alan adı `ocaq.dkagency.com.tr` olarak belirlendi. Hostinger
  CNAME → Vercel bağlantısı ve HTTPS doğrulandı.
- Davet/parola e-postaları için `ocaq@dkagency.com.tr` Hostinger SMTP
  (`smtp.hostinger.com`, SSL/465) yapılandırması Preview ve Production
  ortamlarına eklendi; kimlik doğrulama ve gerçek test mesajı gönderimi
  başarılı oldu.
- Production Neon veritabanına `0008_dk_commercial_foundation.sql`, öncesinde
  `pre-dk-commercial-2026-07-25` snapshot'ı alınarak uygulandı.
- Ticari temel production'a dağıtıldı. Canlı smoke testte login HTTP 200,
  yönetici-only arayüz ve secretsiz DK provisioning isteğinde HTTP 401
  doğrulandı.
- `src/app/dashboard/page.tsx` — Günlük/aylıq satış rakamları mock `TODAY` obyektindən real DB verisinə bağlandı (daily_sales + sales_targets, rol əhatəsinə görə). Digər KPI/cost göstəriciləri toxunulmadı (data mənbəyi yoxdur). AGENTS.md qorunub.
- `src/app/api/sales/daily/route.ts` & `targets/route.ts` — Added strict region/branch validation checks for region managers and branch managers preventing cross-region data queries and target updates.
- `src/app/dashboard/vardiya-checklist/page.tsx` — Replaced client-side mockup submission with database persistence, complete with dynamic branch fetching and dropdown selection.
- `src/app/dashboard/settings/page.tsx` — Upgraded the page with a tabbed interface, adding a secure "Audit Girişləri" log viewer tab for super_admins.
- `src/auth.ts` — Implemented active session revocation. NextAuth session callback now queries the database dynamically to invalidate the session of any user whose status becomes disabled.

### Security
- **Session rol/tenant DB-dən yenilənir** (`auth.ts`): əvvəl session yalnız JWT-dəki köhnə rolu istifadə edirdi → rol düşürmə təsirsiz idi. İndi role/tenant_id hər session yoxlamasında DB-dən təzə oxunur.
- **regions PATCH hijack bağlandı** (`regions/route.ts`): region_manager yalnız öz bölgəsini; manager_id dəyişməsi yalnız super_admin. Əvvəl istənilən bölgəni ələ keçirə bilirdi.
- **staff PATCH IDOR bağlandı** (`api/staff/[id]/route.ts`): əvvəl istənilən istifadəçi (staff daxil) hər hansı personalın maaşını dəyişə bilirdi. İndi: staff qadağan; region/branch manager yalnız öz əhatəsindəki personal; maaş/FIN/IBAN/filial dəyişmə yalnız super_admin/region_manager.
- **`/admin/*` auth guard əlavə edildi** (`src/app/admin/layout.tsx`): əvvəl layout/middleware yox idi, səhifələr girişsiz açıq idi. İndi yalnız super_admin.
- **ENCRYPTION_KEY fail-fast** (`lib/encryption.ts`): əvvəl açar yoxdursa səssizcə sıfır (proqnozlaşdırıla bilən) AES açarı işlədilirdi. İndi prod-da açar yoxdursa throw; oxumada çökmə yox.

### Fixed
- Parola sıfırlamasından sonra giriş yapamayan ilk süper yönetici için
  kontrollü kurtarma akışı eklendi: sistem üretimli geçici parola doğrudan
  hesaba atanır, markalı e-postayla yalnız hesap sahibine gönderilir ve
  başarılı girişten sonra zorunlu parola değiştirme ekranına yönlendirilir.
- Şifre sıfırlama formunda iki parola alanı için ortak
  “Yazdığım şifrəni göstər” kontrolü eklendi. Kullanıcı yeni parolayı
  kaydetmeden önce iki alanı görsel olarak karşılaştırabilir; klavye düzeni ve
  karakter farkından kaynaklanan başarısız ilk giriş riski azaltıldı.
- Production'da yeni auth kodunun tələb etdiyi
  `users.must_change_password` kolonu eksikdi; idempotent
  `0007_thin_firestar.sql` uygulandı. OCAQ tenant'ının ilk platform sahibi
  doğrulanmış `super_admin` olarak bootstrap edildi ve tek kullanımlık parola
  sıfırlama akışıyla parolasını kendisinin belirlemesi sağlandı.
- Fixed cross-region sales leakages and target manipulation vulnerabilities in sales API endpoints.
- **`/dashboard/staff` render çökməsi düzəldildi** (`components/staff-list.tsx`, `dashboard/staff/page.tsx`): personalın `status` sahəsi boş/naməlum olanda `STATUS_CONFIG[status]` undefined olub səhifəni çökdürürdü → indi nötr rozet göstərilir. Həmçinin staff səhifəsinin self-fetch cavabı JSON olmayanda (qorunmuş Preview HTML qaytara bilər) boş siyahıya düşür, çökmür. typecheck / test(24) / build hamısı yaşıl. (commit `cb8643c`)

### Vəziyyət / Budaq qeydi (17 iyul 2026, səhər)
- **Aktiv iş budağı:** `codex/shift-leadership`. **Preview** hazırda `3ab66b5` (= Etap 1) deploy edir və işləyir.
- **Etap 2A** (filial lifecycle + migration `0005`) + **yarımçıq Etap 2B/2C** (müdür təyini/dəvət/filial UI) + yuxarıdakı **staff fix** → hamısı `codex/etap-2bc-wip-backup-20260717` (`cb8643c`) budağında, **GitHub-da yedəklidir**. Preview-a hələ göndərilməyib (yarımçıq müdür ekranı canlıya çıxmasın deyə).
- **`main` (Production) toxunulmayıb** (`e128b9e`). Production DB-də çatışmayan migration-lar: `0004`, `0005`, `0006` — tək-budaq keçidində mütləq DB backup ilə tətbiq olunmalıdır, əks halda yeni kod çökür.
- **Tək-budaq keçidi** (main-ə merge + Production deploy + köhnə budaqların təmizlənməsi) açıq istifadəçi təsdiqi + DB yedəyi gözləyir. Kod hazırdır: typecheck / test / build yaşıl.

---

_Qeyd: bu ilk changelog girişi keçmiş dəyişiklikləri geriyə doğru toplayır.
Bundan sonra hər dəyişiklik burada `[Unreleased]` altında qeyd olunmalıdır._
