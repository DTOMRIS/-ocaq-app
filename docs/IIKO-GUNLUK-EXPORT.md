# iiko → OCAQ günlük export spesifikasiyası

> Bu sənəd **analitika şöbəsinə verilir**. Məqsəd: OCAQ portalının hər gün
> avtomatik oxuduğu faylın dəyişməz «müqaviləsi» olsun — sütun adları sabit
> qalsın, qalan hər şey azad olsun.
>
> Yükləmə yeri: **OCAQ → Günlük Panel → 📦 Günlük detay**
> Son yoxlanma: 10.08.2026 (01–07 avqust datası + `total satış` faylı ilə
> uçdan-uca doğrulandı — bax §7.5)

---

## 1. Qərar: BİR fayl, İKİ vərəq (tək cədvəl DEYİL)

«Tək fayl atıb işi bitirək» sualının cavabı: **bəli, bir fayl** — amma içində
**iki vərəq** olmalıdır. Hər ikisi eyni workbook-da gələ bilər, OCAQ faylın
bütün vərəqlərini avtomatik tarayır və hansının hansı olduğunu **özü tapır**.

| Vərəq | Nə verir | Bunsuz nə itir |
|---|---|---|
| **A — MƏHSUL** (prodmix) | məhsul bazlı ədəd və ciro | menyu mühəndisliyi, upsell, məhsul analizi |
| **B — ÇEK** (ödəniş şərtləri) | qəbz nömrəsi və ödəniş növü | **çek sayı, ortalama çek**, ödəniş qarışığı, delivery payı |

### Niyə iki vərəq, tək düz cədvəl deyil

Bunu birləşdirmək cazibədar görünür, lakin **iki müstəqil mənbə bizim yeganə
səhv tutucumuzdur**:

- 07.08.2026-da məhsul hesabatı ilə ödəniş hesabatı arasında **40 652 ₼ fərq**
  var (169 845 ₼ vs 129 193 ₼), 01–06 avqust isə kuruşu kuruşuna uyğundur.
- Bu fərq **heç bir faylın öz içindən GÖRÜNMÜR** — hər ikisi öz daxilində
  normal görünür. Yalnız **iki hesabat tutuşdurulanda** çıxır.
- ⚠️ Bu fərqin səbəbi **natamam export DEYİL** (10.08-də alınmış `total satış`
  faylı ilə yoxlandı — bax §7.5). Səbəb hələ araşdırılır; önəmli olan budur ki
  **tutuşdurma olmasa fərq heç vaxt görünməzdi**.

İki vərəq gəldikdə OCAQ hər günü **gün-gün tutuşdurur** və fərq varsa yazmadan
əvvəl ekranda göstərir. Tək cədvələ keçsək bu qoruma yox olur.

Əlavə risk: bir qəbz **hissə-hissə ödənə bilər** (bir qismi nağd, bir qismi
kart). Məhsul və ödəniş sətirlərini tək cədvəldə birləşdirsək həmin qəbzin
məhsulları **iki dəfə** sayılar. Ayrı vərəqlərdə bu problem yoxdur — çek
vərəqində qəbz nömrəsi unikal sayılır.

---

## 2. Vərəq A — MƏHSUL (prodmix)

**Bu sütun adları MÜTLƏQ olmalıdır** (yazılış birebir belə):

| Sütun adı | Nədir | Nümunə |
|---|---|---|
| `Uçot günü` | əməliyyat günü | `01.08.2026` |
| `Ticarət müəssisəsi` | filial adı | `Hüseyn Cavid` |
| `Məhsulun kodu` | məhsul kodu | `1000051` |
| `Məhsul` | məhsul adı | `SHAURMA LAVAŞDA BÖYÜK (300 qr)` |
| `Məhsulların sayı` | satılan ədəd | `29` |
| `Endirimli məbləğ` | endirimdən sonra məbləğ (₼) | `174.34` |

`Endirimli məbləğ, m.` kimi sonluqlar problem deyil — «Endirimli məbləğ» ifadəsi
kifayətdir. `Məhsul` sütunu **tam olaraq** `Məhsul` olmalıdır (`Məhsulun kodu`
ilə qarışmasın deyə dəqiq uyğunluq axtarılır).

## 3. Vərəq B — ÇEK (ödəniş şərtləri)

