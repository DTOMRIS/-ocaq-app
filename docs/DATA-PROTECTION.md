# OCAQ — Data İtkisinin Qarşısı & Bərpa (Data Protection & Recovery)

> Sual: "Google/Apple kimi böyük firmalar, səhlənkar bir insan və ya AI agent
> sistemi bozanda datanı necə itirmir?"
>
> Bu sənəd araşdırma ilə (aşağıda kaynaklar) toplanıb və OCAQ stack-inə
> (Next.js + Neon Postgres + Vercel) uyğunlaşdırılıb.

---

## 0. Əsas həqiqət: canlı replika səni qorumur

2011-də bir proqram bug-ı Gmail poçt qutularını **bir neçə onlayn replikada
eyni anda** sildi. Google datanı **oflayn lent (tape) backup-dan** bərpa etdi —
çünki lent oflayndır, proqram bug-ından (və ya səhv agentdən) təsirlənmir. [1][2]

**Dərs:** replika = hardware nasazlığına qarşıdır, **məntiq xətasına / rogue
agentə qarşı deyil.** Silmə əmri bütün onlayn kopyalara eyni anda gedir. Ona
görə **toxunulmaz (immutable) və ayrı** kopya lazımdır.

## 1. Defense in Depth — tək qata güvənmə

Google SRE "Data Integrity" prinsipi: **çox qatlı müdafiə** — heç bir tək
mexanizmə güvənmə. Qatlar: soft-delete → audit → snapshot → PITR → oflayn/
immutable backup. Biri deşilsə, o biri tutur. [3]

## 2. 3-2-1-1-0 backup qaydası (2026 standartı)

- **3** kopya, **2** fərqli media, **1** offsite, **1 immutable (WORM)**,
  **0** yoxlanmamış backup. [4]
- **Immutable/WORM:** retention müddətində **heç kim** (admin, ransomware,
  rogue agent belə) silə/dəyişə bilməz. Rogue-agent ssenarisinin əsas müdafiəsi
  budur. [4]
- **RPO** (nə qədər data itkisi qəbuldur — backup tezliyi) və **RTO** (nə
  qədər sürətdə bərpa) əvvəlcədən yazılır, cadence ona görə seçilir. [4]

## 3. Point-in-Time Recovery (PITR) — bizim stack: Neon

- Neon **instant PITR**: 1–30 gün tarixçə saxlanır; keçmişdəki **istənilən
  ana** saniyələr içində branch yaradıb bərpa etmək olar. Böyük data belə olsa
  sürətli və əlavə xərcsiz. [5]
- **prod / dev iki ayrı root branch** + snapshot ilə dəyişikliyi təhlükəsiz
  köçürmək. Restore etmədən əvvəl "doğru anı" query ilə yoxlamaq olar. [5]
- **OCAQ üçün konkret:** Neon history retention-ı **maksimuma** qaldır; hər
  riskli əməliyyatdan (seed, toplu update, migration) əvvəl **snapshot** al.
  Bir agent/skript datanı silsə → geriyə branch yarat, 2 saniyədə bərpa.

### 3.1 RUNBOOK — migration tətbiqi (addım-addım)

> ⚠️ Deploy migration **İŞLƏTMİR**. `drizzle/migrations/meta/_journal.json`
> **0007-də donmuşdur** → 0008, 0009, 0010 əl ilə yazılıb və
> `drizzle-kit migrate` onları **görmür**. Ona görə addımlar aşağıdakı kimidir.

**1) Snapshot al (Neon Console)** — [Backup & restore səhifəsi][n1]
1. Neon Console → layihə → sol menyu **Backup & restore**
2. Yuxarıda **root branch** seçilməlidir (`main`/`production` — valideyni olmayan
   branch). Snapshot yalnız root branch-dən alınır; `preview-codex` kimi uşaq
   branch-də düymə çıxmır.
3. **Create snapshot** → «Manual snapshot» kimi görünür. Tarixi/adı yaz.

**2) Dry-run (DB-yə heç nə yazılmır)**
```bash
npm run db:migrate -- 0010_analytics_fact_tables.sql
```
İfadə sayını, DB host-unu (maskalanmış) və destruktiv xəbərdarlıqları göstərir.

**3) Tətbiq et**
```bash
npm run db:migrate -- 0010_analytics_fact_tables.sql --apply
```
Sonunda **doğrulama** çıxır: hər cədvəlin kolon və indeks sayı. Tətbiq
`schema_migrations_manual` cədvəlinə qeyd olunur — «hansı migration işləyib?»
sualı bir daha cavabsız qalmasın.

**4) Yarıda kəsilsə** — migration-lar `IF NOT EXISTS` ilə **idempotent**
yazılır: səbəbi düzəlt və **təkrar işlət**, uğurlu ifadələr no-op olur.
(Neon HTTP sürücüsü çoxifadəli tranzaksiya vermir — ona görə idempotentlik
məcburidir, ad-hoc SQL deyil.)

**Bərpa (rollback)** — snapshot-u **yeni branch-ə** restore edib əvvəlcə
yoxla, sonra finalize et; birbaşa prod üzərinə yazma. [n2]

**Qaydalar:**
- Destruktiv ifadə (`DROP`/`TRUNCATE`/`DELETE`/`ALTER COLUMN`/`RENAME`) varsa
  skript **DAYANIR**; `--allow-destructive` yalnız snapshot-dan SONRA.
- `DATABASE_URL` heç vaxt loga/fayla/chat-ə yazılmır — skript yalnız maskalanmış
  host göstərir.
