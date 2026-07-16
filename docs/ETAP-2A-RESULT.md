# Etap 2A Sonuç Raporu — Filial Çekirdeği

Tarih: 16 Temmuz 2026
Durum: tamamlandı; Etap 2B müdür atama ve davet devri sıradaki kapıdır.

## Tamamlanan

- Filial kodu server tarafından öneriliyor ve oluşturma sırasında atomik üretiliyor.
- `(tenant_id, code)` DB unique indexi arşivli kodları da koruyor.
- Yeni filial hazırlık/deaktiv durumda açılıyor; aktif bölge ve müdür olmadan aktive edilemiyor.
- İlk aktivasyon zamanı korunuyor; hazırlık filialı ile sonradan deaktive edilen filial ayrılıyor.
- Filial detay güncelleme, aktivasyon, deaktivasyon, arşiv ve restore action'ları super admin ile sınırlandı.
- Kayıp güncelleme `version/expected_version` compare-and-swap ile engellendi.
- Deaktivasyon ve arşiv öncesi canlı davet, taslak vardiya ve açık şikâyet sayıları kontrol ediliyor.
- Arşiv fiziksel silmiyor; sebep, yapan, zaman ve audit kaydı tutuluyor.
- Super admin `active`, `inactive`, `archived`, `all` liste filtreleriyle restore kaynağını bulabiliyor.
- Filial liste read modeline müdür, bölge, bekleyen müdür daveti, yaşam döngüsü ve version alanları eklendi.

## Migration ve Preview

- `0005_branch_lifecycle.sql` üretildi.
- Preview preflight: exact kod duplicate 0, normalize kod duplicate 0, çift canlı müdür daveti 0.
- Preview snapshotta sessizce düzeltilmeyen mevcut veri borcu: 6 kanonik format dışı kod ve 6 geçersiz müdür bağı.
- Preview şeması 0004'e sahip olmasına rağmen `drizzle.__drizzle_migrations` boştu. 0000–0004 mevcut şema baseline olarak kaydedildi; 0005 aynı transaction içinde uygulandı.
- `version`, `activated_at`, arşiv kolonları ve iki unique index şema seviyesinde doğrulandı.
- Production migration veya veri yazımı yapılmadı.

## Gerçek oturum kabulü

İzole Neon `preview-codex` dalında super admin, bölge müdürü ve filial müdürü gerçek oturumlarıyla çalıştırıldı.

- Sonuç: **51/51 geçti**.
- Eşzamanlı iki otomatik create farklı `F-02` ve `F-03` kodlarını aldı.
- Duplicate manuel kod `409 BRANCH_CODE_CONFLICT` aldı.
- Hazırlık filialı müdür scope'una girmedi; aktivasyon sonrası girdi; deaktivasyon sonrası çıktı.
- Taslak vardiya deaktivasyonu gerçek blocker sayısıyla `409 BRANCH_HAS_ACTIVE_OPERATIONS` durdurdu.
- Arşiv ayrı listede bulundu, restore sonrası deaktiv listede okundu ve ayrı action ile yeniden aktive edildi.
- Bölge müdürü lifecycle mutasyonunda, filial müdürü yönetim detail endpointinde `403` aldı.
- Her koşu sonunda dört geçici kullanıcı pasifleştirildi, üç test filialı arşivlendi ve test tenantı kapatıldı.

## KXT runtime düzeltmesi

Preview kabulü sırasında Drizzle `neon-http` interaktif transaction API'sinin runtime'da desteklenmediği kanıtlandı. Filial create/lifecycle atomikliği tek PostgreSQL CTE sorgusuna çevrildi. Aynı risk mevcut checklist submit akışında da bulundu ve düzeltildi:

- checklist insert + audit tek atomik CTE;
- ilk gönderim `201`;
- aynı idempotency anahtarıyla tekrar `200` ve aynı kayıt;
- audit yalnız bir kez.

## Otomatik kanıt

- TypeScript: geçti.
- Hedefli ESLint: 0 hata, 0 uyarı.
- Birim testleri: 22/22 geçti.
- Next.js 16.2.9 production build: geçti.
- Authenticated Preview kabulü: 51/51 geçti.

## Açık kalan — Etap 2B/2C

- Mevcut aktif müdürü filial ekranından ata/değiştir/ayır.
- Tek canlı müdür daveti, revoke/resend ve kabul anında compare-and-swap devri.
- Orphan filial müdürünü role-wide bildirim alıcısından çıkar.
- Mevcut Filiallar tasarımına müdür/status/action kolonları, next-code ve arşiv filtresi ekle.
- 6 eski kod ve 6 geçersiz müdür bağı için Production öncesi kullanıcı onaylı veri düzeltme planı hazırla.
