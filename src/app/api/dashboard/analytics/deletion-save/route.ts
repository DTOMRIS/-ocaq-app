import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { audit_logs } from '@/db/schema/auth'
import { canonBranchKey, normalizeFilial } from '@/lib/analytics/filial-map'

/**
 * «Silinme hesabati» sətirlərini `analytics_deletion_fact`-a yazır.
 *
 * NİYƏ ÜZƏRİNƏ YAZMA (upsert) DEYİL, GÜN ƏVƏZLƏMƏ:
 * Eyni qəbzdə eyni məhsul İKİ DƏFƏ silinə bilər (iki ayrı ləğv). Unikal açar
 * qoysaydıq onlar birləşər və silinmə sayı AZ görünərdi — kasa nəzarətində
 * bu, riski gizlədən səhvdir. Ona görə cədvəldə unikal açar yoxdur və fayl
 * əhatə etdiyi GÜNLƏRİN sətirlərini silib yenidən yazır.
 *
 * Silinmə DAR ƏHATƏLİDİR (yalnız göndərilən günlər), yalnız super_admin,
 * audit-ə yazılır, ekranda əvvəlcədən deyilir. Data faylın özündən yenidən
 * yazıldığı üçün bərpa olunandır.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_ROWS = 8000
const ISO = /^\d{4}-\d{2}-\d{2}$/

type InRow = {
  date: string; filial: string; item: string; amount: number
  receipt?: string | null; reason?: string | null; comment?: string | null; writtenOff?: boolean
  // ── Anbar silinməsi («Silinmə <ay>.xlsx») ────────────────────────────────
  // QİDA / QEYRİ QİDA / İSTEHSALAT. Çek bazlı silinmədə boş gəlir.
  category?: string | null; qty?: number | null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  let body: {
    rows?: unknown; source?: unknown; replaceDays?: unknown
    sweepDays?: unknown; sweepFrom?: unknown
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON oxunmadı' }, { status: 400 }) }

  // ── SÜPÜRMƏ — bütün chunk-lar yazıldıqdan SONRA çağırılır ──────────────────
  // Həmin günlərdə BU YÜKLƏMƏDƏ yazılmayan (köhnə) sətirlər silinir.
  // Yükləmə yarıda qırılsa bura heç vaxt gəlinmir → köhnə data toxunulmur.
  if (Array.isArray(body.sweepDays)) {
    const sweepDays = [...new Set((body.sweepDays as unknown[])
      .filter((d): d is string => typeof d === 'string' && ISO.test(d)))]
    const sweepFrom = typeof body.sweepFrom === 'string' ? body.sweepFrom : null
    if (!sweepDays.length || !sweepFrom || Number.isNaN(Date.parse(sweepFrom))) {
      return NextResponse.json({ error: 'sweepDays (ISO tarixlər) və sweepFrom (timestamp) tələb olunur' }, { status: 400 })
    }
    if (sweepDays.length > 62) {
      return NextResponse.json({ error: `Maksimum 62 gün süpürülə bilər (gələn: ${sweepDays.length})` }, { status: 400 })
    }
    const tid = session.user.tenant_id
    const q = await sqlClient.query(
      `delete from analytics_deletion_fact
       where tenant_id = $1::uuid
         and business_date = any($2::date[])
         and updated_at < $3::timestamp
       returning 1`,
      [tid, sweepDays, sweepFrom],
    ) as unknown[]
    const sweptRows = Array.isArray(q) ? q.length : 0
    try {
      await db.insert(audit_logs).values({
        tenant_id: tid, user_id: session.user.id,
        action: 'analytics.deletion.sweep', entity: 'analytics',
        entity_id: sweepDays.length ? `${sweepDays[0]}..${sweepDays[sweepDays.length - 1]}` : 'n/a',
        metadata: JSON.stringify({ sweepDays, sweepFrom, sweptRows }),
      })
    } catch (auditError) { console.error('Audit log write error:', auditError) }
    return NextResponse.json({ ok: true, sweptRows, sweepDays }, { status: 200 })
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
  const branchIdOf = (f: string) => byName.get(canonBranchKey(f)) ?? null
  const canon = (f: string) => normalizeFilial(f) ?? f.trim()

  const rejected: string[] = []
  const rows = (body.rows as InRow[]).filter((r, i) => {
    const ok = !!r && typeof r.date === 'string' && ISO.test(r.date)
      && typeof r.filial === 'string' && !!r.filial.trim()
      && typeof r.item === 'string' && !!r.item.trim()
      && Number.isFinite(Number(r.amount))
    if (!ok && rejected.length < 5) rejected.push(`row[${i}]`)
    return ok
  }).map(r => ({ ...r, filial: canon(r.filial) }))

  const replaceDays = Array.isArray(body.replaceDays)
    ? [...new Set((body.replaceDays as unknown[]).filter((d): d is string => typeof d === 'string' && ISO.test(d)))]
    : []
  if (replaceDays.length > 62) {
    return NextResponse.json({ error: `Bir çağırışda maksimum 62 gün əvəz edilə bilər (gələn: ${replaceDays.length})` }, { status: 400 })
  }

  const unmatched = new Set<string>()
  for (const r of rows) if (branchIdOf(r.filial) == null) unmatched.add(r.filial)
  const days = [...new Set(rows.map(r => r.date))].sort()

  try {
    let replacedRows = 0
    let sweepFrom: string | null = null
    if (replaceDays.length) {
      // 🔴 SİLMƏ ARTIQ BURADA DEYİL — SONDA (`sweepDays` çağırışında).
      //
      // Əvvəl bu blok günləri DƏRHAL silirdi, sətirlər isə ayrı-ayrı HTTP
      // çağırışları ilə gəlirdi. Ortada biri sınsa gün SİLİNMİŞ, yalnız bir
      // hissəsi yazılmış qalırdı — SƏSSİZ DATA İTKİSİ.
      //
      // ⚠️ BU CƏDVƏLDƏ UNİKAL AÇAR YOXDUR (eyni qəbzdə eyni məhsul iki dəfə
      // silinə bilər — migration 0014 şərhi), ona görə upsert mümkün deyil,
      // yalnız insert var. Süpürmə həddi buna görə DAHA DA vacibdir: köhnə
      // sətirlər yeni sətirlərdən `updated_at` ilə ayrılır.
      //
      // MÜBADİLƏ (açıq yazılır): yükləmə yarıda qırılsa köhnə sətirlər YERİNDƏ
      // QALIR və yeni yazılanlar onların ÜSTÜNƏ əlavə olunur → həmin günlər
      // müvəqqəti ŞİŞİK görünür. Bu, əvvəlki davranışdan (səssiz İTKİ) daha
      // yaxşıdır: şişmə GÖRÜNÜR və faylı təkrar atmaqla ÖZÜ DÜZƏLİR, itki isə
      // nə görünürdü, nə də özü düzəlirdi.
      const nowQ = await sqlClient.query('select now() as t', []) as Array<{ t: unknown }>
      sweepFrom = nowQ?.[0]?.t ? new Date(String(nowQ[0].t)).toISOString() : null
      const before = await sqlClient.query(
        `select count(*)::int as n from analytics_deletion_fact
         where tenant_id = $1::uuid and business_date = any($2::date[])`,
        [tenantId, replaceDays],
      ) as Array<{ n: number }>
      replacedRows = Number(before?.[0]?.n ?? 0)   // yalnız MƏLUMAT — silinmədi
    }

    if (rows.length) {
      // `unnest` — sütun başına BİR massiv parametri (bax `fact-save` şərhi).
      await sqlClient.query(`
        insert into analytics_deletion_fact
          (tenant_id, branch_id, filial, business_date, receipt, item, reason, comment, amount, written_off, category, qty, source)
        select $1::uuid, t.branch_id, t.filial, t.business_date, t.receipt, t.item, t.reason, t.comment, t.amount, t.written_off, t.category, t.qty, $2::text
        from unnest($3::uuid[], $4::text[], $5::date[], $6::text[], $7::text[], $8::text[], $9::text[], $10::numeric[], $11::boolean[], $12::text[], $13::numeric[])
          as t(branch_id, filial, business_date, receipt, item, reason, comment, amount, written_off, category, qty)
      `, [
        tenantId, source,
        rows.map(r => branchIdOf(r.filial)),
        rows.map(r => r.filial),
        rows.map(r => r.date),
        rows.map(r => r.receipt ?? null),
        rows.map(r => r.item),
        rows.map(r => r.reason ?? null),
        rows.map(r => r.comment ?? null),
        rows.map(r => Number(r.amount).toFixed(2)),
        rows.map(r => !!r.writtenOff),
        rows.map(r => r.category ?? null),
        rows.map(r => (r.qty == null ? null : Number(r.qty).toFixed(3))),
      ])
    }

    try {
      await db.insert(audit_logs).values({
        tenant_id: tenantId,
        user_id: session.user.id,
        action: 'analytics.deletion.save',
        entity: 'analytics',
        entity_id: days.length ? `${days[0]}..${days[days.length - 1]}` : 'n/a',
        metadata: JSON.stringify({
          written: rows.length, rejected: rejected.length, source, days,
          replacedDays: replaceDays, replacedRows,
          amount: Number(rows.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)),
          unmatchedBranches: [...unmatched],
        }),
      })
    } catch (auditError) { console.error('Audit log write error:', auditError) }

    return NextResponse.json({
      ok: true,
      written: rows.length, rejected: rejected.length, rejectedSample: rejected,
      days, replacedDays: replaceDays, replacedRows, sweepFrom,
      amount: Number(rows.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)),
      unmatchedBranches: [...unmatched],
    }, { status: 200 })
  } catch (e) {
    // Xəta UDULMUR — teşhis məlumatı ilə qaytarılır (CLAUDE.md §2.7).
    const err = e as { message?: string; code?: string; severity?: string; detail?: string; sourceError?: { message?: string } }
    const detail = err?.message ?? String(e)
    const meta = {
      rowsReceived: Array.isArray(body.rows) ? body.rows.length : 0,
      rowsValid: rows.length, days: days.length,
      pgCode: err?.code ?? null, pgDetail: err?.detail ?? null,
      severity: err?.severity ?? null, cause: err?.sourceError?.message ?? null,
    }
    console.error('deletion-save error:', detail, meta)
    return NextResponse.json({ error: 'Yazma xətası', detail, meta }, { status: 500 })
  }
}
