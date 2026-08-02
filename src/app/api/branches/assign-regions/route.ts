import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { BOLGELER, normalizeFilial } from '@/lib/analytics/filial-map'

// Filialları bölgələrə avtomatik təyin et (filial-map BOLGELER xəritəsi ilə).
// super_admin; branches.region_id-ni doldurur ki region_manager öz filiallarını görsün.
export const runtime = 'nodejs'

const canon = (s: string) => (normalizeFilial(s) ?? s).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim()

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })
  const tenantId = session.user.tenant_id
  try {
    const rgs = await db.select({ id: regions.id, name: regions.name }).from(regions).where(eq(regions.tenant_id, tenantId))
    const brs = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.tenant_id, tenantId))
    const byBranch = new Map(brs.map(b => [canon(b.name), b.id]))

    let assigned = 0
    const unmatchedBranches: string[] = []
    const unmatchedRegions: string[] = []
    for (const [regionKey, branchNames] of Object.entries(BOLGELER)) {
      const t = canon(regionKey)
      // "İsmayıl bölgəsi" ⊇ "İsmayıl"
      const region = rgs.find(r => canon(r.name) === t) ?? rgs.find(r => canon(r.name).includes(t))
      if (!region) { unmatchedRegions.push(regionKey); continue }
      for (const bn of branchNames) {
        const bid = byBranch.get(canon(bn))
        if (!bid) { unmatchedBranches.push(bn); continue }
        // Ham SQL — yalnız region_id (drizzle-in update-i migration kolonlarına toxunmasın)
        await sqlClient.query(`update branches set region_id = $1 where id = $2 and tenant_id = $3`, [region.id, bid, tenantId])
        assigned++
      }
    }
    return NextResponse.json({ ok: true, assigned, unmatchedBranches, unmatchedRegions }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
