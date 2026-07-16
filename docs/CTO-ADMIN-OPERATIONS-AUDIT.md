# OCAQ Admin Operasyon Denetimi

Tarih: 16 Temmuz 2026  
Kapsam: vardiya sonucu, filial yaşam döngüsü, yönetici ataması ve aktivite görünürlüğü  
Durum: salt okunur kod denetimi; bu rapor hazırlanırken ürün tasarımı değiştirilmedi.

## Yönetici özeti

Mevcut sistem bazı operasyon verilerini topluyor; fakat super admin ve bölge müdürü için bu verileri karara dönüştüren yönetim sonucu üretilmemiş. En belirgin hata, adminin sonuç ekranı yerine filial müdürüne ait uzun ve kilitli vardiya formunu görmesidir.

Doğru rol ayrımı:

- Filial müdürü: vardiya toplantısını yapar ve kaydeder.
- Bölge müdürü: kendi bölgesinde eksik, gecikmiş ve riskli vardiyaları görür; takip aksiyonu açar.
- Super admin: 30 filialın tamamında sonuç, eğilim, yönetici aktivitesi, hesap ve atamaları yönetir.
- İşçi: OCAQ operasyonunda yer almaz; eğitim portalına yönlendirilir.

## 1. Vardiya liderliği: temel ürün hatası

Admin için ayrı sonuç ekranı yoktur. Aynı form `canEdit=false` yapılarak gösteriliyor. Admin boş ve kilitli servis/satış/keyfiyyət alanları görüyor; ağın sonucunu görmüyor.

Kanıt:

- Yalnız bugünün ham kayıtları çağrılıyor: `src/app/dashboard/vardiya-liderliyi/page.tsx:39-48`.
- Sonuç görünümü yalnız “Bugünkü toplantılar” düğmelerinden ibaret: `page.tsx:119-124`.
- Admin aynı uzun giriş formunu kilitli görüyor: `page.tsx:126-157`.
- API en fazla 100 ham kayıt döndürüyor; toplulaştırılmış sonuç üretmiyor: `src/app/api/shift-briefings/route.ts:36-64`.

## 2. Adminin görmesi gereken vardiya sonucu

Ekranın ilk satırı:

`Göndərildi X/Y · Vaxtında A · Gecikdi B · Göndərmədi C · Açıq tapşırıq N · Təlim gözləyən P · Müştəri söhbəti Q/5Y`

Filtreler:

- Tarih aralığı
- Bölge
- Filial
- Filial müdürü
- Vardiya
- Durum: eksik, taslak, tamamlandı, gecikti
- Risk seviyesi

Filial sonuç tablosu alanları:

- Bölge, filial kodu ve adı
- Müdür adı
- İş günü ve vardiya
- Beklenen son saat
- Durum ve gecikme süresi
- Servis, satış ve kalite odağı
- Satış hedefi
- Eğitimi tamamlayan/bekleyen
- Müşteri konuşması `x/5`
- Devir notu
- Açık takip işi
- Detay bağlantısı

Admin kaynak kaydı değiştirmemeli; sonuçtan sorumlu, termin ve durum içeren takip işi açabilmelidir.

## 3. Eksik vardiyanın hesaplanamama nedeni

Sistemde bir filial için haftanın hangi günü hangi vardiyanın zorunlu olduğunu belirleyen model yoktur. Kayıt olmayan şeyin “eksik” mi, yoksa planlanmamış mı olduğu bilinemez.

Gerekli model: `branch_shift_expectations`

- `branch_id`
- `weekday`
- `shift`
- `required`
- `due_time`
- `timezone`
- `valid_from`, `valid_to`

Bu model olmadan 30 filiallık gerçek tamamlama oranı hesaplanamaz.

## 4. Vardiya formunun sonuç üretmeyen alanları

Mevcut servis/satış/keyfiyyət/müdür/devir alanlarının çoğu serbest metindir. Müşteri konuşmalarında konu, duygu, aksiyon, sorumlu ve kapanış alanı yoktur. Satış hedefi gerçek satışla, eğitim sayıları TQTA verisiyle bağlı değildir.

Gerekli takip işi modeli:

- Kaynak: servis, satış, kalite, müşteri, eğitim veya devir
- Başlık
- Sorumlu
- Termin
- Öncelik
- Durum
- Çözüm notu
- Açan ve kapatan kullanıcı
- Açılış/kapanış zamanı

## 5. Filial numarası

Bugün kullanıcı kodu elle yazmak zorundadır. Form boş başlıyor ve yalnız tarayıcıda `F-01` biçimi kontrol ediliyor. API ve veritabanı mükerrer kodu güvenli biçimde engellemiyor.

Doğru davranış:

