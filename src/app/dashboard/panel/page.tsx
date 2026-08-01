import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { desc, eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { analytics_ingest } from '@/db/schema/analytics'
import { sales_targets } from '@/db/schema/sales'
import { branches } from '@/db/schema/branches'
import PanelClient from './panel-client'

export const metadata = { title: 'Günlük Panel — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) redirect('/dashboard')

  const tenantId = session.user.tenant_id
  const sp = await searchParams
  const wantPeriod = sp?.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : null

  // Arxiv: yadda saxlanmış bütün dövrlər (ay-ay) — dropdown üçün
  const periodRows = await db.selectDistinct({ period: analytics_ingest.period })
    .from(analytics_ingest)
    .where(and(eq(analytics_ingest.tenant_id, tenantId), eq(analytics_ingest.engine_version, 'panel-1.0')))
  const periods = periodRows.map(r => r.period).filter((p): p is string => !!p).sort().reverse()

  // Seçilən dövr (yoxdursa ən sonuncu) panel verisi
  const [latest] = await db.select({ network: analytics_ingest.network, gen: analytics_ingest.generated_at, period: analytics_ingest.period })
    .from(analytics_ingest)
    .where(and(
      eq(analytics_ingest.tenant_id, tenantId),
      eq(analytics_ingest.engine_version, 'panel-1.0'),
      ...(wantPeriod ? [eq(analytics_ingest.period, wantPeriod)] : []),
    ))
    .orderBy(desc(analytics_ingest.created_at)).limit(1)

  let initial: { daily: unknown; plan: unknown; yoy?: unknown } | null = null
  if (latest?.network) { try { initial = JSON.parse(latest.network) } catch { initial = null } }

  // Manuel satış hədəfləri (/sales-dən girilən, sales_targets) → dövrün ayı üçün
  const period = (initial?.daily as { period?: string } | undefined)?.period ?? latest?.period ?? null
  const targets: Record<string, number> = {}
  if (period) {
    const rows = await db.select({ name: branches.name, amt: sales_targets.target_amount })
      .from(sales_targets)
      .innerJoin(branches, eq(sales_targets.branch_id, branches.id))
      .where(and(eq(sales_targets.tenant_id, tenantId), eq(sales_targets.month, `${period}-01`)))
    for (const r of rows) targets[r.name.trim()] = Number(r.amt)
  }

  return (
    <PanelClient
      initial={initial}
      targets={targets}
      canUpload={session.user.role === 'super_admin'}
      savedAt={latest?.gen ? new Date(latest.gen).toLocaleDateString('az') : null}
      periods={periods}
      selectedPeriod={latest?.period ?? null}
    />
  )
}