- Prod-a ad-hoc SQL yox: hər dəyişiklik `drizzle/migrations/`-də versiyalı fayl.

[n1]: https://neon.com/docs/guides/backup-restore
[n2]: https://neon.com/blog/announcing-neon-snapshots-a-smoother-path-to-recovery

## 4. Blast radius-i məhdudlaşdır & least privilege

- **Least privilege:** hər kəs/hər proses yalnız işinə lazım olana çıxış alır;
  bu, "təsadüfi baza silmə" kimi insan xətasının **təsir sahəsini** kiçildir. [6]
- **Zero standing privilege:** heç kim daimi admin deyil; prod-a çıxış
  təsdiq + step-up MFA + **müddətli (break-glass)** olur. [6]
- **Blast-radius gating:** tək-obyektli dar əməliyyat avtomatlaşdırıla bilər,
  amma **tenant-geniş / silmə / admin təyinatı insan reviewundan keçir.** [6]

## 5. Google-un AI AGENT rehberi (tam bizim mövzu)

Google SRE agentic sistemlər üçün deyir: [6]
- Agent developer-in **daimi credentials-ı ilə işləməməli**; **ayrı, güclü
  autentifikasiyalı kimlik**, yalnız **lazım olanda** və dar icazə.
- **Declarative `dry_run` rejimi**: prod state dəyişməzdən əvvəl **blast
  radius-u əvvəlcədən proqnozlaşdır** — nə dəyişəcək, əvvəl göstər.
- Hər avtomatik qaydaya **expiry + rollback tetiği** bağlanır.

> Bu sessiyada pozulan qaydalar: prod DATABASE_URL chat-ə yapışdırıldı
> (least-privilege pozuntusu), ad-hoc skript birbaşa prod-a işlədildi
> (dry-run/review yox). Doğrusu §4-§5-dir.

## 6. Silməni geri alınabilən et: soft-delete + audit

- **Soft-delete:** biznes qeydləri (sifariş, şikayət, istifadəçi) **fiziki
  silinmir**; `deleted_at`/`is_archived` ilə işarələnir → təhlükəsiz "undo",
  əlaqələr qorunur. [7]
- **Grace period:** əvvəl soft-delete, müddət sonra hard-delete/purge. [7]
- **Audit:** hər silmə/bərpa/purge üçün **kim, nə vaxt, nə, niyə** yazılır. [7]
- **OCAQ üçün konkret:** sxemdə artıq `is_archived` (branches/staff) və
  `audit_logs` cədvəli **var** — intizamı bütün destruktiv əməliyyatlara yay;
  heç yerdə birbaşa `DELETE` yox.

---

## OCAQ üçün tətbiq planı (prioritetlə)

| # | Addım | Niyə |
|---|---|---|
| 1 | Neon **PITR retention-ı maksimuma** qaldır | Rogue dəyişikliyi saniyələrdə geri al |
| 2 | Riskli əməliyyatdan əvvəl **snapshot** (runbook) | "Geri qaytarıla bilməz" deyilsə belə xilas |
| 3 | Həftəlik **pg_dump → offsite + immutable (WORM)** object storage | Oflayn/toxunulmaz kopya (Gmail dərsi) |
| 4 | **prod/dev branch ayrımı**; heç vaxt prod-da test yox | §3, §5 |
| 5 | Prod credentials **rotate**; agent/skriptə daimi prod açarı vermə | §4 least privilege |
| 6 | Bütün silmələr **soft-delete + audit_logs** | §6 geri alına bilən |
| 7 | Toplu/miqrasiya əməliyyatları üçün **dry-run + review** | §5 blast-radius |

---

## Niyə bu xətalar (bu layihədə) baş verdi?

- Funksiyalar sürətlə (çox vaxt AI ilə) "happy path" yazıldı, **guard-lar
  yarımçıq** qaldı (GET qorunur, PATCH qorunmur — copy-paste boşluğu).
- **Review/CI qapısı yox** idi — səhv tutulmadı.
- **Xətalar uduldu** (email, rate-limit nəticəsi yoxlanmır).
- **Env fallback-ları səssiz təhlükəli** (ENCRYPTION_KEY → sıfır açar).
- **Çoxlu əlaqəsiz AI sessiyaları** eyni faylları ayrı-ayrı dəyişdi →
  migration/journal drift.

**Kök səbəb:** doğrulama qapısı yoxluğu + koordinasiyasız dəyişikliklər.
Həlli: `docs/ENGINEERING-GUARDRAILS.md` + bu sənəd + `docs/ROADMAP.md`.

---

## Kaynaklar
- [1] Data Center Knowledge — Google restores Gmail from tape
- [2] Google SRE Book — Data Integrity (Gmail restore, defense in depth): https://sre.google/sre-book/data-integrity/
- [3] Google SRE — Data Integrity: defense in depth, layered recovery
- [4] 3-2-1(-1-0) backup rule, immutable/WORM, RPO/RTO (Veeam/AvePoint/Datto)
- [5] Neon Docs/Blog — Point-in-Time Restore & branching: https://neon.com/blog/announcing-point-in-time-restore
- [6] Google SRE — AI engineering / reliable operations (agent identity, dry_run, blast radius); least-privilege & blast radius (OWASP): https://sre.google/resources/practices-and-processes/ai-engineering-reliable-operations/
- [7] Soft delete vs hard delete + audit best practices

_Araşdırma: hədəflənmiş web axtarışı + birincil kaynaklar (Google SRE, Neon, OWASP). Ajan ordusu istifadə olunmadı._
