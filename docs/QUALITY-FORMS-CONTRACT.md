# OCAQ rəsmi keyfiyyət formaları — dəyişməz müqavilə

Son yenilənmə: 26 iyul 2026.

## Ayrı məlumat xətləri

1. `KXT` gündəlik əməliyyat checklistidir.
2. `Keyfiyyət formaları` mənbədəki 18 rəsmi SH-KN formudur.
3. `OCAQ Analitik` iiko Excel/PDF idxalı və analitik mühərriklərdir; ayrı repoda yaşayır.
4. Dashboard bu xətlərin nəticəsini göstərə bilər, lakin mənbə qeydlərini birləşdirmir.

Dashboard yalnız cari (`is_current=true`) reviziyanı sayır. Son 7/30 gündəki
qeyd sayı və `submitted`/`draft`/`voided` vəziyyəti göstərilir. Forma tezliyi və
filial təyinatı ayrıca təsdiqlənmədiyi üçün hazırda “gözlənən/çatışmayan rəsmi
forma” hesablanmır; mövcud olmayan tələb məlumat kimi təqdim edilmir.

## Mənbə bütövlüyü

- 25 PDF faylından SHA-256 ilə 18 unikal mənbə müəyyən edilib.
- Bütün sahə adları, sabit saatlar, imza yerləri, hazırlama/reviziya məlumatı və qeydlər kataloqda saxlanır.
- `SH-KN-F-034` nömrəli Bükmə, Lahmacun, Pide, Pizza və Shaurma formaları beş ayrı formadır.
- F-041-dəki 65 °C / 75 °C ziddiyyəti səssiz “düzəldilmir”; təsdiqli yeni mənbə reviziyası gələnədək hər iki qeyd qorunur.

## Rol və əhatə

| Rol | Daxil edir | Görür | Təsdiq edir | Çap edir |
|---|---|---|---|---|
| Filial müdiri | Öz filialı | Öz filialı | Xeyr | Öz filialı |
| Bölgə müdiri | Xeyr | Bağlı filiallar | Bağlı filiallar | Bağlı filiallar |
| Super admin | Zərurətdə | Tenantdakı bütün filiallar | Bütün filiallar | Bütün filiallar |
| Ümumi personel | Xeyr | Xeyr | Xeyr | Xeyr |

Ümumi personel OCAQ-a daxil edilmir. Sonradan ayrıca “nəzarətçi” hesabı istənərsə, bu rol ümumi personeldən ayrı, açıq migration və qəbul testi ilə əlavə olunmalıdır.

## Qeyd və düzəliş qaydası

- Draft serverdə saxlanır və hər yeniləmə ayrıca audit snapshot-ı yaradır.
- Göndərmə idempotentdir; cavab itəndə eyni açarla təkrar qeyd çoxaltmır.
- Paralel pəncərələrdə `version` müqayisəsi köhnə məlumatın yenisini əzməsinə icazə vermir.
- Göndərilmiş payload dəyişdirilməyəcək.
- Düzəliş yeni `record_revision` yaradır; əvvəlki sətrə bağlanır və səbəb məcburidir.
- Düzəliş eyni transaction daxilində əvvəlki reviziyanı `is_current=false`, yeni reviziyanı `is_current=true` edir; dashboard eyni nəticəni iki dəfə saymır.
- Köhnə reviziya həmişə oxuna və yenidən çap edilə bilər.
- Fiziki `DELETE` yoxdur. Səlahiyyətli ləğv əməliyyatı səbəb, icraçı və vaxtla `voided` statusu yaradır.
- Yaratma, göndərmə, təsdiq, düzəliş, çap və ləğv append-only hadisə jurnalına yazılır.
- Filial arxivlənsə belə tarixi forma süper admin və səlahiyyətli bölgə müdürü üçün oxuna və çap edilə bilir.

## İşlək route-lar

- `/dashboard/quality-forms` — 18 formanın mənbə kataloqu.
- `/dashboard/quality-forms/[formKey]` — filial müdiri/süper admin giriş ekranı.
- `/dashboard/quality-forms/records` — rol əhatəli qeyd, filtr, təsdiq və məsul görünüşü.
- `/dashboard/quality-forms/records/[id]/print` — konkret reviziyanın çap/PDF və audit tarixçəsi.
- `/api/quality-forms` — rol əhatəli siyahı və idempotent yeni qeyd.
- `/api/quality-forms/[id]` — taslak yeniləmə, göndərmə, təsdiq, düzəliş və ləğv.
- `/api/quality-forms/[id]/print` — çap hadisəsini auditə yazır.

## Migration qoruması

`0007_quality_form_foundation.sql` yalnız yeni cədvəl və indekslər əlavə edir. Production-a avtomatik tətbiq edilmir. Tətbiqdən əvvəl:

1. production backup;
2. mövcud migration/şema preflight;
3. preview migration;
4. rol və tenant izolasiya testi;
5. rollback sınağı;
6. istifadəçinin ayrıca production təsdiqi tələb olunur.
