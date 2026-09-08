// ─── PUL AXINI (CASH FLOW) ──────────────────────────────────────────────────
//
// «CASH FLOW <dövr>.xlsx» — bir kassa + səkkiz bank hesabının hərəkəti.
//
// NİYƏ MÖVCUD «Kasa/Banka» EKRANI YETMİR: o, YALNIZ bir sual verir —
// «iiko kart satışı bankaya düşübmü?». Bu isə BÜTÜN pul hərəkətidir:
// icarə, əmək haqqı, mal alışı, kredit, təhtəlhesab, komissiya. İkisi fərqli
// suallardır və birləşdirilməməlidir.
//
// 🔴 DOKUZ VƏRƏQ, DOKUZ FƏRQLİ BAŞLIQ. Ortaq olan TƏK sütun `Maddə`-dir —
// və o, 52 sözlük dəyəri ilə HƏR VƏRƏQDƏ eynidir. Ona görə model «maddə»
// üzərinə qurulur, sütun yerləri isə vərəqə görə ayrıca təyin olunur.
//
// Məbləğ çıxarma qaydası vərəqdən vərəqə dəyişir:
//   · Baş kassa   → Debet − Kredit  (kassaya giriş müsbət)
//   · ATB 1/2     → Kredit − Debet  (bank hesabında əks işarə)
//   · Unibank *   → «(+) CR» / «(-) DB» işarə sütunu
//   · Kapital biznes kart → Mədaxil − Məxaric
//   · Kapital cari → hazır «AZN dəyəri» sütunu
// Səhv qayda bütün axını TƏRSİNƏ çevirir — ona görə hər vərəq ayrıca yazılıb.

import { normalizeFilial } from './filial-map'

export type CashRow = {
  /** 52 sözlükdən biri: «Satışdan mədaxil», «İcarə ödənişi»… */
  item: string
  account: string
  date: string
  /** Müsbət = daxil, mənfi = xaric */
  amount: number
  /** «Bölmə» sütunu — YALNIZ Baş kassada var (42 filial/mərkəz) */
  branch: string | null
  note: string | null
}
export type CashflowReport = {
  rows: CashRow[]
  days: string[]
  byItem: Array<{ item: string; amount: number; count: number }>
  byAccount: Array<{ account: string; amount: number; count: number }>
  inflow: number
  outflow: number
  net: number
  warnings: string[]
}

type Cfg = {
  item: number; date: number
  debit?: number; credit?: number      // iki sütunlu
  sign?: number; amount?: number       // işarə sütunlu
  out?: number; in?: number            // məxaric/mədaxil
  plain?: number                       // hazır məbləğ
  branch?: number; note?: number
  /** Debet−Kredit (kassa) yoxsa Kredit−Debet (bank) */
  cashSide?: boolean
}

/** Vərəq adı → sütun xəritəsi. Ad dəyişsə `null` qayıdır və SƏBƏBİ yazılır. */
const SHEETS: Record<string, Cfg> = {
  'Baş kassa':          { item: 0, date: 1, debit: 3, credit: 4, branch: 7, note: 2, cashSide: true },
  'Kapital cari':       { item: 0, date: 1, plain: 6, note: 8 },
  'Unibank 2':          { item: 0, date: 1, sign: 2, amount: 3, note: 5 },
  'Unibank pos':        { item: 0, date: 1, sign: 2, amount: 3, note: 5 },
  'ATB 1':              { item: 0, date: 1, debit: 7, credit: 8, note: 5 },
  'ATB 2':              { item: 0, date: 1, debit: 4, credit: 5, note: 6 },
  'Kapital bizneskart': { item: 0, date: 1, out: 2, in: 3, note: 5 },
  'Unibank b k':        { item: 0, date: 1, sign: 2, amount: 3, note: 5 },
  'Unibank b k 2':      { item: 0, date: 1, sign: 2, amount: 3, note: 5 },
}

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return isFinite(v) ? v : null
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
  return isFinite(n) ? n : null
}

/** Excel serial · Date · «dd.mm.yyyy» · ISO → ISO. */
function toISO(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10)
  }
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{2})[.\/](\d{2})[.\/](\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
}

// «Daxil olan qalıq» / «Qalıq» sətirləri HƏRƏKƏT DEYİL — açılış balansıdır.
// Cəmə qatılsa axın iki dəfə sayılır.
const BALANCE = /qalıq|balans|saldo/i

export function parseCashflow(sheets: Array<{ name: string; rows: unknown[][] }>): CashflowReport {
  const rows: CashRow[] = []
  const warnings: string[] = []
  const days = new Set<string>()
  const tanınmayan: string[] = []

  for (const { name, rows: r } of sheets) {
    if (name === 'CF') continue                    // CF PİVOTDUR — hərəkət deyil
    const cfg = SHEETS[name]
    if (!cfg) { tanınmayan.push(name); continue }

    for (let i = 2; i < r.length; i++) {
      const row = r[i] ?? []
      const item = String(row[cfg.item] ?? '').trim()
      if (!item || BALANCE.test(item)) continue

      let amount: number | null = null
      if (cfg.debit != null && cfg.credit != null) {
        const d = num(row[cfg.debit]) ?? 0
        const c = num(row[cfg.credit]) ?? 0
        amount = cfg.cashSide ? d - c : c - d
      } else if (cfg.out != null && cfg.in != null) {
        amount = (num(row[cfg.in]) ?? 0) - (num(row[cfg.out]) ?? 0)
      } else if (cfg.sign != null && cfg.amount != null) {
        const a = num(row[cfg.amount])
        if (a != null) {
          const sg = String(row[cfg.sign] ?? '').toUpperCase()
          amount = (sg.includes('CR') || sg.includes('+')) ? a : -a
        }
      } else if (cfg.plain != null) {
        amount = num(row[cfg.plain])
      }
      if (amount == null || amount === 0) continue

      const date = toISO(row[cfg.date])
      if (date) days.add(date)
      rows.push({
        item, account: name, date: date ?? '',
        amount,
        // Filial adı DƏRHAL kanonikləşir: «Corner» → «Səbail 2». Xam saxlansa
        // pul axını satış datası ilə eyni açara düşmür və filial hesabatı ikiyə bölünür.
        branch: cfg.branch != null
          ? (normalizeFilial(String(row[cfg.branch] ?? '').trim()) || null)
          : null,
        note: cfg.note != null ? (String(row[cfg.note] ?? '').trim().slice(0, 200) || null) : null,
      })
    }
  }

  if (tanınmayan.length) {
    warnings.push(`Tanınmayan vərəq: ${tanınmayan.join(', ')} — sütun xəritəsi əlavə edilməlidir`)
  }
  if (!rows.length) warnings.push('Pul axını sətri oxunmadı')

  const agg = (key: (r: CashRow) => string) => {
    const m = new Map<string, { amount: number; count: number }>()
    for (const r of rows) {
      const k = key(r)
      const e = m.get(k) ?? { amount: 0, count: 0 }
      e.amount += r.amount; e.count++
      m.set(k, e)
    }
    return [...m.entries()].map(([k, v]) => ({ ...v, k })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  }
  const inflow = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const outflow = rows.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0)

  return {
    rows, days: [...days].sort(),
    byItem: agg(r => r.item).map(x => ({ item: x.k, amount: x.amount, count: x.count })),
    byAccount: agg(r => r.account).map(x => ({ account: x.k, amount: x.amount, count: x.count })),
    inflow, outflow, net: inflow + outflow, warnings,
  }
}
