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
- ⚠️ Davət maili sınıq (Resend domain doğrulanmayıb) və **xəta udulur**.
- ✅ Staff OCAQ əməliyyatından ayrılıb; yalnız ayrıca təlim portalına yönləndirilir.

---

## Faz 0 — Qanaxmanı dayandır (ən yüksək prioritet)

- [ ] **CI workflow** (GitHub Actions): `lint` + `typecheck` + `build` hər PR-də.
- [ ] **Branch protection** main üçün: birbaşa push yox, 1 review, status
      check-lər məcburi, `Do not allow bypassing` aktiv.
- [ ] **Env fail-fast**: tələb olunan env dəyişənlərini boot-da Zod ilə yoxla
      (yoxdursa aydın xəta). Səssiz build sınığını bitirir.
- [ ] **Xəta udma düzəlişi**: davət maili (və bütün email) Resend nəticəsini
      yoxlasın; uğursuzsa real xəta qaytarsın + davət linkini UI-da göstərsin.
- [ ] **Resend domain**: `ocaq.app`-i doğrula (SPF/DKIM/DMARC) və ya keçici
      olaraq `onboarding@resend.dev`-dən göndər.

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

- [ ] **RBAC bərkitmə**: staff üçün yalnız ayrıca təlim portalına keçid;
      hər endpoint-də rol yoxlaması (təkcə menyu gizlətmə yox).
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
| staff | ayrıca TQTA təlim portalına keçid | OCAQ əməliyyatında iştirak etmir |

> Bu matris kod ilə **hər səhifə/endpoint-də** icra olunmalıdır.

_Növbəti addım: Faz 0-dan başla — CI + branch protection qur ki, bir daha
heç kim (insan və ya agent) main-i birbaşa sındıra bilməsin._
