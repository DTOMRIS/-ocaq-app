import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { desc, eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { analytics_ingest } from '@/db/schema/analytics'
import PanelClient from './panel-client'

export const metadata = { title: 'Günlük Panel — OCAQ' }
export const dynamic = 'force-dynamic'

export default async function PanelPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(session.user.role)) redirect('/dashboard')

  // Son yadda saxlanmış panel verisini oxu (təkrar yükləmə lazım deyil)
  const [latest] = await db.select({ network: analytics_ingest.network, gen: analytics_ingest.generated_at })
    .from(analytics_ingest)
    .where(and(eq(analytics_ingest.tenant_id, session.user.tenant_id), eq(analytics_ingest.engine_version, 'panel-1.0')))
    .orderBy(desc(analytics_ingest.created_at)).limit(1)

  let initial: { daily: unknown; plan: unknown } | null = null
  if (latest?.network) { try { initial = JSON.parse(latest.network) } catch { initial = null } }

  return <PanelClient initial={initial} canUpload={session.user.role === 'super_admin'} savedAt={latest?.gen ? new Date(latest.gen).toLocaleDateString('az') : null} />
}
