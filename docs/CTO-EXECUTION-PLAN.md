# OCAQ CTO Yürütme Planı

Tarih: 16 Temmuz 2026  
Durum: yürürlükte  
Kaynak: kullanıcı görüşmeleri, kod denetimi, ADR-024 ve `PRODUCT-COMPLETION-CONTRACT.md`

## 1. Çalışma yöntemi

Her etap aynı kapıdan geçer:

1. Kapsam: yapılacaklar ve özellikle yapılmayacaklar yazılır.
2. Veri sözleşmesi: her alanın kaynağı, sahibi, doğrulaması ve sonucu tanımlanır.
3. Yetki matrisi: sayfa, API, kayıt ve alan seviyesinde rol/filial sınırı belirlenir.
4. Tasarım etkisi: mevcut ekran korunur; zorunlu değişiklik önce belgelenir.
5. Uygulama: yalnız etap kapsamındaki değişiklik yapılır.
6. Doğrulama: test, typecheck, lint, build ve rol senaryoları çalıştırılır.
7. Sonuç: yapılan, yapılamayan, kanıt, risk ve geri dönüş yolu raporlanır.
8. Kapı: etap kabul edilmeden sonraki etap Production'a taşınmaz.

“Hazır” kelimesi yalnız şu zincir tamamlandığında kullanılır:

`girdi → server doğrulaması → DB kaydı → doğru alıcı/kapsam → listede sonuç → takip/kapanış → audit → mobil doğrulama`

## 2. Değişmez kararlar

- OCAQ'ın mevcut görsel dili ve düz sol menü tasarımı dondurulmuştur.
- İşçi OCAQ operasyonuna girmez; yalnız ayrı TQTA eğitim portalına yönlendirilir.
- Filial müdürü kaynak operasyon kaydını oluşturur.
- Bölge müdürü kendi bölgesinin istisnalarını ve takip işlerini yönetir.
- Super admin bütün ağı, hesapları, kapsamları, standartları ve sonuçları yönetir.
- Admin ve bölge müdürü tamamlanmış filial kaynak kaydını değiştirmez.
- Hasta çalışan/CDC konusu bu kapsamda yoktur.
- Mock sayı, `alert` ile sahte başarı, `localStorage` kaydı ve boşa çıkan düğme kabul edilmez.
- TQTA Shaurma örnektir; OCAQ kodu veya verisiyle birleştirilmez.
- Production, açık veri denetimi + yedek + migration provası + kullanıcı onayı olmadan değiştirilmez.

## Etap 0 — Kanonik kapsam ve gerçek durum tablosu

### Amaç

Ekip ve gelecek agentler için tek ürün gerçeği oluşturmak; çelişkili rol, sayfa ve “hazır” iddialarını bitirmek.

### Kapsam

- Kanonik rol matrisi
- Route/API/veri kaynağı envanteri
- Gerçek, planlı, legacy ve engelli modül sınıflandırması
- Bütün etapların kabul kapıları
- Tasarım dondurma ve değişiklik iletişimi
- Production/Preview ayrımı

### Çıktılar

- `docs/CANONICAL-PRODUCT-SCOPE.md`
- `docs/CTO-EXECUTION-PLAN.md`
- `docs/CTO-ADMIN-OPERATIONS-AUDIT.md`
- Eski belgelerdeki çelişkilerin listesi

### Kabul kriteri

- Her rol için “görür / yapar / yapamaz” tek belgede bulunur.
- Her menü öğesi gerçek veri kaynağıyla eşleştirilir.
- Staff için operasyon izni veren eski doküman maddeleri işaretlenir.
- Production'ın değiştirilmediği açıkça kayıtlıdır.

### Sonuç kanıtı

- Doküman bağlantıları
- `git diff --check`
- Çelişki taraması

## Etap 1 — Yetki ve yaşam döngüsü tutarlılığı

### Amaç

Gizli menü ile gerçek API yetkisinin aynı olması; arşivli/deaktif kayıtların operasyona sızmaması; legacy sayfaların yanlış gerçeklik göstermemesi.

### Kapsam

- Staff operasyon route ve API kapsamının merkezi kararla eşleşmesi
- Staff'a ulaştırılamayan OCAQ bildirim hedefinin kapatılması
- `src/lib/rbac.ts`, ROADMAP ve gerçek proxy kararının eşleştirilmesi
- Arşivli/deaktif filialın bütün operasyon kapsamından çıkarılması
- Region düzenleme düğmesindeki yanıltıcı görünürlük koşulunun düzeltilmesi
- Eski `/admin/*` mock route'larının gerçek sayfalara yönlendirilmesi
- Doğrudan URL rol testleri

