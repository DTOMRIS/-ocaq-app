# OCAQ sistem ağacı

Son güncelleme: 12 Eylül 2026 · `main` e325c44

## Ürün ve veri sahipliği

```text
DK Agency (ticari katman)
├── Müşteri
├── Proje / sözleşme
├── Paket / abonelik / lisans
├── Fatura ve destek
└── Satış tamamlanınca OCAQ tenant provisyon isteği
    └── POST /api/integrations/dk/provision-tenant

OCAQ (restoran operasyon ürünü)
├── Vercel: ocaq.dkagency.com.tr
├── Neon: tenant bazlı operasyon verisi
├── Kullanıcı erişimi
│   ├── super_admin
│   ├── region_manager
│   └── branch_manager
├── Operasyon kayıtları
│   ├── checklist ve kalite
│   ├── satış / kasa / fire
│   ├── HACCP / ekipman / logbook
│   └── bölge ve filial raporları
└── DK için salt-okunur özetlerin kaynağı

TQTA (kimlik ve eğitim ürünü)
├── FİN, kullanıcı ve organizasyon kimliği
├── Eğitim içerikleri
└── Partner eğitim satışı
```


## Modül haritası (koddan üretildi)

Bu bölüm elle yazılmaz — route, migration ve kütüphane listesi dosya sisteminden
çıkarılır. Yeni modül eklendiğinde buradaki sayılar da güncellenmelidir.

```text
OCAQ portalı
├── VERİ GİRİŞİ (iiko / banka / Excel)
│   ├── /dashboard/panel            günlük satış · ürün · YoY · çek
│   │   └── yükleme: OXU+YAZ tek adım (iki adımlı akış veri kaybına yol açıyordu)
│   ├── /dashboard/saatlik          saatlik satış + sepet · ay seçici
│   ├── /dashboard/silinme          silinmə/fire · personel yeməyi ayrı
│   ├── /dashboard/kasa-banka       POS ↔ banka mutabakatı
│   ├── /dashboard/pul-axini        9 hesap · nakit akışı
│   └── /dashboard/recetura         Tərkiblər.xlsx · iki katlı reçete (BOM)
│
├── ANALİZ
│   ├── /dashboard                  KPI · hədəf · şəbəkə nəbzi
│   ├── /dashboard/analitika        ürün analizi · Kasavana-Smith
│   ├── büyümə ayırıcısı            eyni filial + yeni + bağlanan = xalis
│   └── ticarət zonası              140 m aralıqdakı filiallar birlikdə
│
├── AÇILIŞ (yeni filial)
│   ├── /dashboard/acilis           G0→G6 qapılar · 216 vəzifə şablonu
│   ├── …/[id]                      profil redaktəsi · fayl · şablonla sinxron
│   ├── …/[id] sifariş bloku        490 sətir kataloq · 3 ölçü · departamentə göndər
│   ├── …/[id]/sifaris/cap          çap / PDF görünüşü
│   └── /dashboard/acilis/departament  departament siyahısı + e-poçt idarəsi
│
├── ƏMƏLİYYAT
│   ├── /dashboard/vardiya-checklist · /checklists     KXT
│   ├── /dashboard/vardiya-liderliyi                   növbə liderliyi
│   ├── /dashboard/sales · /promosyonlar · /complaints
│   └── /dashboard/staff · /hr · /team · /bildirisler
│
└── QURULUŞ
    ├── /dashboard/branches · /regions · /settings
    └── /admin/**  (menyuda YOXDUR — bax «bilinən boşluqlar»)
```

### Sayılar (12.09.2026)

| Ölçü | Dəyər |
|---|---|
| Dashboard səhifəsi | 42 |
| Admin səhifəsi | 9 (menyuya bağlı deyil) |
| API route | 57 |
| Migration | 27 fayl (0001 nömrəsi iki dəfə) |
| `src/lib` modulu | 40 |
| Test faylı | 24 · **320 test, 320 keçir** |
| Lint | 0 xəta, 19 xəbərdarlıq |

## Migration zənciri

Sıra pozulmamalıdır. `deploy migration İŞLƏTMİR` — hamısı ƏL İLƏ işlədilir
(bax `docs/DATA-PROTECTION.md`). «Data dəyişir» sütunu `UPDATE` olan
migration-ları göstərir: onlardan ƏVVƏL Neon snapshot MƏCBURİDİR.

