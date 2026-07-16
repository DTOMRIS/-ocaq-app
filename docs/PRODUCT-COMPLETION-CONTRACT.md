# OCAQ məhsul tamamlama müqaviləsi

Bir funksiya yalnız aşağıdakı zəncir bütöv işləyəndə “hazır” sayılır:

1. Düymə və formanın məqsədi aydındır.
2. Hər sahə istifadəçi roluna və filial əhatəsinə görə yoxlanır.
3. Server daxil olan məlumatı yenidən doğrulayır; brauzer hesablamasına etibar etmir.
4. Məlumat real bazaya yazılır və tenant/filial sərhədi saxlanılır.
5. Təkrar klik və təkrar sorğu ikinci qeyd yaratmır.
6. Uğur cavabı ekranda real nəticə ilə görünür.
7. Xəta gizlədilmir; istifadəçiyə düzəldə biləcəyi Azərbaycan dilində mesaj verilir.
8. Siyahı, detal, redaktə və silmə/arxivləmə eyni məlumat modelindən istifadə edir.
9. Bildiriş və tapşırıq düzgün alıcıya çatır, oxunma/təsdiq vəziyyəti saxlanılır.
10. Dəyişiklik audit jurnalında kim, nə vaxt, nə etdi şəklində izlənir.
11. Mobil görünüşdə bütün əsas əməliyyatlar əlçatandır.
12. Avtomatik test, tip yoxlaması, lint və build keçmədən yayımlanmır.

## Qəbul edilməyən qısayollar

- `localStorage` ilə saxta “saxlanıldı” vəziyyəti
- hardkod edilmiş KPI, satış və checklist nəticələri
- yalnız brauzer yaddaşında qalan forma
- alıcısı məlum olmayan “göndər” düyməsi
- rol və filial əhatəsini yalnız UI-da gizlətmək
- boş `catch`, səssiz xəta və işləməyən düymə
- foto və sənədi müvəqqəti `blob:` ünvanı kimi saxlamaq

## Əsas axınların müqaviləsi

### Növbə liderliyi

Müdür növbə və filialı seçir, 5 dəqiqəlik görüşün mövzusunu və tapşırıqları qeyd edir; əl yuma, porsiya/gramaj, xidmət və tövsiyəli satış xatırladılır. Ən az 5 müştəri söhbəti üçün qısa qeydlər və növbə təhvil notu saxlanılır. Əvvəlki gün portala daxil olan və dərsi tamamlayan əməkdaş sayı real mənbədən göstərilir. Bu modul yoxlama dili ilə deyil, motivasiya və rol-model dili ilə qurulur.

### Bildirişlər

Göndərən roluna görə region, filial və əməkdaş auditoriyası seçir. Server alıcı siyahısını özü hesablayır, hər alıcı üçün çatdırılma qeydi yaradır, təkrar göndərişi bloklayır. Əməkdaş oxuduğunu və lazım olduqda yerinə yetirdiyini təsdiqləyə bilir.

### Hesab və dəvət

Yeni hesab yalnız səlahiyyətli rol tərəfindən öz əhatəsində yaradılır. Dəvət tokeni birdəfəlik, müddətli və bazada hash şəklində saxlanılır. Şifrə qaydaları serverdə tətbiq edilir; şifrə və token loglara yazılmır.

### KXT yoxlama

Yalnız müdür rolları göndərə bilər. Maddələr serverdəki kanonik siyahı ilə uyğunlaşdırılır, skor serverdə hesablanır, filial/növbə/tarix üzrə təkrar qeyd yaranmır. Foto ölçüsü və formatı serverdə yoxlanılır; fayl filial və qeyd sahibinə bağlanır.

## Bilinən məhsul borcu

HACCP/qida təhlükəsizliyi, avadanlıq, kasa, HR, fire/itki və satış təxmini ekranlarının hər biri ayrıca bu müqavilədən keçirilməlidir. Köhnə Logbook və Təqvim mock ekranları məhsul kimi təqdim edilmir; real növbə liderliyi və personel axınlarına yönləndirilir.
