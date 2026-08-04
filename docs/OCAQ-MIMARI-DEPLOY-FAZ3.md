# OCAQ — Ana Sayfa, Deploy Axını və Faz 3 Modulları

> Sual: "sayfa hangisi, main nerede, deploy nasıl, teşhis/konsol/board/aylık trend/saha ne olacak?"
> Bu sənəd hamısını bir yerdə cavablayır.

## 1. Ana səhifə / giriş nöqtəsi

- **Canlı ünvan:** `https://ocaq.dkagency.com.tr`
- **Giriş sonrası ana səhifə:** `/dashboard` (İdarə paneli) — KPI kartları + Tez Keçidlər
- **Kod strukturu (Next.js App Router):**
  - `src/app/layout.tsx` — kök layout
  - `src/app/dashboard/layout.tsx` — **sidebar + shell** (bütün `/dashboard/*` səhifələri bunun içindədir)
  - `src/components/sidebar.tsx` — sol menyu (rol-a görə linklər)
  - Hər modul = `src/app/dashboard/<ad>/page.tsx` (server) [+ `<ad>-client.tsx`]
- **"main" budur:** ayrı bir `main.js` yoxdur — Next.js App Router-dır; giriş `src/app/`.

## 2. Vercel deploy axını

**Necə işləyir:**
1. Kod dəyişikliyi → `git push origin main` (GitHub: `DTOMRIS/-ocaq-app`)
2. Vercel `main`-i izləyir → avtomatik **build** edir
3. `main` **Production Branch** olduğu üçün → birbaşa `ocaq.dkagency.com.tr`-ə çıxır.
   Digər bütün branch-lar → **Preview** URL-i (canlıya təsir etmir)

**⚠️ Üç qeyd (vacib):**
- **Production Branch = `main`** — Vercel-də yoxlanıldı (2026-08-04) və **doğrudur, dəyişdirilməməlidir**.
  Ayarın yeri: **Vercel → Settings → Environments → Production → Branch Tracking**
  (❌ `Settings → Git`-də DEYİL — Vercel bu ayarı köçürüb; bu sənədin köhnə versiyası səhv yer göstərirdi).

  **Task #4 BAĞLANDI — və cavab gözlənilən deyildi.** Ayar heç vaxt səhv deyildi;
  problem `main`-in **10 iyul-da donmuş** qalması idi (`e128b9e`). Bütün iş
  `feat/analytics-on-commercial` və `claude/*` branch-larında yığılırdı → Vercel onları
  sadəcə **Preview** kimi build edirdi. Ona görə aylarla "canlıdadır" deyilən iş
  əslində canlıda DEYİLDİ; canlı 10 iyul kodunu işlədirdi və yalnız **əl ilə
  "Promote to Production"** ilə yenilənirdi.
  2026-08-04: `main` fast-forward ilə `c5f0576`-ya gətirildi → avtomatik zəncir bərpa
  olundu (Vercel-də təsdiqləndi: `main` · `c5f0576` · Production · Ready).

  **Nəticə qaydası:** canlıya çıxacaq hər şey **`main`-ə** getməlidir. Başqa branch-a push
  canlıya çıxmır — orada "build yaşıldır" görüntüsü aldadıcıdır.
- **Migration-lar avtomatik ÇALIŞMIR.** Deploy yalnız kodu build edir — DB schema
  dəyişiklikləri (yeni cədvəl/kolon) **əl ilə** tətbiq olunmalıdır (prod DATABASE_URL ilə).
  2026-08 drift bundan yarandı.

  ⚠️ **`scripts/migrate-prod.mjs` REPODA YOXDUR** (yoxlanıldı 2026-08-04; `scripts/`-də
  yalnız `alter-promotions.mjs` və `create-promotions.mjs` var). O skript yalnız lokal
  diskdədir → yəni prod DB-ni düzəldən alət versiya nəzarətində deyil və başqa heç kim
  (yeni agent daxil) onu işlədə bilməz. Bu, `CLAUDE.md` §3 qırmızı xəttinin pozulmasıdır
  ("prod-a ad-hoc skript yox — versiyalı migration + review").
  **Görülməli iş:** skript repoya alınsın (`package.json`-a `db:migrate-prod` kimi bağlansın),
  ya da `drizzle/migrations/*.sql`-i idempotent tətbiq edən versiyalı əvəzi yazılsın.
- **Sıra takılırsa:** çox ardıcıl push → Vercel Hobby tək build → növbə. Son commit-i "Redeploy" et.

## 3. Deep-analiz modulları — Python motor → OCAQ statusu

Dərin analizlər `~/codelar/shaurma-analiz-sistemi/motor/` içində **Python motoru** kimi mövcuddur.
Bəziləri OCAQ web-ə köçürülüb, əksəriyyəti **hələ köçürülməyib (Faz 3)**.

| Analiz | Python motoru | OCAQ statusu |
|---|---|---|
| Gidişat / KPI | `gidisat_analisti.py`, `analitik_kpi.py` | ✅ **Günlük Panel** |
| Menyu / food cost | `menyu_muhendisi.py` | ✅ **Menü** |
| Promo / marketing | `marketing_analitik.py`, `promo_simulator.py`, `promo_surec.py` | ✅ **Promosyonlar** (qismən — promo idarəsi; simulyator yox) |
| Kasa-banka mutabakat | (bank recon TS) | ✅ **Kasa/Banka** |
| **Filial Teşhis** | `filial_teshis.py` | ⏳ **YOX** (Panel-də "diqqət istəyən filiallar" qismən) |
| **Aylıq Trend** | `aylik_trend.py` | ⏳ **YOX** (Panel-də dövr arxivi var, trend qrafiki yox) |
| **Board** | `board_html.py` | ⏳ **YOX** (idarəçi icmal lövhəsi) |
| **Konsol** | `konsol.py` | ⏳ **YOX** (birləşik idarə konsolu) |
| **Portföy** | `portfoy.py` | ⏳ **YOX** (filial portfolio analizi) |
| **Kadro / Labor** | `kadro_html.py`, `norm_kadro_v2.py` | ⏳ **YOX** (labor %, prime cost — nümunə fayl gözlənilir) |
| Dayparts (saat-tipi) | `dayparts_analisti.py` | ⏳ YOX (Satış hədəfində həftəiçi/həftəsonu qismən) |
| Kanal analizi | `kanal_analisti.py` | ⏳ YOX (Panel ödəniş qarışığı qismən) |
| **Saha Nəzarət** | (KXT/vardiya axını) | 🟡 Qismən — **vardiya-checklist + KXT izləmə** mövcuddur |

## 4. Faz 3 — köçürmə sırası (təklif)

Hər biri Menü/Panel kimi bir səhifə: Excel/veri at → analiz çıx (client-side parse + DB save).
1. **Filial Teşhis** — hər filial üçün diaqnoz kartı (satış, tutturma, YoY, food cost, labor bir yerdə)
2. **Aylıq Trend** — dövr-dövr trend qrafiki (Panel arxivini birləşdirir)
3. **Kadro / Labor** — nümunə fayl lazım (Menü kimi)
4. **Board / Konsol** — idarəçi icmal (bütün modulların xülasəsi tək ekranda)
5. **Portföy** — filial portfolio matrisi

> Qeyd: TQTA Shaurma yalnız məhsul nümunəsidir; motor reposu ilə OCAQ tenant datası qarışdırılmır (bax AGENTS.md).
