<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ocaq-protection-rules -->
# ⛔ KRİTİK QORUMA QAYDALARI — POZİLMAZ!

Bu qaydaları heç bir AI asistent (Claude, Gemini, GPT, Copilot və s.) HEÇBIR HALDA pozmamalıdır.

## 1. Dashboard KPI Panelini SİLMƏ!
`src/app/dashboard/page.tsx` faylında aşağıdakı bölmələr MÜTLƏQDİR və SİLİNƏ BİLMƏZ:
- Günlük Satış hədəfi progress bar (TODAY.sales)
- KPI kartları: Ortalama Çek, Müştəri Sayı, Çek Sayı, Checklist Skor
- Maliyyət Göstəriciləri: Food Cost, Labor Cost, Prime Cost
- Aylıq Hədəflər: Satış, Müştəri, Ort.Çek, Google Rey
- Tez Keçidlər grid: Checklist, Food Safety, Kasa, Ekipman, Logbook, Təqvim, HR, Bildirişlər, Fire/İtki, Satış Təxmini, Komanda, Satış Hədəfi, Şikayətlər, Personel

## 2. Mövcud Səhifələri SİLMƏ!
Aşağıdakı route-ları silmək, boş placeholder ilə əvəz etmək QADAĞANDIR:
- `/dashboard/vardiya-checklist`, `/dashboard/haccp`, `/dashboard/kasa`
- `/dashboard/ekipman`, `/dashboard/logbook`, `/dashboard/takvim`
- `/dashboard/hr/*`, `/dashboard/komanda`, `/dashboard/fire`
- `/dashboard/tahmin`, `/dashboard/sales`, `/dashboard/complaints`
- `/dashboard/branches`, `/dashboard/regions`, `/dashboard/reports`
- `/admin/ekipman`, `/admin/filiallar`, `/admin/personel/*`

## 3. Sidebar Menüsünü SADƏLƏŞDİRMƏ!
`src/components/sidebar.tsx` faylındakı bütün mövcud menü linkləri qorunmalıdır.

## 4. Yeni Modul Əlavə Edərkən Mövcudları SİLMƏ!
Yeni feature əlavə edərkən mövcud kod, komponent, route və UI elementləri MÜTLƏQ qorunmalıdır. "Refactor" adı altında mövcud funksionallığı silmək QADAĞANDIR.

**Bu qaydalar 02a4d34 commit-ində Claude Opus 4.6 tərəfindən bütün KPI dashboard, checklist, HR, ekipman səhifələrinin silinməsindən sonra qoyulmuşdur. Bir daha TƏKRARLANMAYACAĞINdan əmin olun!**
<!-- END:ocaq-protection-rules -->
