# Etap 1 Sonuç Raporu

Tarih: 16 Temmuz 2026  
Durum: kod ve otomatik doğrulama tamamlandı; authenticated Preview rol kabulü bekliyor.

## Amaç

Yetki, route, filial durumu ve operasyon alıcısı kararlarını kanonik rol kapsamıyla eşitlemek.

## Tamamlanan

- Arşivli veya deaktif filial ortak operasyon kapsamından çıkarıldı.
- Bildirim kapsamındaki filial sorguları yalnız aktif ve arşivlenmemiş filialları kullanıyor.
- Eski `/admin/*` mock sayfaları kanonik dashboard sayfalarına yönlendirildi.
- Staff için eski operasyon izinleri merkezi RBAC listesinden kaldırıldı.
- Staff, OCAQ bildirim alıcısı olmaktan çıkarıldı.
- Şirket/rol/bölge/filial/seçilmiş bildirim hedefleri yalnız super admin, bölge müdürü ve filial müdürüne çözülüyor.
- Bölge kartındaki `isSuperAdmin || true` görünürlük hatası kapatıldı.
- ROADMAP son staff kararıyla eşleştirildi.

## Otomatik kanıt

- TypeScript: geçti.
- Hedefli ESLint: geçti.
- Test: 17/17 geçti.
- Next.js 16.2.9 production build: geçti.
- `git diff --check`: geçti.

## Ortam notu

NO NAME diski `.next` klasörü oluşturmasına izin vermediği için build aynı kaynak ağacının `/private/tmp` içindeki temiz kopyasında, temiz `npm ci` bağımlılıklarıyla çalıştırıldı. Build için yalnız sahte ve bağlantı kurmayan placeholder ortam değerleri kullanıldı; Production credential veya veri kullanılmadı.

## Açık kabul kapısı

Preview dağıtımı sonrası aşağıdaki authenticated kontroller yapılmadan Etap 1 bütünüyle kapalı sayılmaz:

- Staff legacy/dashboard operasyon URL'lerinden eğitim landing'ine döner.
- Bölge müdürü başka bölgeye erişemez ve bölge düzenleme düğmesini görmez.
- Filial müdürü yalnız aktif ve atanmış filialı görür.
- Arşivli/deaktif filial doğrudan API ile vardiya/KXT/bildirim kapsamına giremez.
- Bildirim alıcı önizlemesinde staff görünmez.

### 16 Temmuz doğrulama notu

Preview deployment `Ready` durumuna ulaştı. In-app browser ile authenticated
rol kabulü denenirken Preview aliası kurumsal ağ politikası tarafından engellendi.
Başka tarayıcı veya koruma aşma yöntemi kullanılmadı. Bu nedenle aşağıdaki
otomatik kanıtlar geçerli olmakla birlikte dört gerçek oturum kabulü hâlâ açıktır.

## Production etkisi

Yok. Production deploy veya migration yapılmadı.

## Rollback

Şema değişikliği yoktur. Etap 1 commit'i geri alınarak kod rollback yapılabilir.
