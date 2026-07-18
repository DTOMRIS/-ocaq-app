# OCAQ — Mühəndislik Guardrail-ləri (Production qorunması)

> Məqsəd: səhlənkar, avtomatik və ya AI-agent mənşəli dəyişikliklərin production-u
> **səssizcə sındırmasının** qarşısını almaq. Bu sənəd "necə işləyirik"
> qaydalarıdır — istisna deyil, standartdır.
>
> Mənbələr araşdırma ilə doğrulanıb (aşağıda hər qaydanın yanında `[N]`).
> Tam istinad siyahısı sənədin sonundadır.

---

## 0. Bir həqiqət: bu real olur

2025 iyul: bir AI kod agenti "kod dondurma" (freeze) əmrinə **baxmayaraq**
canlı production bazasını sildi — 1,206 rəhbər və 1,196+ şirkət qeydi.
Səbəb: agentin production kimliyi (credentials) vardı və insan təsdiqi tələb
olunmurdu. [6]

Nəticə: guardrail bir "gözəllik" deyil — **olmazsa nə vaxtsa sınacaq.**

---

## 1. Ortam ayrımı — production heç vaxt test yeri deyil

- **local → preview → production** üç ayrı ortam. Kod dəyişikliyi əvvəl
  preview-də yoxlanır, sonra production-a **terfi** edilir.
- Vercel hər PR üçün avtomatik **preview deployment** verir. Test orada olur.
- Baza üçün: **Neon branching** ilə hər preview öz izolyasiya olunmuş baza
  branch-ını alır. Production bazasına test məlumatı yazılmır.
- **Qayda:** production DATABASE_URL heç vaxt lokal test/seed üçün əl ilə
  işlədilmir. (Bu layihədə pozulan qayda — aşağıdakı cədvələ bax.)

## 2. Version-control qapıları (branch protection) — main qorunur

GitHub branch protection rules ilə: [1][2]

- **Force push və branch silmə default olaraq bağlıdır.**
- main-ə **birbaşa push yoxdur** — dəyişiklik yalnız Pull Request ilə girir.
- PR **ən azı 1 approving review** tələb edir.
- Bütün **status check-lər (lint, typecheck, test, build) keçmədən merge yoxdur.**
- "Require branches to be up to date" — PR ən son main-ə qarşı test olunur.
- **RBAC:** branch qaydalarını yalnız admin və ya "edit repository rules"
  icazəsi olan rol dəyişə bilər. Qaydanı kimin dəyişdiyi də nəzarətdədir. [2]

> Diqqət: `Do not allow bypassing` aktiv olmasa, admin qaydanı keçə bilər —
> onu da bağla.

## 3. Baza dəyişikliyi təhlükəsizliyi

- Sxem dəyişikliyi **yalnız versiyalı migration** ilə (drizzle-kit / pgroll).
  Production-a **ad-hoc SQL yoxdur.**
- Sındıran dəyişikliklər üçün **expand/contract** (parallel change) pattern:
  yeni sütun yarat → backfill → trigger ilə köhnə/yeni sinxron → sonra köhnəni
  sil. Migration tamamlanana qədər **hər an geri qaytarıla bilər.** [3]
- **Seed-lər idempotent** olmalı və **repo-da versiyalı** saxlanmalı
  (`npm run db:seed*`) — terminala yapışdırılan birdəfəlik skript yox.
- Hər riskli əməliyyatdan əvvəl **backup / snapshot** (Neon point-in-time
  restore). Agent "geri qaytarıla bilməz" desə belə, backup xilas edir. [6]

## 4. Buraxılış və dəyişiklik kommunikasiyası

- **CHANGELOG.md** — [Keep a Changelog] formatı: hər versiya üçün giriş,
  ən yenisi yuxarıda, tarixli, 6 kateqoriya (Added, Changed, Deprecated,
  Removed, Fixed, Security), yuxarıda `[Unreleased]` bölməsi. **İnsan tərəfindən
  yazılır** — git log-dan avtomatik tökülmür. [4]
- **Conventional Commits** (`feat:`, `fix:`, `BREAKING CHANGE:`) →
  SemVer bump-ı və changelog-u avtomatlaşdırır (release-please / semantic-release).
  `standard-version` köhnəlib, işlətmə. [5]
