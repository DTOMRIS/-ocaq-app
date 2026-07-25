# OCAQ sistem ağacı

Son güncelleme: 25 Temmuz 2026

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
