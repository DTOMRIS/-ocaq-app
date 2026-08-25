# Changelog

Bu faylın formatı [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
əsasındadır və layihə [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
istifadə edir. Girişlər **insan tərəfindən** yazılır (git log-dan avtomatik yox).

## [Unreleased]

### Fixed — 🔴 İKİ QUTU BİTDİ: səhifədə TƏK yükləmə nöqtəsi var
- İstifadəçi «DT Məhsul» faylını üstdəki PRODMIX/ÇEK qutusuna atdı və
  «Nə PRODMIX nə də ÇEK cədvəli tapılmadı» xətası aldı; aşağıdakı 🕐 qutusuna
  isə fayl seçmədiyi üçün «oxu» boz qalırdı. Səhv istifadəçidə deyil —
  **iki qutu qoymaq səhv idi**.
- İndi **bir qutu var**. Üstdəki qutu faylı tanıyır və lazım olan axını ÖZ
  ALTINDA açır; fayl ikinci dəfə seçilmir (`presetFile` ilə ötürülür və
  avtomatik oxunur). Ayrı 🕐 qutusu panel-dən çıxarıldı.
- iiko hesabatı bu qutuya atılanda artıq **xəta verilmir** — tanınır və
  yönləndirilir. Qarışıq seçimdə (PRODMIX + iiko birlikdə) iiko faylı
  SƏSSİZ ATILMIR, açıq xəbərdarlıq verilir.

### Fixed — `range: 0` bütün vərəqi oxuyurdu (donma səbəbi)
- Ucuz tanıma üçün `sheet_to_json(..., { range: 0 })` yazılmışdı. SheetJS-də
  RƏQƏM `range` «bu sətirdən BAŞLA» deməkdir — yəni 292 610 sətrin HAMISI
  oxunurdu. Obyekt `range` ilə əvəz olundu (`{s,e}`), həqiqətən yalnız ilk
  30 sətir oxunur.


### Added — MENYU ANALİZİ bağlandı: «DT Məhsul sayı və qiyməti»
- Üç namizəd fayl müqayisə edildi; qazanan: `Ticarət müəssisəsi | Məhsul |
  Uçot günü | Bağlama saatı → Məhsulların sayı + Endirimli məbləğ`.
  **Həm məhsul adı, həm gün, həm pul var** — digər ikisində məhsul adı yox idi.
- `parseProductDaily()` — saat səviyyəsi YIĞILIR (menyu qərarı saatlıq
  verilmir), açar `gün|filial|məhsul`. Real fayl: 292 610 sətir → **51 384**
  aqreqat sətir, oxunan **2 163 090,96 ₼** = faylın «Grand Total»-ı, fərq
  **0,00**. 277 məhsul · 29 filial · 23 gün.
- `productDailyToItemFacts()` — MÖVCUD `analytics_item_fact` formatına çevirir.
  Yeni cədvəl/endpoint YOX: Analitika səhifəsi onsuz da bu cədvəli oxuyur.
  `item_code` yoxdur → ad açar kimi işlədilir (Analitika onsuz da ad üzrə
  qruplaşdırır).
- Yükləmə qutusu artıq **İKİ hesabatı özü tanıyır** — «Satış ay və gün» və
  «DT Məhsul». Ad/heuristika ilə təxmin etmirik: hər iki parser işlədilir,
  sətir tapan qalib gəlir. Səhv qutu problemi tamamilə bitdi.
- Uçdan-uca REAL Postgres-də (PGlite): `analytics_item_fact` 2 163 090,96 ₼ /
  51 384 sətir / 23 gün / 277 məhsul, **təkrar yükləmədə şişmədi**, Analitika
  menyu sorğusu düzgün sıralama verdi (SHAURMA LAVAŞDA BÖYÜK 287 824,33 ₼ /
  23 073 ədəd / 29 filial).

### 🔴 ÖLÇÜLDÜ — məhsul hesabatı cironun HAMISINI örtmür (%73,9)
- 01–23.08.2026 gün-gün müqayisə: satış **2 925 807,25 ₼** ↔ məhsul
  **2 163 090,96 ₼** → **%73,9**. Fərq 762 716,29 ₼. İki səbəb:
  1. **`Seabreeze` filialı məhsul hesabatında ÜMUMİYYƏTLƏ YOXDUR** (filial
     süzgəci/icazə — Nərimanov hadisəsinin eynisi, Rafael bəyə deyilməli).
  2. Qalan filiallarda örtük %61–80 — kombo/set məbləği məhsul sətrinə tam
     düşmür.
- Ona görə parser bu məhdudiyyəti **HƏR DƏFƏ xəbərdarlıq kimi qaytarır** və
  ekranda göstərilir. Fayl menyu SIRALAMASI üçün etibarlıdır (ədəd, orta
  qiymət, top/flop); «məhsul cirosu = filial cirosu» kimi İŞLƏDİLMƏMƏLİDİR.

### Fixed — `azFold` tələsinə İKİNCİ dəfə düşüldü (`ların` → `larin`)
- `Məhsulların sayı` başlığı üçün naxış `məhsulların sayi` yazılmışdı; `azFold`
  BÜTÜN ı/İ/I hərflərini «i»-yə çevirdiyi üçün real dəyər `məhsullarin sayi`
  olur. Sütun tapılmırdı və **fayl tamamilə oxunmamış** qalırdı. Naxış
  düzəldildi, regressiya testi yazıldı (birinci hal: `satılıb` → `satilib`).


### Added — TƏK FAYL, ÜÇ İSTƏK: «Satış ay və gün» hesabatı bağlandı
- İstifadəçinin üç tələbi (① saatlıq filial satışı ② məhsul satışı
  ③ kart/Wolt/Bolt) üçün doğru fayl tapıldı: **«Satış ay və gün»** —
  `Ticarət müəssisəsi | Ödəniş növü | Uçot günü | Bağlama saatı →
  Endirimli məbləğ + Qonaqların sayı`.
- Bu fayl `Uçot günü` DAŞIYIR → kumulyativ fərq hesabına **ehtiyac yoxdur**,
  sətirlər birbaşa öz gününə yazılır. Fayl da kiçikdir (1,8 MB / 47 324 sətir;
  əvvəlki namizədlər 8–11 MB idi).
- Mövcud `parseHourlySales` bu faylı **olduğu kimi oxudu** — yeni parser
  yazılmadı. Doğrulama: oxunan **2 978 124,02 ₼** = faylın «Grand Total»-ı,
  fərq **0,00**. 30 filial · 13 ödəniş növü · 24 saat · **24 gün**.
- Yeni `hourlyToDailyFacts()` — saatlıq sətirləri MÖVCUD `analytics_daily_fact`
  formatına çevirir (ödəniş səbətləri + `__day__` sentinel). 43 074 saatlıq
  sətir → 3 444 günlük sətir, cəm eyni (0,00 fərq), tanınmayan ödəniş növü
  YOX. Beləliklə dashboard və Analitika səhifələri də bu tək fayldan dolur.
- `hourly-save` endpoint-inə **'dated' rejimi** əlavə olundu: hər sətir öz
  gününü daşıdığı üçün fərq maşınına toxunulmur, `derivation='direct'` yazılır.
  Kumulyativ rejim silinmədi — köhnə fayl formatı üçün işləməyə davam edir.
- Yükləmə ekranı iki rejimi özü ayırır: faylda `Uçot günü` varsa **tarix
  soruşulmur** (soruşmaq səhv cavab riski yaradırdı), 4 000-lik chunk-larla
  yazılır, sonra günlük fakt mövcud `fact-save` endpoint-inə göndərilir.
- Uçdan-uca REAL Postgres-də (PGlite) yoxlandı: 3 migration + real fayl →
  `analytics_hourly_fact` 2 978 124,02 ₼ / 43 074 sətir / 24 gün,
  `analytics_daily_fact` (`__day__`) 2 978 124,02 ₼ / 144 902 çek,
  **təkrar yükləmədə cəm şişmədi**, Analitika sorğuları doğru cavab verdi.

### Fixed — «qonaq sayı çek deyil» ifadəsi ÖLÇÜLDÜ və yumşaldıldı
- Əvvəl parser şərtsiz «Çek sayı DEYİL» yazırdı. Real data ilə ölçüldü:
  01–21.08 üzrə **124 968 qonaq ↔ 123 720 «Bills» = %1,01 fərq** (filial
  səviyyəsində −%1,90…+%3,33; hər iki tərəfdən Nərimanov çıxarılmaqla).
  Yəni qonaq sayı çek sayının işlək qarşılığıdır və ayrıca `Bills` hesabatı
  İSTƏMƏYƏ EHTİYAC YOXDUR. Mətn ölçülmüş rəqəmlə dəyişdirildi.

### Fixed — «qonaq sayı şişikdir» xəbərdarlığı YALAN HALDA VERİLİRDİ
- Xəbərdarlıq şərtsiz verilirdi. Təkrar sayım YALNIZ saatdan dərin ölçü
  (`Məhsul ilə satılıb`) olanda yaranır; «Satış ay və gün» faylında ən dərin
  səviyyə saatdır → təkrar YOXDUR. Şərt `cItem >= 0` ilə məhdudlaşdırıldı.


### Added — Saatlıq satış KUMULYATİV axını: hər gün yeni fayl, toplamdan davam
- İstifadəçi qərarı: «bunu 21 günlük olaraq qeyd et, mən hər gün ocağa yenisini
  atım, amma **toplamdan davam etsin**». iiko-da **heç bir ayar dəyişmir**.
- Fayl KUMULYATİVDİR (ayın əvvəlindən bu günə). İki ardıcıl görüntünün FƏRQİ
  məhz aradakı gündür → gün-gün saatlıq data `Uçot günü` sütunu olmadan çıxır.
- Yeni migration **`0013_analytics_hourly.sql`** (add-only, IF NOT EXISTS):
  - `analytics_hourly_cume` — faylın olduğu kimi yazıldığı görüntü. Açar dövrün
    sonunu da daxil edir → **eyni fayl təkrar atılsa cəm ŞİŞMİR**.
  - `analytics_hourly_fact` — fərqdən çıxan günlük saatlıq fakt. `derivation`
    sütunu mənbəyi gizlətmir (`delta` / `direct`).
- Yeni endpoint `POST /api/dashboard/analytics/hourly-save` (super_admin) —
  `unnest` upsert, əvvəlki görüntünü YAZMAZDAN ƏVVƏL oxuyur (yoxsa fərq həmişə
  sıfır çıxardı), audit yazır, xəta teşhis məlumatı ilə qaytarılır.
- Yeni ekran `/dashboard/panel` → **🕐 Saatlıq satış**. Mövcud PRODMIX/ÇEK
  yükləmə axınına TOXUNULMADI — ayrıca komponent (AGENTS.md §4).
- **Dörd qayda, hamısı testlə bağlı** (`hourly-delta.test.ts`, 12 test):
  - birinci fayl yalnız BAZA — 21 günün cəmi tək günə **yazılmır**;
  - gün atlansa (21 → 24) fərq bir günə **yazılmır**, səbəb ekranda;
  - eyni/köhnə fayl təkrar atılsa üzərinə yazılır, cəm şişmir;
  - mənfi fərq (keçmişə düzəliş) **udulmur** — saxlanılır və sayılıb bildirilir.
- Real fayl üzərində uçdan-uca yoxlandı: 3 899 sətir / 302 KB yük (Vercel
  4,5 MB limitinin çox altında), simulyasiya edilmiş 22.08 faylı ilə fərq
  128 178,44 ₼ / 6 061 qonaq, pik saat 21:00 (%10,14), mənfi 0, itən 0.
- ⚠️ Faylın əhatə etdiyi son gün **istifadəçidən soruşulur** (standart «dünən»):
  başlıqdakı «sonu 31.08.2026» *istənilən* aralıqdır, datanın bitdiyi gün deyil.

### Changed — «`Uçot günü` əlavə olunsun» tələbi də LƏĞV OLUNDU
- Bir gün əvvəl §7.7-də iiko-dan `Uçot günü` istənilməsi tövsiyə edilmişdi.
  Kumulyativ fərq üsulu ilə **buna da ehtiyac qalmadı**. `parseHourlySales`
  `Uçot günü` gələrsə yenə birbaşa oxuyur — dəstək itmir.

### Added — Saatlıq satış pivotu oxunur (`parseHourlySales`)
- iiko-da bizim üçün qurulan «Doğan Tomris Rapor» hesabatı (`Ticarət
  müəssisəsi → Ödəniş növü → Bağlama saatı → Məhsul ilə satılıb`) artıq
  oxunur: **saat × filial × ödəniş növü** kəsiyində ciro və qonaq sayı.
  Bu, indiyə qədər heç bir fayldan çıxmayan **saatlıq satış** məlumatıdır.
- Real fayl üzərində doğrulandı (203 293 sətir, 01–21.08.2026):
  oxunan cəm **2 691 752,86 ₼** ↔ faylın öz «Grand Total» sətri
  **2 691 753,06 ₼** (fərq 0,20 ₼ = pivot yuvarlaması). 30 filial, 24 saat,
  13 ödəniş növü. Şəbəkə piki 21:00 (%10,14), ən sakit saat 08:00 (%0,13).
- Üç tələ koda yazıldı və testlə bağlandı:
  - **çılpaq « Total» sətri** (uzunluq 6) — `isSubtotal` onu tutmurdu; süzülməsə
    ciro **iki dəfə** sayılırdı. `isGroupTotalCell` əlavə olundu və ara cəm
    yoxlaması ölçmə sütunundan soldakı BÜTÜN sütunlara tətbiq edilir.
  - **kombo sətirlərindəki məbləğ** (real faylda 286 sətir / 8 759,70 ₼) —
    «pul yalnız məhsulsuz sətirdədir» yanaşması bunu itirirdi.
  - **`Qonaqların sayı` yarpaq sətirlərdə təkrarlanır** (557 515 ↔ düzgünü
    129 130) — ölçü rəqəmləri pivotun öz saat ara cəmlərindən götürülür.
- İki müstəqil yol (ara cəmlər ↔ yarpaq sətirlər) bir-birini yoxlayır və
  faylın «Grand Total» sətri ilə tutuşdurulur; fərq %0,5-i keçsə xəbərdarlıq.

### Changed — «qruplaşdırma söndürülsün» tövsiyəsi LƏĞV OLUNDU
- `docs/IIKO-GUNLUK-EXPORT.md` §8.0-da saatlıq fayl üçün «ara cəmlər olmasın»
  yazılmışdı. Artıq **əksi doğrudur**: ara cəmlər qonaq sayının düzgün olması
  üçün lazımdır. Yeni tələb tək sətirdir: **`Uçot günü`** qruplaşdırma
  səviyyəsi əlavə olunsun (ya da hesabat tək günlük endirilsin).

### Fixed — açıq sual bağlandı: itən 173 170 ₼-ın böyük hissəsi Nərimanov idi
- Özüm endirdiyim «Satış-filiallar üzrə» və «Məhsullar üzrə» hesabatlarında
  **Nərimanov filialı ümumiyyətlə yoxdur** (01–21.08 üçün 73 014,76 ₼).
  Şablon faylda var. Yəni fərqin böyük hissəsi natamam data deyil, həmin iki
  hesabatdakı **filial süzgəci / icazə problemidir**.

### Fixed — 🔴 SƏHV TEŞHİS DÜZƏLDİLDİ: 07.08 fərqi natamamlıqdan DEYİL
- Əvvəl həm kodda, həm sənəddə, həm də istifadəçiyə belə deyilmişdi:
  «07.08.2026 çek faylı natamamdır, tam fayl gələndə düzələcək». **Bu doğru
  deyildi.** Rafael bəyin 10.08.2026 14:42-də aldığı `total satış` faylı ilə
  yoxlandı:
  - həmin fayl 07.08-i **eyni məbləğlə** göstərir (129 192,78 ₼) — 3 gün sonra
    da dəyişməyib, yəni gün bağlanmışdı;
  - **saat-saat baxıldıqda 07.08-də 24 saatın HAMISI var** və profil normaldır
    (zirvə 21:00–22:00, digər günlərlə eyni) → **kəsilmə yoxdur**;
  - fərq (40 652,13 ₼) **29 filialın 28-inə yayılıb** (yalnız Hüseyn Cavid
    üst-üstə düşür).
- `reconcileProdmixReceipts` xəbərdarlığı artıq **səbəb iddia etmir** — fərqi,
  hansı tərəfin yüksək olduğunu və ehtimalları (natamam export / açıq-ləğv
  edilmiş qəbz / iki hesabatın fərqli bazası) bildirib **araşdırma istəyir**.
  Regresiya testi təsdiqlənməmiş səbəb iddiasının geri qayıtmamasını yoxlayır.
- `docs/IIKO-GUNLUK-EXPORT.md` §1 və §7.5 buna uyğun düzəldildi.

### Added — `total satış` faylının qiymətləndirilməsi (docs §7.5)
- Rafael bəyin tək-fayl təklifi (1 vərəq, 188 935 sətir) uçdan-uca yoxlandı:
  - ✅ ciro **920 585,71 ₼** — köhnə ÇEK faylı ilə birebir, 7 günün hamısı;
    ödəniş qarışığı 9 növ, hamısı uyğun; 29 filial · 7 gün doğru
  - ✅ **`Bağlama saatı` — 24 saatın hamısı var** → saatlıq satış/çek/orta çek
    (Rafael bəyin 6-cı istəyi) **mümkündür**
  - ❌ **29 976 ara cəm sətri** (4 səviyyədə) — süzülmədən oxunsa **5 357 213 ₼**
    çıxır, yəni **5,8× ikiqat sayım**
  - ❌ qrup hücrələri boş (pivot deseni) → forward-fill tələb edir
  - ❌ **`Qəbzin nömrəsi` yox** → unikal çek sayı və ortalama çek hesablanmır
    (`Qonaqların sayı` qonaq sayır: gün səviyyəsində 43 421 vs real çek 43 212)
  - ❌ **`Məhsulların sayı` (ədəd) yox** → menyu mühəndisliyi işləmir;
    bu fayl PRODMIX vərəqini **əvəz etmir**
  - ❌ `Məhsulun kodu`, `Maya dəyəri`, `Kateqoriya` yox

### Fixed — 🔴 HƏDƏFLƏR GİRİLİB, PANEL GÖRMÜRDÜ (kritik)
- **Səbəb: iki kod yolu FƏRQLİ AÇAR işlədirdi.** Hədəflər OCAQ-daki **xam**
  `branches.name` ilə xəritəyə yazılırdı (`panel/page.tsx:182`), oxuma isə
  **kanonik** filial adı ilə olurdu (`targets[b.filial]`). OCAQ-da filial
  «Əcəmi Shaurma» adlanırsa `targets['Əcəmi Shaurma']` yazılır, panel isə
  `targets['Əcəmi']` axtarır → **hədəf «yoxdur» görünürdü**, halbuki girilmişdi.
  Fakt tərəfi `canonBranchKey` işlədirdi (ona görə fakt bağlantısı tutdu),
  hədəf tərəfi işlətmirdi.
  - Artıq hər iki tərəf `canonBranchKey` ilə **eyni açarı** qurur
    (`buildTargetIndex()` saf funksiyası, 4 regresiya testi).
  - **TOPLAYIR, üzərinə yazmır:** iki fiziki nöqtə bir kanonik filiala düşə
    bilər (ALIASES «Torgoviy Yuxarı» + «Torgoviy Aşağı» → «Torgoviy») — üzərinə
    yazsaydıq həmin filialın hədəfi **yarıya enərdi**.
- **Eyni hata sınıfı RBAC yolunda da vardı** (`panel/page.tsx`): filial ad
  müqayisəsi `toLowerCase()` işlədirdi və İ/ı tələsinə düşürdü — uyğunlaşmasa
  **bölgə/filial müdiri panelde HEÇ NƏ görməzdi**. O da `canonBranchKey`-ə
  keçirildi; artıq hədəf, fakt və RBAC yolları eyni kanonikləşdirmədən keçir.

### Fixed — Panelde 53 186 ₼ satış səssiz itirdi + hədəf faizi şişik idi
- **🔴 HƏDƏFİ OLMAYAN FİLİALIN SATIŞI «Plan vs Gerçək»dən TAMAMİLƏ ÇIXIRDI**
  (`panel-client.tsx`, artıq `src/lib/analytics/target-attainment.ts`):
  `tutList` `.filter(planV > 0)` ilə qurulurdu, hədəfsiz filial düşürdü və
  satışı **heç yerdə görünmürdü**. Real datada (avqust 2026):
  **Əcəmi 33 261 ₼ + Abdülkerim Alizadə 19 925 ₼ = 53 186 ₼**. Panel şəbəkə
  satışını 920 586 ₼, «Gerçək» cəmini isə 867 401 ₼ göstərirdi — fərq izahsız.
  - Artıq hədəfsiz filiallar **adla və satışla ekranda göstərilir**, «Satış
    hədəfi» səhifəsinə keçid verilir, və cəm izlənə bilir:
    `müqayisə + hədəfsiz = şəbəkə satışı`.
  - Bölgə səviyyəsində də eyni: İsmayıl 266 371 ₼ yerinə 246 446 ₼,
    Ceyhun 145 518 ₼ yerinə 112 257 ₼ görünürdü.
- **🔴 «HƏDƏFƏ GÖRƏ %102» ŞİŞİK İDİ — doğru rəqəm %96.**
  Pay BÜTÜN filialların ay proqnozu (4 076 881 ₼), məxrəc isə YALNIZ hədəfli
  filialların hədəfi (4 008 000 ₼) idi. «Hədəfi aşdıq» kimi oxunurdu, halbuki
  hədəfin **altında**. Pay və məxrəc artıq **eyni filial dəstindədir**.
  Üstəlik etiket dəqiqləşdi («Hədəfə görə (proqnoz) · ay sonu proqnozu / hədəf»)
  — əvvəl %102 (proqnoz) və %22 (bugünə qədər) yan-yana ziddiyyət kimi görünürdü;
  ikisi FƏRQLİ sualdır, hər ikisi doğrudur.
- **Hesablama saf funksiyaya çıxarıldı** (`target-attainment.ts`): məntiq
  komponentin içində olduğu üçün heç bir test onu tutmurdu. Artıq **8 regresiya
  testi** var, o cümlədən köhnə səhv davranışın reproduksiyası (%102 vs %96) və
  «cəm izlənə bilir» iddiası. Bölgə hesablaması da eyni funksiyadan gəlir.
- Delivery alt yazısı `own_delivery` varsa «Wolt+Bolt+öz» olur (əvvəl bu sətir
  cəmə daxil idi, amma etiket «Wolt+Bolt» deyirdi).

### Fixed — «/dashboard niyə boşdur» + tək fayl kifayət edir
- **🔴 Dashboard boş görünürdü — səbəb: İKİ AYRI MƏNBƏ.** Böyük «Günlük Satış»
  kartı `daily_sales` cədvəlindən oxuyurdu, onu isə YALNIZ `/api/sales/daily`
  (ƏL İLƏ giriş) doldurur — heç kim işlətmirdi. Real satış datası
  `analytics_daily_fact`-da HAZIR dururdu, lakin dashboard ona baxmırdı.
  Artıq fakt varsa **ondan** oxunur: günlük satış, əvvəlki gün, ay cəmi.
  - **Fakt `daily_sales`-ə KÖÇÜRÜLMÜR:** eyni rəqəmi iki cədvəldə saxlamaq
    İKİ HƏQİQƏT yaradır — iyulda datanın «yoxa çıxması» məhz bundan oldu
    (`docs/DENETIM-2026-08-04.md` §1). **Tək mənbə, çox oxucu.**
  - **Hədəf yoxdursa faiz göstərilmir:** əvvəl hədəfsiz halda `0%` və qırmızı
    çubuq çıxırdı — «pis gedir» kimi oxunurdu, halbuki hədəf sadəcə təyin
    edilməyib. Artıq «Hədəf yoxdur» yazılır + hədəf təyin etmə linki.
  - **Mənbə ekranda göstərilir** (fakt / əl ilə) — oxucunun hansı mənbəyə
    baxdığı görünməz qalmasın (iyul hadisəsinin dərsi).
  - **Rəqəm formatı düzəldildi:** `toLocaleString('az-AZ')` minlikləri NÖQTƏ
    ilə ayırır (`129.193 ₼`) və «129 manat» kimi oxuna bilirdi → boşluqlu
    formata keçildi (`129 193 ₼`), Günlük Panel deseni ilə eyni.
- **📈 Günlük Panel artıq fakt cədvəlindən qurulur** (`src/lib/analytics/facts-to-panel.ts`,
  `panel/page.tsx`): PRODMIX + ÇEK faylını atmaq **kifayət edir** — ayrıca aylıq
  satış faylı yükləmək məcburiyyəti bitdi. Fakt datası daha incə qranuldadır
  (gün × filial × ödəniş növü) və **çek sayını da daşıyır**, ona görə mövcud
  olduqda ondan qurulur. Blob yolu **SİLİNMİR** — fakt yüklənməmiş köhnə aylar
  yenə görünür; dövr siyahısına fakt ayları da əlavə olunur (əks halda yalnız
  PRODMIX/ÇEK yüklənmiş ay dropdown-da görünməz qalardı).
  - Panel başlığında mənbə və çek sayı/ortalama çek göstərilir.
  - `own_delivery` delivery payına daxil edildi (blob-da bu sətir yox idi).
  - Adapter SAF funksiyadır → 9 unit testlə örtülü.
  - **Doğrulama (PGlite + real fayl):** paneldeki bütün cəmlər üst-üstə düşür —
    toplam **920 585,71 ₼**, ödəniş qarışığı cəmi = toplam, günlük seriya cəmi =
    toplam, filial cəmi = toplam, 29 filial · 5 bölgə, 43 212 çek ·
    ortalama çek 21,30 ₼. Dashboard: günlük satış 129 193 ₼ (07.08),
    əvvəlki gün 127 139 ₼, ay 920 586 ₼, müştəri 6 123.

### Added — Maya/kateqoriya hazırlığı (sütun gələn gün işləyəcək)
- **`Maya dəyəri` + `Kateqoriya` sütunları əvvəlcədən dəstəkləndi**
  (`parse-sales-detail.ts`, `fact-save/route.ts`, `detail-upload.tsx`,
  `analytics_item_fact.cost` / `.category`, `drizzle/migrations/0012`).
  Analitika şöbəsindən istənildi; **fayl gələn gün ikinci deploy gözlənilməsin**
  deyə boru xəttinin hamısı hazırlandı. Sütun yoxdursa heç nə pozulmur
  (`optional: {cost, category}` ilə vəziyyət yükləmə ekranında göstərilir);
  gəldikdə **food cost dərhal görünür** və menyu matrisi ciro payından
  **marja** əsasına keçə bilər.
  - `Maya dəyəri` = **1 ədəd**, `Maya məbləği` = **sətir cəmi** — ikisi ayrı
    oxunur, qarışmır. Birləşən açarlarda maya **toplanır**.
  - **Səhv şərh səssiz keçmir:** sətir cəmi «1 ədəd» sütununda gəlsə food cost
    qeyri-real çıxır (%300) və xəbərdarlıq verilir — nəticə səssizcə istifadə
    edilmir.
  - Təkrar yükləmədə maya/kateqoriya gəlmirsə **köhnə dəyər silinmir**
    (`coalesce` qoruyur) — PGlite ilə yoxlandı.
  - Migration 0012 **add-only** (`add column if not exists`), destruktiv
    sayılmır, təkrar tətbiq no-op.
- **`docs/IIKO-GUNLUK-EXPORT.md` §6.1, §6.2, §8 genişləndi:**
  - **«Wolt/Bolt/kart satışını da əlavə edək» — LAZIM DEYİL.** Kanal satışı
    artıq B vərəqindəki `Ödəniş növü`-ndən tam çıxır; fayldan xam çıxarış
    cədvəl halında sənədə əlavə olundu (9 ödəniş növü, cəmi 920 585,71 ₼ =
    gün cəmi). Üçüncü vərəq artıqdır.
  - **«Saatlik satış varmı?» — YOX.** Yoxlanıldı: PRODMIX `Uçot günü` və ÇEK
    `Tarix` hücrələrinin **0-ında** kəsr hissə (saat) var — 39 549 + 43 812
    hücrə, hamısı tam gün. Saat üçün iiko-dan yeni sütun tələb olunur.
    (`HƏFTƏ GÜNÜ` isə mövcuddur və tarixdən də çıxarılır.)
  - **§8 artıq kopyala-göndər mətnidir** — analitika şöbəsinə olduğu kimi
    yazılacaq tam sifariş (iki vərəq, sütun adları, `Maya dəyəri`-nin 1 ədəd
    olduğu, kumulyativ aralıq, dəyişsə problem olmayanlar, növbəti mərhələ).

### Added — Filial/bölgə kırılımı + iiko export müqaviləsi
- **🔎 Drill-down: bölgə → filial** (`/dashboard/analitika`): bölgə kartına və ya
  filial sətrinə basanda BÜTÜN rapor həmin əhatəyə düşür (menyu mühəndisliyi,
  upsell, məhsul cədvəli, ödəniş qarışığı — hamısı). Kırılım yolu (breadcrumb)
  ilə geri qayıdış. Texniki: səhifə `scopeFilials` massivi üzərində qurulduğu
  üçün onu daraltmaq kifayət etdi — ayrı sorğu dəsti yazılmadı.
  - **MÜQAYİSƏ SƏTRİ:** tək rəqəm məna daşımır. Filial/bölgə seçildikdə
    «əhatə cirosunun %X-i · ortalama çek Y ₼, şəbəkə ortalaması Z ₼ → ±%W»
    göstərilir; −%5-dən aşağı olanlar «upsell hədəfi» kimi işarələnir.
  - **RBAC sızıntısı bağlı:** URL-dəki `?filial=`/`?bolge=` RBAC əhatəsindən
    kənardırsa NƏZƏRƏ ALINMIR (yoxlandı: kənar filial sorğusu 0 qaytarır).
  - Doğrulama (PGlite + real data): bölgə cəmləri şəbəkə cəminə **bərabər**
    (920 585,71 ₼ / 43 212 çek), hər bölgənin drill-down nəticəsi kart rəqəmi
    ilə **eyni**. Bölgə fərqi: Ramin 26,34 ₼ vs Elnur 17,76 ₼ ortalama çek.
- **📄 `docs/IIKO-GUNLUK-EXPORT.md`** — analitika şöbəsinə verilən export
  müqaviləsi: hansı iki vərəq, hansı sütun adları, nə dəyişsə problem olmur
  (sıra, əlavə sütun, vərəq adı, tarix formatı), nə sındırır, hansı aralıq
  (ayın 1-dən bugünə — upsert natamam günü özü düzəldir) və prioritetli əlavə
  sütun siyahısı (`Maya dəyəri` → marja əsaslı Kasavana-Smith, `Kateqoriya`,
  `Saat`, `Kassir`…). **Tək düz cədvəl tövsiyə EDİLMİR:** iki müstəqil mənbə
  bizim yeganə səhv tutucumuzdur (07.08-dəki 40 652 ₼ boşluğu yalnız
  tutuşdurma ilə göründü) və hissə-hissə ödənən qəbz tək cədvəldə məhsulları
  ikiqat sayardı.
- **F-31 filial bağlantısı** (`filial-map.ts`, `drizzle/migrations/0011`):
  OCAQ-da ünvana görə **`Abdülkerim Alizadə`** adlandırıldı, iiko hələ
  `Mytcha` yazır. Kanonik ad OCAQ adı oldu (`branches.name` ilə eyni olmalıdır,
  yoxsa `branch_id` bağlanmır), iiko adı və yazılış variantları (`Mycta`,
  `Myctha`, `Abdulkerim Alizade`) alias-a çevrildi.
  - **Migration 0011:** əvvəl `Mytcha` kimi yazılmış sətirləri köçürür (əks halda
    avqust datası İKİ ADA BÖLÜNƏRDİ) və `branch_id`-ni doldurur. Heç bir sətir
    silinmir; unique açar toqquşması olarsa köhnə sətir olduğu kimi qalır.
    PGlite ilə yoxlandı: 0 qalıq sətir, ciro qorundu, təkrar tətbiq no-op,
    toqquşma halında köhnə sətir qorundu.

### Fixed — migration guard
- `scripts/apply-migration.mjs` destruktiv naxışı `update`-i də tutur, **cədvəl
  aliası ilə birlikdə**: `update "t" d set …` ilk yazılışda tutulmurdu və 0011
  destruktiv sayılmırdı (yoxlanarkən aşkarlandı). Artıq 0011 `--apply`-da
  exit 2 ilə dayanır, 0010 (yalnız `create … if not exists`) təsirlənmir.

### Added — Məhsul Analizi
- **📊 `/dashboard/analitika` — məhsul analizi ekranı**: yükləmə datanı bazaya
  yazırdı, lakin heç bir ekran onu OXUMURDU — dashboard-daki 3 kart faylın
  içindəki məhsul-səviyyəli detayın kiçik bir hissəsi idi. Bu route əvvəl
  `/dashboard/panel`-ə **ölü yönləndirmə** idi (sidebar-da «Analitika» və
  «Günlük Panel» eyni yerə gedirdi); heç nə silinmədən real səhifəyə çevrildi,
  Günlük Panel keçidi başda saxlanıldı.
  - **Menyu mühəndisliyi (Kasavana-Smith):** Ulduz / At / Tapmaca / İt
    kvadrantları, hər birində **say + ciro payı**. Real datada: ⭐41 çeşid =
    cironun **%82,2**-si, 🐕221 çeşid = yalnız **%10,4** (menyu sadələşdirmə
    adayı). Yalnız say göstərmək yanıldıcı olurdu.
  - **DÜRÜSTLÜK:** matris **ciro payı** ilə qurulub, **marja** ilə deyil — maya
    datası bazada saxlanmır (`/dashboard/menyu`-da fayldan oxunur). Bu, ekranda
    açıq yazılıb. Klassik üsulun KATEQORİYA daxilində tətbiq olunduğu və
    kateqoriya sütunu olmadığı da qeyd olunur.
  - **💰 Upsell fırsatı:** çek başına ədəd (attach rate) filial vs şəbəkə.
    Real datada «ÇAY DƏSTGAHI» üzrə şəbəkə fürsəti **19 447 ₼** (Torgoviy
    0,046 vs şəbəkə 0,115 ədəd/çek → 1 947 ₼).
  - Məhsul cədvəli (sıralanabilir): ədəd, ciro, ciro payı, orta qiymət,
    ədəd/çek, filial sayı, çoxlu məhsul kodu göstəricisi.
  - Filial cədvəli: ciro, çek, ortalama çek (şəbəkə ortalamasının %95-dən aşağı
    olanlar qırmızı), delivery payı. Real datada **Seabreeze 32,76 ₼ vs
    Əhmədli 15,21 ₼** — 2,15× fərq.
  - Ödəniş qarışığı + **gəlir gətirməyən sətirlər ayrıca göstərilir** (silinmir):
    servis sayğacı 159 124, kombo daxili 49 553, modifikator 16 351,
    qablaşdırma 15 035.
  - Aqreqasiya SQL-dədir (36 975 sətri brauzerə daşımırıq). RBAC: super_admin
    şəbəkəni görür, digər rollar yalnız öz filiallarını; `branch_id` boş
    sətirlər onlara görünmür.
  - **Doğrulama (PGlite + real fayl):** ödəniş qarışığı cəmi gün cəminə
    **kuruşu kuruşuna bərabər** (920 585,71 ₼), məhsul cirosu 961 237,84 ₼,
    kvadrant payları cəmi %100, 286 çeşid · 29 filial.
- Yükləmə ekranındaki «filial tapılmadı» xəbərdarlığı dəqiqləşdi: artıq
  `/dashboard/branches`-ə birbaşa yönləndirir və nəticəni izah edir (data
  görünür, lakin bölgə/filial müdiri onu görməz).

### Fixed
- **🔴 `item: Database request failed` — 40 000 parametrli sorğu** (`fact-save/route.ts`):
  yazma sındı. Səbəb: hər sətir üçün ayrı placeholder qrupu qurulurdu → 4000
  məhsul sətri = **40 000 parametr + ~440 KB SQL mətni**. Neon HTTP sürücüsü
  bunu rədd etdi (Postgres xətası deyil, HTTP qatının rəddi — ona görə izahat
  gəlmirdi). `daily` keçdi (~600 sətir), `item` sındı.
  **Düzəliş:** `unnest($1::uuid[], …)` — sütun başına BİR massiv parametri.
  SQL mətni **sabit ~600 bayt**, parametr sayı **sabit 10** (Postgres limiti
  65 535; artıq ona yaxınlaşmırıq). Sürücünün `arrayString` kodlayıcısı `null`-ı
  `NULL` kimi yazır → boş `branch_id` təhlükəsizdir (mənbədən yoxlandı).
  Chunk 4000 → **2000**, üstəlik sınma halında **avtomatik yarıya enən** paket
  (idempotent olduğu üçün təkrar cəhd zərərsizdir). Xəta mesajı artıq
  teşhis edilə bilir (`pgCode`, `cause`, sətir sayı).
- **🔴 SƏSSİZ DATA İTKİSİ — təkrar açar chunk-lar arasında** (`parse-sales-detail.ts`):
  `parseProdmix`-in sənədlənmiş qranulu «filial × gün × məhsul» idi, LAKİN
  aqreqasiya etmirdi — hər xam sətri ayrıca qaytarırdı. Faylda eyni açar
  təkrarlanır (real data: 39 549 sətir → **36 975 unikal açar**, 2 538 təkrar;
  hamısının məhsul adı EYNİ). Chunk-lar təkrarı ayırırdı, ikinci chunk
  birincinin **üzərinə yazırdı (toplamırdı)** → **2 574 sətir və 102 227,56 ₼
  ciro yox olurdu** (859 010,28 ₼ yerinə 961 237,84 ₼ olmalıydı).
  Səbəb: bir kanonik filial altında iki fiziki nöqtə ola bilər (məs. ALIASES
  `Torgoviy Yuxarı` + `Torgoviy Aşağı` → `Torgoviy`).
  **Düzəliş:** parser açar üzrə toplayır → hər açar bir dəfə, chunk-lama
  təhlükəsiz. `kind` TOPLANMIŞ məbləğə görə təyin olunur. Birləşdirmə **səssiz
  deyil**: `mergedKeys` qaytarılır və yükləmə ekranında göstərilir.
- **Doğrulama — REAL POSTGRES + REAL FAYL (PGlite WASM):** migration 0010 tətbiq
  olundu (təkrar tətbiq no-op), route-un ƏSL SQL-i işlədildi, 36 975 məhsul +
  983 gün sətri 20 sorğuda yazıldı (2,5 s). Nəticələr:
  göndərilən = yazılan (**itki YOX**), məhsul cirosu **961 237,84 ₼** (birebir),
  ay cəmi **920 585,71 ₼ · 43 212 çek · ortalama çek 21,30 ₼**,
  ikinci yükləmə sətir sayını **artırmadı** (idempotent), uyğunlaşmayan filial
  **yox** (Mytcha daxil), `coalesce` semantikası doğru (null `receipts`/`source`
  köhnə dəyəri qorudu). Unit testlər: **41/41**.
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
