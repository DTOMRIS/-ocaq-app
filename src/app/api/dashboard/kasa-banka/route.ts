import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '@/auth'
import {
  reconcile, unibankBranchFromDesc, atbBranchFromDesc, type BankByBranch,
} from '@/lib/analytics/bank-reconcile'

export const runtime = 'nodejs'

// exceljs hüceyrə → mətn (richText/formula daxil)
function cellText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (Array.isArray(o.richText)) return (o.richText as Array<{ text?: string }>).map(t => t.text ?? '').join('')
    if ('text' in o) return String(o.text)
    if ('result' in o) return String(o.result)
    return ''
  }
  return String(v)
}
function num(s: unknown): number | null {
  const t = String(s).replace(/[   ]/g, '').replace(',', '.')
  const n = parseFloat(t)
  return isFinite(n) ? n : null
}

// ── Parser: Unibank REP (HTML olarak gələn .xls) ─────────────────────────────
function parseUnibankRep(html: string, out: BankByBranch) {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  for (const tr of rows) {
    const cells = (tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? [])
      .map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    const j = cells.join(' ')
    if (!j.includes('(+) CR') || !/POS U/i.test(j)) continue
    let amt: number | null = null
    for (const x of cells) { if (/^[\d   ]+[.,]\d{2}$/.test(x)) { amt = num(x); break } }
    if (amt == null) continue
    const br = unibankBranchFromDesc(j)
    if (br) out[br] = (out[br] ?? 0) + amt
  }
}

// ── Parser: ATB (xlsx, "Hesabdan çıxarış") ───────────────────────────────────
function parseATB(ws: ExcelJS.Worksheet, out: BankByBranch) {
  ws.eachRow({ includeEmpty: false }, (r, ri) => {
    if (ri < 13) return
    const desc = cellText(r.getCell(5).value)
    const kred = num(cellText(r.getCell(8).value))
    if (!kred) return
    const br = atbBranchFromDesc(desc)
    if (br) out[br] = (out[br] ?? 0) + kred
  })
}

// ── Parser: satış detayı (Uçot günü + Ödəniş növü) → filial kart satış ────────
function parseCardSales(ws: ExcelJS.Worksheet, out: BankByBranch) {
  const rows: string[][] = []
  ws.eachRow({ includeEmpty: true }, (r) => {
    const a: string[] = []
    r.eachCell({ includeEmpty: true }, (c, col) => { a[col - 1] = cellText(c.value) })
    rows.push(a)
  })
  const hi = rows.findIndex(r => r.some(c => /uçot/i.test(c)))
  if (hi < 0) return
  let cf = ''
  const CARD = /kart|bank|kapital|pos|visa|master|terminal/i
  const SKIP = /cəmi|cemi|total|yekun/i
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i]
    if (r[0]) cf = r[0].trim()
    const typ = r[2] ?? ''
    if (!typ || SKIP.test(typ)) continue
    const val = num(r[3])
    if (val == null || !cf || /total/i.test(cf)) continue
    if (CARD.test(typ)) out[cf] = (out[cf] ?? 0) + val
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  try {
    const form = await req.formData()
    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    if (!files.length) return NextResponse.json({ error: 'Fayl tapılmadı' }, { status: 400 })

    const card: BankByBranch = {}, unibank: BankByBranch = {}, atb: BankByBranch = {}
    const tanindi: string[] = []

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      const head = buf.slice(0, 200).toString('utf8').toLowerCase()
      if (head.includes('<html') || head.includes('<table')) {
        parseUnibankRep(buf.toString('utf8'), unibank); tanindi.push(`${file.name} → Unibank`); continue
      }
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf as unknown as ArrayBuffer)
      const ws = wb.worksheets[0]
      // içeriğe göre tip belirle
      let kind = 'bilinməyən'
      let probe = ''
      ws.eachRow({ includeEmpty: false }, (r, ri) => { if (ri <= 14) r.eachCell(c => { probe += ' ' + cellText(c.value) }) })
      if (/təsvir/i.test(probe) && /card no/i.test(probe)) { parseATB(ws, atb); kind = 'ATB' }
      else if (/uçot/i.test(probe)) { parseCardSales(ws, card); kind = 'satış (kart)' }
      tanindi.push(`${file.name} → ${kind}`)
    }

    const result = reconcile(card, unibank, atb)
    return NextResponse.json({ ...result, tanindi }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
