// ─── Filial → Bölgə xəritəsi (add-only; analiz motoru ilə eyni kanonik model) ──
// Mənbə: shaurma-analiz-sistemi/bilgi/filial_bolge_haritasi.json (kopya, embed).
// iiko ham export-unda filial adları bəzən fərqli yazılır; `ALIASES` normalize edir.
// `EXCLUDE` rapora girməyən adlar (bağlanmış / bizim olmayan).

export const BOLGELER: Record<string, string[]> = {
  // Kanonik ad OCAQ-daki `branches.name` ilə EYNİ olmalıdır — `branchIdOf`
  // bağlantısı bu adla qurulur. F-31 OCAQ-da ünvana görə «Abdülkerim Alizadə»
  // adlanır, iiko isə hələ «Mytcha» yazır → ALIASES onu bağlayır (aşağı).
  'İsmayıl': ['Bulvar', 'Bayıl', '5 Mərtəbə', 'Torgoviy', 'Corner', 'Badamdar', 'Bulvar Festival', 'Abdülkerim Alizadə'],
  'Ceyhun':  ['Hüseyn Cavid', 'Əcəmi', 'İnşaatçılar', 'Masazır', 'Space', 'Sumqayıt'],
  'Elnur':   ['Neftçilər', 'Bakıxanov 1', 'Zığ', 'Bakıxanov 2', 'Həzi Aslanov', 'Əhmədli'],
  'Taleh':   ['Binəqədi', 'Duet', 'Ayna Sultanova', 'Nərimanov', 'Amay', 'Azadlıq'],
  'Ramin':   ['Seabreeze', 'Bilgəh', 'Mərdəkan', 'Gəncə', 'İnqilab'],
}

// Bölgə sırası (rapor/qruplaşma üçün)
export const REGION_ORDER = Object.keys(BOLGELER)

// iiko yazılışı → kanonik ad
export const ALIASES: Record<string, string> = {
  // F-31 (İsmayıl bölgəsi, Bakı) — OCAQ-da ünvana görə adlandırılıb, iiko hələ
  // «Mytcha» göndərir. İstifadəçi qeydi (09.08.2026): «bu Mytcha ismi adrese
  // göre yaptım, sonra iikoda düzelecek». iiko düzəldiləndən sonra bu alias
  // zərərsiz qalır (artıq uyğun gəlməyəcək, sadəcə istifadə olunmayacaq).
  'Mytcha': 'Abdülkerim Alizadə',
  'Mycta': 'Abdülkerim Alizadə',
  'Myctha': 'Abdülkerim Alizadə',
  'Abdulkerim Alizade': 'Abdülkerim Alizadə',
  'Xırdalan': 'Masazır',
  'Shaurma Seabreez': 'Seabreeze',
  '5 Mərtəbə.': '5 Mərtəbə',
  'Torgoviy Yuxarı': 'Torgoviy',
  'Torgoviy Aşağı': 'Torgoviy',
  'Bilgeh': 'Bilgəh',
  'Bineqedi': 'Binəqədi',
  'Huseyn Cavid': 'Hüseyn Cavid',
  'Ehmedli': 'Əhmədli',
  'Merdekan': 'Mərdəkan',
  'Əcəmi Shaurma': 'Əcəmi',
  'Sumqayit': 'Sumqayıt',
  'Gence': 'Gəncə',
  // ── Wolt mağaza adları (Wolt kaynaklı dosyalarda 'Shaurma №1 <ad>') — Filiallar wolt.docx ──
  'Shaurma №1 Park H.Cavid': 'Hüseyn Cavid',
  'Shaurma №1 Atatürk Parkı': 'Ayna Sultanova',
  'Shaurma №1 Zığ Şosesi': 'Zığ',
  'Shaurma №1 Bilgah': 'Bilgəh',
  'Shaurma №1 Moskva Pr': 'İnqilab',
  'Shaurma №1 Memar Əcəmi': 'Əcəmi',
  'Shaurma №1 Azadlıq Pr': 'Azadlıq',
  'Shaurma №1 Bakıxanov Küç': 'Duet',
  'Shaurma №1 Füzuli Meydanı': '5 Mərtəbə',
  'Shaurma №1 Nizami Küç': 'Torgoviy',
  'Shaurma №1 H. Cavid Pr': 'Space',
  'Shaurma №1 H. Əliyev Park': 'Bakıxanov 1',
  'Shaurma №1 Mehmandarov küç': 'Bakıxanov 2',
  'Şaurma №1 Mehmandarov küç': 'Bakıxanov 2',
  'Shaurma №1 Əziz Əliyev Küç': 'Corner',
  'Shaurma №1 Mahammad Hadi': 'Əhmədli',
  'Shaurma №1 Sumgait': 'Sumqayıt',
  // Wolt kısa/adres formları (bare)
  'Mahammad Hadi': 'Əhmədli',
  'Nizami Küç': 'Torgoviy',
  'Moskva Pr': 'İnqilab',
  'H. Cavid Pr': 'Space',
  'Füzuli Meydanı': '5 Mərtəbə',
  'Bakıxanov Küç': 'Duet',
  'H. Əliyev Park': 'Bakıxanov 1',
  'Mehmandarov küç': 'Bakıxanov 2',
  'Əziz Əliyev Küç': 'Corner',
  'Aziz Aliyev Str.': 'Corner',
  'Azadliq Ave.': 'Azadlıq',
  'Ataturk Parki': 'Ayna Sultanova',
  'Bilgah': 'Bilgəh',
  'Sumgait': 'Sumqayıt',
}

