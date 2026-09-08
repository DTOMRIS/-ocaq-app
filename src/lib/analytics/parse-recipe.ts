// ─── REÇETURA (Tərkiblər.xlsx) ──────────────────────────────────────────────
//
// Shaurma №1-in RƏSMİ reçetura cədvəli: hansı məhsul hansı xammaldan nə qədər
// işlədir. 277 məhsul · 990 sətir · 242 xammal.
//
// NİYƏ VACİB — bu fayl BİR FƏRZİYYƏNİ KÖKÜNDƏN QALDIRDI (08.09.2026):
// Əvvəl ət qramajı maya kartından TÜRETİLİRDİ (dolgu maya ÷ ət qiyməti).
// Reçetura gələndə görüldü ki rəqəm iki qat fərqlidir: standart sənəd 30/50/80 q
// deyir, reçetura 60/100/160 q. Maya kartı ilə çarpaz yoxlama cavabı verdi:
//   · bişmiş sayılsa Böyüyün əti 1,39 ₼ olur, kartda BÜTÜN dolgu 1,35 ₼ → sığmır
//   · xam sayılsa 0,92 ₼ — dolgunun %68-i, tərəvəz və sousla birlikdə oturur
// Deməli standart sənəddəki qramaj BİŞMİŞ, reçeturadakı XAM-dır. İkisi
// ziddiyyət deyil, eyni şeyin iki ölçüsü.
//
// İKİ SƏVİYYƏLİ REÇETE: 36 «İSTEHSAL TƏDARÜK» yarım mamulun ÖZ reçeturası var
// (Ət qıyma tədarük ← Mal əti + bibər + soğan…). Teorik maya hesablananda
// bunlar AÇILMALIDIR, yoxsa yarım mamulun qiyməti bilinmədən hesab yarımçıq
// qalır. `expandRecipe` bunu edir.

export type RecipeLine = {
  /** Xammal adı (kiril hərfləri latına çevrilmiş) */
  material: string
  /** iiko nomenklatura kodu — ad dəyişsə də bu qalır */
  code: string
  /** Norma: 1 vahid məhsul üçün nə qədər */
  norm: number
  /** kq · L · əd · pors */
  unit: string
}
export type RecipeProduct = {
  product: string
  category: string
  lines: RecipeLine[]
}
export type RecipeResult = {
  products: RecipeProduct[]
  /** Yarım mamullar (İSTEHSAL TƏDARÜK) — öz reçeturası olan xammallar */
  semiFinished: string[]
  materials: number
  warnings: string[]
}

/**
 * Faylda kiril və latın hərfləri QARIŞIQ işlədilib: «МƏНSUL», «Нollаnd»,
 * «PİDЕ KАVURMА». Gözlə fərq görünmür, amma `===` müqayisəsi sınır.
 * Ona görə oxuyanda dərhal normallaşdırılır.
 *
 * ⚠️ YALNIZ GÖRÜNÜŞCƏ EYNİ olan hərflər çevrilir (homoqliflər). Tam kiril
 * sözlərə (məs. «Норма») toxunulmur — orada Н·о·р·м·а hamısı kirildir və
 * hərfbəhərf çevrilsə «hopma» çıxır, «norma» yox. Ona görə başlıq axtarışı
 * AYRICA kiril naxışı da yoxlayır (aşağıda `RE_NORM`).
 */
const CYR: Record<string, string> = {
  // Homoqliflər — görünüşcə latın hərfi ilə eyni
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M',
  'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y',
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y',
  'к': 'k', 'м': 'm', 'т': 't', 'в': 'b', 'н': 'n',
  // Homoqlif OLMAYAN, amma başlıqlarda rast gəlinən hərflər.
  // «код» yalnız homoqliflərlə çevrilsə «koд» qalır və `/kod/` tapmır —
  // sütun görünməz olur. Ona görə tam əlifba verilir.
  'Б': 'B', 'Г': 'G', 'Д': 'D', 'Ж': 'J', 'З': 'Z', 'И': 'I', 'Й': 'Y',
  'Л': 'L', 'П': 'P', 'Ф': 'F', 'Ц': 'C', 'Ч': 'C', 'Ш': 'S', 'Щ': 'S',
  'Ы': 'I', 'Э': 'E', 'Ю': 'U', 'Я': 'A', 'Ь': '', 'Ъ': '',
  'б': 'b', 'г': 'g', 'д': 'd', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y',
  'л': 'l', 'п': 'p', 'ф': 'f', 'ц': 'c', 'ч': 'c', 'ш': 's', 'щ': 's',
  'ы': 'i', 'э': 'e', 'ю': 'u', 'я': 'a', 'ь': '', 'ъ': '',
}
export function deCyrillic(v: unknown): string {
  return String(v ?? '').replace(/[А-Яа-я]/g, c => CYR[c] ?? c).trim()
}

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return isFinite(v) ? v : null
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
  return isFinite(n) ? n : null
}

/**
 * AZƏRBAYCAN «İ» TƏLƏSİ — bu layihədə ÜÇÜNCÜ dəfə (filial-map, parse-daily, burada):
 *   'İSTEHSAL'.toLowerCase() === 'i' + U+0307 (birləşən nöqtə) → 'istehsal' DEYİL
 * Sadə `/i` bayrağı ilə RegExp uyğunluğu SÜKUTLA sınır. `azLower` bunu həll edir.
 */
