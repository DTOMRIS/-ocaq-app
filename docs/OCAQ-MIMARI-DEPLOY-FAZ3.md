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
1. Kod dəyişikliyi → `git push origin feat/analytics-on-commercial` (GitHub: `DTOMRIS/-ocaq-app`)
2. Vercel həmin branch-ı izləyir → avtomatik **build** edir
3. Branch **Production Branch**-dırsa → `ocaq.dkagency.com.tr`-ə çıxır; deyilsə → **Preview** URL-i

**⚠️ İki qeyd (vacib):**
- **Production Branch ayarı:** Vercel → Settings → Git → Production Branch = `feat/analytics-on-commercial` olmalıdır ki push birbaşa canlıya getsin. (Task #4 — yoxlanmalıdır; deyilsə Preview-də qalır, "Promote to Production" lazımdır.)
- **Migration-lar avtomatik ÇALIŞMIR.** Deploy yalnız kodu build edir — DB schema dəyişiklikləri (yeni cədvəl/kolon) `npm run db:push` və ya `scripts/migrate-prod.mjs` ilə **əl ilə** tətbiq olunmalıdır (prod DATABASE_URL ilə). 2026-08 drift bundan yarandı.
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
