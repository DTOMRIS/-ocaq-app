// ─── Saf satış parser'ı (add-only; Python `ocaq_ingest.py` məntiqinin TS portu) ──
// Girdi: xlsx/exceljs ilə oxunmuş xam SƏTİRLƏR (unknown[][]) — bu qat fayl formatından
// asılı DEYİL, ona görə test oluna bilir. Fayl→sətir çevirməsi ayrı qatda (server route).
//
// Məntiq (Python ilə eyni):
//   1. Tarix başlıqlı sətri tap (≥3 tarix hüceyrəsi olan sətir)
//   2. 1-ci sütun = filial adı; tarix sütunlarının cəmi = həmin filialın cirosu
//   3. Grand/Total/Cəmi sətirlərini atla; ALIASES normalize; EXCLUDE çıxar
//   4. Dövr (YYYY-MM) fayldakı tarixlərdən avtomatik
//   5. İki il (cari/keçən) verilərsə YoY hesabla

import { normalizeFilial, BRANCH_TO_REGION, EXCLUDE } from './filial-map'

export type SheetInput = { rows: unknown[][] }

export type BranchSales = {
  filial: string          // kanonik ad (tapılmasa xam ad)
  xam: string             // fayldakı orijinal ad
  bolge: string | null    // xəritədən; tapılmasa null
  eslesdi: boolean        // bölgə xəritəsində tanındımı
  ciro: number            // cari dövr cəmi
  ciroKecen: number | null
  yoy: number | null      // cari/keçən − 1
  gunSayi: number         // toplanan tarix sütunu sayı (cari)
}

export type ParseResult = {
  period: string | null                          // 'YYYY-MM'
  gunAraligi: { bas: string; son: string } | null
  branches: BranchSales[]
  meta: {
    okunan: number
    eslesen: number
    eslesmeyen: number
    toplamCiro: number
    uyarilar: string[]
  }
}

// ─── Köməkçilər ──────────────────────────────────────────────────────────────

const TOTAL_RE = /\b(grand|total|cəmi|cemi|toplam|yekun|ümumi|umumi)\b/i

/** Hüceyrə tarixdirsə Date qaytar (Date obyekti, tarix mətni, və ya Excel serial). */
function asDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v
  if (typeof v === 'number') {
    // Excel serial (1900 sistemi): 25569 = 1970-01-01. Ağlabatan aralıq: 2015–2035.
    if (v > 40000 && v < 50000) {
      const ms = Math.round((v - 25569) * 86400 * 1000)
      const d = new Date(ms)
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }
  if (typeof v === 'string') {
    const s = v.trim()
    // dd.mm.yyyy / dd/mm/yyyy / yyyy-mm-dd
    const m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/)
    if (m) {
      const dd = +m[1], mm = +m[2], yy = +m[3] < 100 ? 2000 + +m[3] : +m[3]
      const d = new Date(yy, mm - 1, dd)
      return isNaN(d.getTime()) ? null : d
    }
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (iso) {
      const d = new Date(+iso[1], +iso[2] - 1, +iso[3])
      return isNaN(d.getTime()) ? null : d
    }
  }
  return null
}

/** Tarix başlıqlı sətri tap: ≥3 tarix hüceyrəsi olan İLK sətir. */
function findDateHeader(rows: unknown[][]): { idx: number; dateCols: number[]; dates: Date[] } | null {
  for (let i = 0; i < rows.length; i++) {
    const cols: number[] = []
    const dts: Date[] = []
    rows[i].forEach((c, j) => {
      const d = asDate(c)
      if (d) { cols.push(j); dts.push(d) }
    })
    if (cols.length >= 3) return { idx: i, dateCols: cols, dates: dts }
  }
  return null
}

/** Sətirdə ilk boş-olmayan mətn hüceyrəsi = filial adı (adətən 0-cı sütun). */
function firstLabel(row: unknown[]): string | null {
  for (const c of row) {
    if (c == null) continue
    const s = String(c).trim()
    if (s && asDate(c) == null && isNaN(Number(s))) return s
  }
  return null
}

