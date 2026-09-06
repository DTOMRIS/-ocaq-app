# OCAQ — növbəti agent üçün devir sənədi

> ⚠️ **Bu faylın 2-ci və sonrakı bölmələri 16 İYUL 2026 vəziyyətini yazır və
> KÖHNƏLİB** (budaq adı, Preview Neon müddəti və s. artıq doğru deyil).
> Onlar tarixi qeyd kimi SAXLANILIR, silinmir. **Güncel vəziyyət aşağıdakı
> «0» bölməsindədir — əvvəlcə onu oxu.**

---

## 0. GÜNCEL VƏZİYYƏT — 06.09.2026

### 0.1 Kod haradadır

| | |
|---|---|
| GitHub | `DTOMRIS/-ocaq-app` |
| Aktiv budaq | `claude/ocaq-deploy-modules-dccn6v` |
| `main` | **eynidir** — budaq `main`-ə push olunub |
| Son commit | `adee61d` |
| Deploy | `main` → Vercel avtomatik Production |

⚠️ Yuxarıdakı köhnə bölmədə yazılan `codex/shift-leadership` budağı və
`/Volumes/NO NAME/...` lokal yolları **ARTIQ AKTUAL DEYİL**.

### 0.2 Əvvəlcə nə oxunmalı (bu sıra ilə)

1. `CLAUDE.md` — iş prinsipləri, qırmızı xətlər
2. `AGENTS.md` — silmə qadağası (KPI paneli, route-lar, sidebar)
3. **`CHANGELOG.md` → «Unreleased» → «📋 DEVİR» bölməsi** — bu sessiyanın tam
   xülasəsi, ölçülmüş rəqəmlər və açıq maddələr
4. `docs/MUSAVIR-REYI-CASHFLOW-2026-08.md` — Cash Flow təhlili (iş sənədi)

### 0.3 İşə başlama

```bash
git clone https://github.com/DTOMRIS/-ocaq-app
cd -ocaq-app
git checkout claude/ocaq-deploy-modules-dccn6v
npm install        # ⚠️ `npm ci` DEYİL — aşağıdaki `xlsx` qeydinə bax
npm test           # 195/195 keçməlidir
npx tsc --noEmit   # təmiz olmalıdır
```

⚠️ **`xlsx` paketi npm-də DEYİL** — `https://cdn.sheetjs.com/...tgz`-dən çəkilir.
Bəzi mühitlərdə (proxy arxasında) bu ünvan bloklanır və `npm install` sınır.
Belə halda paketi müvəqqəti `package.json`-dan çıxarıb quraşdır, sonra
**mütləq geri qaytar** — `commit`-ə düşməməlidir.

### 0.4 Bu sessiyada dəyişən fayllar

```
src/lib/analytics/parse-iiko-reports.ts      ← sütun lüğəti (V), AZ/EN/TR
src/lib/analytics/parse-sales-detail.ts      ← excelSerialToISO: Date dəstəyi
src/app/dashboard/panel/detail-upload.tsx    ← çox fayl seçimi (iikoList)
src/app/dashboard/panel/hourly-upload.tsx    ← süpürmə (sweep) axını
src/app/dashboard/panel/page.tsx             ← fakt tarixi + əhatə
src/app/dashboard/panel/panel-client.tsx     ← başlıqda əhatə göstərilir
src/app/api/dashboard/analytics/fact-save/route.ts      ← sweepDays rejimi
src/app/api/dashboard/analytics/deletion-save/route.ts  ← sweepDays rejimi
tests/parse-iiko-reports.test.ts             ← 183 → 195 test
CHANGELOG.md · docs/MUSAVIR-REYI-CASHFLOW-2026-08.md
```

### 0.5 🔴 BİRİNCİ İŞ — avqust datası bazaya yazılmayıb

Panel `analytics_daily_fact`-dan oxuyur; orada hələ **11.08.2026-da yüklənmiş
24 günlük** data var (**2 978 124 ₼**). Avqust satış faylı yüklənməlidir.

**Gözlənilən nəticə (real fayl ilə ölçülüb):**
**31 gün · 3 833 665,55 ₼ · 188 578 çek · ort.çek 20,33 ₼**

Kodda tıxanma **YOXDUR** — parse → `hourly-save` → `hourlyToDailyFacts` →
`fact-save` → `factsToPanel` zənciri uçdan-uca ölçülüb, ciro və çek sayı
dəyişmir, bütün çağırış limitləri (15/2/18) `MAX_ROWS` altındadır.

### 0.6 Fayllar (iiko/bank ixracları) REPODA DEYİL

`.xlsx` faylları istifadəçinin özündədir, kod bazasına qoyulmayıb (məxfi
əməliyyat datası). Yenidən iş görmək üçün istifadəçidən istənilməlidir:

