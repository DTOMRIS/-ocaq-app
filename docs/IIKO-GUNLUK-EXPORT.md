# iiko → OCAQ günlük export spesifikasiyası

> Bu sənəd **analitika şöbəsinə verilir**. Məqsəd: OCAQ portalının hər gün
> avtomatik oxuduğu faylın dəyişməz «müqaviləsi» olsun — sütun adları sabit
> qalsın, qalan hər şey azad olsun.
>
> Yükləmə yeri: **OCAQ → Günlük Panel → 📦 Günlük detay**
> Son yoxlanma: 09.08.2026 (01–07 avqust datası ilə uçdan-uca doğrulandı)

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

- 08.08.2026-da çek faylının 7 avqustu **40 652 ₼ əskik** gəldi (export səhər
  saatında alınmışdı).
- Bu natamamlıq **çek faylının öz içindən GÖRÜNMÜRDÜ** — həmin günün cəmi öz
  ortalamasına yaxın idi, yəni normal görünürdü.
- Yalnız **məhsul vərəqi ilə tutuşdurulanda** çıxdı: 169 845 ₼ vs 129 193 ₼.

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

**Hər gün, səhər — AYIN 1-dən BUGÜNƏ QƏDƏR (kumulyativ).**

Yalnız «dünən»i deyil, **ayın başından etibarən** göndərilməsi vacibdir. Səbəb:
OCAQ yazını `(filial, gün, məhsul)` açarı ilə **üzərinə yazır** (upsert). Yəni:

- dünən natamam gəlmişsə (export erkən saatda alınıb) → bugün tam gələndə
  **özü düzəlir**;
- gün **iki dəfə sayılmır** — təkrar yükləmə zərərsizdir;
- bir gün atlanılsa → növbəti yükləmə boşluğu **özü doldurur**.

Bir ay ~170 000 sətirdir; fayl ~12 MB olur və brauzerdə oxunur. Ay dəyişəndə
yeni ay sıfırdan başlayır.

> Yalnız «dünən»i göndərmək də işləyir, lakin o zaman natamam gün natamam qalır
> və heç kim bunu görmür. Kumulyativ göndəriş bu riski aradan qaldırır.

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

## 6.2 «Saatlik satış varmı?» — YOX, bu sütun istənilməlidir

Faylda **saat məlumatı yoxdur**. Yoxlanma (01–07 avqust, xam hücrələr):

| Sütun | Nəticə |
|---|---|
| PRODMIX `Uçot günü` | 39 549 rəqəm hücrənin **0-ında** kəsr hissə (saat) var |
| ÇEK `Tarix` | 43 812 rəqəm hücrənin **0-ında** kəsr hissə var |

Yəni hər ikisi **tam gün** dəyəridir (`46235` = 01.08.2026, saat 00:00).
Saat-saat analiz (pik saatlar, növbə planlaması, saat bazlı upsell) üçün
**yeni sütun tələb olunur** — aşağı §7-də 3-cü sıradadır.

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

## 8. ANALİTİKA ŞÖBƏSİNƏ GÖNDƏRİLƏCƏK MƏTN (olduğu kimi kopyalayın)

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
> **ARALIQ: ayın 1-dən bugünə qədər** (kumulyativ, yalnız dünən deyil).
> Sistem gün açarı ilə üzərinə yazır, ona görə təkrar günlər problem deyil —
> əksinə, dünən yarımçıq alınmışsa bugün özü düzəlir.
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
