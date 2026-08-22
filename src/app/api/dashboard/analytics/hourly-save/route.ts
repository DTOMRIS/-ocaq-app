import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { audit_logs } from '@/db/schema/auth'
import { canonBranchKey, normalizeFilial } from '@/lib/analytics/filial-map'
import { diffCumulative, type CumeRow } from '@/lib/analytics/hourly-delta'

/**
 * SAATLIQ satış hesabatını yazır — KUMULYATİV görüntü + ondan çıxan GÜNLÜK fərq.
 *
 * İSTİFADƏÇİ AXINI (22.08.2026 qərarı): «bunu 21 günlük olaraq qeyd et, mən hər
 * gün ocağa yenisini atım, amma toplamdan davam etsin».
 *
 * Hər çağırışda İKİ İŞ görülür:
 *   1. Fayl `analytics_hourly_cume`-a OLDUĞU KİMİ yazılır. Açar dövrün sonunu
 *      da daxil edir → eyni fayl təkrar atılsa ÜZƏRİNƏ yazılır, cəm ŞİŞMİR.
 *   2. Eyni başlanğıclı ƏVVƏLKİ görüntü tapılır və fərq hesablanır. Fərq məhz
 *      aradakı gündür → `analytics_hourly_fact`-a yazılır.
 *
 * 🔴 BİRİNCİ FAYLDAN GÜNLÜK FAKT ÇIXARILMIR (bax `hourly-delta.ts` qayda 1) —
 * 21 günün cəmini tək günə yazmaq datanı korlayardı.
 *
 * NİYƏ `unnest`: 09.08.2026 hadisəsi — çox sətirli `VALUES` 40 000 parametr və
 * ~440 KB SQL mətni yaradırdı, Neon HTTP sürücüsü rədd edirdi. `unnest` ilə
 * SQL mətni SABİT, parametr sayı SABİT.
 *
 * ⚠️ ÇAĞIRAN BÜTÜN SƏTİRLƏRİ BİR ÇAĞIRIŞDA GÖNDƏRMƏLİDİR. Fərq hesablamaq
 * üçün TAM görüntü lazımdır — hissə-hissə göndərilsə fərq yanlış çıxar
 * (göndərilməyən açarlar «yox olub» sayılar). Real fayl 30 filial × 13 ödəniş
 * növü × 24 saat ≈ 3 900 sətirdir, bu limitin altındadır.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

/** 30 filial × 13 ödəniş növü × 24 saat = 9 360; təhlükəsiz tavan. */
const MAX_ROWS = 12000

const ISO = /^\d{4}-\d{2}-\d{2}$/

