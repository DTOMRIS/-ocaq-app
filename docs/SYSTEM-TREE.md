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
    └── rol əhatəsinə görə nəticə, trend, istisna və məsul

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
│   └── draft → submitted → approved
├── Düzəliş
│   └── köhnə qeyd qalır → səbəbli yeni record_revision
├── Ləğv
│   └── fiziki silmə yoxdur → voided + səbəb + icraçı + vaxt
├── Audit
│   └── created/submitted/approved/correction_created/printed/voided
└── Çap
    └── hər reviziya ayrıca yenidən çap edilə bilir
```

Ətraflı müqavilə: `docs/QUALITY-FORMS-CONTRACT.md`.