| Sütun adı | Nədir | Nümunə |
|---|---|---|
| `Ticarət müəssisəsi` | filial adı | `5 Mərtəbə` |
| `Tarix` | əməliyyat günü | `01.08.2026` |
| `Ödəniş növü` | ödəniş kanalı | `BOLT SATIŞ`, `NAĞD PUL`, `Kapital Bank` |
| `Qəbzin nömrəsi` | **qəbz nömrəsi** | `44131` |
| `Endirimli məbləğ` | məbləğ (₼) | `12.00` |

> ⚠️ `Qəbzin nömrəsi` **ƏN KRİTİK sütundur**. Çek sayı = **unikal** qəbz sayı.
> Bu sütun olmasa «müştəri sayı» və «ortalama çek» hesablanmır — dashboard-daki
> o kartlar `—` qalır.

---

## 4. NƏ DƏYİŞSƏ PROBLEM OLMUR

«Analitika şöbəsi hər gün dəyişdirir» — bu hallar sistemi **sındırmır**:

- ✅ **Sütun sırası** — istənilən sıra. Adına görə tapılır, mövqeyinə görə yox.
- ✅ **Əlavə sütunlar** — `HƏFTƏ GÜNÜ`, `Dövriyyə payı`, `ENDİRİMLİ%`, `Bölmənin
  kodu:` və s. sərbəst qala bilər, nəzərə alınmır.
- ✅ **Vərəq adı** — `BAZA 2026`, `Baza 2026`, `Sheet1`… fərqi yoxdur, hamısı
  yoxlanılır.
- ✅ **Başlıq sətrinin yeri** — ilk 30 sətirdə olsun, kifayətdir (üstdə başlıq/
  logo sətirləri ola bilər).
- ✅ **Tarix formatı** — `46235` (Excel serial), `01.08.2026`, `1.8.26`,
  `2026-08-01` — hamısı oxunur.
- ✅ **Rəqəm formatı** — mətn və ya rəqəm, vergüllü/nöqtəli.
- ✅ **Sətir sayı** — bir gün ~5 500 sətir, bir ay ~170 000. Hər ikisi işləyir.
- ✅ **Köhnə il vərəqləri** (`BAZA 2025`) fayla qala bilər — 2026 vərəqi
  tapıldıqda o istifadə olunur.

## 5. NƏ SINDIRIR — bunlara toxunulmasın

- ❌ Yuxarıdaki **sütun adlarının dəyişməsi** (`Qəbzin nömrəsi` → `Çek №` və s.).
  Ad dəyişəcəksə **əvvəlcə xəbər verilməlidir**, kodda uyğunlaşdırma edilir.
- ❌ `Qəbzin nömrəsi` sütununun **çıxarılması** → çek sayı və ortalama çek ölür.
- ❌ **Cəm (subtotal) sətirlərinin** cədvəlin içinə qarışdırılması — «CƏMİ»,
  «Total» sətirləri məhsul sətri kimi görünüb ikiqat sayıma səbəb ola bilər.
  Cəmlər ayrı vərəqdə olsun.
- ❌ Filial adının **yeni yazılışı** (`Shaurma №1 …`, qısaldılmış ad və s.) —
  yeni yazılış OCAQ xəritəsinə əlavə olunmalıdır, yoxsa həmin filial
  «tapılmadı» siyahısına düşür (data itmir, amma bölgə/filial müdiri görmür).
- ❌ `.xls` köhnə format yerinə **`.xlsx`** verilsin (hər ikisi oxunur, amma
  `.xlsx` daha etibarlıdır).

---

## 6. Nə vaxt və hansı aralıq

**Hər gün, səhər — YALNIZ O GÜN (bir günlük fayl).**

> ⓘ İstifadəçi qərarı (10.08.2026): «hər gün alıp atacağım». Doğru qərardır —
> bir gün ~22 700 sətir, **~1,1 MB**, sürətli. Əvvəl burada «son 7 gün»
> yazılmışdı; səbəbim «natamam gün pəncərə ilə özü düzəlsin» idi, lakin fayl hər
> gün atıldığı üçün buna ehtiyac yoxdur — şübhəli gün varsa həmin günü təkrar
> istəyib atmaq kifayətdir, üzərinə yazılır (upsert).
>
> Geriyə doldurma (backfill) lazım olsa **bir neçə günlük faylı birlikdə** atmaq
> olar — yükləmə ekranı çoxlu fayl qəbul edir və hamısını birləşdirir.

