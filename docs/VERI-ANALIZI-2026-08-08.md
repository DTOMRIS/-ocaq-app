# İki Excel faylının analizi — prodmix və çek verisi tapıldı

Tarix: 8 avqust 2026
Fayllar: `avqust_plan.xlsx` (11 MB, 9 vərəq) · `ödəniş şərtləri.xlsx` (10 MB, 5 vərəq)
Metod: fayllar tam oxundu (stdlib zip+XML), sətir-sətir sayıldı, OCAQ kodu ilə tutuşduruldu.

---

## 1. Nə tapıldı — bütün sessiyanın «əskik» dediyi data

### `avqust_plan.xlsx`

| Vərəq | Sətir | Məzmun |
|---|---|---|
| **BAZA 2026** | **39 549** | `Uçot günü · Bölmə kodu · Ticarət müəssisəsi · Məhsulun kodu · Məhsul · **Məhsulların sayı** · Endirimli məbləğ` |
| **BAZA 2025** | **128 189** | eyni struktur, keçən il |
| GÜNLÜK | 34 | gün-gün: `Satış 2025 · Plan 2026 · Satış 2026 · Gerçəkləşmə · MTD` + həftə günü hər iki il üçün |
| PLAN | 31 | `filial · avqust plan · **bölgə müdiri adı** · faktiki · ay sonu gedişat · ay sonu %` |
| BM | 36 | bölgə müdiri üzrə qruplaşdırılmış |
| Bölgələr | 55 | bölgə səviyyəsində plan/faktiki/gerçəkləşmə |
| Лист5 | 75 953 | əməliyyat səviyyəsi (gün · məbləğ · ay · həftə günü) |
| DASHBOARD | 0 | boş |

