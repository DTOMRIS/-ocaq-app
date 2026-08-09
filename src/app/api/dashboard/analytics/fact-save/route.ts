import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { audit_logs } from '@/db/schema/auth'
import { canonBranchKey, normalizeFilial } from '@/lib/analytics/filial-map'
import { PAYMENT_KINDS, LINE_KINDS } from '@/lib/analytics/parse-sales-detail'

/**
 * PRODMIX və ÇEK sətirlərini fact cədvəllərinə yazır.
 *
 * NİYƏ UPSERT, İNSERT DEYİL:
 * Fayllar HƏR GÜN atılır və son gün natamam ola bilər — 08.08.2026 datasında
 * çek faylının 7 avqustu prodmix-dən 40 652 ₼ əskik idi (1–6 avqust kuruşu
 * kuruşuna uyğun). Sabah tam 7 avqust gələndə insert etsək həmin gün İKİ DƏFƏ
 * sayılar. `ON CONFLICT DO UPDATE` üzərinə yazır → təkrar yükləmə təhlükəsizdir.
 *
 * NİYƏ CHUNK: Vercel body limiti 4,5 MB-dır. Fayl brauzerdə parse olunur
 * (mövcud panel deseni), nəticə hissə-hissə göndərilir. Hər çağırış müstəqil
 * idempotentdir — yarıda kəsilsə təkrar göndərmək zərərsizdir.
 *
 * 🔴 NİYƏ `unnest`, ÇOX SƏTİRLİ `VALUES` DEYİL (09.08.2026 hadisəsi):
 * Əvvəl hər sətir üçün ayrı placeholder qrupu qurulurdu. 4000 məhsul sətri =
 * 40 000 parametr + ~440 KB SQL MƏTNİ. Neon HTTP sürücüsü bunu qəbul etmədi:
 * «Database request failed» (Postgres xətası deyil — HTTP qatının rəddi; ona
 * görə heç bir izahat gəlmirdi). `daily` keçdi (~600 sətir), `item` sındı.
 *
 * `unnest` ilə sütun başına BİR massiv parametri gedir:
 *   • SQL mətni SABİT (~600 bayt), sətir sayından asılı deyil
 *   • parametr sayı SABİT 10 (40 000 deyil)
 *   • Postgres limiti 65 535 parametrdir — artıq ona heç yaxınlaşmırıq
 * Sürücü JS massivini Postgres massiv literalına çevirir və `null`-ı `NULL`
 * kimi kodlayır (`@neondatabase/serverless` → `arrayString`), yəni boş
 * `branch_id` təhlükəsizdir.
 *
 * ÇAĞIRANIN ÖHDƏLİYİ (vacib): sətirlər açar başına BİR DƏFƏ göndərilməlidir.
 * `parseProdmix().lines` və `parseReceipts().days` artıq bu qranuldadır
 * («upsert qranulu» şərhinə bax), ona görə chunk-ları sərbəst böləbilərsiniz —
 * amma EYNİ açarı iki chunk-a paylamayın: ikinci chunk üzərinə YAZAR, TOPLAMAZ.
 * Bir chunk daxilində təkrar açar gəlsə burada TOPLANIR (aşağı `merged`) —
 * çünki Postgres `ON CONFLICT DO UPDATE` eyni sətrə iki dəfə toxunanda
 * «cannot affect row a second time» xətası verir.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_ROWS = 5000   // bir çağırışda maksimum sətir (body ~1 MB-da qalsın)

/**
 * Gün cəmi sətri: çek sayı (müştəri sayı) ÖDƏNİŞ NÖVÜNƏ GÖRƏ BÖLÜNMÜR —
 * bir qəbz həm nağd həm kart ola bilər, ödəniş növlərinə paylasaq müştəri
 * sayı şişər. Ona görə `receipts` yalnız bu sentinel sətirdə saxlanır;
 * `payment_type` sütunundakı digər dəyərlər həqiqi ödəniş növləridir.
 */
const DAY_TOTAL = '__day__'
const VALID_PAYMENT = new Set<string>([...PAYMENT_KINDS, DAY_TOTAL])