| Migration | Yaratdığı cədvəl / sütun | Data dəyişir? |
|---|---|---|
| `0000_faz1.sql` | — | xeyr |
| `0001_cold_stature.sql` | — | xeyr |
| `0001_complaints.sql` | — | xeyr |
| `0002_polite_songbird.sql` | — | xeyr |
| `0003_black_whistler.sql` | — | xeyr |
| `0004_bent_mojo.sql` | — | ⚠ BƏLİ (UPDATE) |
| `0005_branch_lifecycle.sql` | — | xeyr |
| `0006_branch_activation_backfill.sql` | — | ⚠ BƏLİ (UPDATE) |
| `0007_thin_firestar.sql` | — | xeyr |
| `0008_dk_commercial_foundation.sql` | — | xeyr |
| `0009_analytics_ingest.sql` | — | xeyr |
| `0010_analytics_fact_tables.sql` | `analytics_daily_fact`, `analytics_item_fact` | xeyr |
| `0011_mytcha_to_abdulkerim.sql` | — | ⚠ BƏLİ (UPDATE) |
| `0012_item_fact_cost_category.sql` | `analytics_item_fact.category`, `analytics_item_fact.cost` | xeyr |
| `0013_analytics_hourly.sql` | `analytics_hourly_cume`, `analytics_hourly_fact` | xeyr |
| `0014_deletion_recon.sql` | `analytics_deletion_fact`, `kasa_banka_recon` | xeyr |
| `0015_sebail_rename.sql` | — | ⚠ BƏLİ (UPDATE) |
| `0016_acilis_takip.sql` | `opening_tasks`, `openings` | xeyr |
| `0017_acilis_fayllar.sql` | `opening_files` | xeyr |
| `0018_acilis_digest.sql` | `opening_dept_contacts` | xeyr |
| `0019_writeoff_category.sql` | `analytics_deletion_fact.category`, `analytics_deletion_fact.qty` | xeyr |
| `0020_recipe_lines.sql` | `recipe_lines` | xeyr |
| `0021_cashflow_lines.sql` | `cashflow_lines` | xeyr |
| `0022_acilis_sifaris.sql` | `opening_orders` · `openings.table_count` | xeyr |
| `0023_acilis_olcu.sql` | `opening_orders.olcu_etiket`, `openings.counter_len_m` | xeyr |
| `0024_promotions.sql` | `promotions` · `promotions.active_days`, `promotions.end_time`, `promotions.location`, `promotions.start_time` | xeyr |
| `0025_branch_lifecycle.sql` | `branches.closed_at`, `branches.opened_at`, `branches.trade_zone` | xeyr |

> `0000`–`0008` təməl sxemdir (tenant · user · branch · region · checklist ·
> complaint · notification · shift). Cədvəl adları fərqli formatda yazıldığı
> üçün yuxarıdakı avtomatik siyahıda görünmür.
>
> **Journal 0007-də donub və DÜZƏLDİLMİR** — 19 migration orada görünmür.
> Journal-ı geriyə doğru yazmaq `drizzle-kit`-i artıq tətbiq olunmuş
> migration-ları yenidən işlətməyə sövq edə bilər. Onun yerinə:
>
> · ⛔ **`drizzle-kit migrate` İŞLƏDİLMİR** — journal-dakı 8-dən başqasını görmür
> · Tətbiq YALNIZ `npm run db:migrate -- <fayl> --apply` ilə edilir
> · Qeydiyyat `schema_migrations_manual` cədvəlindədir və artıq
>   `src/db/schema/migrations.ts`-də TƏYİN olunub (Studio-da görünür)
> · `npm run db:status` — diskdə nə var, bazada nə qeyd olunub, nə çatmır
> · `npm run db:status -- --qeyd-et <fayl>` — artıq tətbiq olunmuş köhnə
>   migration-ı SQL İŞLƏTMƏDƏN qeydə alır
> · `0001` nömrəsi iki faylda təkrarlanır (tarixi hal). **Ad DƏYİŞDİRİLMİR** —
>   qeydiyyat fayl adına bağlıdır, ad dəyişsə migration «tətbiq olunmayıb»
>   görünər.
>
> İntizam artıq `tests/migration-files.test.ts` ilə qorunur: ad qaydası ·
> nömrə boşluğu · yeni nömrə təkrarı · destruktiv/UPDATE fayllarda snapshot
> xəbərdarlığı · `create table if not exists`.

## Təhlükəsizlik qatı

```text
auth (NextAuth)
 └── session.user { id, tenant_id, role }
      ├── access-policy.ts     ← SAF QƏRAR: rol → əhatə üsulu
      │                          tanınmayan rol = BOŞ əhatə (səssiz genişlənmə yox)
      ├── branch-access.ts     ← qərarı SQL-ə çevirir (IDOR qoruması)
      ├── message-audience.ts  ← bildiriş/brifinq alıcı kütləsi
      ├── rbac.ts              ← icazə adı → bəli/xeyr
      ├── permissions.ts       ← sahə səviyyəsində görünmə/redaktə
      ├── encryption.ts        ← FIN/IBAN AES-256-GCM
      └── rate-limit.ts        ← giriş/dəvət/şifrə sıfırlama
```

Qərar qatı (`access-policy.ts`) 12.09.2026-da sorğuların içindən ÇIXARILDI və
testlə örtüldü — sorğunun içindəki qərar test edilə bilmirdi.

## İnterfeys dili

| Element | Qayda |
|---|---|
| Şrift | Plus Jakarta Sans (mətn) · JetBrains Mono (kod/rəqəm) — `next/font` |
| Rəqəm | `tabular-nums` qlobaldır — cədvəldə sütun sürüşmür |
| Kart | `.ocaq-kart` · `.ocaq-kart-link` (toxunanda qalxır) |
| Cədvəl | `.kart-cedvel` + `data-label` → ≤640px-də karta çevrilir |
| Mobil naviqasiya | iOS tab bar: işıqlı şüşə, hairline ayırıcı, dolu/kontur ikon |
| İkon | SVG, 24×24 tor. **Emoji işlədilmir** (cihazdan-cihaza dəyişir) |
| Silmə | Dərhal sil + 7 san «Geri al». Geri dönüşü olmayan işdə təsdiq qalır |
| Filtr | Ünvanda saxlanılır (`?bolge=&ara=`) — link paylaşıla bilir |

