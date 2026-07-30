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

// ── Reconcile ────────────────────────────────────────────────────────────────

export type BankByBranch = Record<string, number>

export type ReconRow = {
  filial: string
  kartSatis: number
  unibank: number
  atb: number
  bankaCemi: number          // unibank + atb (Kapital hesab-bazlı, ayrıca)
  ortu: number | null        // bankaCemi / kartSatis
  qalan: number              // kartSatis − bankaCemi (≈ Kapital + timing)
  status: 'over' | 'missing' | 'full' | 'partial' | 'closed'
}

const CLOSED = new Set(['Masazır'])

/**
 * Reconcile: filial-bazlı kart satış vs Unibank + ATB düşən.
 * status: over=banka>satış(incele) · missing=bankaya düşməyib · full=≥%85 · partial=Kapital'də.
 */
export function reconcile(card: BankByBranch, unibank: BankByBranch, atb: BankByBranch): {
  rows: ReconRow[]
  network: { kartSatis: number; unibank: number; atb: number; ortu: number | null }
} {
  const names = new Set([...Object.keys(card), ...Object.keys(unibank), ...Object.keys(atb)])
  const rows: ReconRow[] = []
  let tc = 0, tu = 0, ta = 0
  for (const filial of names) {
    const kartSatis = Math.round(card[filial] ?? 0)
    const unibankV = Math.round(unibank[filial] ?? 0)
    const atbV = Math.round(atb[filial] ?? 0)
    const bankaCemi = unibankV + atbV
    const ortu = kartSatis > 0 ? bankaCemi / kartSatis : null
    let status: ReconRow['status']
    if (CLOSED.has(filial)) status = 'closed'
    else if (bankaCemi > kartSatis * 1.05) status = 'over'
    else if (kartSatis > 3000 && bankaCemi < kartSatis * 0.03) status = 'missing'
    else if (ortu != null && ortu >= 0.85) status = 'full'
    else status = 'partial'
    rows.push({ filial, kartSatis, unibank: unibankV, atb: atbV, bankaCemi, ortu, qalan: kartSatis - bankaCemi, status })
    tc += kartSatis; tu += unibankV; ta += atbV
  }
  rows.sort((a, b) => b.kartSatis - a.kartSatis)
  return { rows, network: { kartSatis: tc, unibank: tu, atb: ta, ortu: tc > 0 ? (tu + ta) / tc : null } }
}
