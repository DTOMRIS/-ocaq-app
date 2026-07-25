# DK Agency → OCAQ ticari entegrasyonu

## Kesin sınır

- DK Agency müşteri, paket, abonelik ve faturanın sahibidir.
- OCAQ restoran operasyon kayıtlarının sahibidir.
- DK, OCAQ operasyon verisini kopyalamaz; gerektiğinde salt-okunur özet API'den okur.
- OCAQ yalnız `super_admin`, `region_manager` ve `branch_manager` rollerine giriş verir.
- Personel kayıtları operasyonel listelerde kalabilir; personel için OCAQ hesabı/daveti açılmaz.

## Satış sonrası otomatik müşteri açma

DK sunucusu aşağıdaki isteği yalnız sunucudan sunucuya gönderir:

```http
POST https://ocaq.dkagency.com.tr/api/integrations/dk/provision-tenant
Authorization: Bearer <DK_PROVISIONING_SECRET>
Content-Type: application/json
```

```json
{
  "externalCustomerId": "dk-customer-123",
  "name": "Restoran Markası",
  "slug": "restoran-markasi",
  "planCode": "standard",
  "ownerEmail": "owner@example.com"
}
```

`externalCustomerId` idempotency anahtarıdır. Aynı satış tekrar bildirilirse ikinci tenant
oluşmaz; bekleyen ilk süper yönetici daveti yenilenir. Başka bir müşteri aynı slug veya
owner e-postasını kullanıyorsa istek çakışma hatasıyla durur.

## Vercel production değişkenleri

- `NEXTAUTH_URL=https://ocaq.dkagency.com.tr`
- `AUTH_URL=https://ocaq.dkagency.com.tr`
- `AUTH_SECRET=<güçlü-rastgele-değer>`
- `DATABASE_URL=<Neon-production-connection-string>`
- `DK_PROVISIONING_SECRET=<DK-ve-OCAQ-arasında-ortak-güçlü-sır>`
- `SMTP_HOST=<DK-mail-sunucusu>`
- `SMTP_PORT=465` (veya sağlayıcının verdiği port)
- `SMTP_SECURE=true` (587 kullanılırsa çoğunlukla `false`)
- `SMTP_USER=ocaq@dkagency.com.tr`
- `SMTP_PASS=<uygulama-parolası>`
- `SMTP_FROM=OCAQ <ocaq@dkagency.com.tr>`

Sırlar Git'e ve istemci koduna yazılmaz. DK provisioning isteği tarayıcıdan yapılmaz.

## Alan adı

1. Vercel projesine `ocaq.dkagency.com.tr` production domain olarak eklenir.
2. DNS sağlayıcısında Vercel'in gösterdiği CNAME kaydı aynen oluşturulur.
3. SSL aktif olduktan sonra `NEXTAUTH_URL` ve `AUTH_URL` yeni alan adına çevrilir.
4. `ocaq@dkagency.com.tr` için DKIM/SPF; `dkagency.com.tr` için DMARC doğrulanır.
5. Login, davet, şifre sıfırlama ve DK provisioning smoke testleri çalıştırılır.