### Yapılmayacaklar

- Sol menü veya sayfa görsel dilini değiştirmek
- Yeni yönetim dashboardu yapmak
- Production migration/deploy yapmak

### Test matrisi

- Dört rol × korunan route
- Dört rol × kritik API
- Arşivli/deaktif filial × doğrudan API erişimi
- Legacy URL × doğru yönlendirme
- Staff bildirim alıcısı oluşturma girişimi

### Kabul kriteri

- Menüde görünmeyen işlem doğrudan URL/API ile yapılamaz.
- Arşivli/deaktif filial operasyon kaydı üretemez.
- İşçiye OCAQ içinde okunamayacak bildirim yaratılamaz.
- Eski admin mock sayfası açılmaz.

### Geri dönüş

- Tek commit; şema değişikliği yok; önceki commit'e kod rollback mümkündür.

## Etap 2 — Filial yaşam döngüsü

### Amaç

Filial oluşturma, müdür atama, düzenleme, deaktivasyon ve arşivlemenin tek gerçek akış olması.

### Veri sözleşmesi

- Kod: server önerisi, düzenlenebilir, tenant içinde benzersiz, arşivde tekrar kullanılmaz.
- Bölge: regional işletim modelinde zorunlu.
- Müdür: mevcut aktif kullanıcı veya bekleyen davet.
- Durum: aktif, deaktif, arşivli.
- Arşiv: sebep, yapan, zaman; geçmiş kayıtlar korunur.

### Kapsam

- Server-side `next_code`
- `(tenant_id, code)` unique migration
- Filial detay/düzenleme
- Mevcut müdürü ata, yeni müdür davet et, değiştir, ayır
- Deaktivasyon/aktivasyon
- Soft archive ve audit
- Açık davet/görev/operasyon uyarıları

### Kabul kriteri

- İki eşzamanlı filial aynı kodu alamaz.
- Müdür ataması kabul sonrası filial satırında görünür.
- Eski müdür yeni operasyon kapsamını kaybeder.
- Arşiv geçmiş satış/KXT/şikâyet/vardiya kayıtlarını silmez.
- Bütün işlemler audit'e yazılır.

### Migration kapısı

- Preview DB migration
- Duplicate code preflight sorgusu
- Migration rollback planı
- Production öncesi snapshot

## Etap 3 — Vardiya modeli ve filial müdürü çalışma ekranı

### Amaç

Toplantı notundan gerçek vardiya hakimiyetine geçmek.

### Veri modeli

- Filial haftalık vardiya beklentisi: gün, vardiya, zorunlu, termin saati
- Planlanan vardiya müdürü
- Vardiyadaki çalışan/pozisyon listesi veya ilk fazda kadro özeti
- Başlama/tamamlama zamanı
- Servis, satış, kalite odağı
- Eğitim sonucu snapshotı
- 5 müşteri konuşması
- Devir notu

### Filial müdürü ekranı

- Bugünkü vardiya kartı
- Eksik pozisyon/personel uyarısı
- Dünün sonuç özeti
- Beş dakikalık toplantı gündemi
- Zorunlu kritik alanlar
- Taslak ve tamamla
- Tamamlanmış kaydı kilitle

### Kabul kriteri

- Beklenen vardiya ile gönderilen kayıt ayrı kavramlardır.
- Bakı iş günü doğru hesaplanır.
- Kritik odaklar boşken kayıt tamamlanamaz.
- Tamamlanan kayıt değiştirilemez; düzeltme auditli ek kayıtla yapılır.
- Mobilde tek elle tamamlanabilir.

## Etap 4 — Admin ve bölge sonuç kokpiti

### Amaç

Adminin form değil karar ekranı görmesi.

### Üst sonuçlar

- Beklenen / tamamlanan / taslak / eksik / geciken
- Zamanında tamamlama oranı
- Müşteri görüşü toplamı
- Eğitim bekleyen toplamı
- Açık takip işi

### İstisna tablosu

- Bölge, filial, müdür, tarih, vardiya
- Durum, gecikme, risk
- Servis/satış/kalite sonucu
- Eğitim ve müşteri sonucu
- Devir notu
- Açık aksiyon

### Yetki

- Super admin: tenant'ın tamamı
- Bölge müdürü: yalnız kendi bölgeleri
- Filial müdürü: yalnız kendi filial sonucu

### Kabul kriteri