**`BAZA 2026` = PRODMIX.** `filial × gün × məhsul × ƏDƏD × məbləğ`.
Bu, bütün sessiya boyunca «yoxdur» deyilən verinin özüdür
(`docs/DENETIM-2026-08-04.md` §4: *"OCAQ-ın heç bir yerində məhsul bazlı satış
ƏDƏDİ yox"*, `parse-menu.ts:3`: *"Kasavana-Smith matrisi ayrıca prodmix (ədəd)
istəyir"*).

**Ölçülər:** 29 filial · 443 unikal «məhsul» · 7 gün (01–07 avqust 2026) ·
431 456 ədəd · **961 237,84 ₼**

✅ **Tutarlılıq təsdiqi:** prodmix cəmi (961 237,84) `PLAN` vərəqinin
«Faktiki satış» (961 237,84) və `GÜNLÜK` vərəqinin cəmi (961 237,84) ilə
**birebir** üst-üstə düşür. Yəni fayl daxilində uzlaşmadır.

### `ödəniş şərtləri.xlsx`

| Vərəq | Sətir | Məzmun |
|---|---|---|
| **Baza 2026** | **43 812** | `Ticarət müəssisəsi · Tarix · Ödəniş növü · **Qəbzin nömrəsi** · məbləğ` |
| **Baza 2025** | 46 517 | eyni struktur, keçən il |
| 2025 | 158 640 | 2025-in daha geniş dataseti |
| xülasə / DASHBOARD | 12 / 22 | ödəniş növü özeti |

**`Qəbzin nömrəsi` = ÇEK NÖMRƏSİ.** Yəni:

| Göstərici | Dəyər (7 gün) | OCAQ-da hazırkı hal |
|---|---|---|
| **Çek sayı** | **43 212** | `—` (`dashboard/page.tsx`) |
| **Ortalama çek** | **21,30 ₼** | `—` |
| Cəmi | 920 585,71 ₼ | — |

Bu iki KPI dashboard-da aylardır «məlumat mənbəyi yoxdur» yazır. Mənbə budur.

---

## 2. 🔴 DÖRD PROBLEM — düzəldilmədən istifadə edilməməli

### 2.1 Prodmix-in ən çox «satılan məhsulları» MƏHSUL DEYİL

| Ədəd | «Məhsul» | Nədir |
|---|---|---|
| 98 160 | **Servis** | xidmət sayğacı |
| 40 086 | **Take away** | götür-apar işarəsi |
| 21 239 | Ayran | ✅ real məhsul |
| 20 214 | SHAURMA LAVAŞDA BÖYÜK | ✅ real məhsul |
| 15 435 | **Paket** | qablaşdırma |
| 15 034 | **STƏKAN SAYI** | stəkan sayğacı |

İlk 6-nın **4-ü məhsul deyil**. Xam prodmix-dən düzəldiləcək Kasavana-Smith
matrisi «Servis»-i şəbəkənin bir nömrəli **Ulduz** məhsulu kimi göstərər.

**Həll:** `filial-map.ts:68`-dəki `EXCLUDE` deseninin məhsul versiyası —
`PRODUCT_EXCLUDE` (Servis, Take away, Paket, Stəkan sayı, servis haqqı və s.).
Bu siyahı **istifadəçi tərəfindən təsdiqlənməlidir**, mən təxmin etməyəcəm.

### 2.2 🔴 Ödəniş növləri iki il arasında FƏRQLİDİR — və bu ən böyük sürücünü şübhə altına alır

**2026 (9 növ):**
Nağd 34,7% · Uni Bank 26,1% · Kapital Bank 16,6% · WOLT SATIŞ 12,2% ·
BOLT SATIŞ 3,9% · UNIBANK PAX A35 3,9% · ATB bank 2,4% ·
Delivery SeaBreeze 0,2% · Wolt Storefront 0,03%

**2025 (7 növ):**
Nağd · Uni Bank · Kapital Bank · **Pasha bank** · *WOLT · BOLT · **YANGO**

Fərqlər:
- **YANGO 2025-də var, 2026-da YOX** — çatdırılma platformasıdır, çıxılıb
- **Pasha bank 2025-də var, 2026-da yox**; **ATB bank 2026-da var, 2025-də yox**
- Adlandırma dəyişib: `*WOLT` → `WOLT SATIŞ`, `BOLT` → `BOLT SATIŞ`

> ### ⚠️ Bunun nəticəsi ciddidir
> Artifact-lardaki **`Delivery (Wolt/Bolt) YoY −22,0%`** rəqəmi və Portföy-ün
> ən böyük sürücüsü **📦 Delivery düşüşü — 333 451 ₼/ay (havuzun %58-i)**
> 2025 bazasında **YANGO-nun sayılıb-sayılmadığından** asılıdır:
>
> - YANGO 2025 delivery bazasına DAXİLDİRSƏ → düşüşün bir hissəsi
>   **performans deyil, kanaldan çıxış**dır. Yəni «Wolt-u aktiv idarə et»
>   tövsiyəsi problemin bir qismini həll etməz.
> - YANGO DAXİL DEYİLSƏ → müqayisə natamamdır, −22% səhvdir.
>
> **Bu netləşməyincə havuzun %58-i şübhəlidir.** OCAQ-ın
> `parse-delivery.ts`-i yalnız wolt/bolt tanıyır — YANGO onun üçün mövcud deyil.

Əlavə: OCAQ `parse-daily.ts` ödənişi 4 səbətə yığır (`nagd/kart/wolt/bolt`).
Bu fayldaki 9 növ normalizasiya tələb edir və **`Delivery SeaBreeze` heç bir
səbətə düşmür → itir**. Kart tərəfi isə əslində 4 acquirer-dir:
Uni Bank + UNIBANK PAX A35 + Kapital Bank + ATB = **%49,0**.

✅ **Yaxşı xəbər:** `src/lib/analytics/bank-reconcile.ts` artıq Unibank / ATB /
Kapital xəritələrini saxlayır. Yəni bu fayl **panel satışını kasa-banka
mutabakatına bağlayan əskik halqadır**.

### 2.3 🟠 İki faylın cəmi uyuşmur — 40 652 ₼ (%4,2)

| Mənbə | Cəmi (01–07 avqust) |
|---|---|
| Prodmix (BAZA 2026) | 961 237,84 ₼ |
| Çeklər (ödəniş Baza 2026) | 920 585,71 ₼ |
| **Fərq** | **40 652,13 ₼ · %4,2** |

Prodmix `PLAN` və `GÜNLÜK` ilə uzlaşır, yəni **ehtimal ki çek faylı natamamdır**
(bir ödəniş növü, bir filial-gün, yaxud ödənişsiz çeklər — ikram/personal
yeməyi — daxil edilməyib). **Hansının «doğru satış» sayıldığı təsbit edilməlidir**
— əks halda «Ortalama çek 21,30 ₼» rəqəmi %4 yanlış olar.

### 2.4 🟡 `Mytcha` — tanınmayan filial

29 filial adının **28-i** OCAQ `filial-map.ts` ilə birebir uyğundur.
Tanınmayan: **`Mytcha`** (plan 100 000 ₼, bölgə müdiri İbrahimov İsmayıl).

OCAQ-ın İsmayıl bölgəsində faylda olmayan tək filial: **`Bulvar Festival`**.
Yəni `Mytcha` ehtimal ki onun başqa yazılışıdır — **amma təsdiq lazımdır**,
təxminlə xəritəyə yazmaq yanlış rəqəm yaradar.

`Masazır` faylda yoxdur — bu **düzgündür**: `docs/DENETIM-2026-08-04.md`-də
qeyd olunub ki Masazır bağlıdır (Saha Nəzarət 28 filial deyir). ✔

---

## 3. Bu fayllar nəyi AÇIR

### Dərhal (yalnız normalizasiya lazım)
| Nəticə | Mənbə |
|---|---|
| **Ortalama çek 21,30 ₼** · **Çek sayı 43 212** | `Qəbzin nömrəsi` |
| Filial × gün × ödəniş növü (9 növ, acquirer səviyyəsi) | ödəniş Baza |
| Gün-gün plan / faktiki / keçən il | `GÜNLÜK` |
| Filial × plan × faktiki × ay sonu proqnozu | `PLAN` |
| Bölgə müdiri adları (5 nəfər, filial-filial) | `PLAN` C sütunu |
| Kasa-banka mutabakatına bağlantı | acquirer adları ↔ `bank-reconcile.ts` |

### Prodmix ilə (məhsul filtri təsdiqlənəndən sonra)
| Nəticə | Qiymət |
|---|---|
| **Kasavana-Smith matrisi** (Ulduz/İşçi at/Bilməcə/İt) | menyu mühəndisliyinin özü |
| **Ciro ağırlıqlı REAL food cost** | hazırkı çəkisiz ortalama səhvdir |
| **🥤 Upsell fırsatı** | **47 234 ₼/ay** (Portföy) |
| İçki attach rate, məhsul YoY (2025 prodmix da var) | — |
| Promo kanibalizasyon ölçümü | promo modulunun əskik yarısı |

**Fırsat havuzuna təsiri:** 376 230 ₼ → **+47 234 ₼ = 423 464 / 575 085 = %74**
(əvvəl %65). Qalan %26 üçün hələ silinmə raporu, reyting feed-i və kadro
norması lazımdır.

---

## 4. Necə qurulmalı — və niyə mövcud desen YARAMAZ

### Həcm problemi
7 GÜNLÜK data: 39 549 (prodmix) + 43 812 (çek) = **83 361 sətir**.
Bir ay ≈ **350 000 sətir**. İki illik tarixçə ≈ milyonlarla.

Hazırkı Panel deseni parse nəticəsini **tək JSON blob** kimi
`analytics_ingest.network`-ə yazır (`panel-save/route.ts:25,35`). Bu həcm ora
sığmaz və sığsa da sorğulanmazdır (ay-üstü-ay məhsul müqayisəsi JSON blob-da
mümkün deyil). Üstəlik iyul hadisəsi göstərdi ki blob deseni datanı
**görünməz** edə bilir (`DENETIM-2026-08-04.md` §1).

### Doğru quruluş — sənədləşdirilmiş fact cədvəli, indi əsaslanır
```
analytics_daily_fact
  tenant_id · branch_id · filial · business_date · payment_type · amount
  + receipt_count            ← ödəniş faylından
  UNIQUE(tenant_id, filial, business_date, payment_type)

analytics_item_fact
  tenant_id · branch_id · filial · business_date · item_code · item_name
  · qty · amount
  UNIQUE(tenant_id, filial, business_date, item_code)
```
`engine_version` yalnız **lineage sütunu** kimi qalır — oxuma filtri OLARAQ
İSTİFADƏ EDİLMİR (iyul hadisəsinin kök səbəbi bu idi).

### İngest yolu
Vercel body limiti 4,5 MB-dır (kod bunu qeyd edir) → fayl **brauzerdə** parse
olunur (mövcud desen doğrudur), lakin nəticə **xam sətirlər halında, hissə-hissə
(chunk)** POST edilir; server tərəfdə idempotent upsert (`ON CONFLICT`).
Aqreqasiya **SQL-də** olur, JS-də yox.

---

## 5. Təklif: BƏLİ, edilməlidir — bu sıra ilə

**Addım 0 — istifadəçi təsdiqi (kod yazılmır)**
1. `PRODUCT_EXCLUDE` siyahısı: Servis · Take away · Paket · Stəkan sayı —
   başqa nə var? (443 məhsulun tam siyahısı çıxarıla bilər)
2. `Mytcha` = `Bulvar Festival`-dır, yoxsa ayrı filial?
3. YANGO 2025 delivery bazasına daxildir, yoxsa xaric?
4. Hansı cəmi «doğru satış»dır — 961 237 (prodmix) yoxsa 920 586 (çek)?

**Addım 1 — fact cədvəli + migration** (Neon snapshot + açıq təsdiq lazım)

**Addım 2 — `parse-prodmix.ts` + `parse-receipts.ts`**
`parse-daily.ts` deseni ilə; `normalizeFilial` yenidən istifadə;
ödəniş növü normalizasiya xəritəsi (9 → kanonik + YANGO/Pasha tarixi üçün).

**Addım 3 — dərhal görünən nəticə**
Dashboard-daki `Ortalama Çek` və `Çek Sayı` kartlarını canlandır (`—` bitir).
Bu, ən az işlə ən çox görünən qazancdır.

**Addım 4 — menyu mühəndisliyi**
Prodmix + mövcud `parse-menu.ts` maya siyahısı → Kasavana-Smith matrisi,
ciro ağırlıqlı food cost, Upsell fırsatı.

**Addım 5 — Aylıq Trend / Teşhis / Board**
Fact cədvəli üzərində SQL ilə; artıq JSON blob-dan asılı deyil.

---

## 6. Bir xəbərdarlıq

Bu fayllar **7 günlük**dir (01–07 avqust). Yəni:
- Aylıq/illik analiz üçün **hər ay bu iki fayl lazımdır** — proses qurulmalıdır
  (kim, nə vaxt, hansı iiko hesabatını çıxarır)
- 2025 tərəfi daha genişdir (128 189 + 158 640 sətir) → YoY bazası var
- Fact cədvəli qurulduqdan sonra hər yeni fayl **üzərinə əlavə olunur**,
  köhnəni əvəz etmir (idempotent upsert) — iyulun itməsi kimi hadisə təkrarlanmaz

---

_Fayllar oxundu və sətir-sətir sayıldı; heç bir dəyər təxmin edilmədi.
OCAQ kodu `fayl:sətir` ilə tutuşduruldu. Heç bir fayl dəyişdirilməyib._