OCAQ yazını `(filial, gün, məhsul)` açarı ilə **üzərinə yazır** (upsert). Yəni:

- gün **iki dəfə sayılmır** — təkrar yükləmə zərərsizdir;
- bir gün natamam gəlmişsə həmin günü **təkrar göndərmək** kifayətdir, düzəlir;
- bir gün atlanılsa sonradan atıla bilər, sıra önəmli deyil;
- köhnə günlər bazada **silinmir**, olduğu kimi qalır.

Fayl həcmi (bax §7.6):

| Aralıq | Sətir | Fayl | Qeyd |
|---|---|---|---|
| **1 gün** | ~22 700 | **~1,1 MB** | **tövsiyə — hər gün** |
| son 7 gün | ~159 000 | ~7,4 MB | backfill üçün işləyir |
| bütün ay | ~704 000 | ~32,7 MB | brauzerdə riskli |

> **Çoxlu fayl birlikdə atıla bilər.** Yükləmə ekranı hər faylı ayrı parse edir
> və nəticələri birləşdirir: eyni açar bir neçə fayldadırsa **SONUNCU qalır**
> (toplanmır) və xəbərdarlıq verilir — yəni eyni günü iki dəfə atmaq gün
> cəmini İKİQAT ETMİR.

---

## 6.1 «Wolt / Bolt / kart satışını da əlavə edək» — LAZIM DEYİL, artıq gəlir

Bu sual verildi (09.08.2026). Cavab: **üçüncü vərəq istəmək lazım deyil** —
kanal satışı **B vərəqindəki `Ödəniş növü` sütunundan tam çıxır**. 01–07 avqust
faylından xam çıxarış (cəmi kuruşu kuruşuna uyğundur):

| Ödəniş növü (fayldaki xam ad) | Məbləğ | OCAQ kateqoriyası |
|---|---|---|
| Nağd | 319 668,28 ₼ | `nagd` |
| Uni Bank | 239 999,84 ₼ | `kart` |
| Kapital Bank | 152 379,13 ₼ | `kart` |
| WOLT SATIŞ | 112 177,60 ₼ | `wolt` |
| BOLT SATIŞ | 36 309,60 ₼ | `bolt` |
| UNIBANK PAX A35 | 36 252,14 ₼ | `kart` |
| ATB bank | 21 867,92 ₼ | `kart` |
| Delivery SeaBreeze | 1 657,40 ₼ | `own_delivery` |
| Wolt Storefront | 273,80 ₼ | `wolt` |
| **CƏMİ** | **920 585,71 ₼** | = gün cəmi |

OCAQ bunu **filial × gün × kanal** qranulunda saxlayır və Məhsul Analizində
göstərir: kart %48,9 · nağd %34,7 · Wolt %12,2 · Bolt %3,9 · öz çatdırılma %0,2.

> ⚠️ Yeni ödəniş növü əlavə olunarsa (yeni bank terminalı, yeni platforma)
> xəbər verilməlidir — xəritəyə salınmasa «tanınmayan ödəniş növü» kimi
> yükləmə ekranında göstərilir (səssiz keçmir), lakin kateqoriyaya düşmür.

**Ayrıca hesabat NƏ VAXT lazım olur:** iiko-nun yazdığı Wolt/Bolt məbləği ilə
platformanın **ödədiyi** məbləğ fərqlidir (komissiya, ləğvlər). Bu üzləşdirmə
üçün Wolt/Bolt **portalının öz hesabatı** və bank çıxarışı lazımdır — onlar
analitika şöbəsindən deyil, ayrı mənbədən gəlir və ayrı işdir.

## 6.2 «Saatlik satış varmı?» — ilk iki fayldа YOX idi, `total satış`-da VAR

> ✅ **10.08.2026 GÜNCƏLLƏMƏSİ:** Rafael bəyin `total satış` faylında
> **`Bağlama saatı`** sütunu var və **24 saatın hamısı doludur** (bax §7.5).
> Yəni saatlıq satış/çek/orta çek **mümkündür**. Aşağıdaki bölmə ilk iki faylın
> vəziyyətini (saat YOXDUR) sənədləşdirir — həmin fayllarda hələ də yoxdur.

