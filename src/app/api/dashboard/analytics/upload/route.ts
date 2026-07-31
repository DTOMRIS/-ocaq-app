import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import ExcelJS from 'exceljs'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { analytics_ingest, analytics_branch } from '@/db/schema/analytics'
import { parseDaily } from '@/lib/analytics/parse-daily'

// İstifadəçi (super_admin) OCAQ-dan satış Excel-i yükləyir → parse → önizləmə/insert.
// Server-to-server ingest-dən FƏRQLİ: burada session auth, secret DEYİL. Add-only.
export const runtime = 'nodejs'

// exceljs hüceyrə dəyərini primitivə çevir (Date/number/string; formula→result; richText→mətn).
function cellVal(v: unknown): unknown {
  if (v == null) return null
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('result' in o) return o.result           // formula
    if ('text' in o) return o.text                // hyperlink
    if (Array.isArray(o.richText)) return (o.richText as Array<{ text?: string }>).map(t => t.text ?? '').join('')
    return null
  }
  return v
}

async function workbookToSheets(buf: Buffer): Promise<Array<{ name: string; rows: unknown[][] }>> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ArrayBuffer)
  const out: Array<{ name: string; rows: unknown[][] }> = []
  wb.eachSheet((sheet) => {
    const rows: unknown[][] = []
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const arr: unknown[] = []
      row.eachCell({ includeEmpty: true }, (cell, col) => { arr[col - 1] = cellVal(cell.value) })
      rows.push(arr)
    })
    out.push({ name: sheet.name, rows })
  })
  return out
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    const mode = String(form.get('mode') ?? 'preview')   // 'preview' | 'commit'
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fayl tapılmadı' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())

    // Excel → sheet-lər → Uçot günü olan detay sheet-i → parseDaily (robust)
    const sheets = await workbookToSheets(buf)
    if (!sheets.length) return NextResponse.json({ error: 'Excel boş və ya oxunmadı' }, { status: 400 })
    const detay = sheets.find(s => s.rows.some(r => r?.some(c => /uçot/i.test(String(c ?? ''))))) ?? sheets[0]
    const daily = parseDaily(detay.rows)
    if (!daily.period || daily.branches.length === 0) {
      return NextResponse.json({ error: 'Excel oxundu amma filial/tarix tapılmadı. Ham satış detayı (Uçot günü) gözlənilir.' }, { status: 422 })
    }
    // upload-flow ekranı üçün parseSales-uyğun forma
    const branchList = daily.branches.map(b => ({
      filial: b.filial, xam: b.filial, bolge: b.bolge, eslesdi: b.bolge != null,
      ciro: b.total, ciroKecen: null as number | null, yoy: null as number | null,
      deliveryPayi: b.total ? (b.wolt + b.bolt) / b.total : null,
    }))
    const parsed = {
      period: daily.period,
      branches: branchList,
      meta: {
        okunan: branchList.length,
        eslesen: branchList.filter(b => b.eslesdi).length,
        eslesmeyen: branchList.filter(b => !b.eslesdi).length,
        toplamCiro: daily.toplam,
        uyarilar: daily.uyarilar,
      },
    }

    // ── Önizləmə: insert etmə, yalnız nəticəni qaytar ──
    if (mode !== 'commit') {
      return NextResponse.json({ mode: 'preview', ...parsed }, { status: 200 })
    }

    // ── Commit: analytics_ingest + analytics_branch-ə yaz ──
    const tenantId = session.user.tenant_id
    const network = {
      ciro: parsed.meta.toplamCiro,
      deliveryPayi: daily.toplam ? (daily.pay.wolt + daily.pay.bolt) / daily.toplam : null,
      gedisat: daily.gedisat,
    }

    // Idempotency: fayl baytlarının sha-sı (deterministik)
    const sha = createHash('sha256').update(buf).digest('hex')
    const [existing] = await db
      .select({ id: analytics_ingest.id })
      .from(analytics_ingest)
      .where(and(
        eq(analytics_ingest.tenant_id, tenantId),
        eq(analytics_ingest.period, parsed.period),
        eq(analytics_ingest.source_sha256, sha),
      )).limit(1)
    if (existing) {
      return NextResponse.json({ mode: 'commit', duplicate: true, ingestId: existing.id, period: parsed.period }, { status: 200 })
    }

    const [ins] = await db.insert(analytics_ingest).values({
      tenant_id: tenantId,
      period: parsed.period,
      engine_version: 'excel-upload-1.0',
      source_sha256: sha,
      imported_total: String(parsed.meta.toplamCiro),
      quality_status: parsed.meta.uyarilar.length ? 'warn' : 'pass',
      quality_warnings: parsed.meta.uyarilar.length ? JSON.stringify(parsed.meta.uyarilar) : null,
      network: JSON.stringify(network),
      status: 'draft',
      generated_at: new Date(),
    }).returning({ id: analytics_ingest.id })

    // Filial adları ilə OCAQ branch-larını eşləşdir (tenant daxili)
    const tenantBranches = await db.select({ id: branches.id, name: branches.name })
      .from(branches).where(eq(branches.tenant_id, tenantId))
    const byName = new Map(tenantBranches.map(b => [b.name.trim().toLowerCase(), b.id]))

    const rows = parsed.branches.map(b => ({
      tenant_id: tenantId,
      ingest_id: ins.id,
      filial: b.filial,
      bolge: b.bolge,
      branch_id: byName.get(b.filial.trim().toLowerCase()) ?? null,
      metrics: JSON.stringify({ ciro: b.ciro, deliveryPayi: b.deliveryPayi }),
    }))
    if (rows.length) await db.insert(analytics_branch).values(rows)

    const matched = rows.filter(r => r.branch_id).length
    return NextResponse.json({
      mode: 'commit', ingestId: ins.id, period: parsed.period,
      branchCount: rows.length, matched, unmatched: rows.length - matched,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
