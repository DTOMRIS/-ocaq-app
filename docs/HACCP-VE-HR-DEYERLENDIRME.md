# HACCP sənədləri + HR modulu — dəyərləndirmə və təklif

Tarix: 8 avqust 2026 · Mənbə: iki Google Drive qovluğu (oxundu) + OCAQ kodu

---

## 1. Nə oxundu

**Qovluq A — TQTA / Shaurma University təlim materialı** (48+ fayl)
Təlim Yolu Standartı · Ortaq Təməl A/B/C (qida təhlükəsizliyi, iş
təhlükəsizliyi, oriyentasiya) · TIP1–TIP5 modulları · **10 stansiya modulu**
(Şaurma Döner, Fırın, Fri, Salat, Bar-Barista, Kassa, Qabyuyan, Xadəmə,
Ofisiant, Çatdırılma) · **10 «Manager Audit Kartı»** (hər stansiya üçün) ·
SOP Şikayət Proseduru · Mizanplas (bıçaq/kəsim) · İdarəetmə Hesabatı

**Qovluq B — HACCP qeydiyyat formaları** (14 unikal forma, `SH-KN-F-xxx`)

| Sənəd № | Forma | Dövr |
|---|---|---|
| F-002 | Məhsulların anbara qəbulu | — |
| F-006 | Frityür yağının dəyişilməsi | — |
| F-008 | Temperatur və nəmlik | 1 aylıq |
| F-011 | Təmizlik nəzarəti | 1 aylıq |
| F-015 | Uyğunsuz məhsul aktı | — |
| F-017 | İşçilərin gigiyenik nəzarəti | **5 günlük** |
| F-018 | İstehsala gələn ziyarətçilər | — |
| F-020 | Sobada bişirmə temperaturu (**min 250 °C**) | **10 günlük** |
| F-028 | Dondurucu/Soyuducu temperaturu | 1 aylıq |
| F-034 | İzləmə forması × 5 (Şaurma, Pizza, Bükmə, Pide, Lahmacun) | 1 aylıq |
| F-035 | Defrostasiya qeydiyyatı | 1 aylıq |
| F-037 | Şaurmanın servis temperaturu | 1 aylıq |
| F-040 | Şorba və salat temperaturu | **6 günlük** |
| F-041 | Bişmiş şaurma şişinin temperaturu | 1 aylıq |

Hamısı `Reviziya № 01 · 23.07.2026` — yəni e-poçtda deyilən revizə tətbiq
olunub, tarixlər uyğundur. ✔

---

## 2. Sənədlərdə tapılan problemlər

### 2.1 🔴 F-035 Defrostasiya HEÇ BİR vəzifə qovluğuna aid edilməyib
E-poçtdaki 5 qovluq bölgüsündə (Menecer / Şaurmaçı / Fırınçı / Mətbəx /
Ofisiant) **Defrostasiya forması yoxdur** — halbuki qovluqda mövcuddur və
1 aylıqdır. Defrost qida təhlükəsizliyində kritik nöqtədir (soyuq zəncir).
**Kimin dolduracağı təyin edilməlidir** — ehtimal: Mətbəx işçisi və ya Menecer.

### 2.2 🟠 «Yeməklərin servis temp NF» qovluqda YOXDUR
E-poçt Mətbəx işçisinə üç forma verir: Şorba/salat temp (F-040), **Yeməklərin
servis temp**, Frityür yağı (F-006). Amma qovluqdaki F-040 *qəbulda* şorba və
salat temperaturudur — *servis* deyil. Ya forma əskikdir, ya da ad səhvdir.

### 2.3 🟠 7 təkrar fayl — səhv nüsxə çap riski
Eyni forma iki dəfə, biri `[n]` sonluqlu (fayl ölçüləri EYNİ → həqiqi
dublikat): F-002`[19]`, F-006`[3]`, F-011`[87]`, F-015`[1]`, F-017`[67]`,
F-018`[40]`, F-035`[25]`.
Risk: filial səhvən köhnə/təkrar nüsxəni çap edir. **Dublikatlar silinməlidir.**

### 2.4 🔴 F-017-də işarə məntiqi TƏRSDİR — və nəticəsi ağırdır
Formanın öz qeydi:
> «(−) uyğundur, (+) uyğunsuzluq aşkar edilmişdir. (+) nəticəsi qeydə
> alındıqda, **işçi uyğunsuzluq aradan qaldırılanadək iş sahəsinə
> buraxılmamalıdır**.»

İki problem:
1. **İntuisiyaya ziddir.** Tələsik dolduran adam «yaxşıdır» deyə (+) qoyar.
   Kağızda bunu tutmaq mümkün deyil.
2. **Bu bloklayıcı bir qərardır** — işçinin işə buraxılmaması. Hüquqi və
   əməliyyat ağırlığı olan qərar, tərs simvolla kağıza yazılır və heç yerdə
   toplanmır. Bir filialda 5 gündə nə qədər (+) çıxdığını kimsə bilmir.