İlk iki faylda **saat məlumatı yoxdur**. Yoxlanma (01–07 avqust, xam hücrələr):

| Sütun | Nəticə |
|---|---|
| PRODMIX `Uçot günü` | 39 549 rəqəm hücrənin **0-ında** kəsr hissə (saat) var |
| ÇEK `Tarix` | 43 812 rəqəm hücrənin **0-ında** kəsr hissə var |

Yəni hər ikisi **tam gün** dəyəridir (`46235` = 01.08.2026, saat 00:00).
Saat-saat analiz üçün `Bağlama saatı` sütunu tələb olunur — `total satış`
faylında artıq var, əsas fayla da əlavə edilməlidir.

Real datadan saatlıq profil (01–07 avqust, şəbəkə): zirvə **21:00 (14 440 ₼)**
və **22:00 (14 056 ₼)**; ən sakit **07:00–09:00** (~200 ₼/saat). Gecə 00:00–02:00
hələ ciddi satış var (8 200 + 6 800 + 5 100 ₼) — növbə planlaması üçün önəmli.

Faylda **`HƏFTƏ GÜNÜ`** sütunu var (`6_şənbə` formatında) — həftənin günü üzrə
analiz üçün əlavə sütun lazım deyil, tarixdən özü çıxarılır.

## 7. Əlavə sütunlar — nə açır (prioritet sırası)

Bunlar **məcburi deyil**, lakin gələrsə OCAQ-da yeni analiz açılır. Sıra
dəyər/zəhmət nisbətinə görədir.

| # | Sütun | Nə açılır | Niyə lazımdır |
|---|---|---|---|
| 1 | **`Maya dəyəri`** (məhsul başına maya, ₼) | **əsl Kasavana-Smith matrisi** (marja əsaslı) + çəkili food cost | Hazırda matris **ciro payı** ilə qurulur. Marja olmadan «çox satılır, amma pul qazandırmır» məhsulu görmək MÜMKÜN DEYİL. **Ən dəyərli əlavə budur.** |
| 2 | **`Kateqoriya`** (əsas yemək / içki / desert / əlavə) | kateqoriya daxilində menyu mühəndisliyi | Klassik üsul kateqoriya daxilində tətbiq olunur. Hazırda 286 çeşid birlikdə qiymətləndirilir və «İt» kvadrantına 221 çeşid düşür (cironun yalnız %10,4-ü) — kateqoriya ilə bu siyahı istifadəyə yararlı olar. |
| 3 | **`Saat`** (qəbz saatı) | gün ərzində saat-saat yüklənmə, növbə planlaması, pik saat upsell-i | Labor cost və növbə cədvəli üçün əsasdır. |
| 4 | **`Kassir` / `Ofisiant`** | kim nə qədər upsell edir | Ortalama çek fərqi (Seabreeze 32,76 ₼ vs Əhmədli 15,21 ₼ — **2,15×**) böyük ölçüdə personal davranışıdır. Bu sütun onu adla göstərər. |
| 5 | **`Endirim məbləği`** (ayrıca sütun) | endirim/promosyon təsiri, sui-istifadə nəzarəti | Hazırda yalnız endirimdən **sonraki** məbləği görürük. |
| 6 | **`Ləğv edilmiş qəbz`** işarəsi | ləğv/void nəzarəti (kassa fırıldağı riski) | Kasa nəzarəti üçün. |
| 7 | **`Masa` / `Zal / Götür-apar`** | zal vs götür-apar qarışığı | Hazırda «Servis» sayğacından təxmin edilir. |

**Tövsiyəm:** birinci mərhələdə yalnız **`Maya dəyəri`** və **`Kateqoriya`**
əlavə edilsin. İkisi menyu analizini yarımçıqdan tam hala keçirir; qalanları
sonraki fazalarda.

---

## 7.5 «total satış» faylının qiymətləndirilməsi (10.08.2026)

Rafael bəy tək fayl göndərdi: `total satış_10.08.2026_14.42.11.xlsx` —
1 vərəq, **188 935 sətir**, dövr 01–07.08.2026. Fayl uçdan-uca yoxlandı.

### ✅ NƏ YAXŞIDIR