| Fayl | Nə üçün |
|---|---|
| «Doğan Tomris Rapor Satış» (aylıq/günlük) | saatlıq + günlük satış |
| «DT Məhsul sayı və qiyməti» | menyu analizi |
| «Silinmə hesabatı» | kassa nəzarəti |
| «CASH FLOW» | kassa/banka mutabakatı (hələ qurulmayıb) |

### 0.7 Açıq maddələr

Tam siyahı `CHANGELOG.md` → «📋 DEVİR» → «AÇIQ QALANLAR» bölməsindədir
(8 maddə). Ən vacibləri:

1. Avqust datasının yüklənməsi (§0.5)
2. Süpürmə (`sweepDays`) yalnız SQL səviyyəsində doğrulanıb — avtomatik testə
   bağlanmayıb (PGlite proxy-də bloklanır, Neon test budağı lazımdır)
3. `Seabreeze` məhsul hesabatında ÜMUMİYYƏTLƏ yoxdur — 24.08-də #1 filial idi
   (10 576,25 ₼). iiko tərəfində düzəldilməlidir
4. Cash Flow inteqrasiyası: təhlil edilib, qurulmayıb
5. Menyu/Food Cost «Maya dəyəri» saxlanması — başlanmayıb

### 0.8 Bu sessiyanın metod qeydi (təkrarlanmasın deyə)

- **`azFold` ı/İ/I/i → «i» çevirir.** Naxışlar fold-dan SONRAKI mətnə yazılır
  (`satılıb`→`satilib`, `sayı`→`sayi`). Bu tələyə **üç dəfə** düşüldü.
- **`sqlClient.query()` SƏTİR MASSİVİNİ birbaşa qaytarır**, `{ rows }` deyil.
- **SheetJS `range` rəqəm verilsə vərəqin HAMISINI oxuyur** — obyekt ver.
- Hər dəyişiklikdən sonra `next build` işlət: `tsc` təmiz olsa da build sına
  bilər (bir dəfə oldu, deploy sındı).

---

## 1. Doğru kod mənbəyi

- Lokal qovluq: `/Volumes/NO NAME/codelar/ocaq-app-current`
- GitHub: `DTOMRIS/-ocaq-app`
- Aktiv budaq: `codex/shift-leadership`
- Feature başlanğıc commit-i: `c1167eb`
- Köhnə qovluq: `/Volumes/NO NAME/codelar/ocaq-app`

Köhnə qovluqda istifadəçiyə aid qarışıq və commit edilməmiş fayllar var. Onu silmək, sıfırlamaq, üzərinə yazmaq və ya avtomatik merge etmək qadağandır.

## 2. İşə başlama komandaları

```bash
cd "/Volumes/NO NAME/codelar/ocaq-app-current"
git status
git log -1 --oneline
git pull --ff-only
npm ci
npm test
npm run typecheck
```

Next.js kodu dəyişməzdən əvvəl `node_modules/next/dist/docs/` daxilində uyğun Next.js 16.2.9 sənədini oxu.

## 3. Deploy və məlumat arxitekturası

### Production

- URL: `https://ocaq-app.vercel.app`
- Real 30 filial məlumatını istifadə edir.
- Bu devir zamanı Production kodu və Production bazası dəyişdirilməyib.
- İstifadəçinin ayrıca, açıq təsdiqi olmadan Production deploy/migration etmək olmaz.

### Preview

- Budaq aliası: `https://ocaq-app-git-codex-shift-leadership-dtomris-projects.vercel.app`
- Vercel Preview protection aktivdir; baxmaq üçün Vercel hesabına giriş tələb oluna bilər.
- Vercel Preview `DATABASE_URL` ayrıca Neon `preview-codex` budağına bağlıdır.
- Neon project: `ocaq-app` (`weathered-fog-09766136`).
- Preview branch ID: `br-fancy-wave-as490qik`.
- Preview branch son istifadə tarixi: `23 iyul 2026, 23:59:59 UTC`.

Preview Production-dan yaradıldığı andakı snapshot-dır. Preview-da yazılan məlumat Production-a getmir; Production-da sonradan dəyişən məlumat da Preview-a avtomatik gəlmir.

Əməkdaşın ayrıca təlim portalına keçidini aktiv etmək üçün Vercel mühitində `TRAINING_PORTAL_URL` dəyişəni tam `https://...` ünvanı ilə təyin edilir. Dəyişən yoxdursa əməkdaşa saxta və ya təxmin edilən link göstərilmir; filial müdürü ilə əlaqə mesajı görünür.