### 2.5 🟡 Dörd fərqli dövr — kağızda izlənməsi çətin
5 günlük · 6 günlük · 10 günlük · 1 aylıq. Yəni «hansı forma bu gün
doldurulmalıdır?» sualının dörd fərqli cavabı var. Kağızda bunu izləmək
demək olar ki mümkün deyil; proqramda trivialdır.

---

## 3. Soruşulan üç nəzarət

### CO₂ qazı nəzarəti — **HACCP formalarında YOXDUR**
Amma **Saha Nəzarət Matrisində var**: «Bar və Qəhvə» bloku (CO₂) + ayrıca
P0 hökmü — *havalandırma + gövdənin 2/3-dən zəncir + kaymaz altlıq + sensor*,
«zəncir devrilməni həll edir, boğulmanı yox — sensör şərtdir».

**Qiymətləndirmə:** bu bölgü səhvdir. Saha Nəzarət **15 günlük dövri** audit;
CO₂ sızması isə **can təhlükəsi**dir və 15 gün gözləyə bilməz.
**Təklif:** CO₂ ayrıca **gündəlik/həftəlik avadanlıq yoxlaması** olmalıdır
(balon bağlıdır? zəncir yerindədir? havalandırma işləyir? sensor yaşıldır?) —
və hər «xeyr» dərhal P0. Yeni forma: `SH-KN-F-0xx CO₂ balon təhlükəsizliyi`.

### Z salfet istifadəsi — **heç bir formada yoxdur**
Bu **sərfiyyat** qeydidir, HACCP nəzarəti deyil. Doğru yeri: sərf materialı
istifadəsi (kağız, salfet, qablaşdırma) — filial müqayisəsi üçün faydalıdır
(bir filial digərinin 3 qatı salfet işlədirsə səbəbi var).
⚠️ **Netləşdirilməli:** «Z salfet» sərf materialıdır, yoxsa kassanın Z-raportu?
İkisi tamamilə fərqli iş.

### Günlük personel iclası — **OCAQ-da ARTIQ VAR**
`/dashboard/vardiya-liderliyi` — 5 dəqiqəlik iclas, tapşırıqlar, devir notu,
5 müştəri söhbəti. Yəni bu əskik deyil.
**Əskik olan:** iclas HACCP/gigiyena ilə BAĞLI DEYİL. Halbuki F-017 hər 5 gündə
vəzifə üzrə gigiyena yoxlayır — bu, iclasın təbii ilk maddəsidir.
**Təklif:** növbə iclası ekranına «bugünkü gigiyena nəzarəti» blokunu bağla →
bir yerdə doldurulsun, iki dəfə iş olmasın.

---

## 4. HR modulu (`/dashboard/hr`) — vəziyyət

| Səhifə | Vəziyyət |
|---|---|
| `/dashboard/staff` (Personel idarəetməsi) | ✅ **Real** |
| `hr/mezuniyyet` (Məzuniyyət) | ⏳ 14 sətir, «Hazır deyil» |
| `hr/sanitar` (Sanitar sənəd) | ⏳ 14 sətir, «Hazır deyil» |
| `hr/oryentasiya` (Oryentasiya) | ⏳ 14 sətir, «Hazır deyil» |
| `hr/sinaq` (Sınaq müddəti) | ⏳ 14 sətir, «Hazır deyil» |

**Vacib qeyd:** bu səhifələr sınıq DEYİL — bilərəkdən dürüst placeholder-dir.
`docs/FORM-REALITY-AUDIT.md`-ə görə əvvəl saxta formalar vardı (alert ilə
«saxlanıldı» deyən, bazaya yazmayan) və onlar **qəsdən çıxarılıb**. Yəni HR
«pozulmuş» deyil, «hələ qurulmamış»dır. Bu doğru qərar olub.

### Ən dəyərli tapıntı: HACCP formaları HR-in əskik datasını VERİR
- **F-017** (vəzifə üzrə gigiyena, 5 günlük) = faktiki **gündəlik HR uyğunluq
  qeydi**. Kim işə buraxılmadı, niyə, nə vaxt — hamısı burada.
- **Sanitar sənəd izləmə** = `staff_profiles`-da sənəd nömrəsi + bitmə tarixi +
  xatırlatma. Cədvəl artıq var (`src/db/schema/staff.ts`), sahə əlavəsi kifayət.
- **Oryentasiya** = Qovluq A-dakı `Ortaq Təməl C - Oriyentasiya` + stansiya
  modulları = hazır müfredat. Yəni məzmun var, izləmə yoxdur.
- **Sınaq müddəti** = `Manager Audit Kartı` (10 stansiya) = hazır
  dəyərləndirmə aləti.

→ HR-i boş qabıq kimi qurmaq səhv olar. **HR gündəlik qeydlərin İSTEHLAKÇISI
olmalıdır**, ayrıca forma toplusu deyil.

---

## 5. Əsas təklif: 14 forma → 1 mühərrik

### Niyə 14 ayrı ekran YANLIŞ olar
14 formanın hamısı **eyni formadadır**:
`filial × tarix × (obyekt/vəzifə) × ölçü və ya nəticə × imza`
14 ayrı səhifə = 14 ayrı baxım yükü + hər birinin öz silosu. Analitikada
məhz bu səhv baş verdi (bax `docs/DENETIM-2026-08-04.md` §1: dörd yazıcı,
bir oxucu → iyul «itdi»).