| Yoxlama | Nəticə |
|---|---|
| Ciro (yarpaq sətirlər) | **920 585,71 ₼** — köhnə ÇEK faylı ilə **birebir** |
| Gün-gün | 7 günün **hamısı kuruşu kuruşuna** uyğun |
| Ödəniş qarışığı | 9 növ, hamısı birebir (Nağd 319 668,29 · Uni Bank 239 999,83 …) |
| Filial / gün | 29 · 7 — doğru |
| **`Bağlama saatı`** | **24 saatın hamısı var** → Rafael bəyin 6-cı istəyi (saatlıq satış) **MÜMKÜNDÜR** |
| `Qonaqların sayı` | gün səviyyəsində **43 421** (real çek 43 212 — %0,5 fərq) |

Bu fayl **ÇEK vərəqini tam əvəz edir** və üstünə **saatlıq** gətirir.

### ❌ NƏ DÜZƏLDİLMƏLİDİR

1. **Ara cəm (subtotal) sətirləri var — 29 976 ədəd, 4 səviyyədə:**
   filial Total (30) · gün Total (200) · ödəniş Total (1 150) · məhsul Total (28 596).
   Süzülmədən oxunsa **5 357 213 ₼** çıxır — **5,8× ikiqat sayım**.
   (OCAQ bunu `Bağlama saatı` dolu olan sətirləri seçərək ayırd edə bilir, lakin
   ara cəmlərin olmaması daha təhlükəsizdir.)
2. **Qrup hücrələri boş buraxılıb (pivot deseni):** filial/gün/ödəniş yalnız
   qrupun İLK sətrində yazılıb, qalan sətirlərdə boşdur → forward-fill lazımdır.
   **Hər sətirdə təkrarlanması istənilir.**
3. **`Qəbzin nömrəsi` YOXDUR** → **unikal çek sayı və ortalama çek hesablanmır**.
   `Qonaqların sayı` qonaq sayır, çek deyil (43 421 vs 43 212).
4. **`Məhsulların sayı` (ədəd) YOXDUR** → menyu mühəndisliyi İŞLƏMİR.
   Populyarlıq oxu ədədə dayanır; bu fayl yalnız məbləğ verir.
   **Bu fayl PRODMIX vərəqini əvəz ETMİR.**
5. **`Məhsulun kodu` YOXDUR** → məhsul yalnız adla saxlanır; ad dəyişəndə tarix qırılır.
6. `Maya dəyəri` və `Kateqoriya` yenə yoxdur (§7).

### ⚠️ ÖNƏMLİ TAPINTI — 07.08 fərqi natamamlıqdan DEYİL

Əvvəl belə qeyd olunmuşdu: «07.08.2026 çek faylı natamamdır, tam fayl gələndə
düzələcək». **Bu doğru deyil, düzəldilir:**

- Bu fayl **10.08.2026 14:42**-də alınıb — 07.08 mütləq bağlanmışdı;
- yenə də **129 192,78 ₼** göstərir (köhnə fayl ilə eyni, qəpik fərqi yox);
- **saat-saat baxıldıqda 07.08-də 24 saatın HAMISI var**, profil normaldır
  (zirvə 21:00–22:00, digər günlərlə eyni) → **kəsilmə yoxdur**;
- fərq (40 652,13 ₼) **29 filialın 28-inə yayılıb** — yalnız Hüseyn Cavid
  üst-üstə düşür.

Yəni PRODMIX-in 07.08 rəqəmi (169 844,91 ₼) ödəniş bazlı rəqəmdən **40 652,13 ₼
YUXARIDIR** və səbəb hələ məlum deyil. Ehtimallar: açıq/ödənilməmiş sifarişlər,
ləğv edilmiş qəbzlər, ya da iki hesabatın fərqli bazası (məhsul məbləği vs
ödənilmiş məbləğ). **Analitika şöbəsinə soruşulmalı sual budur:**

> 01–06 avqustda məhsul hesabatı ilə ödəniş hesabatı kuruşu kuruşuna uyğundur,
> lakin 07 avqustda məhsul hesabatı 40 652,13 ₼ daha yüksəkdir (29 filialın
> 28-ində). Səbəb nədir — açıq sifarişlər, ləğv edilmiş qəbzlər, yoxsa iki
> hesabatın bazası fərqlidir?

