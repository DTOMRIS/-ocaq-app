// ─── Kasa-Banka mutabakat motoru (Python-da kanıtlanmış məntiqin TS portu) ─────
// Kart satışı (iiko) vs bankaya düşən (Unibank + ATB + Kapital), filial bazında.
// Bank döküm faylları route qatında parse edilir (Unibank REP=HTML, ATB=xlsx); bu
// modul: kod/ad → filial xəritələri + attribution + reconcile (saf, test oluna bilər).

import { normalizeFilial } from './filial-map'

// Unibank POS merchant kodu → filial (MÜQAVİLƏLƏR Posterminal sənədindən)
export const UNIBANK_CODE_TO_BRANCH: Record<string, string> = {
  '10001': 'Ayna Sultanova', '10002': 'Binəqədi', '12001': 'Mərdəkan',
  '13001': 'Space', '13002': '5 Mərtəbə', '13003': 'İnşaatçılar', '13004': 'Hüseyn Cavid',
  '14001': 'İnqilab', '14002': 'Torgoviy', '14004': 'Duet', '14005': 'Əcəmi',
  '15001': 'Nərimanov', '15002': 'Azadlıq', '16001': 'Neftçilər',
  '17001': 'Corner', '17002': 'Badamdar', '17003': 'Bayıl',
  '18001': 'Bilgəh', '18002': 'Seabreeze', '18003': 'Bakıxanov 1', '18004': 'Bakıxanov 2',
  '20001': 'Həzi Aslanov', '20002': 'Əhmədli', '20003': 'Zığ', '20004': 'Amay', '23001': 'Gəncə',
}
// Anbar/depo kodları (satış deyil) — reconcile-dan xaric
export const UNIBANK_ANBAR_CODES = new Set(['14003', '15003', '17004', '18005'])

// Kapital terminal (R-no) → filial (terminal siyahı + müqavilə)
export const KAPITAL_TERMINAL_TO_BRANCH: Record<string, string> = {
  R2290179: 'Badamdar', R2290171: 'Corner', R2290172: 'Corner', R2290178: 'Bilgəh',
  R2290169: 'Hüseyn Cavid', R2297093: 'Hüseyn Cavid', R2290166: 'Space', R2290175: 'Nərimanov',
  R2290165: 'Əhmədli', R2290161: '5 Mərtəbə', R2290162: '5 Mərtəbə', R2290170: 'Ayna Sultanova',
  R2297070: 'Duet', R2290155: 'İnşaatçılar', R2290164: 'Bakıxanov 1', R2290152: 'Binəqədi',
  R2290163: 'Azadlıq', R2290157: 'Torgoviy', R2290156: 'Torgoviy', R2290177: 'İnqilab',
  R2297071: 'Bayıl', R2290160: 'Mərdəkan', R2290159: 'Mərdəkan', R2290154: 'Bakıxanov 2',
  R2290176: 'Zığ', R2290153: 'Gəncə', R2297085: 'Əcəmi', R2297099: 'Sumqayıt',
  R2290174: 'Neftçilər', R2290167: 'Seabreeze', R2290168: 'Seabreeze',
  R2290158: 'Həzi Aslanov', R2290173: 'Amay',
}

// ── Attribution helpers ──────────────────────────────────────────────────────

/** Unibank REP təsvirindən merchant kodu (mötərizədə) → filial. */
export function unibankBranchFromDesc(desc: string): string | null {
  const m = desc.match(/\((\d{4,6})\)/)
  if (!m) return null
  const code = m[1]
  if (UNIBANK_ANBAR_CODES.has(code)) return null
  return UNIBANK_CODE_TO_BRANCH[code] ?? null
}

/** ATB təsvirindən filial adı ("Shaurma1 <ad>, Card no:..."). */
export function atbBranchFromDesc(desc: string): string | null {
  const m = desc.match(/Shaurma1?\s+(.*?),\s*Card/i)
  if (!m) return null
  const raw = m[1].trim().toLowerCase()
  if (raw.includes('nizami')) return 'Torgoviy'
  if (raw.includes('space')) return 'Space'
  if (raw.includes('bulvar fest')) return 'Bulvar Festival'
  return normalizeFilial(m[1].trim())
}

// ── Saf parser'lar (client-tarafında da işlənə bilər — böyük fayl upload limiti yox) ─

export type BankByBranch = Record<string, number>

function parseNum(s: unknown): number | null {
  if (typeof s === 'number') return isFinite(s) ? s : null
  const t = String(s ?? '').replace(/[    ]/g, '').replace(',', '.')
  const n = parseFloat(t)
  return isFinite(n) ? n : null
}

/** Unibank REP (HTML mətn) → filial başına POS gəlir. */
export function parseUnibankRepHtml(html: string): BankByBranch {
  const out: BankByBranch = {}
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  for (const tr of rows) {
    const cells = (tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? [])
      .map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    const j = cells.join(' ')
    if (!j.includes('(+) CR') || !/POS U/i.test(j)) continue
    let amt: number | null = null
    for (const x of cells) { if (/^[\d    ]+[.,]\d{2}$/.test(x)) { amt = parseNum(x); break } }
    if (amt == null) continue
    const br = unibankBranchFromDesc(j)
    if (br) out[br] = (out[br] ?? 0) + amt
  }
  return out
}