- “30 filialdan kim göndermedi?” tek ekranda cevaplanır.
- Sonuç denominator'ı vardiya beklentisinden gelir; hardcode değildir.
- Kaynak kayıt salt okunurdur.
- Filtre ve detay mobilde çalışır.

## Etap 5 — Görev, takip ve bildirim sonucu

### Amaç

“Seç, yaz, gönder” işleminin havada kalmaması.

### Görev alanları

- Kaynak modül/kayıt
- Başlık ve açıklama
- Filial/bölge
- Sorumlu
- Termin
- Öncelik
- Durum: açık, sürüyor, tamamlandı, iptal
- Kanıt/fotoğraf
- Yorum zinciri
- Çözüm notu
- Açan/kapatan ve zamanlar

### Bildirim ayrımı

- Bilgi: okundu
- Onay: okundu + onaylandı
- Görev: sorumlu + termin + tamamlandı + doğrulandı

### Kabul kriteri

- Her görev alıcının iş listesinde görünür.
- Geciken görev yönetici istisna ekranına düşer.
- Tamamlanma kanıtı ve audit bulunur.
- Toplu gönderimde alıcı önizlemesi ve gönderim sonucu vardır.

## Etap 6 — Yönetici aktivitesi ve şikâyet/SLA

### Amaç

Yöneticinin yalnız girişini değil gerçek operasyon sonucunu görmek.

### Yönetici aktivitesi

- Son giriş
- Son operasyon
- Vardiya tamamlama/zamanında oranı
- KXT tamamlama ve skor
- Açık/geciken görev
- Açık/geciken şikâyet
- Eğitim takibi

### Şikâyet sonucu

- Kanal, puan, filial, vardiya ve sorumlu
- SLA, ilk cevap ve çözüm zamanı
- Kök neden
- Yapılan düzeltme ve iade
- Tekrar eden problem
- Kapanış onayı

### Kabul kriteri

- Aktivite, yalnız login sayılmaz.
- Bölge müdürü yalnız kendi kapsamını görür.
- Şikâyet kapatılmadan sorumlu/çözüm/puan sonucu eksik bırakılamaz.

## Etap 7 — TQTA sonucu ve günlük müdür bilgisi

### Amaç

TQTA'yı OCAQ'a karıştırmadan eğitim sonucunu müdür kararına taşımak.

### Entegrasyon sözleşmesi

- Salt okunur API
- Org/filial/user eşleştirme anahtarları
- Dün giriş yapanlar
- Dersi tamamlayanlar
- Başlamayan/geride kalanlar
- Son senkron zamanı ve hata durumu

### Vardiya öncesi kart

- Dün satış/hedef
- Şikâyet ve müşteri puanı
- Eksik KXT
- Eğitim bekleyenler
- Bugünkü kadro
- Servis/satış/kalite odağı
- Açık/geciken görevler

### Kabul kriteri

- Manuel eğitim sayısı kullanılmaz.
- Entegrasyon yoksa eski/sahte sayı gösterilmez.
- Müdür beş dakikalık toplantı gündemini tek ekranda görür.

## Etap 8 — Borç kapanışı ve güvenli canlı geçiş

### Kapsam

- Bütün route'larda mock/alert/localStorage taraması
- Planlı modüllerin menü dışı ve dürüst durumunun doğrulanması
- Super admin, bölge müdürü, filial müdürü ve işçi yönlendirmesi için mobil E2E
- CI: lint, typecheck, test, build
- Preview DB ve authenticated kabul testi
- Production kullanıcı/rol/filial preflight sayımı
- Migration audit ve backup/snapshot
- E-posta davet/reset canlı testi
- Hata izleme ve rollback runbook
- Pilot filial → bölge → tüm ağ yayılımı

### Yayılım

1. İki pilot filial
2. Bir bölge
3. Beş iş günü gözlem
4. Kritik hata kapanışı
5. Tüm ağ

### Production kabul kriteri

- Veri kaybı riski için yedek ve geri dönüş kanıtı vardır.
- Bütün rol senaryoları Preview'da geçer.
- Kullanıcı sayısı, rolü ve kapsamı doğrulanır.
- Production deploy sonrası smoke test ve DB readback yapılır.

## 3. Etap sonuç raporu şablonu

Her etap sonunda aşağıdaki format zorunludur:

- Amaç
- Tamamlanan maddeler
- Değişen dosyalar/migrationlar
- Test ve davranış kanıtı
- Preview sonucu
- Açık risk/borç
- Production etkisi
- Rollback yolu
- Sonraki etaba geçiş kararı

