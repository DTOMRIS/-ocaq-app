# Etap 2 Ayrıntılı Plan — Filial Yaşam Döngüsü

Tarih: 16 Temmuz 2026  
Durum: preflight planı hazır; Etap 1 authenticated kabul kapısı nedeniyle uygulama başlamadı.

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

### Silme

- Fiziksel silme yoktur.
- `Deaktiv et`: geçici ve geri alınabilir.
- `Arxivlə`: zorunlu sebep + filial kodunu tekrar yazma ile onaylanır.
- Geçmiş satış, KXT, vardiya ve şikâyet kayıtları korunur.

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

- `archived_at timestamp null`
- `archived_by uuid null references users(id)`
- `archive_reason text null`

### Benzersizlik

- `unique index branches_tenant_code_uq on branches(tenant_id, code)`
- Index öncesinde duplicate preflight sonucu sıfır olmalıdır.
- Kod normalize edilecekse ayrı, açık onaylı data migration yapılır; sessiz rewrite yoktur.

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

### `PATCH /api/branches/[id]`

İzin verilen işlemler ayrı action değerleriyle:

- `update_details`
- `assign_manager`
- `unassign_manager`
- `activate`
- `deactivate`
- `restore`

Her action kendi allowlist alanlarını kabul eder; gönderilen fazla alanlar reddedilir.

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

## 11. Etap 1 bağımlılığı

Etap 2 kodlaması, dört rol authenticated Preview kabulü tamamlanana veya aynı
davranışı kanıtlayan onaylı test hesapları sağlanana kadar başlamaz. Bu kural,
yetki temeli doğrulanmadan yeni destructive yaşam döngüsü eklenmesini engeller.