### Doğru model — və yarısı ARTIQ YAZILIB
Saha Nəzarət üçün qurduğum desen birebir buna uyğundur
(`src/data/saha-nezaret-matrix.ts` + `src/lib/saha-nezaret.ts`, 21 test):

```
Bir kataloq        →  hər forma bir TƏYİNAT (sahələr, hədd, dövr,
                      məsul vəzifə, P0-dırmı)
Bir cədvəl         →  filial × tarix × forma × cavablar (JSON deyil, sətir)
Bir submit API     →  server doğrulaması + hədd yoxlaması + audit
Bir mobil UI       →  telefon üçün bir dəfə hazırlanır, 14 formaya işləyir
Bir P0 reyestri    →  hədd pozuntusu → sahib + son tarix → bağlanana qədər izlə
```

### Kağızın EDƏ BİLMƏDİYİ dörd şey (əsl qazanc)
1. **Hədd pozuntusu dərhal görünür.** F-020 «min 250 °C» deyir. Kağızda 240
   yazılsa heç nə olmur. Proqramda → dərhal P0, bölgə müdirinin ekranında.
2. **«Doldurulmadı» ilə «problem yoxdur» ayrılır.** Saha Nəzarət motorundaki
   `Bal = Bəli ÷ (Bəli + Xeyr)` qaydası — «Baxılmadı» bala girmir. Kağızda boş
   qalan sətir «problemsiz» görünür.
3. **Dövr izlənməsi avtomatik.** 5/6/10/30 günlük — sistem «bu gün nə
   doldurulmalıdır» deyir, insan yadda saxlamır.
4. **Çap xərci sıfır.** E-poçtun öz səbəbi bu idi: *«A4 çap xərclərinin və
   kağız sərfiyyatının azaldılması»*. Rəqəmsallaşma bunu tamamilə bitirir —
   revizənin hədəfi tam olaraq buradan qazanılır.

### F-017 tərs işarə problemi proqramda YOX OLUR
Kağızda (−)/(+) qarışır. Ekranda **«Uyğundur / Uyğunsuzluq var»** yazılır —
qarışdırmaq mümkün deyil. Və «uyğunsuzluq var» seçilən an sistem xatırladır:
*«bu işçi uyğunsuzluq aradan qaldırılanadək iş sahəsinə buraxılmamalıdır»* +
P0 açılır + kim həll etdi qeydə alınır.

---

## 6. Sıra (təklif)

**P0 — sənəd təmizliyi (proqram tələb etmir, bu gün ediləbilər)**
1. 7 dublikat faylı sil
2. F-035 Defrostasiya-nı bir vəzifə qovluğuna təyin et
3. «Yeməklərin servis temp NF»-i tap və ya adını düzəlt
4. CO₂ üçün ayrıca gündəlik/həftəlik yoxlama forması yarat (P0 statuslu)

**P1 — mühərrik (mövcud Saha Nəzarət kodunun üstünə)**
5. `qeydiyyat_formalari` cədvəli + submit API + mobil UI
6. İlk 3 forma: **F-017 gigiyena** (gündəlik, bloklayıcı), **F-020 soba temp**
   (hədd 250 °C), **F-028 soyuducu temp** — üçü də ən yüksək riskli
7. Növbə iclası ekranına gigiyena blokunu bağla

**P2 — qalan 11 forma + HR bağlantısı**
8. Qalan formalar kataloqa əlavə (kod dəyişmir, yalnız təyinat)
9. `hr/sanitar` → `staff_profiles`-a sənəd nömrəsi + bitmə tarixi + xatırlatma
10. `hr/oryentasiya` → Qovluq A müfredatı + tamamlama izləmə
11. `hr/sinaq` → Manager Audit Kartı (10 stansiya) dəyərləndirmə forması

---

## 7. Netləşdirilməli suallar

1. **«Z salfet»** sərf materialıdır, yoxsa kassa Z-raportu?
2. **«Yeməklərin servis temp NF»** mövcuddur, yoxsa yazılmalıdır?
3. **F-035 Defrostasiya** kimin məsuliyyətindədir?
4. Formalar rəqəmsallaşdıqda **kağız tamamilə dayandırılacaq**, yoxsa müvəqqəti
   paralel gedəcək? (Auditor kağız tələb edirsə ikisi bir müddət yanaşı olmalı.)
5. **Şaurma_N1_Saha_Nezaret_Matrisi.xlsx** — 77 kontrolun mətni hələ gözlənilir;
   o gəlsə Saha Nəzarət modulu tamamlanır və bu mühərrikin ilk istifadəçisi olur.

---

_Qeyd: Drive faylları oxundu (mətn səviyyəsində); F-017 və F-020 tam sahə
strukturu ilə incələndi, qalanları başlıq/dövr səviyyəsində. OCAQ kodu
`fayl:sətir` ilə yoxlanıldı. Heç bir fayl dəyişdirilməyib._