// Rapora GİRMƏYƏN adlar
export const EXCLUDE = new Set(['Siciliano Restoran', 'Yasamal'])

// Kanonik ad → bölgə (BOLGELER-dən qurulur)
export const BRANCH_TO_REGION: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const [region, list] of Object.entries(BOLGELER)) {
    for (const b of list) m[b] = region
  }
  return m
})()

/** iiko adını kanonikə çevir (alias tətbiq et). */
export function normalizeFilial(name: unknown): string | null {
  if (name == null) return null
  const n = String(name).trim()
  if (!n) return null
  return ALIASES[n] ?? n
}

// ─── Bağlanmış filiallar ─────────────────────────────────────────────────────
// `EXCLUDE`-dan FƏRQLİDİR: EXCLUDE «bizim olmayan» adlardır və rapordan
// tamamilə çıxarılır. `CLOSED` isə BİZİM olan, keçmişdə satışı olan, lakin
// artıq işləməyən filiallardır → TARİXİ DATA QORUNUR (silinmir, YoY-da lazımdır),
// amma «gözlənilən filial sayı»na daxil edilmir.
//
// Niyə vacibdir: bağlanmış filialı aktiv saymaq «göndərmədi» siyahısında
// əbədi qırmızı sətir yaradır; EXCLUDE-a atmaq isə keçən ilin cirosunu itirir
// və YoY-u səhv göstərir.
//
// Masazır: 08.2026-da bağlı (Saha Nəzarət matrisi 28 filial deyir; 08.2026
//   satış export-unda yoxdur).
// Bulvar Festival: istifadəçi qeydi (08.08.2026) — avqusta qədər işləyib,
//   08.2026 export-unda yoxdur.
export const CLOSED = new Set(['Masazır', 'Bulvar Festival'])

/** Filial hazırda işləyirmi? (bağlanmışlar tarixi hesabatda qalır) */
export function isActiveBranch(name: string): boolean {
  const canon = normalizeFilial(name)
  return !!canon && !EXCLUDE.has(canon) && !CLOSED.has(canon)
}

/**
 * Filial adını MÜQAYİSƏ açarına çevir (OCAQ `branches.name` ↔ iiko export adı).
 *
 * NİYƏ SADƏ `toLowerCase()` YETƏRSİZDİR — Azərbaycan hərf tələsi:
 *   'I'.toLowerCase() === 'i'   (olmalıydı 'ı')
 *   'İ'.toLowerCase() === 'i' + U+0307 birləşən nöqtə  → gözlə görünməyən fərq
 * Bu tələ CHANGELOG-da qeyd olunan 4× ikiqat sayma hadisəsinin səbəbidir.
 * Ona görə İ/I/ı/i əvvəlcə 'i'-yə yığılır, sonra diakritiklər NFD ilə atılır
 * (ç→c, ş→s, ğ→g, ö→o, ü→u) və 'ə'→'e' edilir — `assign-regions` ilə eyni qayda.
 */
export function canonBranchKey(name: unknown): string {
  return (normalizeFilial(name) ?? '')
    .replace(/[İıIi]/g, 'i')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ə/g, 'e')
    .replace(/\s+/g, ' ')
    .trim()
}
