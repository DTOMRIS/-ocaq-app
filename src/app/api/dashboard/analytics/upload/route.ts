import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import ExcelJS from 'exceljs'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { analytics_ingest, analytics_branch } from '@/db/schema/analytics'
import { parseSales, type SheetInput } from '@/lib/analytics/parse-sales'

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

// Sheet-in tarix ilini tap (parse-sales-in tapdığı ilk tarix sətrindən).
function sheetYear(rows: unknown[][]): number | null {
  for (const r of rows) {
    for (const c of r) {
      if (c instanceof Date && !isNaN(c.getTime())) return c.getFullYear()
    }
  }
  return null
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

    // Excel → sheet-lər → cari/keçən il seç
    const sheets = await workbookToSheets(buf)
    if (!sheets.length) return NextResponse.json({ error: 'Excel boş və ya oxunmadı' }, { status: 400 })

    const withYear = sheets.map(s => ({ ...s, year: sheetYear(s.rows) })).filter(s => s.year != null)
    let cari: SheetInput, kecen: SheetInput | null = null
    if (withYear.length) {
      withYear.sort((a, b) => (b.year! - a.year!))
      cari = { rows: withYear[0].rows }
      const prev = withYear.find(s => s.year === withYear[0].year! - 1)
      kecen = prev ? { rows: prev.rows } : null
    } else {
      cari = { rows: sheets[0].rows }   // tarix tapılmadısa ilk sheet-i dene
    }

    const parsed = parseSales(cari, kecen)
    if (!parsed.period || parsed.branches.length === 0) {
      return NextResponse.json({
        error: 'Excel oxundu amma filial/tarix tapılmadı. Doğru satış hesabatını yüklədiyinizə əmin olun.',
        parsed,
      }, { status: 422 })
    }

    // ── Önizləmə: insert etmə, yalnız nəticəni qaytar ──
    if (mode !== 'commit') {
      return NextResponse.json({ mode: 'preview', ...parsed }, { status: 200 })
    }

    // ── Commit: analytics_ingest + analytics_branch-ə yaz ──
    const tenantId = session.user.tenant_id
    const netYoy = (() => {
      const cur = parsed.branches.reduce((s, b) => s + b.ciro, 0)
      const prv = parsed.branches.reduce((s, b) => s + (b.ciroKecen ?? 0), 0)
      return prv > 0 ? cur / prv - 1 : null
    })()
    const network = { ciro: parsed.meta.toplamCiro, yoy: netYoy, gidisatFark: netYoy }

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
      metrics: JSON.stringify({ ciro: b.ciro, yoy: b.yoy, gidisatFark: b.yoy }),
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
