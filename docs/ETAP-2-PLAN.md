# Etap 2 Ayrıntılı Plan — Filial Yaşam Döngüsü

Tarih: 16 Temmuz 2026  
Durum: Etap 2A tamamlandı ve 51/51 Preview kabulü geçti; Etap 2B müdür atama/davet devri sıradaki kapıdır.

## 1. Amaç

Filial oluşturma, kod verme, müdür atama/değiştirme, düzenleme, deaktivasyon ve arşivlemeyi tek güvenli akışa dönüştürmek.

## 2. Mevcut durum

- `branches.code` zorunlu fakat kullanıcı tarafından elle yazılıyor.
- API'de server-side `F-XX` format ve benzersizlik doğrulaması yok.
- DB'de `(tenant_id, code)` unique index yok.
- Filial API yalnız GET ve POST destekliyor.
- Müdür yalnız davet kabulünde `branches.manager_id` alanına yazılıyor.
- Mevcut bir müdürü atama/değiştirme/ayırma endpoint'i yok.
- `is_active` ve `is_archived` alanları var; bunları yöneten kullanıcı akışı yok.
- Filial tablosunda müdür, bekleyen davet ve işlem menüsü yok.

## 3. Kararlar

### Filial kodu

- Kanonik format `F-01`, `F-02`, ... şeklindedir.
- Form açıldığında server bir sonraki kodu önerir.
- Kullanıcı kodu değiştirebilir; server tekrar doğrular.
- Kod tenant içinde benzersizdir.
- Arşivli kod yeniden kullanılmaz.
- Sadece istemci `max + 1` hesabına güvenilmez.

### Müdürlük

- Her filialın en fazla bir birincil müdürü vardır (`branches.manager_id`).
- Bir müdür geçici vekâlet amacıyla birden fazla filiala atanabilir; UI uyarı verir ve audit yazar.
- Mevcut aktif `branch_manager` seçilebilir.
- Yeni kişi e-posta davetiyle eklenebilir.
- Davet kabul edilene kadar durum `Dəvət gözləyir` gösterilir.
- Değiştirme anında eski müdürün filial kapsamı kapanır.
- Yeni kişi davet edilerek değiştirilecekse eski müdür davet kabul edilene kadar görevde kalır; kabul anında compare-and-swap ile yetki devredilir.
- Bir filial için aynı anda yalnız bir canlı filial müdürü daveti bulunabilir.
- İptal edilen davet fiziksel silinmez; yapan, zaman ve sebep kaydedilir.

### Hazırlık ve aktivasyon

- Yeni filial `is_active=false`, `is_archived=false` ile hazırlık durumunda açılır.
- İlk başarılı aktivasyon `activated_at` alanını doldurur ve alan daha sonra temizlenmez; böylece hiç açılmamış hazırlık filialı ile sonradan deaktive edilmiş filial ayrılır.
- Bölge zorunludur; müdür oluşturma sırasında veya aynı filial ekranındaki ikinci adımda atanabilir/davet edilebilir.
- Filial ancak aktif bölge ve geçerli aktif müdür kontrolünden sonra ayrıca aktive edilir. Böylece hazırlık filialı KXT/vardiya/KPI paydasına erken girmez.
- Filial kodu oluşturma sonrasında değiştirilemez; kimlik ve arşiv onayı sabit kalır.

### Silme

- Fiziksel silme yoktur.
- `Deaktiv et`: geçici ve geri alınabilir.
- `Arxivlə`: zorunlu sebep + filial kodunu tekrar yazma ile onaylanır.
- Geçmiş satış, KXT, vardiya ve şikâyet kayıtları korunur.
- Deaktivasyon ve arşivleme; canlı müdür daveti, taslak vardiya toplantısı veya açık şikâyet varsa `409 BRANCH_HAS_ACTIVE_OPERATIONS` ile durur.
- Arşivden geri yükleme filialı `deaktiv` duruma getirir; aktivasyon ayrı işlemdir.

### Tarihsel görünürlük

- Yeni operasyon yazımı yalnız `is_active=true AND is_archived=false` filiallarda yapılır.
- Super admin arşiv/deaktiv filialın yaşam döngüsü kaydını ayrı filtreyle görür.
- Satış, KXT, vardiya ve şikâyet satırları fiziksel olarak korunur; Etap 4 sonuç kokpitinde salt okunur tarihsel drill-down ile gösterilir.
- Bölge veya filial adı değiştiğinde mevcut kayıtlar `branch_id` ile korunur; Etap 2 ekranında güncel ad gösterilir, alan değişikliği audit before/after ile saklanır.

## 4. Preflight veri sorguları

Production veya Preview migrationdan önce aşağıdaki sonuçlar kaydedilecektir:

1. Tenant bazında mükerrer filial kodları.
2. Kanonik `^F-[0-9]{2,}$` biçimine uymayan kodlar.
3. Boş veya whitespace kod/ad.
4. Bölgesiz filiallar.
5. Manager ID'si olmayan filiallar.
6. Aktif olmayan kullanıcıya bağlı manager ID'leri.
7. Bir müdüre bağlı filial sayısı.
8. Arşivli fakat aktif kalan filiallar.
9. Filiallara bağlı açık davetler.
10. Filiallara bağlı taslak vardiya ve açık şikâyetler.

Preflight yalnız SELECT çalıştırır; veriyi otomatik düzeltmez.

## 5. Migration planı

### Şema alanları

`branches` tablosuna:

- `version integer not null default 1`
- `activated_at timestamp null`
- `archived_at timestamp null`
- `archived_by uuid null references users(id)`
- `archive_reason text null`

`invitations` tablosuna:

- `revoked_at timestamp null`
- `revoked_by uuid null references users(id)`
- `revoked_reason text null`
- `replaces_manager_id uuid null references users(id)`

### Benzersizlik

- `unique index branches_tenant_code_uq on branches(tenant_id, code)`
- Index öncesinde duplicate preflight sonucu sıfır olmalıdır.
- Kod normalize edilecekse ayrı, açık onaylı data migration yapılır; sessiz rewrite yoktur.
- Canlı filial müdürü daveti için branch bazlı partial unique index eklenir. Süresi biten davet yeni davet öncesi auditli olarak revoke edilir.

### Geri dönüş

- Yeni kolonlar backward-compatible eklenir.
- Uygulama eski kolonları okumaya devam edebilir.
- Unique index yalnız veri temizse eklenir.
- Production öncesi Neon snapshot alınır.

## 6. Server sözleşmesi

### `GET /api/branches/next-code`

- Yetki: yalnız `super_admin`.
- Çıktı: `{ code: "F-31" }`.
- Öneri rezervasyon değildir; POST sırasında yeniden kontrol edilir.

### `POST /api/branches`

Alanlar:

- `code?: string` — boşsa server üretir.
- `name: string` — trim, 2–80.
- `region_id: uuid` — zorunlu.
- `city: string` — varsayılan Bakı, 2–80.
- `address?: string` — max 300.
- `phone?: string` — normalize `+994...`.
- `open_time`, `close_time` — `HH:mm`, mantıksal sıra.
- `manager_id?: uuid` — mevcut aktif branch_manager.

İşlem:

1. Session/tenant/rol doğrula.
2. Alanları server'da doğrula.
3. Tenant-kapsamlı transaction/advisory lock al.
4. Kod yoksa sonraki kodu üret.
5. Code conflict durumunda 409 döndür.
6. Filialı ekle.
7. Manager ataması varsa doğrula ve yaz.
8. Audit kaydı oluştur.
9. Oluşan filialı readback ile döndür.

Yeni filial hazır/deaktiv oluşturulur. `open_time=close_time` geçersizdir; kapanış saatinin açılıştan küçük olması gece yarısını aşan işletme için geçerlidir.

### `GET /api/branches`

- Varsayılan: aktif ve hazırlık/deaktiv, arşivsiz filiallar.
- Super admin: `?status=active|inactive|archived|all`.
- Bölge müdürü yalnız aktif, kendi bölgelerindeki filialları görür.
- Arşiv görünümü restore işleminin tek keşif kaynağıdır.

### `PATCH /api/branches/[id]`

İzin verilen işlemler ayrı action değerleriyle:

- `update_details`
- `activate`
- `deactivate`
- `restore`

Her action kendi allowlist alanlarını kabul eder; gönderilen fazla alanlar reddedilir. Kod `update_details` ile değiştirilemez. Bütün yaşam döngüsü action'ları yalnız super admin içindir ve `expected_version` ile kayıp güncelleme engellenir.

### `PUT /api/branches/[id]/manager`

- `assign_existing`: aynı tenant'taki aktif, doğrulanmış `branch_manager` hesabını compare-and-swap ile ata/değiştir.
- `invite_new`: tek canlı davet oluştur; replacement ise mevcut müdürü kabul anına kadar koru.
- `unassign`: müdürü filial kapsamından çıkar; hesabı varsayılan olarak aktif bırak. Hesap deaktivasyonu yalnız super adminin ayrı, açık seçimidir.
- Response; güncel müdür, bekleyen davet ve filial `updated_at` readback'ini döndürür.

### `DELETE /api/branches/[id]`

HTTP DELETE fiziksel silmez; soft archive uygular.

Zorunlu:

- `confirmation_code`
- `reason`

Kontroller:

- Super admin
- Tenant eşleşmesi
- Kod doğrulaması
- Açık davet/taslak vardiya/açık şikâyet özeti
- Aktif operasyon varsa 409 + kullanıcıya düzeltilebilir hata

Sonuç:

- `is_active=false`
- `is_archived=true`
- archive alanları
- audit

`409` cevabı `pending_invitations`, `draft_shift_briefings` ve `open_complaints` sayılarını alan bazında döndürür. Deaktivasyon da aynı blocker kontrolünü kullanır; açık kayıt sessizce erişilemez hâle getirilemez.

## 7. UI planı — tasarımı değiştirmeden

Mevcut Filiallar tablosu korunur. Yalnız kolonlar ve satır işlemi eklenir:

- Kod
- Ad
- Bölge
- Filial müdürü / davet durumu
- Telefon
- İş saati
- Status
- `⋯` işlem düğmesi

İşlemler:

- `Düzəlt`
- `Müdür təyin et`
- `Müdürü dəyiş`
- `Deaktiv et / Aktiv et`
- `Arxivlə`

Filial oluşturma sonucu:

1. Filial kaydı oluşur.
2. Aynı modal başarı adımına geçer.
3. `Filial müdiri təyin et` birincil çağrı olur.
4. Mevcut müdür seç veya davet gönder.
5. Liste readback ile güncellenir.

Arşivliler aynı tabloda varsayılan olarak gösterilmez; super admin `Arxiv` filtresiyle bulur ve geri yükler. Mevcut sol menü ve sayfanın görsel dili değişmez.

## 8. Audit olayları

- `branch.create`
- `branch.update`
- `branch.manager.assign`
- `branch.manager.unassign`
- `branch.activate`
- `branch.deactivate`
- `branch.archive`
- `branch.restore`

Metadata şifre/parola içermez; önceki ve yeni kapsam ID'lerini içerir.

## 9. Test planı

### Birim

- Kod normalize/format
- Sonraki kod hesaplama
- Allowlist action doğrulama
- Arşiv confirmation

### API entegrasyon

- Super admin başarılı akış
- Diğer roller 403
- Başka tenant IDOR 404/403
- Duplicate code 409
- Geçersiz manager rolü 400
- Deaktif manager 400
- Archive readback
- Arşiv sonrası operasyon erişimi yok
- İki eşzamanlı otomatik kod isteğinde duplicate kayıt oluşmaz
- Deaktiv/arşivli filialda davet kabulü user veya atama üretmez
- Aynı filial için iki canlı müdür davetinden yalnız biri oluşur
- Müdür değişiminden sonra eski müdür yeni API isteğinde erişimi kaybeder
- Deaktiv/arşiv blocker cevabındaki üç sayı gerçek DB sonucu ile eşleşir
- Arşiv ayrı listede görünür; restore sonrası deaktiv listede görünür

### UI

- Mobil modal ve tablo
- Loading/double-click
- Server hata mesajı
- Müdür daveti bekleme/iptal/yeniden gönderme

## 10. Kabul kapısı

- Otomatik kod gerçek server kaynağından gelir.
- Duplicate kod DB tarafından da engellenir.
- Müdür atama/değiştirme tek filial ekranından yapılır.
- Deaktivasyon geri alınabilir.
- Arşiv geçmişi korur ve operasyon erişimini kapatır.
- Bütün aksiyonlar listede readback ve audit ile görünür.
- Typecheck, lint, test, build ve Preview rol testi geçer.
- Production migration uygulanmaz; ayrı açık onay bekler.

## 11. Uygulama dilimleri

### 2A — Şema, preflight ve filial çekirdeği

Durum: **tamamlandı**. Kanıt: `docs/ETAP-2A-RESULT.md`.

- Kod üretimi/benzersizlik
- Hazırlık durumunda create
- Liste filtreleri ve arşiv readback
- Detay, aktivasyon, deaktivasyon, restore, archive ve audit

### 2B — Müdür atama ve davet devri

Durum: **sıradaki uygulama kapısı**.

- Mevcut hesabı ata/değiştir/ayır
- Tek canlı müdür daveti
- Revoke/resend/accept compare-and-swap
- Eski müdür erişim kaybı ve orphan-manager bildirim filtresi

### 2C — Mevcut tasarım içinde filial UI

- Server next-code
- Müdür/davet/status kolonları
- Satır işlem menüsü ve mobil modal
- Create sonrası müdür adımı, arşiv filtresi ve restore

Her dilim typecheck, lint, test ve Preview kabulü geçmeden sonraki dilim kapalıdır.

## 12. Etap 1 bağımlılığı

Etap 1 dört rol authenticated Preview kabulü 16 Temmuz 2026 tarihinde 56/56 geçmiştir. Etap 2 bağımlılığı kapanmıştır.
