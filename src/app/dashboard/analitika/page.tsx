import type { CSSProperties } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { analytics_ingest, analytics_branch } from '@/db/schema/analytics'
import { accessibleBranchIds } from '@/lib/branch-access'
import { and, eq, desc, inArray } from 'drizzle-orm'

export const metadata = { title: 'Analitika — OCAQ' }
export const dynamic = 'force-dynamic'

const money = (n?: number | null) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼')
const pct = (x?: number | null) => (x == null ? '—' : (x * 100 >= 0 ? '+' : '') + (x * 100).toFixed(0) + '%')

type M = {
  ciro?: number; gidisatFark?: number; yoy?: number; reyting?: number
  deliveryPayi?: number; deliveryYoy?: number; silinmePct?: number
  laborPct?: number; fazlaKadroV2?: number; composite?: number
}

function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: '-.3px' }}>{v}</div>
      {sub ? <div style={{ fontSize: 11, color: '#8b8378', marginTop: 2 }}>{sub}</div> : null}
    </div>
  )
}

export default async function AnalitikaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(role)) redirect('/dashboard')

  const [latest] = await db.select().from(analytics_ingest)
    .where(eq(analytics_ingest.tenant_id, session.user.tenant_id))
    .orderBy(desc(analytics_ingest.created_at)).limit(1)

  if (!latest) {
    return (
      <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 22 }}>📊 Analitika</h1>
        <p style={{ color: '#8b8378' }}>Hələ analitik məlumat yüklənməyib. Analiz motoru ilk göndərişi edəndə burada görünəcək.</p>
      </main>
    )
  }

  const network = latest.network ? JSON.parse(latest.network) : {}
  const showNetwork = role !== 'branch_manager'

  let rows
  if (role === 'super_admin') {
    rows = await db.select().from(analytics_branch).where(eq(analytics_branch.ingest_id, latest.id))
  } else {
    const ids = await accessibleBranchIds(session.user)
    rows = ids.length
      ? await db.select().from(analytics_branch)
          .where(and(eq(analytics_branch.ingest_id, latest.id), inArray(analytics_branch.branch_id, ids)))
      : []
  }

  const data = rows
    .map(r => ({ id: r.id, filial: r.filial, bolge: r.bolge, m: (r.metrics ? JSON.parse(r.metrics) : {}) as M }))
    .sort((a, b) => (a.m.gidisatFark ?? a.m.yoy ?? 0) - (b.m.gidisatFark ?? b.m.yoy ?? 0))

  const th: CSSProperties = { textAlign: 'left', padding: '9px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.3px', color: '#8b8378', borderBottom: '1px solid #e6e1d7' }
  const td: CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }
  const num: CSSProperties = { ...td, textAlign: 'right' }

  return (
    <main style={{ padding: '24px 26px 60px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>📊 Analitika</h1>
        <span style={{ color: '#8b8378', fontSize: 13 }}>Dövr {latest.period} · analiz motorundan (iiko) · {data.length} filial</span>
      </div>

      {showNetwork && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '18px 0 22px' }}>
          <Tile k="Şəbəkə ciro" v={money(network.ciro)} sub="aylıq" />
          <Tile k="Gidişat fərqi" v={pct(network.gidisatFark ?? network.yoy)} sub="2026 vs 2025" />
          <Tile k="Delivery YoY" v={pct(network.deliveryYoy)} sub="Wolt+Bolt" />
          <Tile k="Proqnoz" v={money(network.forecast?.deger)} sub="bu ay" />
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Filial</th><th style={th}>Bölgə</th>
              <th style={{ ...th, textAlign: 'right' }}>Ciro</th>
              <th style={{ ...th, textAlign: 'right' }}>Gidişat</th>
              <th style={{ ...th, textAlign: 'right' }}>Reyting</th>
              <th style={{ ...th, textAlign: 'right' }}>Delivery</th>
              <th style={{ ...th, textAlign: 'right' }}>Silinmə</th>
              <th style={{ ...th, textAlign: 'right' }}>Labor%</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => (
              <tr key={b.id}>
                <td style={{ ...td, fontWeight: 600 }}>{b.filial}</td>
                <td style={{ ...td, color: '#8b8378' }}>{b.bolge ?? '—'}</td>
                <td style={num}>{money(b.m.ciro)}</td>
                <td style={{ ...num, color: (b.m.gidisatFark ?? b.m.yoy ?? 0) < 0 ? '#c8102e' : '#1c7a4e', fontWeight: 700 }}>{pct(b.m.gidisatFark ?? b.m.yoy)}</td>
                <td style={num}>{b.m.reyting ?? '—'}</td>
                <td style={num}>{b.m.deliveryPayi != null ? Math.round(b.m.deliveryPayi * 100) + '%' : '—'}</td>
                <td style={num}>{b.m.silinmePct != null ? b.m.silinmePct.toFixed(2) + '%' : '—'}</td>
                <td style={num}>{b.m.laborPct != null ? Math.round(b.m.laborPct * 100) + '%' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: '#8b8378', fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>
        Mənbə: analiz motoru (iiko OLAP → ingest). {role === 'branch_manager' ? 'Yalnız öz filialınız göstərilir.' : role === 'region_manager' ? 'Öz bölgənizin filialları.' : 'Bütün şəbəkə.'} Gidişat mənfi = keçən ilə görə geriləmə.
      </p>
    </main>
  )
}
