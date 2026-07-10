# OCAQ Portal — Layihə Konteksti & İş Prinsipləri

> Bu fayl hər AI sessiyasının ƏVVƏLCƏ oxuyacağı yerdir. Məqsəd: sadə işi
> sadə saxlamaq, mövcud sistemi qorumaq, dünyaya baxıb ən yaxşı praktikanı
> gətirmək — və bir daha "durduq yerdə sistemi silmək" olmasın.

## 1. Bu sistem nədir (SADƏ)

OCAQ restoran zənciri üçün **əməliyyat portalıdır**. Əsas axın sadədir:

1. **Filiallar** vardiya **checklist**-i ilə yoxlama edir → formu göndərir.
2. **Bölgə müdirləri** həmin nəticələrə/formalara baxır.
3. **Şikayətlər** daxil edilir.
4. İrəlidə: **HR**, satış hədəfi, hesabatlar və s.

Rollar (yuxarıdan aşağı): `super_admin` → `region_manager` → `branch_manager` → `staff`.
Hər rol yalnız öz səviyyəsini görməlidir (bax RBAC).

## 2. Necə işləyirik (PRİNSİPLƏR)

1. **ÖNCƏ ANLA.** Dəyişiklikdən əvvəl mövcud kodu və məqsədi oxu. Varsayma —
   məlumatı girmədən "bu tam olaraq nədir?" soruş.
2. **DÜNYAYA BAX.** Bir iş görəndə "böyük firmalar / başqaları bunu necə edib?"
   araşdır, benchmark et, ən yaxşı praktikanı gətir.
3. **TƏKLİF GƏTİR.** Seçim varsa qısaca öner (tövsiyə ilə), sonra icra et.
4. **SİSTEMƏ SADİQ QAL.** Mövcud işləyən funksiyanı qoru. "Refactor" adı
   altında silmə. Yeni əlavə edərkən köhnəni sındırma.
5. **KİÇİK & DOĞRULANMIŞ.** Kiçik addım → build/test → GÖSTƏR → sonra deploy.
6. **PROD-DA TEST YOX.** Dəyişiklik preview-də yoxlanır; prod-a birbaşa yaz-poz
   yoxdur. Prod credentials chat-ə yapışdırılmır.
7. **XƏTA UDMA.** Hər xəta göstərilir, udulmur (email, rate-limit və s.).
8. **XƏBƏRDAR ET.** Risk görsən DAYAN və de; sürprizlə davam etmə.

## 3. Qırmızı xətlər (POZULMAZ)

- Mövcud **dashboard KPI panelini, sidebar-ı, route/komponentləri SİLMƏ**
  → bax `AGENTS.md` (kritik qoruma qaydaları).
- **Datanı itirmə** → bax `docs/DATA-PROTECTION.md` (Neon PITR, snapshot,
  soft-delete, audit). Riskli əməliyyatdan əvvəl snapshot.
- **Prod-a ad-hoc destruktiv SQL/skript yox.** Versiyalı migration + review.
- **Birbaşa `main`-ə push yox** (guardrail qurulandan sonra) → PR + yoxlama.

## 4. Texniki qeydlər

- Stack: **Next.js 16 (Turbopack) + Drizzle ORM + NextAuth + Neon Postgres +
  Vercel**. Deploy: `main`-ə merge → Vercel avtomatik prod.
- Build həmişə env dəyişənləri tələb edir (DATABASE_URL, AUTH_SECRET,
  RESEND_API_KEY, UPSTASH_*, AWS/S3, NEXTAUTH_URL) — yoxdursa build sınır.
- Next.js bu versiyası fərqlidir → kod yazmadan `node_modules/next/dist/docs/`
  oxu (bax AGENTS.md).

## 5. Sənədlər (tək həqiqət mənbəyi)

| Fayl | Nə üçün |
|---|---|
| `AGENTS.md` | Kritik qoruma qaydaları (silmə qadağan) |
| `docs/ENGINEERING-GUARDRAILS.md` | CI, branch protection, migration, RBAC qaydaları |
| `docs/DATA-PROTECTION.md` | Data itkisi qorunması & bərpa (backup, PITR) |
| `docs/ROADMAP.md` | Faz-faz yol xəritəsi + RBAC matrisi |
| `CHANGELOG.md` | Hər dəyişiklik burada qeyd olunur |

@AGENTS.md