type DailyRow = { filial: string; date: string; payment_type: string; amount: number; receipts?: number | null }
type ItemRow = { filial: string; date: string; item_code: string; item_name: string; qty: number; amount: number; line_kind: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  }

  let body: { kind?: unknown; rows?: unknown; source?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON oxunmadı' }, { status: 400 }) }

  const kind = body.kind === 'daily' || body.kind === 'item' ? body.kind : null
  if (!kind) return NextResponse.json({ error: "kind 'daily' və ya 'item' olmalıdır" }, { status: 400 })
  if (!Array.isArray(body.rows)) return NextResponse.json({ error: 'rows massiv olmalıdır' }, { status: 400 })
  if (body.rows.length === 0) return NextResponse.json({ ok: true, written: 0, merged: 0, rejected: 0, days: [] }, { status: 200 })
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Bir çağırışda maksimum ${MAX_ROWS} sətir (gələn: ${body.rows.length})` }, { status: 413 })
  }
  const source = typeof body.source === 'string' ? body.source.slice(0, 120) : null

  const tenantId = session.user.tenant_id
  // Filial adı → OCAQ branch.id. Ad uyğunlaşmasa branch_id null qalır və sətir
  // YENƏ yazılır: data itməməlidir. Sonra filial yaradılanda (`/admin/filiallar`)
  // növbəti yükləmə `coalesce(excluded.branch_id, …)` ilə boşluğu doldurur.
  const tb = await db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(eq(branches.tenant_id, tenantId))
  const byName = new Map(tb.map(b => [canonBranchKey(b.name), b.id]))
  const branchIdOf = (filial: string) => byName.get(canonBranchKey(filial)) ?? null

  // Unique açar `filial` TEXT sütunu üzərindədir → alias kanonikləşdirilməlidir,
  // yoxsa 'Xırdalan' və 'Masazır' EYNİ filial üçün İKİ sətir yaradar.
  const canonName = (raw: string) => normalizeFilial(raw) ?? raw.trim()

  const rejected: string[] = []
  let merged = 0
  let written = 0
  const dates = new Set<string>()
  const unmatched = new Set<string>()

  try {
    if (kind === 'daily') {
      const valid = (body.rows as DailyRow[]).filter((r, i) => {
        const ok = !!r && typeof r.filial === 'string' && !!r.filial.trim()
          && typeof r.date === 'string' && ISO.test(r.date)
          && typeof r.payment_type === 'string' && VALID_PAYMENT.has(r.payment_type)
          && Number.isFinite(Number(r.amount))
        if (!ok && rejected.length < 5) rejected.push(`daily[${i}]`)
        return ok
      })

      // Chunk daxili təkrar açarı TOPLA (Postgres eyni sətrə iki dəfə toxunmur).
      const acc = new Map<string, { filial: string; date: string; payment_type: string; amount: number; receipts: number | null }>()
      for (const r of valid) {
        const filial = canonName(r.filial)
        const key = `${canonBranchKey(filial)}|${r.date}|${r.payment_type}`
        const rec = r.receipts == null ? null : Math.trunc(Number(r.receipts))
        const prev = acc.get(key)
        if (prev) {
          merged++
          prev.amount += Number(r.amount)
          if (rec != null) prev.receipts = (prev.receipts ?? 0) + rec
        } else {
          acc.set(key, { filial, date: r.date, payment_type: r.payment_type, amount: Number(r.amount), receipts: rec })
        }
      }

      const rows = [...acc.values()]
      for (const r of rows) {
        dates.add(r.date)
        if (branchIdOf(r.filial) == null) unmatched.add(r.filial)
      }

      if (rows.length) {
        // `unnest` — sütun başına BİR massiv parametri (bax yuxarıdaki şərh).
        await sqlClient.query(`
          insert into analytics_daily_fact
            (tenant_id, branch_id, filial, business_date, payment_type, amount, receipts, source)
          select $1::uuid, t.branch_id, t.filial, t.business_date, t.payment_type, t.amount, t.receipts, $2::text
          from unnest($3::uuid[], $4::text[], $5::date[], $6::text[], $7::numeric[], $8::integer[])
            as t(branch_id, filial, business_date, payment_type, amount, receipts)
          on conflict (tenant_id, filial, business_date, payment_type) do update set
            amount     = excluded.amount,
            receipts   = coalesce(excluded.receipts, analytics_daily_fact.receipts),
            branch_id  = coalesce(excluded.branch_id, analytics_daily_fact.branch_id),
            source     = coalesce(excluded.source, analytics_daily_fact.source),
            updated_at = now()
        `, [
          tenantId, source,
          rows.map(r => branchIdOf(r.filial)),
          rows.map(r => r.filial),
          rows.map(r => r.date),
          rows.map(r => r.payment_type),
          rows.map(r => r.amount.toFixed(2)),
          rows.map(r => r.receipts),
        ])
        written = rows.length
      }
    } else {
      const valid = (body.rows as ItemRow[]).filter((r, i) => {
        const ok = !!r && typeof r.filial === 'string' && !!r.filial.trim()
          && typeof r.date === 'string' && ISO.test(r.date)
          && typeof r.item_code === 'string' && !!r.item_code.trim()
          && typeof r.item_name === 'string'
          && typeof r.line_kind === 'string' && (LINE_KINDS as readonly string[]).includes(r.line_kind)
          && Number.isFinite(Number(r.qty)) && Number.isFinite(Number(r.amount))
        if (!ok && rejected.length < 5) rejected.push(`item[${i}]`)
        return ok
      })

      const acc = new Map<string, { filial: string; date: string; item_code: string; item_name: string; qty: number; amount: number; line_kind: string }>()
      for (const r of valid) {
        const filial = canonName(r.filial)
        const item_code = r.item_code.trim()
        const key = `${canonBranchKey(filial)}|${r.date}|${item_code}`
        const prev = acc.get(key)
        if (prev) {
          merged++
          prev.qty += Number(r.qty)
          prev.amount += Number(r.amount)
        } else {
          acc.set(key, {
            filial, date: r.date, item_code, item_name: r.item_name.trim(),
            qty: Number(r.qty), amount: Number(r.amount), line_kind: r.line_kind,
          })
        }
      }

      const rows = [...acc.values()]
      for (const r of rows) {
        dates.add(r.date)
        if (branchIdOf(r.filial) == null) unmatched.add(r.filial)
      }

      if (rows.length) {
        await sqlClient.query(`
          insert into analytics_item_fact
            (tenant_id, branch_id, filial, business_date, item_code, item_name, qty, amount, line_kind, source)
          select $1::uuid, t.branch_id, t.filial, t.business_date, t.item_code, t.item_name, t.qty, t.amount, t.line_kind, $2::text
          from unnest($3::uuid[], $4::text[], $5::date[], $6::text[], $7::text[], $8::numeric[], $9::numeric[], $10::text[])
            as t(branch_id, filial, business_date, item_code, item_name, qty, amount, line_kind)
          on conflict (tenant_id, filial, business_date, item_code) do update set
            item_name  = excluded.item_name,
            qty        = excluded.qty,
            amount     = excluded.amount,
            line_kind  = excluded.line_kind,
            branch_id  = coalesce(excluded.branch_id, analytics_item_fact.branch_id),
            source     = coalesce(excluded.source, analytics_item_fact.source),
            updated_at = now()
        `, [
          tenantId, source,
          rows.map(r => branchIdOf(r.filial)),
          rows.map(r => r.filial),
          rows.map(r => r.date),
          rows.map(r => r.item_code),
          rows.map(r => r.item_name),
          rows.map(r => r.qty.toFixed(3)),
          rows.map(r => r.amount.toFixed(2)),
          rows.map(r => r.line_kind),
        ])
        written = rows.length
      }
    }

    // Audit: kim, nə vaxt, hansı günləri yazdı. Xəta udulmur.
    const days = [...dates].sort()
    try {
      await db.insert(audit_logs).values({
        tenant_id: tenantId,
        user_id: session.user.id,
        action: kind === 'daily' ? 'analytics.fact.daily' : 'analytics.fact.item',
        entity: 'analytics',
        entity_id: days.join(',').slice(0, 200) || 'n/a',
        metadata: JSON.stringify({
          written, merged, rejected: rejected.length, source, days,
          unmatchedBranches: [...unmatched],
        }),
      })
    } catch (auditError) { console.error('Audit log write error:', auditError) }

    return NextResponse.json({
      ok: true, written, merged, rejected: rejected.length,
      rejectedSample: rejected, days,
      // Filial adı OCAQ-da yoxdur → `branch_id` boş getdi. Data itməyib, amma
      // RBAC filial filtri işləməz; istifadəçi `/admin/filiallar`-da yaratmalıdır.
      unmatchedBranches: [...unmatched],
    }, { status: 200 })
  } catch (e) {
    // Xəta UDULMUR (CLAUDE.md §2.7) — real səbəb qaytarılır.
    //
    // TEŞHİS EDİLƏ BİLƏN OLSUN: «Database request failed» tək başına heç nə
    // demir (09.08.2026-da bir saat itirdik). Neon sürücüsünün əlavə sahələri
    // (`code`, `sourceError`, `severity`) və sətir sayı da qaytarılır ki
    // növbəti dəfə səbəb dərhal görünsün.
    const err = e as { message?: string; code?: string; severity?: string; detail?: string; sourceError?: { message?: string } }
    const detail = err?.message ?? String(e)
    const meta = {
      kind,
      rowsReceived: Array.isArray(body.rows) ? body.rows.length : 0,
      pgCode: err?.code ?? null,
      pgDetail: err?.detail ?? null,
      severity: err?.severity ?? null,
      cause: err?.sourceError?.message ?? null,
    }
    console.error('fact-save error:', detail, meta)
    return NextResponse.json({ error: 'Yazma xətası', detail, meta }, { status: 500 })
  }
}
