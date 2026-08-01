// ─── Toplu dəvət parser (Shaurma email Excel: e-poçt | Adı Soyadı | Vəzifəsi) ──
// Yalnız Bölgə Müdiri + Filial Menecer sətirləri götürülür (ofis/mühasib/anbar atlanır).
// role + target (bölgə adı / filial adı) çıxarılır; server target-i id-yə çevirir.

import { normalizeFilial, BOLGELER } from './filial-map'

export type InviteRow = { email: string; name: string; role: 'region_manager' | 'branch_manager'; target: string }

const REGIONS = Object.keys(BOLGELER) // İsmayıl, Ceyhun, Elnur, Taleh, Ramin

// Bu faylın yazılışı → kanonik filial (normalizeFilial tutmayanlar)
const BRANCH_ALIAS: Record<string, string> = {
  'tarqovi': 'Torgoviy', 'tarqovaya': 'Torgoviy',
  'memar əcəmi': 'Əcəmi', 'bakixanov': 'Bakıxanov 1', 'masazir': 'Masazır',
  'inşaatçilar': 'İnşaatçılar',
}

function firstEmail(s: unknown): string {
  const m = String(s ?? '').match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/)
  return m ? m[0].trim().toLowerCase() : ''
}

export function parseInvites(rows: unknown[][]): { rows: InviteRow[]; skipped: number } {
  const hi = rows.findIndex(r => r?.some(c => /poçt|email|e-mail|e-poçt/i.test(String(c ?? ''))))
  const hdr = hi >= 0 ? (rows[hi] ?? []).map(c => String(c ?? '').toLowerCase()) : []
  let iE = hdr.findIndex(h => /poçt|email|e-mail/.test(h)); if (iE < 0) iE = 0
  let iN = hdr.findIndex(h => /ad|soyad|isim/.test(h)); if (iN < 0) iN = 1
  let iV = hdr.findIndex(h => /vəzifə|vezife|position|rol/.test(h)); if (iV < 0) iV = 2

  const out: InviteRow[] = []
  let skipped = 0
  for (let i = hi >= 0 ? hi + 1 : 0; i < rows.length; i++) {
    const r = rows[i] ?? []
    const email = firstEmail(r[iE])
    const name = String(r[iN] ?? '').trim()
    const vez = String(r[iV] ?? '').trim()
    if (!email) continue

    if (/bölgə müdir|bolge mudir/i.test(vez)) {
      const nl = name.toLowerCase()
      let region = REGIONS.find(rg => nl.includes(rg.toLowerCase()))
      if (!region && /ramil|ramin/i.test(name)) region = 'Ramin'
      if (region) out.push({ email, name, role: 'region_manager', target: region })
      else skipped++
    } else if (/fil\S*\s+menecer/i.test(vez)) {   // yalnız "Filialı/Filalı Menecer" (ofis rolları yox)
      const target = BRANCH_ALIAS[name.toLowerCase()] ?? normalizeFilial(name) ?? name
      out.push({ email, name, role: 'branch_manager', target })
    } else {
      skipped++ // ofis / mühasib / anbar / audit / baş şaurmaçı — OCAQ hesabı lazım deyil
    }
  }
  return { rows: out, skipped }
}