export function azLower(v: unknown): string {
  return String(v ?? '')
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const SEMI = /istehsal\s*t[əe]dar[uü]k/

// Başlıq naxışları — HƏM latın, HƏM tam kiril yazılışı.
// «Норма» tamamilə kiril yazılıb: homoqlif çevirməsi onu «hopma» edir.
const RE_PRODUCT = /m[əe]hsul|м[əe]hsul/i
const RE_MATERIAL = /mallar|маллар/i
const RE_NORM = /norma|норма|hopma/i
const RE_CODE = /kod|код|коd/i
const RE_UNIT = /^ed|^ед|ölç|olc|изм|изm/i
const RE_CAT = /[çc]e[şs]id|чешид/i

/** «Tərkiblər.xlsx» → RESEPTURA vərəqi. Başlıq: MƏHSUL · Mallar · kod · Norma · Ed. · ÇEŞİD */
export function parseRecipes(rows: unknown[][]): RecipeResult {
  const warnings: string[] = []
  let hi = -1
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const c = (rows[r] ?? []).map(x => azLower(deCyrillic(x)))
    if (c.some(x => RE_PRODUCT.test(x)) && c.some(x => RE_MATERIAL.test(x)) && c.some(x => RE_NORM.test(x))) { hi = r; break }
  }
  if (hi < 0) {
    return { products: [], semiFinished: [], materials: 0,
      warnings: ['Reçetura başlığı tapılmadı (MƏHSUL / Mallar / Norma gözlənilir)'] }
  }
  const hdr = (rows[hi] ?? []).map(x => azLower(deCyrillic(x)))
  const idx = (re: RegExp) => hdr.findIndex(h => re.test(h))
  const iP = idx(RE_PRODUCT), iM = idx(RE_MATERIAL), iC = idx(RE_CODE)
  const iN = idx(RE_NORM), iU = idx(RE_UNIT), iCat = idx(RE_CAT)
  if (iP < 0 || iM < 0 || iN < 0) {
    return { products: [], semiFinished: [], materials: 0,
      warnings: ['Reçeturada MƏHSUL / Mallar / Norma sütunlarından biri yoxdur'] }
  }

  const map = new Map<string, RecipeProduct>()
  const mats = new Set<string>()
  let bad = 0
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const product = deCyrillic(row[iP])
    const material = deCyrillic(row[iM])
    if (!product || !material) continue
    const norm = num(row[iN])
    // Norma oxunmasa sətir ATILIR — amma SƏSSİZ deyil, sonda sayı bildirilir.
    if (norm == null || norm <= 0) { bad++; continue }
    const category = iCat >= 0 ? deCyrillic(row[iCat]) : ''
    const e = map.get(product) ?? { product, category, lines: [] }
    e.lines.push({
      material, code: String(row[iC] ?? '').trim(),
      norm, unit: iU >= 0 ? deCyrillic(row[iU]) : '',
    })
    if (category && !e.category) e.category = category
    map.set(product, e)
    mats.add(material)
  }
  if (bad) warnings.push(`${bad} sətirdə norma oxunmadı və atıldı`)
  const products = [...map.values()]
  const semiFinished = products.filter(p => SEMI.test(azLower(p.category))).map(p => p.product)
  if (!products.length) warnings.push('Reçeturada oxunan məhsul yoxdur')
  return { products, semiFinished, materials: mats.size, warnings }
}

/**
 * Yarım mamulları AÇ — iki səviyyəli reçeteni xam xammala endir.
 *
 * «SHAURMA ÇÖRƏKDƏ ORTA» → «Fırın çörəyi bişmiş» → (un, maya, duz…)
 * Açılmasa yarım mamulun qiyməti bilinmədən teorik maya hesablana bilmir.
 *
 * `maxDepth` — dairəvi istinad qoruması. Reçeturada A→B→A olsa sonsuz döngü
 * yaranardı; həddə çatanda sətir OLDUĞU KİMİ saxlanılır və xəbərdarlıq verilir.
 */
export function expandRecipe(
  product: string,
  byProduct: Map<string, RecipeProduct>,
  semi: Set<string>,
  maxDepth = 4,
): { lines: RecipeLine[]; truncated: string[] } {
  const out = new Map<string, RecipeLine>()
  const truncated: string[] = []
  const walk = (name: string, factor: number, depth: number, seen: Set<string>) => {
    const rec = byProduct.get(name)
    if (!rec) return
    for (const l of rec.lines) {
      const isSemi = semi.has(l.material) && byProduct.has(l.material)
      if (isSemi && depth < maxDepth && !seen.has(l.material)) {
        walk(l.material, factor * l.norm, depth + 1, new Set([...seen, l.material]))
        continue
      }
      if (isSemi && depth >= maxDepth) truncated.push(l.material)
      const key = l.code || l.material
      const prev = out.get(key)
      if (prev) prev.norm += l.norm * factor
      else out.set(key, { ...l, norm: l.norm * factor })
    }
  }
  walk(product, 1, 0, new Set([product]))
  return { lines: [...out.values()], truncated: [...new Set(truncated)] }
}