Kod tərəfi: tutuşdurma xəbərdarlığı artıq **səbəb iddia etmir** — fərqi bildirir
və araşdırma istəyir (`reconcileProdmixReceipts`).

## 7.6 «iiko bunu verə bilərmi?» — BƏLİ, 9 sahənin 9-u ARTIQ verilmişdi

Sual haqlıdır və cavabı təxminə söykənmir: **istədiyimiz sahələrin hamısı
(ikisindən başqa) Rafael bəyin göndərdiyi üç faylın BİRİNDƏ artıq var** — sadəcə
hamısı BİR yerdə deyil.

| Sahə | Hansı faylda sübut olundu |
|---|---|
| `Ticarət müəssisəsi` · `Uçot günü` · `Endirimli məbləğ` | üçündə də |
| **`Bağlama saatı`** | `total satış` ✓ |
| **`Ödəniş növü`** | `ödəniş şərtləri` + `total satış` ✓ |
| **`Qəbzin nömrəsi`** | `ödəniş şərtləri` ✓ |
| **`Məhsulun kodu`** · **`Məhsulların sayı`** | `avqust plan` ✓ |
| `Maya dəyəri` · `Kateqoriya` | **heç birində yox** — yeganə bilinməyən |

**Nəticə:** iiko-da data VAR. Sual «verə bilərmi» deyil, «hamısını bir hesabatda
verə bilərmi»dir. iiko OLAP satış hesabatının qranulu **qəbz sətri**dir, yəni bu
sahələrin hamısı həmin hesabatın ölçüləridir — texniki maneə görünmür.

**Ara cəmlər və boş qrup hücrələri DATA MƏHDUDİYYƏTİ DEYİL** — qruplaşdırılmış
görünüşün Excel-ə çıxarılmasının nəticəsidir. Qruplaşdırma söndürülüb «düz»
export edildikdə həm cəm sətirləri, həm boş hücrələr yox olur. Ən asan düzəliş budur.

`Maya dəyəri` / `Kateqoriya` üçün dürüst cavab: iiko-da maya (self-cost) və
nomenklatura qrupu anlayışı var, lakin bu iki sahənin **həmin hesabatda ölçü
kimi mövcudluğu bizim üçün sübut olunmayıb**. Ona görə onlar «mümkünsə» kimi
istənilir, məcburi kimi deyil.

### ⚠️ ƏSL RİSK iiko deyil — FAYL ÖLÇÜSÜ

Mövcud fayl: **8,8 MB · 188 935 sətir · 7 gün** (48,8 bayt/sətir sıxılmış).
Ara cəmlər çıxarılsa 158 954 sətir → 7,4 MB.

| Aralıq | Sətir | Təxmini fayl |
|---|---|---|
| 1 gün | 22 708 | **1,1 MB** |
| **son 7 gün (rolling)** | 158 954 | **7,4 MB** ← tövsiyə |
| son 14 gün | 317 908 | 14,8 MB |
| bütün ay (31 gün) | 703 939 | **32,7 MB** ⚠️ |

Panel hazırda 12 MB faylı oxuyur; **30+ MB brauzerdə riskli**. Ona görə §6-daki
«ayın 1-dən bugünə» tələbi bu qranulda **SON 7 GÜNƏ** dəyişdirilir:

- upsert `(filial, gün, məhsul)` açarı ilə işlədiyi üçün köhnə günlər DB-də
  qalır — silinmir;
- son 7 gün pəncərəsi **düzəlişlərin baş verdiyi aralığı** əhatə edir (natamam
  gün, sonradan bağlanan qəbz);
- ay əvvəli lazım olsa bir dəfə tam ay göndərilə bilər (birdəfəlik, 33 MB).

### Daha yüngül alternativ (əgər qəbz sətri çox böyükdürsə)

`Qəbzin nömrəsi`-ni hər sətirdə istəmək əvəzinə **çek sayını ÖLÇÜ kimi** almaq:
kiçik ikinci vərəq — `Ticarət müəssisəsi · Uçot günü · Çek sayı` (həftədə ~200
sətir). Bu halda əsas vərəqdə qəbz nömrəsi lazım deyil və fayl kiçilir.
Çatışmazlığı: qəbz səviyyəsində analiz (səbət tərkibi) mümkün olmur.

