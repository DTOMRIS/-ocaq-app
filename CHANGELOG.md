# Changelog

Bu faylın formatı [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
əsasındadır və layihə [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
istifadə edir. Girişlər **insan tərəfindən** yazılır (git log-dan avtomatik yox).

## [Unreleased]

### Fixed
- **🔴 «Nə PRODMIX nə də ÇEK cədvəli tapılmadı» — tarix formatı** (`parse-sales-detail.ts`,
  `detail-upload.tsx`): yükləmə real fayllarla HEÇ İŞLƏMİRDİ.
  - **Səbəb:** parser-lər Python ilə çıxarılmış XAM serial-a (`46235`) qarşı yazılıb
    və test edilib. Brauzerdə isə `sheet_to_json(..., { raw: false })` işlədilir və
    SheetJS tarix formatlı hücrəni **formatlayıb qaytarır**: `'01.08.2026'`.
    Faylların tarix sütunlarının numFmt kodu məhz `dd\.mm\.yyyy`-dir (`BAZA 2026!A`,
    `Baza 2026!B` — fayldan yoxlandı). `Number('01.08.2026')` = NaN → **hər sətir
    atılırdı** → «tapılmadı». Mövcud 22 test bunu tutmadı: hamısı serial verirdi.
  - **Düzəliş (ikiqat):** `excelSerialToISO` artıq serial DA, formatlanmış sətir DƏ
    qəbul edir (`dd.mm.yyyy`, `d.m.yy`, ISO); yükləmə isə `raw: true` işlədir —
    xam dəyər locale-dən asılı deyil.
  - **Belirsiz format TƏXMİN EDİLMİR:** `03/04/2026` həm 3 aprel həm 4 mart ola
    bilər → `null` qaytarılır, sətir atılır və xəbərdarlıq görünür. Təxmin bir
    aylıq datanı səssizcə yerindən oynadardı. Birmənalı hallar (`25/12/2026`)
    oxunur. Təqvimdə olmayan tarix (`31.02.2026`) round-trip yoxlaması ilə rədd edilir.
  - **Doğrulama — REAL FAYLLARLA:** hər iki yol (xam serial + formatlanmış sətir)
    eyni nəticəni verir və sənədlənmiş rəqəmlərlə birebir uyğundur:
    prodmix 39 549 sətir · 7 gün · 29 filial · 431 456 ədəd · **961 237,84 ₼**;
    çek **43 212** · ort. çek **21,30 ₼** · 920 585,71 ₼; 7 avqust fərqi
    **40 652,13 ₼** tutulur. Parser xəbərdarlığı və naməlum ödəniş növü: yoxdur.
  - Regresiya testləri əlavə olundu (38/38 keçir).

### Added
- **📦 Günlük detay yükləməsi — PRODMIX + ÇEK** (`src/app/dashboard/panel/detail-upload.tsx`):
  `/dashboard/panel`-də super_admin üçün ayrıca bölmə (aylıq panel yükləməsinə
  TOXUNMUR — o fayllar ayrı tempdə gəlir). Fayl **brauzerdə** parse olunur
  (Vercel 4,5 MB limiti; 7 günlük fayl 83 361 sətir), nəticə 4000-lik chunk-larla
  `/api/dashboard/analytics/fact-save`-ə göndərilir.
  - **ƏVVƏLCƏ TUTUŞDURMA, SONRA YAZMA:** iki fayl gün-gün müqayisə olunur və
    fərq varsa cədvəldə göstərilir — yazmadan əvvəl. 08.08.2026-da çek faylının
    7 avqustu prodmix-dən 40 652 ₼ əskik idi; bu natamamlıq tək faylın içindən
    GÖRÜNMÜRDÜ (öz ortalamasına yaxın idi), yalnız müqayisədə çıxdı.
  - Parser xəbərdarlıqları, tanınmayan ödəniş növləri, validasiyadan keçməyən
    sətirlər və OCAQ-da tapılmayan filial adları **ekranda göstərilir** — udulmur.
  - Sətir tipi seçimi ad/heuristika ilə təxmin edilmir: hər vərəqə iki parser də
    tətbiq olunur, hansı data qaytarsa o götürülür.
- **Dashboard KPI kartları canlandı** (`src/app/dashboard/page.tsx`):
  `Ortalama Çek`, `Müştəri Sayı`, `Çek Sayı` artıq `analytics_daily_fact`-dən
  real data oxuyur (`payment_type='__day__'` gün cəmi sətri).
  - `Ortalama Çek` = ciro / **unikal** qəbz sayı (son gün) + ay ortalaması alt
    yazıda. Sıfıra bölmə yox → data yoxdursa dürüst `—`.
  - `Müştəri Sayı` = son günün qəbz sayı (istifadəçi təsdiqi: «çek ise müşteri»);
    `Çek Sayı` = ayın cəmi. Eyni mənbə, fərqli dövr — kartlar təkrar deyil.
  - **RBAC:** super_admin şəbəkəni görür; digər rollar yalnız öz filiallarını,
    `branch_id` boş sətirlər onlara GÖRÜNMÜR (hansı filiala aid olduğu təsdiqsizdir).
  - Cədvəl yoxdursa (migration tətbiq olunmayıbsa) dashboard **açılmağa davam
    edir**, kartlar `—` göstərir, səbəb loga yazılır.
- **🛠 Migration tətbiqçisi** (`scripts/apply-migration.mjs`, `npm run db:migrate`):
  `drizzle/migrations/meta/_journal.json` **0007-də donub** → 0008/0009/0010 əl ilə
  yazılmış SQL-dir və `drizzle-kit migrate` onları GÖRMÜR; deploy də migration
  işlətmir. Bu boşluq indi bağlandı:
  - **Standart rejim DRY-RUN** — `--apply` olmadan DB-yə heç nə yazılmır.
  - Destruktiv ifadə (`DROP`/`TRUNCATE`/`DELETE`/`ALTER COLUMN`/`RENAME`) görsə
    **dayanır**; `--allow-destructive` yalnız snapshot-dan sonra.
  - `DATABASE_URL` **loga yazılmır** — yalnız maskalanmış host.
  - Tətbiq `schema_migrations_manual` cədvəlinə qeyd olunur → «hansı migration
    işləyib?» sualı cavabsız qalmır.
  - Sonda doğrulama: hər cədvəlin kolon + indeks sayı.
  - Runbook: `docs/DATA-PROTECTION.md` §3.1 (Neon snapshot addımları daxil).
- **📊 Analitika FACT cədvəlləri — PRODMIX + ÇEK saxlanması** (`drizzle/migrations/0010_analytics_fact_tables.sql`,
  `src/db/schema/analytics.ts`, `/api/dashboard/analytics/fact-save`):
  `analytics_daily_fact` (filial × gün × ödəniş növü) və `analytics_item_fact`
  (filial × gün × məhsul). Blob deyil cədvəl, çünki 7 günlük export **83 361
  sətirdir** (bir ay ≈ 350 000) — JSON-a sığmaz və sorğulanmazdır.
  - **UPSERT, insert deyil:** fayllar hər gün atılır və son gün natamam ola bilər
    (08.08.2026-da çek faylının 7 avqustu prodmix-dən 40 652 ₼ əskik idi, 1–6
    avqust kuruşuna uyğun). `ON CONFLICT DO UPDATE` → təkrar yükləmə gün İKİ DƏFƏ
    saymır.
  - **Chunk daxili təkrar açar toplanır:** Postgres `ON CONFLICT DO UPDATE` eyni
    sətrə iki dəfə toxunanda «cannot affect row a second time» xətası verir.
  - `source` sütunu **yalnız lineage**-dir, oxuma filtri kimi işlədilmir — iyul
    hadisəsində datanı görünməz edən `engine_version` deseninin təkrarı olmasın
    (`docs/DENETIM-2026-08-04.md` §1).
  - Çek sayı gün başına bir dəfə (`payment_type='__day__'`): bir qəbz həm nağd
    həm kart ola bilər, ödəniş növlərinə paylasaydıq müştəri sayı şişərdi.
  - Filial adı OCAQ-da yoxdursa sətir **yenə yazılır** (`branch_id` null) — data
    itmir; cavabda `unmatchedBranches` qaytarılır.
- **`canonBranchKey()`** (`src/lib/analytics/filial-map.ts`): OCAQ `branches.name`
  ↔ iiko export adı müqayisəsi. `'I'.toLowerCase()==='i'` (olmalıydı `'ı'`) və
  `'İ'.toLowerCase()`-in birləşən nöqtə (U+0307) əlavə etməsi — CHANGELOG-da qeyd
  olunan 4× ikiqat saymanın səbəbi — indi regresiya testi ilə qorunur
  (`tests/filial-map.test.ts`, 12 test).
- **🎁 Promosyonlar (marketing) modulu — mock-dan gerçəyə** (`src/db/schema/promotions.ts`,
  `/api/promotions`, `/api/upload/promo-image`, `dashboard/promosyonlar/*`,
  `admin/promosyonlar/yeni`): promotions cədvəli (Neon/Drizzle), CRUD API, R2-yə
  şəkil yüklə (sharp→webp, public URL), DB-bağlı promo grid + QR modal, tam admin form
  (başlıq, tip, endirim, kod, tarix, saat, günlər, lokasyon, şəkil), sidebar 🎁 linki.
- **📥 Toplu Dəvət — email Excel → 34 menecer** (`src/lib/analytics/parse-invites.ts`,
  `/api/invitations/bulk`, `dashboard/team/BulkInviteUpload.tsx`): Shaurma email
  siyahısından 5 bölgə + 29 filial meneceri ayrılır, dryRun önizləmə (e-poçt getmir),
  super_admin göndərir. E-poçt getməsə **accept linkləri** qaytarılır (WhatsApp fallback).
- **🔗 Filialları bölgələrə təyin et** (`/api/branches/assign-regions`): BOLGELER
  xəritəsi ilə hər filialı bölgəsinə təyin edir (region_manager filiallarını görsün).
- **Panel gün-sütunlu format** (`parseDailyWide`): "Satış hesabatı" Müqayisə cədvəli
  (Filial | 01.08 | 02.08 | …) → günlük qrafik; OLAP ödəniş qarışığı ilə birləşir.
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
- **Filial xəritəsi (`filial-map.ts`) — 08.2026 vəziyyəti** (istifadəçi təsdiqi 08.08.2026):
  `Mytcha` İsmayıl bölgəsinə **ayrı filial** olaraq əlavə olundu (`Bulvar Festival`-ın
  başqa yazılışı DEYİL — `docs/VERI-ANALIZI-2026-08-08.md` §2.4-dəki açıq sual bağlandı).
  Yeni `CLOSED` çoxluğu (`Masazır`, `Bulvar Festival`) və `isActiveBranch()`:
  bağlanmış filial «aktiv» sayılmır, **amma xəritədən silinmir** — tarixi ciro
  YoY-da lazımdır. `EXCLUDE` («bizim olmayan») ilə qarışdırılmır. Aktiv filial: 29.
  ⚠️ `Mytcha` OCAQ-da filial kimi yaradılmayıb → `/api/branches/assign-regions`
  onu `unmatchedBranches`-də qaytaracaq (sındırmır); `/admin/filiallar`-da açılmalıdır.
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
- **🔴 KÖK: 32 əsas düymə GÖRÜNMƏZ idi — `--ocaq-red` təyinatı itmişdi**
  (`src/app/globals.css`): kodda `var(--ocaq-red)` **145 yerdə, 19 faylda** istifadə
  olunur, lakin `:root`-da təyin edilməmişdi. Təyin olunmamış custom property
  "invalid at computed-value time"-dır → `background-color` miras alınmadığı üçün
  initial dəyərə (`transparent`) düşür. `bg-[var(--ocaq-red)]` + `text-white`
  **32 yerdə birlikdə** işlənir → ağ üzərində ağ. Ən kritik nümunə:
  `vardiya-checklist/page.tsx:425` **"Checklistı Göndər"** düyməsi, üstəlik
  `bg-white/95` sticky footer-in içində (`:414`) — filial müdiri KXT-ni doldurub
  görünməyən düyməyə basırdı. Həmçinin növbə seçicisi (`:236,246`) seçili halı
  göstərmirdi (istifadəçi TƏRSİNİ görürdü), dashboard CTA (`page.tsx:54`),
  "Toplantını tamamla" (`vardiya-liderliyi:156`), kasa/fire/haccp/bildirişlər/
  ekipman göndər düymələri, 40 × görünməz kənarlıq, 7 × itmiş mətn,
  `focus:ring` fokus görünürlüyü. Dəyər `#C8102E` — kod boyu **137 yerdə**
  hardcode edilmiş rəngin eynisi (`#E11D48`: 0 yer), yəni yeni vizual qərar deyil.
  Regressiya: `278e1f6`-da təyinat var idi, sonra itib.
- **Mobil: iOS fokus zoom-u bütün tətbiqdə bağlandı** (`globals.css`, yalnız
  ≤767px): iOS Safari 16px-dən kiçik sahəyə fokusda səhifəni məcburi
  yaxınlaşdırır və `blur`-da geri qaytarmır. Əvvəl düzəliş yalnız **bir** faylda
  vardı (`sales-client.tsx:259`); 7 ayrı input sistemi 12–14px qalırdı — KXT
  "Qeyd" sahələri (12px), filial seçici (12px), növbə liderliyi (~12 sahə, 14px),
  team/profile/regions/complaints/panel (13px), kasa banknot sayımı (14px).
  100+ maddəli formada hər qeyddə ekran sıçrayırdı. Masaüstü görünüş dəyişmir.
- **Mobil: `viewport` export-u əlavə edildi** (`src/app/layout.tsx`): `viewport`
  export-u yox idi → `viewport-fit=cover` göndərilmirdi → `env(safe-area-inset-*)`
  0px-ə həll olunurdu. Halbuki o kod **artıq yazılmışdı**
  (`vardiya-checklist/page.tsx:414`, `haccp/page.tsx:218`) — nəticədə çentikli
  iPhone-larda əsas düymə home indicator zonasına düşürdü. `user-scalable`/
  `maximum-scale` **qoyulmadı** (WCAG 2.1). Yan təsir bağlandı: `cover` üfüqi
  safe-area-nı da açdığı üçün `.dashboard-main` yan padding-lərinə
  `env(safe-area-inset-left/right)` əlavə edildi (landscape).
- **KÖK: Prod DB migration drift (0005/0007/0008) tətbiq edildi** — Drizzle hər
  `insert`/bare-`select`-də ŞEMANIN BÜTÜN kolonlarını yazır; prod-da 0005/0008 kolonları
  (invitations.revoked_at/source/replaces_manager_id, branches.version, users.must_change_password,
  tenants.provisioned_*) yox idi → ~15 sorğu 500 verirdi (dəvət qəbul, filial müdür atama,
  Filiallar, tək dəvət...). `scripts/migrate-prod.mjs` ilə additiv tətbiq → hamısı düzəldi.
- **RBAC sızıntısı bağlandı** (`dashboard/panel/page.tsx`): branch/region müdiri bütün
  şəbəkənin cirosunu görürdü. İndi rol-scoped (accessibleBranchIds); aqreqatlar əlçatan
  filiallara görə yenidən hesablanır.
- **self-HTTP-fetch → birbaşa DB** (`lib/request-origin.ts` + team/page.tsx): `getRequestOrigin`
  VERCEL_URL (*.vercel.app) istifadə edirdi → auth cookie custom domenə bağlı → 401 → boş
  data ("Serverlə əlaqə qurulmadı"). İndi request host öncəlikli; Komanda birbaşa DB.
- **Email**: RESEND_API_KEY varsa Resend (SMTP qurulmasa da); Resend uğursuzsa SMTP-yə
  düşür (sınmış key hər şeyi bloklamırdı); BASE prod domeninə (NEXTAUTH_URL prod-da yox idi).
- **Bölgə eşleşməsi** (bulk invite + region-assign): "İsmayıl bölgəsi" ⊇ "İsmayıl"
  (canon-includes); İ/ə harf-katlama.
- **Ay sonu proqnozu** artıq sabit 31 deyil ayın gerçək gün sayı (parseDaily + panel).
- **CƏMİ (böyük İ) TOTAL-a tutmurdu** → gün-sütunlu formatda çift sayım (4×) → İ-normalize.
- Gündəlik satış dedupe (çift kayıt 2 dəfə sayılmasın); panel-save xətası görünür;
  yükləmə sonrası dropdown refresh; Əcəmi lookbehind (toplu hədəf).
- **Mobil**: iç-içə `<main>`→`<div>` (a11y + genişlik), grid `auto-fit`, iOS input 16px
  (zoom), üfüqi padding azaldıldı.
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