function pad2(n: number) { return n < 10 ? '0' + n : '' + n }
function isoDay(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

function periodFromDates(dates: Date[]): { period: string; bas: string; son: string } | null {
  if (!dates.length) return null
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const bas = sorted[0], son = sorted[sorted.length - 1]
  return { period: `${bas.getFullYear()}-${pad2(bas.getMonth() + 1)}`, bas: isoDay(bas), son: isoDay(son) }
}

/** Bir sheet → filial→ciro xəritəsi (xam adla açar). */
function parseSheet(rows: unknown[][]): {
  totals: Map<string, { xam: string; ciro: number; gun: number }>
  dates: Date[]
} {
  const totals = new Map<string, { xam: string; ciro: number; gun: number }>()
  const hdr = findDateHeader(rows)
  if (!hdr) return { totals, dates: [] }

  for (let i = hdr.idx + 1; i < rows.length; i++) {
    const row = rows[i]
    const label = firstLabel(row)
    if (!label) continue
    if (TOTAL_RE.test(label)) continue                 // Grand/Total/Cəmi atla
    const kanon = normalizeFilial(label)
    if (!kanon || EXCLUDE.has(kanon) || EXCLUDE.has(label)) continue

    let sum = 0, gun = 0
    for (const j of hdr.dateCols) {
      const v = row[j]
      if (typeof v === 'number' && isFinite(v)) { sum += v; gun++ }
    }
    if (gun === 0) continue
    const prev = totals.get(kanon)
    if (prev) { prev.ciro += sum; prev.gun = Math.max(prev.gun, gun) }
    else totals.set(kanon, { xam: label, ciro: sum, gun })
  }
  return { totals, dates: hdr.dates }
}

// ─── Əsas API ────────────────────────────────────────────────────────────────

/**
 * Satış Excel-ini parse et. `cari` məcburi (bu il); `kecen` verilərsə YoY hesablanır.
 * Hər sheet raw sətir massivi kimi ötürülür (fayl→sətir çevirməsi çağıran qatda).
 */
export function parseSales(cari: SheetInput, kecen?: SheetInput | null): ParseResult {
  const uyarilar: string[] = []
  const cur = parseSheet(cari.rows)
  const prev = kecen ? parseSheet(kecen.rows) : null

  if (cur.totals.size === 0) {
    uyarilar.push('Cari il sheet-ində tarix başlıqlı sətir və ya filial tapılmadı.')
  }
  if (prev && cur.dates.length && prev.dates.length) {
    const curGun = cur.dates.length, prevGun = prev.dates.length
    if (Math.abs(curGun - prevGun) > 0) {
      uyarilar.push(`Gün sayı fərqli (cari ${curGun} / keçən ${prevGun}) — YoY tam eyni günlərə görə olmaya bilər.`)
    }
  }

  const pr = periodFromDates(cur.dates)
  const branches: BranchSales[] = []
  let toplam = 0, eslesen = 0

  for (const [kanon, v] of cur.totals) {
    const bolge = BRANCH_TO_REGION[kanon] ?? null
    const eslesdi = bolge != null
    const kp = prev?.totals.get(kanon)?.ciro ?? null
    const yoy = kp && kp !== 0 ? v.ciro / kp - 1 : null
    branches.push({
      filial: kanon, xam: v.xam, bolge, eslesdi,
      ciro: Math.round(v.ciro), ciroKecen: kp != null ? Math.round(kp) : null,
      yoy, gunSayi: v.gun,
    })
    toplam += v.ciro
    if (eslesdi) eslesen++
  }

  // Bölgə sırası + ciro-ya görə sırala (böyükdən kiçiyə)
  branches.sort((a, b) => b.ciro - a.ciro)

  return {
    period: pr?.period ?? null,
    gunAraligi: pr ? { bas: pr.bas, son: pr.son } : null,
    branches,
    meta: {
      okunan: branches.length,
      eslesen,
      eslesmeyen: branches.length - eslesen,
      toplamCiro: Math.round(toplam),
      uyarilar,
    },
  }
}
