import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { tenants } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { analytics_ingest, analytics_branch } from '@/db/schema/analytics'

// Analiz motorlarından bundle ingest. İstifadəçi auth-u DEYİL — server-to-server
// Bearer secret (Vercel env: ANALYTICS_INGEST_SECRET). Mövcud login/rol modelinə toxunmur.
// İdempotent (tenant+period+sha256) + reconciliation qapısı. status='draft' (publish ayrıca).
export async function POST(req: NextRequest) {
  const secret = process.env.ANALYTICS_INGEST_SECRET
  const authz = req.headers.get('authorization')
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let bundle: {
    tenantSlug?: string; period?: string; engineVersion?: string; generatedAt?: string
    sources?: Array<{ iikoTotal?: number; importedTotal?: number; reconciled?: boolean }>
    qualityGate?: { status?: string; warnings?: unknown }
    network?: unknown; actions?: unknown; briefings?: unknown
    branches?: Array<{ filial?: string; bolge?: string; metrics?: unknown }>
  }
  try { bundle = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!bundle?.tenantSlug || !bundle?.period || !Array.isArray(bundle?.branches)) {
    return NextResponse.json({ error: 'Missing tenantSlug/period/branches' }, { status: 400 })
  }

  try {
  const [tenant] = await db.select({ id: tenants.id }).from(tenants)
    .where(eq(tenants.slug, bundle.tenantSlug)).limit(1)
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const sha = createHash('sha256')
    .update(JSON.stringify({ b: bundle.branches, n: bundle.network ?? null, p: bundle.period }))
    .digest('hex')

  // İdempotency: eyni tenant+period+sha varsa təkrar yazma
  const [existing] = await db
    .select({ id: analytics_ingest.id, status: analytics_ingest.status })
    .from(analytics_ingest)
    .where(and(
      eq(analytics_ingest.tenant_id, tenant.id),
      eq(analytics_ingest.period, bundle.period),
      eq(analytics_ingest.source_sha256, sha),
    )).limit(1)
  if (existing) {
    return NextResponse.json({ ingestId: existing.id, status: existing.status, duplicate: true }, { status: 200 })
  }

  const src = Array.isArray(bundle.sources) ? bundle.sources[0] : null
  const iikoTotal = src?.iikoTotal ?? null
  const importedTotal = src?.importedTotal ?? null
  const reconciled = src?.reconciled ?? null

  // Reconciliation qapısı: iiko total verilibsə ±0.5% tolerans
  if (iikoTotal != null && importedTotal != null && Number(iikoTotal) > 0) {
    const diff = Math.abs(Number(iikoTotal) - Number(importedTotal)) / Number(iikoTotal)
    if (diff > 0.005) {
      return NextResponse.json({ error: 'Reconciliation failed', iikoTotal, importedTotal }, { status: 422 })
    }
  }

  const [ins] = await db.insert(analytics_ingest).values({
    tenant_id: tenant.id,
    period: bundle.period,
    engine_version: bundle.engineVersion ?? null,
    source_sha256: sha,
    iiko_total: iikoTotal != null ? String(iikoTotal) : null,
    imported_total: importedTotal != null ? String(importedTotal) : null,
    reconciled,
    quality_status: bundle.qualityGate?.status ?? null,
    quality_warnings: bundle.qualityGate?.warnings ? JSON.stringify(bundle.qualityGate.warnings) : null,
    network: bundle.network ? JSON.stringify(bundle.network) : null,
    actions: bundle.actions ? JSON.stringify(bundle.actions) : null,
    briefings: bundle.briefings ? JSON.stringify(bundle.briefings) : null,
    status: 'draft',
    generated_at: bundle.generatedAt ? new Date(bundle.generatedAt) : null,
  }).returning({ id: analytics_ingest.id })

  // Filial adları ilə eşləşdir (yalnız tenant daxili)
  const tenantBranches = await db.select({ id: branches.id, name: branches.name })
    .from(branches).where(eq(branches.tenant_id, tenant.id))
  const byName = new Map(tenantBranches.map(b => [b.name.trim().toLowerCase(), b.id]))

  const rows = bundle.branches
    .map(x => ({
      tenant_id: tenant.id,
      ingest_id: ins.id,
      filial: String(x.filial ?? '').trim(),
      bolge: x.bolge ?? null,
      branch_id: byName.get(String(x.filial ?? '').trim().toLowerCase()) ?? null,
      metrics: x.metrics ? JSON.stringify(x.metrics) : null,
    }))
    .filter(r => r.filial)

  if (rows.length) await db.insert(analytics_branch).values(rows)

  const matched = rows.filter(r => r.branch_id).length
  return NextResponse.json({
    ingestId: ins.id, status: 'draft', reconciled,
    branchCount: rows.length, matched, unmatched: rows.length - matched,
  }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Server error', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