/** ATB sətirləri (Təsvir=index 4, Kredit=index 7) → filial başına. */
export function parseATBRows(rows: unknown[][]): BankByBranch {
  const out: BankByBranch = {}
  for (const r of rows) {
    if (!r) continue
    const kred = parseNum(r[7])
    if (!kred) continue
    const br = atbBranchFromDesc(String(r[4] ?? ''))
    if (br) out[br] = (out[br] ?? 0) + kred
  }
  return out
}

/** Satış detayı sətirləri (Uçot günü formatı) → filial başına KART satış. */
export function parseCardSalesRows(rows: unknown[][]): BankByBranch {
  const out: BankByBranch = {}
  const hi = rows.findIndex(r => r?.some(c => /uçot/i.test(String(c ?? ''))))
  if (hi < 0) return out
  let cf = ''
  const CARD = /kart|bank|kapital|pos|visa|master|terminal/i
  const SKIP = /cəmi|cemi|total|yekun/i
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    if (r[0]) cf = String(r[0]).trim()
    const typ = String(r[2] ?? '')
    if (!typ || SKIP.test(typ)) continue
    const val = parseNum(r[3])
    if (val == null || !cf || /total/i.test(cf)) continue
    if (CARD.test(typ)) out[cf] = (out[cf] ?? 0) + val
  }
  return out
}

/** Kapital/Birbank POS statement (Terminal Nömrəsi + Əməliyyat Məbləği) → filial. */
export function parseKapitalPosRows(rows: unknown[][]): BankByBranch {
  const out: BankByBranch = {}
  const hi = rows.findIndex(r => r?.some(c => /terminal nömrəsi/i.test(String(c ?? ''))))
  if (hi < 0) return out
  const hdr = (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase())
  const iT = hdr.findIndex(h => /terminal nömrəsi/.test(h))
  let iA = hdr.findIndex(h => /əməliyyat məbləği/.test(h))
  if (iA < 0) iA = hdr.findIndex(h => /məbləği/.test(h))
  const iN = hdr.findIndex(h => /əməliyyatın növü/.test(h))
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const br = KAPITAL_TERMINAL_TO_BRANCH[String(r[iT] ?? '').trim()]
    if (!br) continue
    if (iN >= 0 && !/purchase/i.test(String(r[iN] ?? ''))) continue
    const amt = parseNum(r[iA])
    if (amt) out[br] = (out[br] ?? 0) + amt
  }
  return out
}

// ── Reconcile ────────────────────────────────────────────────────────────────

export type ReconRow = {
  filial: string
  kartSatis: number
  unibank: number
  atb: number
  kapital: number
  bankaCemi: number          // unibank + atb + kapital
  ortu: number | null        // bankaCemi / kartSatis
  qalan: number              // kartSatis − bankaCemi (≈ timing/komisyon)
  status: 'over' | 'missing' | 'full' | 'partial' | 'closed'
}

const CLOSED = new Set(['Masazır'])

/**
 * Reconcile: filial-bazlı kart satış vs Unibank + ATB + Kapital düşən.
 * status: over=banka>satış(incele) · missing=bankaya düşməyib · full=≥%85 · partial.
 */
export function reconcile(card: BankByBranch, unibank: BankByBranch, atb: BankByBranch, kapital: BankByBranch = {}): {
  rows: ReconRow[]
  network: { kartSatis: number; unibank: number; atb: number; kapital: number; ortu: number | null }
} {
  const names = new Set([...Object.keys(card), ...Object.keys(unibank), ...Object.keys(atb), ...Object.keys(kapital)])
  const rows: ReconRow[] = []
  let tc = 0, tu = 0, ta = 0, tk = 0
  for (const filial of names) {
    const kartSatis = Math.round(card[filial] ?? 0)
    const unibankV = Math.round(unibank[filial] ?? 0)
    const atbV = Math.round(atb[filial] ?? 0)
    const kapitalV = Math.round(kapital[filial] ?? 0)
    const bankaCemi = unibankV + atbV + kapitalV
    const ortu = kartSatis > 0 ? bankaCemi / kartSatis : null
    let status: ReconRow['status']
    if (CLOSED.has(filial)) status = 'closed'
    else if (bankaCemi > kartSatis * 1.05) status = 'over'
    else if (kartSatis > 3000 && bankaCemi < kartSatis * 0.03) status = 'missing'
    else if (ortu != null && ortu >= 0.85) status = 'full'
    else status = 'partial'
    rows.push({ filial, kartSatis, unibank: unibankV, atb: atbV, kapital: kapitalV, bankaCemi, ortu, qalan: kartSatis - bankaCemi, status })
    tc += kartSatis; tu += unibankV; ta += atbV; tk += kapitalV
  }
  rows.sort((a, b) => b.kartSatis - a.kartSatis)
  return { rows, network: { kartSatis: tc, unibank: tu, atb: ta, kapital: tk, ortu: tc > 0 ? (tu + ta + tk) / tc : null } }
}
