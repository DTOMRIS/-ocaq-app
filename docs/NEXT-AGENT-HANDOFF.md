# OCAQ — növbəti agent üçün devir sənədi

Son yenilənmə: 16 iyul 2026, Bakı vaxtı.

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
4. Resend/e-poçt servisini real Vercel dəyişənləri ilə qoşmaq və dəvət/reset mailini yoxlamaq.
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
