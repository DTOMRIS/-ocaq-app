import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { audit_logs } from '@/db/schema/auth'
import { canonBranchKey, normalizeFilial } from '@/lib/analytics/filial-map'

/**
 * Kasa/Banka mutabakatını `kasa_banka_recon`-a yazır.
 *
 * 🔴 NİYƏ LAZIM İDİ: hesablama brauzerdə aparılırdı və ekranda göstərilirdi,
 * lakin HEÇ YERƏ YAZILMIRDI. Səhifə bağlananda nəticə itirdi; «bu filial hər
 * ay bankaya əskik verir» sualı cavablana bilmirdi, çünki keçmiş yığılmırdı.
 * Yazma olmadan oxuma da yoxdur.
 *
 * DÖVR AÇARDIR: banka çıxarışı gün-gün deyil, dövr üzrə gəlir. Eyni dövr
 * təkrar yüklənsə ÜZƏRİNƏ yazılır (upsert) — cəm şişmir.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

const ISO = /^\d{4}-\d{2}-\d{2}$/
const STATUS = new Set(['full', 'partial', 'missing', 'over', 'closed'])

type InRow = {
  filial: string
  cardSales?: number; unibank?: number; atb?: number; kapital?: number
  bankTotal?: number; diff?: number; status?: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  let body: { periodStart?: unknown; periodEnd?: unknown; rows?: unknown; source?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON oxunmadı' }, { status: 400 }) }

  const periodStart = typeof body.periodStart === 'string' && ISO.test(body.periodStart) ? body.periodStart : null
  const periodEnd = typeof body.periodEnd === 'string' && ISO.test(body.periodEnd) ? body.periodEnd : null
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'periodStart və periodEnd YYYY-MM-DD formatında olmalıdır' }, { status: 400 })
  }
  if (periodEnd < periodStart) {
    return NextResponse.json({ error: 'Dövrün sonu başlanğıcdan əvvəl ola bilməz' }, { status: 400 })
  }
  if (!Array.isArray(body.rows)) return NextResponse.json({ error: 'rows massiv olmalıdır' }, { status: 400 })
  if (body.rows.length > 500) return NextResponse.json({ error: 'Maksimum 500 sətir' }, { status: 413 })
  const source = typeof body.source === 'string' ? body.source.slice(0, 120) : null

  const tenantId = session.user.tenant_id
  const tb = await db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(eq(branches.tenant_id, tenantId))
  const byName = new Map(tb.map(b => [canonBranchKey(b.name), b.id]))
  const branchIdOf = (f: string) => byName.get(canonBranchKey(f)) ?? null
  const canon = (f: string) => normalizeFilial(f) ?? f.trim()

  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  // Açar başına birləşdir — `ON CONFLICT DO UPDATE` eyni sətrə iki dəfə toxunmur.
  const acc = new Map<string, Required<Omit<InRow, 'status'>> & { status: string }>()
  const rejected: string[] = []
  ;(body.rows as InRow[]).forEach((r, i) => {
    if (!r || typeof r.filial !== 'string' || !r.filial.trim()) {
      if (rejected.length < 5) rejected.push(`row[${i}]`)
      return
    }
    const filial = canon(r.filial)
    const k = canonBranchKey(filial)
    const prev = acc.get(k)
    const v = {
      filial,
      cardSales: num(r.cardSales), unibank: num(r.unibank),
      atb: num(r.atb), kapital: num(r.kapital),
      bankTotal: num(r.bankTotal), diff: num(r.diff),
      status: typeof r.status === 'string' && STATUS.has(r.status) ? r.status : 'partial',
    }
    if (prev) {
      prev.cardSales += v.cardSales; prev.unibank += v.unibank
      prev.atb += v.atb; prev.kapital += v.kapital
      prev.bankTotal += v.bankTotal; prev.diff += v.diff
    } else acc.set(k, v)
  })
  const rows = [...acc.values()]
  const unmatched = new Set<string>()
  for (const r of rows) if (branchIdOf(r.filial) == null) unmatched.add(r.filial)

  try {
    if (rows.length) {
      await sqlClient.query(`
        insert into kasa_banka_recon
          (tenant_id, branch_id, filial, period_start, period_end,
           card_sales, unibank, atb, kapital, bank_total, diff, status, source)
        select $1::uuid, t.branch_id, t.filial, $2::date, $3::date,
               t.card_sales, t.unibank, t.atb, t.kapital, t.bank_total, t.diff, t.status, $4::text
        from unnest($5::uuid[], $6::text[], $7::numeric[], $8::numeric[], $9::numeric[],
                    $10::numeric[], $11::numeric[], $12::numeric[], $13::text[])
          as t(branch_id, filial, card_sales, unibank, atb, kapital, bank_total, diff, status)
        on conflict (tenant_id, period_start, period_end, filial) do update set
          card_sales = excluded.card_sales,
          unibank    = excluded.unibank,
          atb        = excluded.atb,
          kapital    = excluded.kapital,
          bank_total = excluded.bank_total,
          diff       = excluded.diff,
          status     = excluded.status,
          branch_id  = coalesce(excluded.branch_id, kasa_banka_recon.branch_id),
          source     = coalesce(excluded.source, kasa_banka_recon.source),
          updated_at = now()
      `, [
        tenantId, periodStart, periodEnd, source,
        rows.map(r => branchIdOf(r.filial)),
        rows.map(r => r.filial),
        rows.map(r => r.cardSales.toFixed(2)),
        rows.map(r => r.unibank.toFixed(2)),
        rows.map(r => r.atb.toFixed(2)),
        rows.map(r => r.kapital.toFixed(2)),
        rows.map(r => r.bankTotal.toFixed(2)),
        rows.map(r => r.diff.toFixed(2)),
        rows.map(r => r.status),
      ])
    }

    try {
      await db.insert(audit_logs).values({
        tenant_id: tenantId,
        user_id: session.user.id,
        action: 'kasa.banka.recon',
        entity: 'kasa_banka',
        entity_id: `${periodStart}..${periodEnd}`,
        metadata: JSON.stringify({
          written: rows.length, rejected: rejected.length, source,
          cardSales: Number(rows.reduce((s, r) => s + r.cardSales, 0).toFixed(2)),
          bankTotal: Number(rows.reduce((s, r) => s + r.bankTotal, 0).toFixed(2)),
          flagged: rows.filter(r => r.status === 'missing' || r.status === 'over').map(r => r.filial),
          unmatchedBranches: [...unmatched],
        }),
      })
    } catch (auditError) { console.error('Audit log write error:', auditError) }

    return NextResponse.json({
      ok: true, written: rows.length, rejected: rejected.length, rejectedSample: rejected,
      periodStart, periodEnd, unmatchedBranches: [...unmatched],
    }, { status: 200 })
  } catch (e) {
    // Xəta UDULMUR (CLAUDE.md §2.7).
    const err = e as { message?: string; code?: string; detail?: string; sourceError?: { message?: string } }
    const detail = err?.message ?? String(e)
    console.error('kasa-banka save error:', detail)
    return NextResponse.json({
      error: 'Yazma xətası', detail,
      meta: { rows: rows.length, pgCode: err?.code ?? null, pgDetail: err?.detail ?? null, cause: err?.sourceError?.message ?? null },
    }, { status: 500 })
  }
}