## 8.0 ⭐ ƏSAS VARİANT — 3 FAYL, YALNIZ 1 DÜZƏLİŞ (tövsiyə olunan)

> İstifadəçi təsdiqi (10.08.2026): «olmazsa 2-3 dosya olsun ama tüm sistemi
> beslesin». Bu icazə işi kökündən sadələşdirir — **birləşik hesabat qurmağa
> ehtiyac yoxdur.**

Rafael bəyin ARTIQ hazırladığı üç hesabatdan **ikisi olduğu kimi mükəmməldir**.
Yalnız üçüncüsündə bir export ayarı dəyişir:

| Fayl | Vəziyyət | Nə lazımdır |
|---|---|---|
| **1. Məhsul** (`avqust plan` → BAZA 2026) | ✅ **İŞLƏYİR** — kod, ad, ədəd, məbləğ var | **Heç nə. Olduğu kimi davam.** (mümkünsə `Maya dəyəri` + `Kateqoriya`) |
| **2. Ödəniş/çek** (`ödəniş şərtləri` → Baza 2026) | ✅ **İŞLƏYİR** — qəbz nömrəsi, ödəniş növü var | **Heç nə. Olduğu kimi davam.** |
| **3. Saatlıq** (`total satış`) | ⚠️ data düzgün, FORMAT problemli | **Qruplaşdırma söndürülsün** (ara cəm sətirləri olmasın, qrup sütunları hər sətirdə təkrarlansın) |

**Yəni tək iş: 3-cü faylda qruplaşdırmanı söndürmək.** Bu, iiko-da bir export
ayarıdır — yeni hesabat qurmaq deyil.

### Niyə bu variant daha yaxşıdır (birləşik fayldan)

- **1 və 2 heç dəyişmir** → hazırda işləyən axın sınmır (ən böyük risk budur);
- iki müstəqil mənbə **tutuşdurma qorumasını saxlayır** (07.08-dəki 40 652 ₼
  fərq yalnız bu sayədə göründü);
- fayllar kiçik qalır — birləşik ay faylı ~33 MB olurdu (§7.6);
- 3-cü fayl yalnız **saatlıq** üçündür; sınsa 1 və 2 işləməyə davam edir.

### Bu variantda nə açılır

| İstək (Rafael bəyin siyahısı) | Mənbə | Vəziyyət |
|---|---|---|
| Günləri seçmə | fayl 1+2 | ✅ hazır (fakt cədvəli gün qranulunda) |
| Həftəlik orta çek | fayl 2 | ✅ hazır |
| Top 5 ən çox / ən az satılan məhsul | fayl 1 | ✅ hazır |
| Satış və çekin bölgə üzrə faiz payı | fayl 1+2 | ✅ hazır |
| Top 5 filial (satış və çek) | fayl 1+2 | ✅ hazır |
| **Saatlıq satış, çek sayı, orta çek** | **fayl 3** | ⏳ format düzəlişindən sonra |

## 8. ALTERNATİV — TƏK BİRLƏŞİK FAYL (yalnız §8.0 mümkün olmazsa)

