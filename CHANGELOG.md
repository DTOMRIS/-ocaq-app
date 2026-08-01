# Changelog

Bu faylın formatı [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
əsasındadır və layihə [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
istifadə edir. Girişlər **insan tərəfindən** yazılır (git log-dan avtomatik yox).

## [Unreleased]

### Added
- **📈 Günlük Panel — self-servis satış analizi motoru** (`src/app/dashboard/panel/*`,
  `src/lib/analytics/parse-daily.ts`): super_admin iiko satış hesabatını (Excel)
  atır, panel çıxır — toplam satış, günlük ortalama, bölgə satışı, ödəniş qarışığı
  (nağd/kart/wolt/bolt), delivery %, diqqət istəyən filiallar. Fayl **browser-də**
  parse olunur (Vercel 4.5MB limitindən qaçmaq üçün), nəticə DB-yə yazılır (qalıcı).
- **İki satış hesabatı formatı oxunur:** `parseDaily` (Uçot günü olan günlük detay →
  günlük qrafik) və `parseOlap` (OLAP Hesabat: filial × ödəniş növü aylıq özet, günlük
  yox). Panel avtomatik uyğun parser-i seçir. Grand Total ilə dəqiq uyğunluq (3.96M).
- **📥 Toplu aylıq hədəf yüklə** (`src/app/dashboard/sales/BulkTargetUpload.tsx`,
  `POST /api/sales/targets/bulk`): super_admin PLAN.xlsx atır → bütün filialların hər
  ayının (İyul→Dekabr) hədəfi `sales_targets`-ə yazılır (upsert). "avqust plan" və
  "proqnoz İYUL" sütunlarını tanıyır (İ-normalizasyonu). Filial müdirləri dərhal görür.
- **🎯 Plan vs Gerçək · Tutturma** (Panel): şəbəkə özeti + **bölgə rollup** (bölgələrə
  rapor üçün progress-bar kartları) + filial-filial Plan/Gerçək/Fərq/Tutturma
  (✓ tutturur / ~ sınırda / ✗ tutmur; en pis üstte).
- **Keçən il (2025) qalıcı YoY** (`parseYoyRef`): PLAN.xlsx-də hər ayın "<ay> 2025"
  faktiki var — toplu yükləmədə `analytics_ingest`-ə (engine `yoyref-1.0`) qalıcı
  saxlanır. Panel hər ay YoY-u avtomatik qurur (Keçən ilə tile + YoY sütunu +
  📉 düşənlər filtri) — **təkrar fayl yükləmə lazım deyil** (bir dəfə PLAN.xlsx = 165 referans).
- **Dövr arxivi** (Panel): `🗓️ Dövr` dropdown — keçmiş aylara keçib baxılır (İyul/Avqust…),
  köhnə ay itmir (`analytics_ingest` period-bazlı).
- **Satış hədəfi — gündəlik tutturma** (`src/app/dashboard/sales/sales-client.tsx`):
  müdür gün girdikcə N-günlük hədəf + fərq (+/−) + həftəiçi/həftəsonu ağırlıklı ay sonu
  tahmini + tutturma rozeti. Filial kartında + bölgə/admin tablolarında.
- **🏦 Kasa/Banka mutabakat** (`src/app/dashboard/kasa-banka/*`,
  `src/lib/analytics/bank-reconcile.ts`): 3 acquirer (Unibank REP/HTML, ATB xlsx,
  Kapital POS binary .xls) → filial kart satışı vs bankaya keçən. Terminal→filial xəritəsi.
- **🍔 Menü / Food Cost** (`src/app/dashboard/menyu/*`): Maya və Qiymət analizi →
  hər məhsul food cost, kritik məhsullar (>%40), marja.
- `Bulvar Festival` filialı İsmayıl bölgəsinə əlavə edildi (`filial-map.ts`).
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
- **Panel cila:** sortable tablo (kolona tıkla ▲▼) + zebra + hover + yapışkan başlık;
  KPI tile'lara accent üst çizgi + gölge; bölgə barlarında % payı; filial tablosunda
  Hədəf (rakam) + Wolt/Bolt həm ₼ həm %.
- **"Ay proqnozu" tile** yalnız günlük/qismən dövrdə göstərilir; tamamlanmış aylıq
  özetdə (OLAP) gizli — çünkü orada proqnoz deyil faktiki rəqəmdir (yanıltmasın).
- `parseYoy` genişləndi: "Ticarət müəssisəsi | iyul 2025 | iyul gedişat" formatını da
  oxur; "Əcəmi" filialının ara-toplam kimi yanlış atlanması lookbehind ilə düzəldildi.
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
