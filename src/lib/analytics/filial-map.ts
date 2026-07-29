// ─── Filial → Bölgə xəritəsi (add-only; analiz motoru ilə eyni kanonik model) ──
// Mənbə: shaurma-analiz-sistemi/bilgi/filial_bolge_haritasi.json (kopya, embed).
// iiko ham export-unda filial adları bəzən fərqli yazılır; `ALIASES` normalize edir.
// `EXCLUDE` rapora girməyən adlar (bağlanmış / bizim olmayan).

export const BOLGELER: Record<string, string[]> = {
  'İsmayıl': ['Bulvar', 'Bayıl', '5 Mərtəbə', 'Torgoviy', 'Corner', 'Badamdar', 'Bulvar Festival'],
  'Ceyhun':  ['Hüseyn Cavid', 'Əcəmi', 'İnşaatçılar', 'Masazır', 'Space', 'Sumqayıt'],
  'Elnur':   ['Neftçilər', 'Bakıxanov 1', 'Zığ', 'Bakıxanov 2', 'Həzi Aslanov', 'Əhmədli'],
  'Taleh':   ['Binəqədi', 'Duet', 'Ayna Sultanova', 'Nərimanov', 'Amay', 'Azadlıq'],
  'Ramin':   ['Seabreeze', 'Bilgəh', 'Mərdəkan', 'Gəncə', 'İnqilab'],
}

// Bölgə sırası (rapor/qruplaşma üçün)
export const REGION_ORDER = Object.keys(BOLGELER)

// iiko yazılışı → kanonik ad
export const ALIASES: Record<string, string> = {
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