> **Mövzu: OCAQ portalı üçün günlük satış export-u — sabit format**
>
> Salam. Bundan sonra OCAQ portalına **hər gün səhər bir `.xlsx` fayl** kifayət
> edir. Faylın içində **iki vərəq** olmalıdır. Vərəq adları sərbəstdir, sistem
> hansının hansı olduğunu sütun adlarına görə özü tapır.
>
> **VƏRƏQ A — məhsul detayı** (bu sütun adları dəyişməsin):
> `Uçot günü` · `Ticarət müəssisəsi` · `Məhsulun kodu` · `Məhsul` ·
> `Məhsulların sayı` · `Endirimli məbləğ`
>
> **VƏRƏQ A-ya ƏLAVƏ OLARAQ İSTƏYİRİK** (ən vacib iki sütun):
> - **`Maya dəyəri`** — **1 ƏDƏD üçün maya, ₼** (məsələn 300 qr shaurma üçün
>   2,10 ₼). Sətir cəmi verirsinizsə sütun adı **`Maya məbləği`** olsun ki
>   qarışmasın — sistem ikisini ayrı oxuyur.
> - **`Kateqoriya`** — menyu qrupu (Əsas yemək / İçki / Desert / Əlavə / Sos…)
>
> **VƏRƏQ B — çek/ödəniş** (bu sütun adları dəyişməsin):
> `Ticarət müəssisəsi` · `Tarix` · `Ödəniş növü` · **`Qəbzin nömrəsi`** ·
> `Endirimli məbləğ`
>
> **ARALIQ: hər gün o günün faylı** (1 günlük, ~1,1 MB).
> Sistem `(filial, gün, məhsul)` açarı ilə üzərinə yazır, ona görə təkrar
> göndəriş problem deyil — bir gün şübhəlidirsə həmin günü təkrar göndərmək
> kifayətdir.
>
> **DƏYİŞSƏ PROBLEM OLMAYAN şeylər:** sütun sırası, əlavə sütunlar, vərəq adı,
> başlıq sətrinin faylın neçənci sətrində olması, tarix formatı
> (`46235` / `01.08.2026` / `2026-08-01`), sətir sayı, `BAZA 2025` vərəqinin
> faylda qalması.
>
> **DƏYİŞMƏMƏLİ:** yuxarıdaki **sütun adları**. Ad dəyişməsi lazım gələrsə
> əvvəlcədən xəbər verin.
>
> **XÜSUSİLƏ ÖNƏMLİ:** `Qəbzin nömrəsi` sütunu mütləqdir — müştəri sayı və
> ortalama çek yalnız bununla hesablanır. Həmçinin cədvəlin içinə **cəm
> (CƏMİ/Total) sətirləri qarışdırılmasın**.
>
> **Növbəti mərhələdə istəyəcəyimiz** (indi lazım deyil, planlaşdırma üçün):
> qəbz **saatı** (pik saat və növbə planlaması üçün), **kassir/ofisiant** adı,
> ayrıca **endirim məbləği**, ləğv edilmiş qəbz işarəsi.
>
> Təşəkkür edirik.

### Niyə «hər şeyi tək düz cədvəldə verin» demirik

Cazibədar görünür, lakin iki müstəqil vərəq bizim **yeganə səhv tutucumuzdur**:
07.08.2026-da çek datası 40 652 ₼ əskik gəldi və bu **öz içindən görünmürdü** —
yalnız məhsul vərəqi ilə tutuşdurulanda çıxdı. Üstəlik hissə-hissə ödənən qəbz
(yarısı nağd, yarısı kart) tək cədvəldə həmin qəbzin məhsullarını **iki dəfə**
saydırardı. Bir **fayl** — iki **vərəq**.

### Sistem tərəfi artıq hazırdır

`Maya dəyəri` və `Kateqoriya` sütunları **gəldiyi gün işləyəcək** — parser,
API və cədvəl (`analytics_item_fact.cost` / `.category`, migration 0012) əvvəlcədən
hazırlandı, yeni deploy gözlənilmir. Sütun yoxdursa heç nə pozulmur; gəldikdə
yükləmə ekranında **food cost dərhal görünür** və menyu matrisi ciro payından
**marja** əsasına keçir.

Qoruma: `Maya dəyəri` səhv şərh edilsə (sətir cəmi «1 ədəd» kimi oxunsa) food
cost qeyri-real çıxır və sistem **səssiz keçmir** — «food cost %300, sütun adı
dəqiqləşdirilməlidir» xəbərdarlığı verir.

---

## 9. Doğrulama qeydi (09.08.2026)

01–07 avqust datası ilə uçdan-uca yoxlanıldı:

| Ölçü | Nəticə |
|---|---|
| Məhsul sətri | 39 549 xam → 36 975 unikal açar (təkrarlar toplanır) |
| Məhsul cirosu | **961 237,84 ₼** — PLAN vərəqinin «Faktiki satış»ı ilə birebir |
| Çek cirosu | 920 585,71 ₼ · **43 212 çek** · ortalama çek **21,30 ₼** |
| Filial | 29 (yeni F-31 `Abdülkerim Alizadə` daxil — iiko `Mytcha` yazır) |
| Tutuşdurma | 6/7 gün təmiz; 07.08 fərqi 40 652 ₼ **tutuldu** |
| Bölgə cəmi | şəbəkə cəminə **bərabər** (kuruşu kuruşuna) |
| Təkrar yükləmə | sətir sayı **artmadı** (idempotent) |
