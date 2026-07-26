# OCAQ sistem ağacı

Son yenilənmə: 26 iyul 2026.

## Məhsul sərhədləri

```text
DK Agency
└── satış, müqavilə, paket və abunəlik
    └── OCAQ-a keçid / tenant provision

OCAQ
├── KXT
│   └── gündəlik əməliyyat checklisti
├── Rəsmi keyfiyyət formaları
│   └── mənbədəki 18 SH-KN formu
└── İdarəetmə dashboardları
    ├── filial müdiri → öz filialının nəticəsi və işi
    ├── bölgə müdiri → bağlı filialların 7/30 trendi, istisnası və məsulu
    └── super admin → tenant üzrə bütün aktiv filialların eyni şəbəkə görünüşü

TQTA
└── şəxsiyyət və təlim xətti

shaurma-analiz-sistemi (ayrı repo)
└── iiko Excel/PDF idxalı və analitik mühərriklər
```

## Rəsmi keyfiyyət formaları

```text
Keyfiyyət formaları (18 unikal mənbə)
├── Kanonik kataloq
│   ├── sənəd nömrəsi + variant
│   ├── mənbə SHA-256
│   ├── hazırlama/reviziya məlumatı
│   └── sahələr + sabit saatlar + imzalar + mənbə qeydləri
├── Rol əhatəsi
│   ├── filial müdiri → öz filialı
│   ├── bölgə müdiri → bağlı filiallar
│   └── super admin → tenantdakı bütün filiallar
├── Qeyd zənciri
│   ├── draft → submitted → approved
│   ├── idempotency → təkrar göndəriş qeyd çoxaltmır
│   └── version → paralel pəncərə köhnə məlumatla yenini əzmir
├── Düzəliş
│   ├── köhnə qeyd qalır → səbəbli yeni record_revision
│   └── əvvəlki is_current=false → yeni reviziya is_current=true
├── Ləğv
│   └── fiziki silmə yoxdur → voided + səbəb + icraçı + vaxt
├── Audit
│   └── created/draft_updated/submitted/approved/correction_created/printed/voided
└── Çap
    └── hər reviziya ayrıca yenidən çap edilə bilir
```

Ətraflı müqavilə: `docs/QUALITY-FORMS-CONTRACT.md`.

## Rəhbərlik dashboardunun hesab qaydası

```text
KXT
├── bu gün → hər aktiv filial üçün sabah + axşam (2 gözlənən növbə)
├── 7 gün → cari gün daxil son 7 günün real göndəriş ortalaması
├── əvvəlki 7 gün → trend müqayisə bazası
└── 30 gün → son 30 günün real göndəriş ortalaması

Rəsmi keyfiyyət formaları
├── yalnız is_current=true revision sayılır
├── 7/30 gün qeydləri ayrıca göstərilir
├── submitted → onay gözləyir
├── draft → tamamlanmamış qeyd
└── voided → auditli iptal

İstisna
├── bu gün çatışmayan KXT növbəsi
├── onay gözləyən/taslak/iptal cari forma
└── filial müdürü təyin edilməyən aktiv filial
```

Rəsmi formaların filial/forma üzrə gözlənən tarixini hesablamaq üçün ayrıca tezlik
və təyinat cədvəli lazımdır. Bu cədvəl təsdiqlənənədək dashboard “çatışmayan forma”
uydurmur; yalnız mövcud real qeydlərin vəziyyətini göstərir.
