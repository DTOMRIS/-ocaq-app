# Etap 1 Sonuç Raporu

Tarih: 16 Temmuz 2026  
Durum: tamamlandı.

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

## Authenticated Preview kabulü

16 Temmuz 2026 tarihinde izole Neon `preview-codex` dalında dört geçici
hesapla gerçek oturum kabulü çalıştırıldı:

- Staff legacy/dashboard operasyon URL'lerinden eğitim landing'ine döner.
- Bölge müdürü başka bölgeye erişemez ve bölge düzenleme düğmesini görmez.
- Filial müdürü yalnız aktif ve atanmış filialı görür.
- Arşivli/deaktif filial doğrudan API ile vardiya/KXT/bildirim kapsamına giremez.
- Bildirim alıcı önizlemesinde staff görünmez.

Sonuç: **56/56 kontrol geçti**.

- İlk koşuda deaktif filial denemesi eksik payload nedeniyle kapsam kontrolünden
  önce `400` aldı. Test geçerli tarih ve növbə alanlarıyla düzeltildi.
- Son koşuda deaktif ve arşivli filialın vardiya yazma girişimleri `403` aldı.
- Staff operasyon route'ları dashboard eğitim landing'ine döndü ve bildirim
  alıcı API'si `403` verdi.
- Super admin alıcı önizlemesinde yalnız üç operasyon rolü ve üç geçici yönetici
  hesabı yer aldı; staff yer almadı.
- Bölge ve filial müdürü yalnız aktif, arşivlenmemiş test filialını gördü.
- Legacy admin URL'leri kanonik dashboard URL'lerine yönlendi.

Her koşu zorunlu temizleme bloğuyla bitti. Son başarılı koşuda dört geçici hesap
pasifleştirildi, üç test filialı arşivlendi ve test tenantı pasifleştirildi. İlk
koşunun geçici kayıtları da aynı şekilde temizlendi. Test parolaları veya bağlantı
değerleri dosyaya, rapora ya da terminal çıktısına yazılmadı.

## Production etkisi

Yok. Production deploy, veri yazımı veya migration yapılmadı.

## Rollback

Şema değişikliği yoktur. Etap 1 commit'i geri alınarak kod rollback yapılabilir.
