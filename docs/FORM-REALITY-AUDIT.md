# OCAQ forma və məlumat reallığı auditi

Son baxış: 16 iyul 2026.

## Real server və verilənlər bazası axını olan modullar

- Hesab girişi, şifrə dəyişmə və şifrə sıfırlama tokenləri
- Personel siyahısı və səlahiyyətli personel idarəetməsi
- Hesab dəvəti, yenidən göndərmə, ləğv və qəbul
- Filial və bölgə əhatəsi
- Şikayət yaratma, status və 1–5 müştəri balı
- Satış hədəfi və günlük satış qeydləri
- Növbə liderliyi, 5 müştəri söhbəti və devir notu
- KXT checklist, server skoru, foto sübutu və nəticə izləmə
- Bildiriş, alıcı, oxundu və təsdiqləndi qeydi

## Yanıltıcı hissəsi çıxarılan HR modulları

- `Məzuniyyət`: köhnə forma heç kimə göndərmirdi və bazaya yazmırdı.
- `Sanitar`: köhnə adlar, sənəd nömrələri və tarixlər hardkod nümunə idi.
- `Oryentasiya`: seçimlər yalnız brauzer yaddaşında qalırdı.
- `Sınaq müddəti`: “saxlanıldı” alert-i vardı, server yazısı yox idi.
- `KAHI` adı və mənbə iddiaları OCAQ ekranı və data kataloqundan çıxarıldı.

Bu route-lar saxta forma göstərmir; real məlumat modeli, təsdiq zənciri və audit qurulana qədər dürüst “Planlaşdırılır” vəziyyəti göstərir.

## Hələ real axına çevrilməyən modullar

- HACCP/qida təhlükəsizliyi hesabatı
- Kasa hesabatı
- Fire/itki hesabatı
- Avadanlıq nasazlıq və inventar ekranları
- Satış təxmini
- Menyu və promosyon admin formaları
- Yeni filial üçün köhnə admin forması
- Kod daxilində saxlanılan filial satış/gerçəkləşmə hesabatı

Bu modullar silinməyib, lakin real məhsul kimi əsas menyuda göstərilmir. Hər biri `docs/PRODUCT-COMPLETION-CONTRACT.md` müqaviləsinə uyğun server yazısı, rol əhatəsi, alıcı/təsdiq, audit, mobil nəticə və test tamamlandıqdan sonra menyuya qaytarılmalıdır.
