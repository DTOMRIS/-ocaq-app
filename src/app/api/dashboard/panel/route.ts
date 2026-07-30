import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '@/auth'
import { parseDaily } from '@/lib/analytics/parse-daily'

export const runtime = 'nodejs'

function cellVal(v: unknown): unknown {
  if (v == null) return null
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('result' in o) return o.result
    if ('text' in o) return o.text
    if (Array.isArray(o.richText)) return (o.richText as Array<{ text?: string }>).map(t => t.text ?? '').join('')
    return null
  }
  return v
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fayl tapılmadı' }, { status: 400 })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer)
    const ws = wb.worksheets[0]
    const rows: unknown[][] = []
    ws.eachRow({ includeEmpty: true }, r => {
      const a: unknown[] = []
      r.eachCell({ includeEmpty: true }, (c, col) => { a[col - 1] = cellVal(c.value) })
      rows.push(a)
    })
    const data = parseDaily(rows)
    if (!data.days.length) {
      return NextResponse.json({ error: 'Günlük satış tapılmadı (Uçot günü + Ödəniş növü formatı gözlənilir).' }, { status: 422 })
    }
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
