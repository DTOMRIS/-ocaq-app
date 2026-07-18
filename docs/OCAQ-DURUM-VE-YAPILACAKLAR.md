# OCAQ — DURUM VE YAPILACAKLAR (elinde olsun)

Son güncelleme: 18 iyul 2026. Toplantı: Pazartesi (20 iyul). Vaktimiz: hafta sonu.

---

## 0. EN ÖNEMLİ ADRESLER

- **Çalışma klasörü (TEK doğru):** `/Volumes/NO NAME/codelar/ocaq-app-current`
- **GitHub repo:** `DTOMRIS/-ocaq-app`
- **Preview (test) sitesi:** https://ocaq-app-git-codex-shift-leadership-dtomris-projects.vercel.app
- **Production (gerçek) sitesi:** https://ocaq-app.vercel.app
- **Kullanma:** masaüstündeki eski kopya + `/Volumes/NO NAME/codelar/ocaq-app` (eski) — DOKUNMA.

## 1. DALLAR (ne nerede)

| Dal | Commit | Ne | Deploy |
|---|---|---|---|
| `codex/shift-leadership` | `f452564` | **Tam sürüm** (Etap 1 + 2A + 2B/2C + staff fix) | **Preview**'da canlı |
| `codex/etap-2bc-wip-backup-20260717` | `4d2da1c` | Her şey + import script (yedek) | Deploy yok |
| `main` | `e128b9e` | Eski kod | **Production** (dokunulmadı) |

> Kod sağlığı: typecheck ✅, test 24/24 ✅, build ✅.

## 2. ŞU ANA KADAR YAPILANLAR

- ✅ Staff sayfası çökme hatası düzeltildi (status null → çökmüyor). Preview'da canlı.
- ✅ Tam sürüm (2B/2C müdür atama/davet/arşiv dahil) Preview'a alındı — tek dal.
- ✅ Filial yönetimi çalışıyor: her satırın sağındaki **⋯** → Düzəlt / Müdür təyin et / Deaktiv / Arxivlə.
- ✅ CTE precedence bug düzeltildi.
- ✅ **Production preflight GEÇTİ** — 3 kritik kontrol (mükerrer kod/checklist/davet) temiz. Migration patlamayacak.
- ✅ 60 kişilik **import script** yazıldı: `src/db/import-staff.ts`.
- ✅ Her şey GitHub'da yedekli + CHANGELOG + denetim raporu (`docs/ETAP-2BC-REVIEW.md`).

## 3. KARARLAR (verdiğimiz)

- Onboarding önce **Preview**'da test, sonra Production.
- Şifreler **güvenli rastgele** (123456 değil) — script üretir, kişilere dağıtılır.
- **Direktörler + Oktay → super_admin** (her şeyi görür).
- Mail: **Resend**, gönderen domain **shaurma.az**, DNS'i **DK Agency** ekler.
- Production'a **açık onay + DB yedeği olmadan** dokunulmaz.

---

## 4. YAPILACAKLAR (öncelik sırası)

### ADIM 1 — 60 hesabı Preview'a aç (import script)
Kendi Terminal.app'inde:
```bash
cd "/Volumes/NO NAME/codelar/ocaq-app-current"
# Önce DRY-RUN (hiçbir şey yazmaz, sadece gösterir):
DATABASE_URL="<PREVIEW_DB_URL>" npx tsx src/db/import-staff.ts
# Sorun yoksa gerçekten yaz:
DATABASE_URL="<PREVIEW_DB_URL>" APPLY=1 npx tsx src/db/import-staff.ts
```
- `<PREVIEW_DB_URL>` = Neon → OCAQ → **preview-codex** dalı → Connection string.
- Çıktıda `⚠ EŞLEŞMƏYƏN` varsa (filial adı tutmadı) → o satırları Claude'a ver, düzeltsin.
- APPLY çıktısındaki **email → şifre** listesini kaydet (dağıtacaksın).

### ADIM 2 — Mail'i kur (Resend + DK Agency)
1. **resend.com** hesap aç.
2. Domain ekle: `shaurma.az` → Resend sana DNS kayıtları (SPF/DKIM) verir.
3. O kayıtları shaurma.az DNS'ine ekle → **DK Agency yapar**.
4. Doğrulanınca API key al.
5. **Vercel** → OCAQ projesi → Settings → Environment Variables:
   - `RESEND_API_KEY` = `<key>` (Preview + Production)
   - `SENDER_EMAIL` = `OCAQ <noreply@shaurma.az>`
6. Kodda değişiklik YOK — key gelince davet + "şifremi unuttum" çalışır.

### ADIM 3 — Production cutover (tek-dal canlıya) — SADECE onayınla
1. **Neon'da Production DB'nin yedeğini al** (branch/snapshot — 30 saniye).
2. Migration'ları Production'a uygula: `0004`, `0005`, `0006` (preflight geçti, güvenli).
3. `main`'i tam sürüme getir (fast-forward) → otomatik deploy.
4. 60 hesabı Production'a da aç (import script, Production URL ile).
5. Eski dalları sil → tek dal kalır.

### ADIM 4 — Kalan işler (Pazartesi sonrası)
- **Kullanıcı yönetimi** (Komanda'da sil/deaktiv/rol-değiştir/kapsam) — henüz YOK, yapılacak özellik.
- **API entegrasyon testleri** (2B/2C için) — test DB'siyle.
- ⋯ menüsünü daha görünür yap (küçük UI).

---

## 5. UNUTMA

- ✅ "Şifre değiştir" (giriş yapınca) → mailsiz çalışıyor.
- ⏳ "Şifremi unuttum" → mail (Resend) kurulunca çalışır.
- 🔴 Production'a her `main` push'u = otomatik canlı deploy. Yedeksiz dokunma.
- 📁 Her şey `codex/etap-2bc-wip-backup-20260717` dalında yedekli.
