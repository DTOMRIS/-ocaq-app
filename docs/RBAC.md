# OCAQ — RBAC & Dəyişiklik Qaydaları (İcazələr qarışmasın)

> Sual: "Yarın müdir dəyişdi, bölgə dəyişdi — icazələr qarışmasın necə?"
> Cavab: **icazə şəxsə deyil, DATA sahibliyinə bağlıdır.** Sahibliyi dəyiş →
> icazə avtomatik köçür. Dünya standartı (Google/Okta) budur.

## 1. Rollar və nə görürlər

| Rol | Görür | Edir |
|---|---|---|
| **super_admin** | Hər şey (bütün bölgə/filial/HR/audit) | Hər şey; rol/təyinat dəyişir |
| **region_manager** | YALNIZ öz bölgəsinin filialları, satış, checklist, personal | Filial nəticələrinə baxır, hədəf |
| **branch_manager** | YALNIZ öz filialı | Gündəlik satış, checklist doldurur |
| **staff** | Yalnız öz checklist + şikayət | Checklist doldurur, şikayət |

## 2. Əsas prinsip — icazə DATA-dan gəlir (şəxsə "yapışmır")

- region_manager-in gördüyü = `regions.manager_id = sən` olan bölgələr.
- branch_manager-in gördüyü = `branches.manager_id = sən` olan filiallar.
- Yəni icazə **manager_id göstəricisindən** hesablanır, hər sorğuda yoxlanır.
  Bu göstəricini dəyişmək = icazəni köçürmək. **Rol adama yapışmır, vəzifəyə.**

## 3. Dəyişiklik ssenariləri (A-dan Z-yə)

**a) Müdir işdən çıxdı / dəyişdi.**
super_admin → köhnə istifadəçini `is_active = false` edir → **sessiyası dərhal
ləğv olur** (auth.ts DB-dən yoxlayır). Sonra həmin bölgə/filialın `manager_id`-ni
yeni şəxsə verir → yeni müdir dərhal görür, köhnə heç nə görmür.

**b) Filial başqa bölgəyə keçdi.**
super_admin → `branches.region_id`-ni yeni bölgəyə dəyişir → yeni bölgə müdiri
avtomatik görür, köhnə görmür. Kod dəyişikliyi lazım deyil.

**c) Filial müdiri bölgə müdiri oldu (terfi).**
super_admin → istifadəçinin `role`-nu region_manager edir + bölgə təyin edir →
**sessiya DB-dən yenilənir, yeni icazə dərhal işləyir** (köhnə JWT-yə güvənmir).

**d) Yeni filial açıldı.**
super_admin → filial yaradır, bölgə + müdir təyin edir. Bitdi.

**e) Bir bölgəyə iki müdir?**
Hazırda **bir bölgə = bir müdir** (manager_id tək). Yeni müdir təyini köhnəni
əvəz edir. Co-manager lazım olsa — bu, gələcək sxem dəyişikliyidir (many-to-many).

## 4. İcazələr niyə qarışmır (texniki təminat)

Hər API/səhifə rolu VƏ sahibliyi **ayrıca yoxlayır** (yalnız menyu gizlətmək
bəs deyil):
- `staff` PATCH edə bilməz; region/branch manager yalnız öz əhatəsi (staff/[id]).
- region_manager yalnız öz bölgəsini dəyişir (regions PATCH).
- satış/checklist/personal sorğuları bölgə/filial əhatəsinə görə süzülür.
- Sessiya rol/tenant-i hər dəfə DB-dən oxuyur → köhnə icazə qalmır.

## 5. İnsan prosesi (runbook)

- **Onboarding:** link əsaslı dəvət (şifrə göndərilmir, özü qoyur). Bax
  `scripts/invite-regions.mjs` (pilot) / `scripts/bulk-invite.mjs` (hamı).
- **Offboarding:** `is_active=false` (sessiya dərhal düşür) → sonra manager_id
  yeni şəxsə.
- **Yenidən təyinat:** manager_id / region_id / role dəyiş — kod yox, data.

> Qayda: **əvvəl pilot** (bir neçə nəfər), işlədiyini gör, sonra hamıya aç.
> İcazə dəyişikliyi = data dəyişikliyi; sessiya dərhal təsirlənir.
