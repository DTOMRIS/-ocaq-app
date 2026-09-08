import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sqlClient } from '@/db'

export const runtime = 'nodejs'
export const maxDuration = 60
const MAX_ROWS = 5000
const ISO = /^\d{4}-\d{2}-\d{2}$/

type InRow = {
  product: string; material: string; code?: string | null
  norm: number; unit?: string | null; category?: string | null; is_semi?: boolean
}

/**
 * Reçetura sətirlərini `recipe_lines`-a yazır.
 *
 * `validFrom` MƏCBURİDİR: reçetura versiyalanır. Versiyasız yazılsa keçən ayın
 * teorik mayası bugünkü norma ilə yenidən hesablanar və keçmiş səssizcə dəyişər.
 * Eyni `validFrom` təkrar yüklənsə üzərinə yazılır (upsert) — düzəliş mümkündür.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  try {
    const body = await req.json() as { rows?: unknown; validFrom?: unknown; source?: unknown }
    const validFrom = String(body.validFrom ?? '')
    if (!ISO.test(validFrom)) {
      return NextResponse.json({ error: 'validFrom (YYYY-MM-DD) lazımdır — reçetura versiyalanır' }, { status: 400 })
    }
    if (!Array.isArray(body.rows)) return NextResponse.json({ error: 'rows massiv olmalıdır' }, { status: 400 })
    if (body.rows.length > MAX_ROWS) {
      return NextResponse.json({ error: `Bir çağırışda maksimum ${MAX_ROWS} sətir` }, { status: 413 })
    }
    const source = typeof body.source === 'string' ? body.source.slice(0, 120) : null
    const tenantId = session.user.tenant_id

    const rejected: string[] = []
    const valid = (body.rows as InRow[]).filter((r, i) => {
      const ok = !!r && typeof r.product === 'string' && !!r.product.trim()
        && typeof r.material === 'string' && !!r.material.trim()
        && Number.isFinite(Number(r.norm)) && Number(r.norm) > 0
      if (!ok && rejected.length < 5) rejected.push(`row[${i}]`)
      return ok
    })

    // Eyni (məhsul|xammal) təkrarı — reçeturada bir məhsulda eyni xammal iki
    // sətirdə ola bilər (məs. iki fərqli mərhələdə). Normalar TOPLANIR.
    const acc = new Map<string, InRow>()
    let merged = 0
    for (const r of valid) {
      const key = `${r.product.trim()}|${r.material.trim()}`
      const prev = acc.get(key)
      if (prev) { prev.norm = Number(prev.norm) + Number(r.norm); merged++ }
      else acc.set(key, { ...r, product: r.product.trim(), material: r.material.trim(), norm: Number(r.norm) })
    }
    const rows = [...acc.values()]
    if (!rows.length) return NextResponse.json({ ok: true, written: 0, merged, rejected: rejected.length })

    await sqlClient.query(`
      insert into recipe_lines
        (tenant_id, product, category, material, code, norm, unit, is_semi, valid_from, source)
      select $1::uuid, t.product, t.category, t.material, t.code, t.norm, t.unit, t.is_semi, $2::date, $3::text
      from unnest($4::text[], $5::text[], $6::text[], $7::text[], $8::numeric[], $9::text[], $10::boolean[])
        as t(product, category, material, code, norm, unit, is_semi)
      on conflict (tenant_id, product, material, valid_from) do update set
        norm       = excluded.norm,
        code       = coalesce(excluded.code, recipe_lines.code),
        unit       = coalesce(excluded.unit, recipe_lines.unit),
        category   = coalesce(excluded.category, recipe_lines.category),
        is_semi    = excluded.is_semi,
        source     = coalesce(excluded.source, recipe_lines.source),
        updated_at = now()
    `, [
      tenantId, validFrom, source,
      rows.map(r => r.product),
      rows.map(r => r.category ?? null),
      rows.map(r => r.material),
      rows.map(r => r.code ?? null),
      rows.map(r => Number(r.norm).toFixed(6)),
      rows.map(r => r.unit ?? null),
      rows.map(r => !!r.is_semi),
    ])
    return NextResponse.json({ ok: true, written: rows.length, merged, rejected: rejected.length, validFrom })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Naməlum xəta' }, { status: 500 })
  }
}
