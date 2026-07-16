# OCAQ Kanonik Ürün Kapsamı

Bu belge rol ve ürün davranışı için tek karar kaynağıdır. Eski ROADMAP veya kod yorumları bununla çelişirse bu belge esas alınır; çelişki düzeltilir.

## Roller

| Rol | Görür | Yapar | Yapamaz |
|---|---|---|---|
| `super_admin` | Bütün bölgeler, filiallar, yöneticiler, sonuçlar, audit | Hesap/kapsam, standart, filial/bölge yaşam döngüsü, takip | Filial müdürünün tamamlanmış kaynak kaydını sessizce değiştirmek |
| `region_manager` | Yalnız yönettiği bölgeler ve bağlı filiallar | Müdür daveti, istisna takibi, görev atama ve kapanış doğrulama | Başka bölgeye erişmek; sistem standardı ve super admin hesabı yönetmek |
| `branch_manager` | Yalnız atandığı aktif filial | Vardiya toplantısı, KXT, müşteri görüşü, devir, şikâyet ve görev sonucu | Başka filial/bölge; tamamlanmış kaydı değiştirmek |
| `staff` | Yalnız ayrı eğitim portalına yönlendirme | TQTA eğitim portalına geçmek | OCAQ operasyon sayfası/API/bildirim kutusu kullanmak |

## Ürün düzlemleri

1. Filial icrası: vardiya, KXT, müşteri, şikâyet ve görev.
2. Bölge istisnası: eksik, geciken, düşük sonuç ve takip.
3. Super admin yönetimi: ağ sonucu, hesap, kapsam, standart ve audit.
4. Eğitim: ayrı TQTA portalı; OCAQ yalnız yönetici için salt okunur eğitim sonucu alır.

## Modül durumu

### Gerçek veri akışı bulunan

- Giriş, şifre değişimi/sıfırlama
- Hesap daveti/kabulü/yeniden gönderme/iptal
- Personel kaydı ve kapsamlı liste
- Filial ve bölge listesi/oluşturma (yaşam döngüsü henüz eksik)
- Şikâyet ve müşteri puanı
- Satış hedefi/günlük satış kaydı
- KXT ve sonuç izleme
- Vardiya toplantısı ve müşteri notları (yönetim sonucu henüz eksik)
- Bildirim/alıcı/okundu/onay (görev yaşam döngüsü henüz eksik)

### Planlı veya eksik

- Filial vardiya planı/kadro
- Admin vardiya sonuç kokpiti
- Görev/takip motoru
- Yönetici aktivite sonucu
- TQTA eğitim sonuç entegrasyonu
- Filial düzenleme/müdür değiştirme/deaktivasyon/arşiv
- Ayrıntılı HACCP
- Avadanlıq, kasa, fire/itki, satış təxmini
- HR məzuniyyət, sanitar, oryentasiya ve sınaq iş akışları

### Legacy/mock — ürün olarak gösterilemez

- Hardcoded `/admin/*` örnek sayfaları
- `alert` ile başarı bildiren ve server kaydı olmayan formlar
- Koda gömülü KPI/filial/personel verisi
- `localStorage` ile sahte kayıt

## Tasarım kuralı

- Sol menü: mevcut düz OCAQ yapısı korunur.
- Görsel dil değişikliği ayrı onay gerektirir.
- Yetki düzeltmesi tasarım değişikliği için gerekçe değildir.
- Mobil düzen masaüstü tasarımın devamıdır; ayrı ve habersiz ürün tasarımı değildir.

## Bir özelliğin “tamam” sayılması

- Gerçek veri kaynağı
- Server-side doğrulama ve kapsam
- Başarılı/başarısız sonuç
- Liste/detay/takip
- Audit
- Mobil kullanım
- Otomatik test
- Preview davranış kanıtı
