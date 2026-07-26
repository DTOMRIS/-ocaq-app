# OCAQ — Texniki Yol Xəritəsi

> Hədəf: hazırkı kövrək vəziyyətdən (prod-da əl ilə test, birbaşa main-ə merge,
> udulan xətalar) → **dəyişikliyin production-u səssizcə sındıra bilmədiyi**
> qorunan vəziyyətə keçmək.
>
> Prinsiplər `docs/ENGINEERING-GUARDRAILS.md`-də. Bu sənəd **sıra ilə addımlar**dır.

## İndi harda dayanırıq (dürüst mənzərə)

- ✅ Tətbiq canlıdadır (Vercel + Neon), giriş işləyir, satış/hesabat/checklist var.
- ⚠️ Guardrail **yoxdur**: birbaşa main-ə merge, CI qapısı yox, staging yox.
- ⚠️ Məlumat prod-a **ad-hoc skript**lə girildi (versiyasız).
- ✅ Davət və şifrə sıfırlama maili DK SMTP-yə keçirilib; uğursuz göndəriş
  UI-da uğur kimi göstərilmir.
- ✅ Staff OCAQ girişindən ayrılıb; personel kimliyi və təlimi TQTA-da qalır.

---

## Faz 0 — Qanaxmanı dayandır (ən yüksək prioritet)

- [ ] **CI workflow** (GitHub Actions): `lint` + `typecheck` + `build` hər PR-də.
- [ ] **Branch protection** main üçün: birbaşa push yox, 1 review, status
      check-lər məcburi, `Do not allow bypassing` aktiv.
- [ ] **Env fail-fast**: tələb olunan env dəyişənlərini boot-da Zod ilə yoxla
      (yoxdursa aydın xəta). Səssiz build sınığını bitirir.
- [x] **Xəta udma düzəlişi**: davət maili uğursuzsa davət ləğv edilir və UI
      real xəta qaytarır.
- [x] **DK SMTP kodu**: host/port/istifadəçi/app parolu ilə göndəriş və real
      xəta nəticəsi qoşuldu. Preview/Production environment scope qəbul testi qalır.

## Faz 1 — Ortam ayrımı və məlumat təhlükəsizliyi

- [ ] **Neon branch per preview**: hər PR öz baza branch-ında, prod-a toxunmadan.
- [ ] **Versiyalı seed-lər** repo-da: `db:seed`, `db:reset-admin`,
      `db:seed-sales` (idempotent) — ad-hoc `.mjs`-ləri əvəz et.
- [ ] **Backup rejimi**: prod dəyişikliyindən əvvəl Neon snapshot; restore
      prosedurunu runbook-a yaz.
- [ ] **Prod credentials rotate**: chat-ə düşən DATABASE_URL yenilənsin.

## Faz 2 — Buraxılış intizamı və müşahidə

- [ ] **CHANGELOG.md** işlək saxla (Keep a Changelog) — hər buraxılışda yenilə.
- [ ] **Conventional Commits** + release-please: avtomatik versiya + changelog.
- [ ] **Sentry** (Next.js): xəta izləmə + alert.
- [ ] **DORA metrikləri** izlə: deployment tezliyi, change-failure rate, MTTR.

## Faz 3 — Məhsul yetkinliyi

- [x] **RBAC bərkitmə**: OCAQ girişi yalnız super admin, bölgə müdiri və filial
      müdiri; staff üçün auth, reset, dəvət və endpoint sərhədləri bağlandı.
- [ ] **Hesabat modulu real məlumatdan**: `/dashboard/reports` hazırda sabit
      məlumatla işləyir — satış DB-sinə bağla (əl girişi qalxsın).
- [ ] **Feature flag** + Vercel instant rollback prosedurunu sənədləşdir.
- [ ] **Runbook**: seed / davet / deploy / rollback addım-addım.

---

## Personas / RBAC (netləşdirilməli)

Sistem **vardiya müdiri** üçün quruldu; **bölgə müdirləri** baxacaq.
Aşağıdakı matris təsdiqlənməlidir (Faz 3 girişi):

| Rol | Görməli | Etməli |
|---|---|---|
| super_admin | hər şey | hər şey |
| region_manager | öz bölgəsinin filialları, satış, hesabat | davet, hədəf təyini |
| branch_manager | öz filialı | gündəlik satış, checklist |
| staff | OCAQ giriş hesabı yoxdur; rəhbərlər personel qeydini görə bilər | kimlik və təlim TQTA-da |

> Bu matris kod ilə **hər səhifə/endpoint-də** icra olunmalıdır.

_Növbəti addım: Faz 0-dan başla — CI + branch protection qur ki, bir daha
heç kim (insan və ya agent) main-i birbaşa sındıra bilməsin._