## Bilinən boşluqlar (12.09.2026 denetimi)

| Boşluq | Təsir |
|---|---|
| ~~`/admin/**` menyuda yoxdur~~ | **12.09 qərarı: MENYUYA ƏLAVƏ EDİLMİR.** 9 səhifədən yalnız `promosyonlar/yeni` real data oxuyur və o, artıq `/dashboard/promosyonlar`-dan əlçatandır. Qalanı nümunədir (0 fetch, 0 baza) — menyuya qoymaq işləməyən ekranı gözə soxmaq olardı. 5-nə xəbərdarlıq bloku qoyuldu, işləyən ekrana yönləndirir |
| 6 nümunə ekran (`ekipman`, `kasa`, `haccp`, `fire`, `tahmin`, `menu`) | Baza yoxdur — girilən məlumat itir. Xəbərdarlıq bloku əlavə edildi, modul yazılmayıb |
| ~~Migration jurnalı 0007-də donub~~ | **12.09 qərarı: journal DÜZƏLDİLMİR** (geriyə yazmaq artıq tətbiq olunmuşları yenidən işlətmə riski yaradır). Əvəzinə: qeydiyyat cədvəli şemaya salındı, `npm run db:status` əlavə edildi, intizam 7 testlə qoruma altına alındı |
| ~~Ölü kod~~ | **12.09 qərarı:** `upload-flow.tsx` SİLİNDİ (yalnız redirect səhifəsinin yanında qalmışdı, heç bir dəyər daşımırdı). Qalan üçü «⚠️ ARXİV» başlığı ilə işarələndi, silinmədi: `api/dashboard/panel` (AGENTS.md route qoruması), `api/dashboard/kasa-banka` (Unibank/ATB HTML parseri BAŞQA YERDƏ YOXDUR), `parse-delivery.ts` (kanal analizi portala gələndə təməl) |
| ~~Həftəlik xülasə cron-u~~ | **12.09-da quruldu:** `vercel.json` → hər bazar ertəsi 06:00 UTC (Bakı 10:00) `/api/cron/acilis-digest`. **QURAŞDIRMA TƏLƏB ETMİR** — `x-vercel-cron` başlığı ilə işləyir. `CRON_SECRET` istəyə bağlı sərtləşdirmədir |
| «Geri al» yalnız departament e-poçtunda | Sifariş sətri, hədəf, şikayət hələ dönüşsüz |
| ~~CI yoxdur~~ | **12.09-da quruldu:** `.github/workflows/yoxlama.yml` — hər push/PR-da lint + typecheck + test. `build` CI-da işlədilmir (env sirləri GitHub-a daşınmasın); o, hər halda Vercel deploy-da işləyir |

## Altın veri kuralı

Her bilgi tek sistemde yazılır; diğer sistem veriyi kopyalamaz, sahibinden okur.

| Bilgi | Tek sahibi | Diğer sistemlerin davranışı |
| --- | --- | --- |
| Kullanıcı, FİN, rol, organizasyon/filial kimliği | TQTA | OCAQ ve DK kimliklerle referans verir |
| Restoran operasyon kayıtları | OCAQ | DK gerektiğinde salt-okunur özet alır |
| Müşteri, sözleşme, paket, lisans, fatura ve destek | DK Agency | OCAQ ticari kaydı kopyalamaz |
| Eğitim içeriği ve ilerleme | TQTA | DK ürünü satar; OCAQ eğitim verisini kopyalamaz |

## OCAQ ticari akışı

```text
DK satışı
  → DK müşteriyi kendi sisteminde kaydeder
  → DK sunucusu provisioning API'sini çağırır
  → OCAQ externalCustomerId ile tenant'ı idempotent açar
  → İlk super_admin daveti ocaq@dkagency.com.tr üzerinden gönderilir
  → Yönetici ocaq.dkagency.com.tr adresinden giriş yapar
  → Personel için OCAQ hesabı açılmaz
```

## Canlı altyapı

| Katman | Durum |
| --- | --- |
| Uygulama | Vercel `ocaq-app` projesi |
| Canlı alan adı | `https://ocaq.dkagency.com.tr` |
| DNS | Hostinger CNAME → Vercel |
| Veritabanı | Neon production; migration öncesi snapshot mevcut |
| E-posta | Hostinger `ocaq@dkagency.com.tr`, SMTP SSL/465 |
| DK güvenliği | Sunucudan sunucuya Bearer `DK_PROVISIONING_SECRET` |

Parola, API anahtarı, `DATABASE_URL` ve benzeri sırlar bu dosyaya veya Git'e
yazılmaz; yalnız Vercel'in şifreli ortam değişkenlerinde tutulur.