1. “Yeni filial” açıldığında sistem sonraki kullanılmamış kodu önerir: örneğin `F-31`.
2. Kod düzenlenebilir fakat sunucu tarafından doğrulanır.
3. `(tenant_id, code)` veritabanında benzersiz olmalıdır.
4. Kod sunucuda atomik ayrılır; eşzamanlı iki kayıt aynı kodu alamaz.
5. Arşivlenen kod yeniden kullanılmaz.

## 6. Filial müdürü nasıl ekleniyor?

Bugünkü yol dolaylıdır:

`Hesab və dəvət → Dəvət göndər → Filial Meneceri → Filial seç → e-posta`

Müdür daveti kabul edince yeni hesap oluşur ve `branches.manager_id` yazılır. Fakat filial ekranında müdür görünmez; mevcut bir müdür hesabını filiala atama, değiştirme veya ayırma akışı yoktur.

Doğru yol:

- Filial oluşturulduktan sonra doğrudan `Filial müdiri təyin et` adımı açılır.
- Mevcut aktif müdür seçilebilir veya e-postayla yeni davet gönderilebilir.
- Bekleyen davet aynı filial satırında görünür.
- Yeniden gönder, iptal et, değiştir ve ayır işlemleri audit kaydı üretir.

## 7. Bölge müdürü ataması

Bölge ekranında mevcut aktif `region_manager` hesabını bölgeye atama altyapısı vardır. Ancak edit düğmesindeki koşul hatalı biçimde herkese görünür hâle getirilmiştir (`isSuperAdmin || true`). Bu yanıltıcı görünüm kaldırılmalı; müdür seçimi yalnız super admine gösterilmelidir.

## 8. Yönetici aktivitesi

Başarılı girişte `users.last_login_at` güncelleniyor; fakat `/api/users` ve takım ekranı bu alanı göstermiyor. Vardiya, KXT ve şikâyet aktiviteleri ayrı tablolarda bulunuyor, tek yönetici sonucu olarak birleştirilmiyor.

`Komanda → İdarəçilər` tablosu:

- Ad ve e-posta
- Rol
- Aktif/deaktif
- Bölge/filial kapsamı
- Son giriş
- Son operasyon
- Bugünkü vardiya toplantısı
- Bugünkü KXT ve skor
- Açık şikâyet
- Geciken takip işi
- Detay, kapsam değiştir, deaktif et, şifre sıfırla

Bölge müdürü yalnız kendi bölgesinin müdürlerini; super admin tüm yöneticileri görmelidir.

## 9. Filial silme

Bugün silme, düzenleme veya arşivleme endpoint’i ve butonu yoktur. Fiziksel silme doğru değildir; satış, KXT, şikâyet ve vardiya geçmişi korunmalıdır.

İki işlem olmalıdır:

- `Deaktiv et`: geçici, geri alınabilir; yeni operasyon kaydı açılamaz.
- `Arxivlə`: filial kodunun yazılması ve zorunlu sebep ile onaylanır; geçmiş korunur.

Arşiv alanları:

- `is_archived`
- `archived_at`
- `archived_by`
- `archive_reason`

Kritik güvenlik düzeltmesi: operasyonel yetki sorguları `is_active=true AND is_archived=false` koşulunu zorunlu uygulamalıdır. Şu anda bazı kapsam sorguları arşiv/aktif filtresi kullanmıyor.

## 10. Uygulama önceliği ve kabul kriterleri

### P0 — Temel yönetim kontrolü

- Admin için form yerine vardiya sonuç dashboardu
- Eksik/geciken/tamamlanan vardiya özeti
- Filial kodu otomatik önerisi + benzersiz DB kuralı
- Filial detayında müdür atama/değiştirme
- Güvenli deaktivasyon/arşivleme
- Arşivli filialın bütün operasyon erişimini kapatma

### P1 — Yönetici performansı

- Yönetici aktivite tablosu
- Son giriş ve son operasyon
- Vardiya/KXT/şikâyet birleşik sonucu
- Sorumlu ve terminli takip işleri
- Bölge bazlı istisna ekranı

### P2 — Entegrasyon ve trend

- TQTA eğitim tamamlama entegrasyonu
- Satış hedefi–gerçekleşen bağlantısı
- 7/30 günlük trend ve filial karşılaştırması
- Bildirim/escalation otomasyonu

Kabul kriteri: super admin sisteme girdiğinde uzun ve kilitli vardiya formu değil; 30 filialın gönderdi/göndermedi, zamanında/gecikti, açık aksiyon, eğitim ve müşteri sonucu görünmelidir. Her istisnadan sorumlu ve terminli iş açılmalı, kapanana kadar takip edilmelidir.

## Değiştirilmemesi gerekenler

- Mevcut OCAQ görsel dili ve sol menü tasarımı
- Tek giriş ekranı
- Bazadan gelen rol yetkisi
- Filial müdürünün kaynak kaydı oluşturması
- Admin ve bölge müdürünün tamamlanmış kaynak kaydını değiştirememesi
- İşçinin OCAQ operasyonundan ayrı tutulması