type InRow = { filial: string; payType: string; hour: number; net: number; guests?: number | null }

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
  if (!periodStart) return NextResponse.json({ error: 'periodStart YYYY-MM-DD formatında olmalıdır' }, { status: 400 })
  if (!periodEnd) return NextResponse.json({ error: 'periodEnd YYYY-MM-DD formatında olmalıdır' }, { status: 400 })
  if (periodEnd < periodStart) {
    return NextResponse.json({ error: 'Dövrün sonu başlanğıcdan əvvəl ola bilməz' }, { status: 400 })
  }
  if (!Array.isArray(body.rows)) return NextResponse.json({ error: 'rows massiv olmalıdır' }, { status: 400 })
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Maksimum ${MAX_ROWS} sətir (gələn: ${body.rows.length})` }, { status: 413 })
  }
  const source = typeof body.source === 'string' ? body.source.slice(0, 120) : null

  const tenantId = session.user.tenant_id
  const tb = await db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(eq(branches.tenant_id, tenantId))
  const byName = new Map(tb.map(b => [canonBranchKey(b.name), b.id]))
  const branchIdOf = (filial: string) => byName.get(canonBranchKey(filial)) ?? null
  const canonName = (raw: string) => normalizeFilial(raw) ?? raw.trim()

  const rejected: string[] = []
  const valid = (body.rows as InRow[]).filter((r, i) => {
    const ok = !!r && typeof r.filial === 'string' && !!r.filial.trim()
      && typeof r.payType === 'string' && !!r.payType.trim()
      && Number.isInteger(r.hour) && r.hour >= 0 && r.hour <= 23
      && Number.isFinite(Number(r.net))
    if (!ok && rejected.length < 5) rejected.push(`row[${i}]`)
    return ok
  })

  // Açar başına birləşdir — Postgres `ON CONFLICT DO UPDATE` eyni sətrə iki
  // dəfə toxunanda «cannot affect row a second time» xətası verir.
  const acc = new Map<string, CumeRow>()
  let merged = 0
  for (const r of valid) {
    const filial = canonName(r.filial)
    const payType = r.payType.trim()
    const k = `${canonBranchKey(filial)}|${payType}|${r.hour}`
    const prev = acc.get(k)
    if (prev) {
      merged++
      prev.net += Number(r.net)
      prev.guests += Math.trunc(Number(r.guests ?? 0))
    } else {
      acc.set(k, { filial, payType, hour: r.hour, net: Number(r.net), guests: Math.trunc(Number(r.guests ?? 0)) })
    }
  }
  const rows = [...acc.values()]
  const unmatched = new Set<string>()
  for (const r of rows) if (branchIdOf(r.filial) == null) unmatched.add(r.filial)

  try {
    // ── 1. ƏVVƏLKİ görüntünü ƏVVƏLCƏ oxu ────────────────────────────────────
    // Yenisini yazmazdan ƏVVƏL: eyni dövr sonu təkrar göndərilibsə öz üzərinə
    // yazıb özü ilə fərq alsaydıq nəticə həmişə sıfır çıxardı.
    const prevQ = await sqlClient.query(`
      select period_end from analytics_hourly_cume
      where tenant_id = $1::uuid and period_start = $2::date and period_end < $3::date
      order by period_end desc limit 1
    `, [tenantId, periodStart, periodEnd])
    const prevEnd: string | null = prevQ.rows?.[0]?.period_end
      ? String(prevQ.rows[0].period_end).slice(0, 10)
      : null

    let prevRows: CumeRow[] | null = null
    if (prevEnd) {
      const q = await sqlClient.query(`
        select filial, pay_type, hour, net, guests from analytics_hourly_cume
        where tenant_id = $1::uuid and period_start = $2::date and period_end = $3::date
      `, [tenantId, periodStart, prevEnd])
      prevRows = (q.rows ?? []).map((x: Record<string, unknown>) => ({
        filial: String(x.filial),
        payType: String(x.pay_type),
        hour: Number(x.hour),
        net: Number(x.net),
        guests: Number(x.guests ?? 0),
      }))
    }

    // ── 2. Kumulyativ görüntünü yaz (idempotent) ────────────────────────────
    if (rows.length) {
      await sqlClient.query(`
        insert into analytics_hourly_cume
          (tenant_id, branch_id, filial, period_start, period_end, pay_type, hour, net, guests, source)
        select $1::uuid, t.branch_id, t.filial, $2::date, $3::date, t.pay_type, t.hour, t.net, t.guests, $4::text
        from unnest($5::uuid[], $6::text[], $7::text[], $8::integer[], $9::numeric[], $10::integer[])
          as t(branch_id, filial, pay_type, hour, net, guests)
        on conflict (tenant_id, period_start, period_end, filial, pay_type, hour) do update set
          net        = excluded.net,
          guests     = coalesce(excluded.guests, analytics_hourly_cume.guests),
          branch_id  = coalesce(excluded.branch_id, analytics_hourly_cume.branch_id),
          source     = coalesce(excluded.source, analytics_hourly_cume.source),
          updated_at = now()
      `, [
        tenantId, periodStart, periodEnd, source,
        rows.map(r => branchIdOf(r.filial)),
        rows.map(r => r.filial),
        rows.map(r => r.payType),
        rows.map(r => r.hour),
        rows.map(r => r.net.toFixed(2)),
        rows.map(r => r.guests),
      ])
    }

    // ── 3. Fərqi hesabla və günlük cədvələ yaz ──────────────────────────────
    const delta = diffCumulative(prevRows, prevEnd, rows, periodEnd)
    let dailyWritten = 0
    if (delta.canWriteDaily && delta.rows.length) {
      const d = delta.rows
      await sqlClient.query(`
        insert into analytics_hourly_fact
          (tenant_id, branch_id, filial, business_date, pay_type, hour, net, guests, derivation, source)
        select $1::uuid, t.branch_id, t.filial, $2::date, t.pay_type, t.hour, t.net, t.guests, 'delta', $3::text
        from unnest($4::uuid[], $5::text[], $6::text[], $7::integer[], $8::numeric[], $9::integer[])
          as t(branch_id, filial, pay_type, hour, net, guests)
        on conflict (tenant_id, filial, business_date, pay_type, hour) do update set
          net        = excluded.net,
          guests     = coalesce(excluded.guests, analytics_hourly_fact.guests),
          branch_id  = coalesce(excluded.branch_id, analytics_hourly_fact.branch_id),
          derivation = excluded.derivation,
          source     = coalesce(excluded.source, analytics_hourly_fact.source),
          updated_at = now()
      `, [
        tenantId, delta.date, source,
        d.map(r => branchIdOf(r.filial)),
        d.map(r => r.filial),
        d.map(r => r.payType),
        d.map(r => r.hour),
        d.map(r => r.net.toFixed(2)),
        d.map(r => r.guests),
      ])
      dailyWritten = d.length
    }

    const cumeNet = rows.reduce((s, r) => s + r.net, 0)

    try {
      await db.insert(audit_logs).values({
        tenant_id: tenantId,
        user_id: session.user.id,
        action: 'analytics.hourly.cume',
        entity: 'analytics',
        entity_id: `${periodStart}..${periodEnd}`,
        metadata: JSON.stringify({
          cumeWritten: rows.length, merged, rejected: rejected.length, source,
          cumeNet: Number(cumeNet.toFixed(2)),
          prevEnd, deltaDate: delta.date, spanDays: delta.spanDays,
          dailyWritten, deltaNet: delta.totals.net,
          negatives: delta.negatives.length, vanished: delta.vanished,
          unmatchedBranches: [...unmatched],
        }),
      })
    } catch (auditError) { console.error('Audit log write error:', auditError) }

    return NextResponse.json({
      ok: true,
      periodStart, periodEnd,
      cumeWritten: rows.length,
      cumeNet: Number(cumeNet.toFixed(2)),
      merged, rejected: rejected.length, rejectedSample: rejected,
      // Fərq nəticəsi — istifadəçi nə olduğunu GÖRSÜN, təxmin etməsin.
      prevEnd,
      deltaDate: delta.date,
      spanDays: delta.spanDays,
      deltaNet: delta.totals.net,
      deltaGuests: delta.totals.guests,
      dailyWritten,
      negatives: delta.negatives.length,
      negativesSample: delta.negatives.slice(0, 5),
      vanished: delta.vanished,
      warnings: delta.warnings,
      unmatchedBranches: [...unmatched],
    }, { status: 200 })
  } catch (e) {
    // Xəta UDULMUR (CLAUDE.md §2.7) — teşhis edilə bilən cavab qaytarılır.
    const err = e as { message?: string; code?: string; severity?: string; detail?: string; sourceError?: { message?: string } }
    const detail = err?.message ?? String(e)
    const meta = {
      rowsReceived: Array.isArray(body.rows) ? body.rows.length : 0,
      periodStart, periodEnd,
      pgCode: err?.code ?? null,
      pgDetail: err?.detail ?? null,
      severity: err?.severity ?? null,
      cause: err?.sourceError?.message ?? null,
    }
    console.error('hourly-save error:', detail, meta)
    return NextResponse.json({ error: 'Yazma xətası', detail, meta }, { status: 500 })
  }
}