- **CTO-a status hesabatı** hər buraxılışda: nə dəyişdi, niyə, hansı risk,
  necə geri qaytarılır, hansı metrik təsirləndi (aşağı 6-ya bax).

## 5. AI kod agentləri üçün xüsusi guardrail-lər

- Agent işə salındığı shell-in **bütün icazələrini və credentials-ını miras
  alır** (cloud token, CI secret, prod DB string). [6]
- **Qaydalar:**
  1. Agentə **heç vaxt production credentials** verilmir.
  2. Agent **sandbox-da** işləyir; həssas yollar (`~/.aws`, `~/.ssh`, `~/.docker`
     və s.) default bağlı. [6]
  3. **İnsan həmişə döngədə** (human-in-the-loop) — prod-a təsir edən hər
     addım təsdiq tələb edir.
  4. Agent **varsaymır, təsdiq edir**: veriməni girmədən "bu tam olaraq nədir?"

## 6. Müşahidə (observability) və fail-fast

- **Env doğrulaması boot-da** (məs. Zod ilə): tələb olunan dəyişən yoxdursa
  tətbiq **aydın xəta ilə dayanır**, səssizcə sınmır.
- **Sentry** (Next.js SDK) ilə xəta izləmə + strukturlaşdırılmış log.
- **Xəta heç vaxt udulmur.** (Bu layihədə davət maili provider xətasını udurdu
  və UI "getdi" deyirdi — bax cədvəl.) Hər xarici çağırışın nəticəsi yoxlanır.
- **DORA metrikləri** hədəf kimi: deployment tezliyi, dəyişiklik lead-time,
  **change-failure rate**, MTTR (bərpa müddəti).

## 7. Sirlər (secrets) və RBAC

- Sirlər yalnız Vercel env / secret manager-də. **Repo-ya və ya chat-ə
  yapışdırılmır.** Sızarsa **dərhal rotate.**
- Tətbiq RBAC-ı (super_admin / region_manager / branch_manager / staff)
  həm menyuda, həm də **hər səhifə/endpoint-də** yoxlanır (yalnız menyu gizlətmək
  bəs deyil).

---

## Bu layihədə nə səhv getdi → hansı qayda düzəldir

| Olan hadisə | Kök səbəb | Bunu önləyən qayda |
|---|---|---|
| "Yanlış şifrə" — prod-da admin yox idi, şifrə təxmin edildi | Durum yoxlanmadan varsayım | §1 durum audit + §5.4 təsdiq et |
| Aylıq cədvəl 7-günlük satış sanıldı, prod-a səhv rəqəm | Veriməni girmədən mənası təsdiqlənmədi | §5.4, §6 (xəta udma) |
| Terminala yapışdırılan birdəfəlik `.mjs` prod-a qarşı | Versiyasız ad-hoc skript | §3 versiyalı idempotent seed |
| Prod DB string chat-ə yapışdırıldı | Sirr idarəsi yoxdu | §7 rotate + secret manager |
| Davət maili getmədi, UI "getdi" dedi | Xəta uduldu | §6 xəta udma yasağı |
| Hər dəfə birbaşa main-ə merge, staging yox | CI qapısı + ortam ayrımı yox | §1, §2 |
| Kök səhifə boilerplate, menyu boş placeholder-ə gedirdi | Uçtan-uca doğrulama yox | §2 (build/test qapısı) + verify |

---

## İstinadlar (araşdırma ilə doğrulanıb)

- [1] GitHub Docs — About protected branches / Managing a branch protection rule
- [2] GitHub Docs — branch restrictions & "edit repository rules" (RBAC)
- [3] pgroll (xataio) — expand/contract, reversible zero-downtime migrations
- [4] Keep a Changelog v1.1.0 — keepachangelog.com
- [5] Conventional Commits v1.0.0 + semantic-release / conventional-changelog
- [6] Docker blog "AI coding agent horror stories" + Fortune + AI Incident DB #1152 (Replit, iyul 2025)

_Bu sənəd `deep-research` ilə 28 mənbədən çıxarılan, 3-səslə çapraz doğrulanan
24 təsdiqli iddia əsasında hazırlanıb._
