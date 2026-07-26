# Changelog

## 2026-07-26 — Rəsmi keyfiyyət formaları təməli

- 25 mənbə PDF-dən SHA-256 ilə doğrulanan 18 unikal SH-KN formu kanonik kataloqa əlavə edildi.
- Eyni `SH-KN-F-034` nömrəli Bükmə, Lahmacun, Pide, Pizza və Shaurma formaları beş ayrı mənbə kimi qorundu.
- Mənbə sahələri, sabit ölçmə saatları, hazırlama/reviziya məlumatları və F-041-dəki ziddiyyətli temperatur qeydləri itkisiz qeydə alındı.
- Filial müdiri → öz filialı, bölgə müdiri → bağlı filiallar, super admin → bütün tenant əhatəsi rol müqaviləsi əlavə edildi; ümumi personelə OCAQ forma icazəsi verilmədi.
- Göndərilmiş qeydi dəyişdirməyən, düzəlişi yeni reviziya kimi saxlayan və fiziki silmə əvəzinə auditli ləğv istifadə edən add-only DB migration hazırlandı.
- Yaratma, göndərmə, təsdiq, düzəliş, çap və ləğv üçün append-only hadisə jurnalı modelləşdirildi.
- Dashboard menyusuna KXT-dən ayrı `Keyfiyyət formaları` kataloqu əlavə edildi.
- 18 formanın hər biri üçün ayrıca, sahə tipli giriş şablonu əlavə edildi; server naməlum və qısaldılmış sahələri qəbul etmir.
- Taslak yaratma və yeniləmə, göndərmə, bölgə/süper admin təsdiqi, səbəbli düzəliş, auditli ləğv və auditli çap API-ləri əlavə edildi.
- Eyni sorğunun təkrarında qeyd çoxaltmayan idempotency və paralel pəncərədə məlumat itkisinin qarşısını alan `version` nəzarəti əlavə edildi.
- Arxiv filialın tarixi formalarının süper admin və səlahiyyətli bölgə müdüründən gizlənməməsi üçün aktiv əməliyyat əhatəsi ilə tarixi oxu əhatəsi ayrıldı.
- Forma qeydləri səhifəsinə filial/forma/status filtrləri, məsul filial müdiri, təsdiq və ləğv əməliyyatları əlavə edildi.
- Hər köhnə qeyd reviziyası üçün mənbə başlığı, cədvəl tutumu, mənbə qeydləri və audit tarixçəsi olan `Çap et / PDF` görünüşü əlavə edildi.
- Düzəliş zamanı əvvəlki reviziya atomik olaraq `Əvvəlki`, yeni taslak `Cari` işarələnir; standart siyahı yalnız cari nəticəni sayır, tarixçə filtri köhnə reviziyaları göstərir.
- Qeyd ekranından səbəb məcburi olmaqla əvvəlki məlumatla doldurulmuş yeni düzəliş taslağı yaratmaq əlavə edildi.
- Filial müdiri, bölgə müdiri və super admin üçün ana dashboard rol əhatəsinə görə ayrıldı; ümumi personel yalnız təlim keçidində qalır.
- Rəhbərlik dashboarduna real KXT məlumatından 7 gün, əvvəlki 7 gün və 30 gün ortalaması/trendi, bugünkü iki növbə tamamlanması və filial səviyyəli istisna sıralaması əlavə edildi.
- Rəsmi formalar üçün 7/30 günlük cari reviziya sayı, onay gözləyən, taslak və auditli iptal göstəriciləri məsul filial müdiri ilə birgə göstərilir.
- Filial müdürü təyin edilməyən filial idarəetmə istisnası kimi görünür; məlumat olmayan göstəricidə skor uydurulmur.
- Rəsmi forma tezlik/təyinat cədvəli təsdiqlənmədiyi üçün “çatışmayan forma” göstəricisi qəsdən hesablanmır; bu, növbəti ayrıca addımdır.
- Dashboard filial/bölgə və müdür join-larında tenant şərti sərtləşdirildi; super admin sorğusu da yalnız öz tenantındakı aktiv filialları hesablayır.
- OCAQ giriş sərhədi qəti şəkildə rəhbər rolları ilə məhdudlaşdırıldı: süper admin, bölgə müdiri və filial müdiri. Mövcud personel qeydləri silinmir, lakin `staff` hesabı giriş edə, şifrə sıfırlama e-poçtu ala və yeni OCAQ dəvəti qəbul edə bilməz.
- Ümumi dəvət axını yalnız süper adminin bölgə müdiri dəvətinə ayrıldı; filial müdiri dəvəti filialın öz auditli müdür təyinatı ekranından gedir. Köhnə personel dəvəti yenidən göndərilə bilməz, amma audit/tarixçə üçün saxlanır.
- Personel səhifəsindəki OCAQ hesabı yaratma modali çıxarıldı; səhifə personel məlumatını itirmədən yalnız idarəetmə siyahısı kimi qalır.
- DK SMTP göndərişi giriş, dəvət və şifrə sıfırlama axınlarına bağlandı; göndərilməyən reset maili artıq saxta uğur göstərmir və yararsız tokeni saxlamır.
- Toplu hesab idxalı 37 rəhbər hesabı ilə məhdudlaşdırıldı; 26 personel sətri tarixi referans kimi qorunur, OCAQ giriş hesabına çevrilmir.
- Uzaq daldakı ilk-giriş şifrə dəyişmə məcburiyyəti birləşdirildi; reset linki ilə uğurla dəyişdirilən şifrə ayrıca ikinci dəyişiklik tələb etmir.
- Migration sıra toqquşması aradan qaldırıldı: şifrə sahəsi `0007`, əlavəedici rəsmi forma təməli `0008` oldu.
- Production migration və deploy edilmədi.

Bu faylın formatı [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
əsasındadır və layihə [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
istifadə edir. Girişlər **insan tərəfindən** yazılır (git log-dan avtomatik yox).

## [Unreleased]

### Added
- `src/app/dashboard/checklists/page.tsx` — **Çekirdek akışı tamamlayan görünüm:** bölgə müdiri/filial müdiri göndərilmiş vardiya checklist nəticələrini (filial, vardiya, skor, dolduran, tarix) görür. Rol əhatəsinə görə scoped (region_manager yalnız öz bölgəsi). Əvvəl boş placeholder idi.
- `src/db/schema/checklists.ts` — Created checklists table schema for persisting vardiya checklist responses.
- `src/app/api/checklists/route.ts` — Implemented GET/POST endpoints for checklists with automatic audit logging on submit.
- `src/app/api/audit-logs/route.ts` — Added super_admin restricted endpoint for fetching latest 100 system audit logs.
- `drizzle/migrations/0003_black_whistler.sql` — Generated and pushed database migration for checklists table.

### Changed
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