Heç bir connection string, parol və token bu sənədə və ya kod bazasına əlavə edilməməlidir. Mühit dəyişənləri Vercel/Neon daxilində saxlanılır.

## 4. Tamamlanan işlər

- Tenant–region–filial əsaslı mərkəzi icazə nəzarəti
- Staff, şikayət, satış, istifadəçi, filial və region IDOR qoruması
- Təhlükəsiz dəvət yaratma, yenidən göndərmə, ləğv və qəbul axını
- Şifrə dəyişdikdən sonra köhnə JWT sessiyasının ləğvi
- Real növbə liderliyi: filial, tarix, növbə, 5 dəqiqəlik görüş, tapşırıqlar, devir notu
- Əl yuma, porsiya/gramaj, xidmət və tövsiyəli satış fokusları
- Minimum 5 müştəri söhbəti qeydi
- Real və qalıcı bildirişlər: auditoriya, alıcı qeydi, oxundu/təsdiqləndi vəziyyəti
- Manager-scope KXT checklist, server skoru və idempotency
- Foto decode/ölçü yoxlaması, WebP çevirmə və private R2 yazma
- Mobil dashboard drawer və əsas mobil düzəlişlər
- Hardkod satış rəqəmləri və `localStorage` saxta parametrləri silinib
- Mock Logbook/Təqvim route-ları real axınlara yönləndirilib
- Preview migration tətbiq və şema səviyyəsində yoxlanıb

Ətraflı məhsul qəbul qaydası: `docs/PRODUCT-COMPLETION-CONTRACT.md`.

## 5. Son doğrulama vəziyyəti

- Checklist testləri: 8/8 keçib
- TypeScript: keçib
- ESLint: 0 error; mövcud performans/unused warning-ləri qalır
- Next.js production build: keçib
- Preview deployment: Ready
- Preview `/login`: HTTP 200
- Oturumsuz `/api/notifications`: HTTP 401
- Etap 1 authenticated rol qəbulu: 56/56 keçib
- Etap 2A filial yaşam dövrü + KXT runtime qəbulu: 51/51 keçib
- Preview `0005_branch_lifecycle` tətbiq edilib; Production tətbiq edilməyib
- Bağlanmış test tenantlarındakı 8 arxiv filialı auditli təmizlənib; Preview preflight nəticəsi formatdan kənar kod 0, etibarsız müdür bağı 0-dır
- Dörd müvəqqəti rol hesabı pasivləşdirilib, üç test filialı arxivlənib və test
  tenantı bağlanıb
- Production deploy, migration və məlumat yazısı edilməyib

## 6. Açıq qalan işlər

1. Preview Neon budağının müddətini 23 iyuldan əvvəl uzatmaq və ya testi tamamlayıb qərar vermək.
2. Etap 2B müdür atama/dəvət devrini `docs/ETAP-2-PLAN.md` qəbul qapıları ilə həyata keçirmək.
3. TQTA portalından əvvəlki gün dərsə girən/tamamlayan əməkdaşları avtomatik gətirən inteqrasiya. Hazırda növbə ekranındakı təlim sayları manual daxil edilir.
4. DK SMTP dəyişənlərini Vercel-ə qoşmaq və dəvət/reset mailini Preview-da yoxlamaq.
5. HACCP, avadanlıq, kasa, HR, fire/itki və satış təxmini modullarını field-by-field tamamlamaq; mock/local state borcunu aradan qaldırmaq.
6. Mövcud GitHub credential-da `workflow` scope olmadığı üçün əlavə edilə bilməyən CI workflow-unu səlahiyyətli hesabla ayrıca əlavə etmək.
7. Production migrationdan əvvəl `0004_bent_mojo.sql` üçün real DB data audit və backup planı hazırlamaq.
8. İstifadəçi təsdiqindən sonra PR review, `main` merge və Production deploy.

## 7. Dəyişməz məhsul prinsipləri

- Dil Azərbaycan dilidir və imla yoxlanmalıdır.
- Müdür müfəttiş deyil; motivasiya edən rol model və növbəyə hakim liderdir.
- Xəstə işçi/CDC mövzusu bu scope-dan istifadəçinin açıq göstərişi ilə çıxarılıb; yenidən əlavə etmə.
- TQTA Shaurma yalnız nümunədir; OCAQ reposuna və məlumat modelinə qarışdırma.
- “Seç, yaz, göndər” əməliyyatı havada qala bilməz: server yazısı, alıcı, status, audit, xəta və mobil nəticə tam olmalıdır.
- Mock KPI, localStorage saxta save, boş düymə və yalnız brauzerdə yaşayan data qəbul edilmir.
- İstifadəçinin xəbəri olmadan səhifə quruluşunu və mövcud real funksiyanı dəyişmə.
