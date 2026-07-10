import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { checklists } from '@/db/schema/checklists'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { eq, and, inArray, desc } from 'drizzle-orm'

export const metadata = { title: 'KXT Nəticələri — OCAQ' }

const shiftLabel = (s: string) => (s === 'sabah' ? '🌅 Sabah' : s === 'axsam' ? '🌙 Axşam' : s)

export default async function ChecklistsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (!['super_admin', 'region_manager', 'branch_manager'].includes(role)) {
    redirect('/dashboard')
  }

  // ─── Rol əhatəsinə görə göndərilmiş checklist-lər ───
  let rows: Array<{
    id: string; branchName: string | null; shift: string; score: number;
    completedBy: string; checkedBy: string; createdAt: Date
  }> = []

  try {
    const conditions = [eq(checklists.tenant_id, session.user.tenant_id)]

    if (role !== 'super_admin') {
      let branchIds: string[] = []
      if (role === 'region_manager') {
        const myRegions = await db.select({ id: regions.id }).from(regions)
          .where(and(eq(regions.tenant_id, session.user.tenant_id), eq(regions.manager_id, session.user.id)))
        if (myRegions.length > 0) {
          const regBranches = await db.select({ id: branches.id }).from(branches)
            .where(and(eq(branches.tenant_id, session.user.tenant_id), inArray(branches.region_id, myRegions.map(r => r.id))))
          branchIds = regBranches.map(b => b.id)
        }
      } else {
        const myBranches = await db.select({ id: branches.id }).from(branches)
          .where(and(eq(branches.tenant_id, session.user.tenant_id), eq(branches.manager_id, session.user.id)))
        branchIds = myBranches.map(b => b.id)
      }
      // əhatəsində filial yoxdursa heç nə göstərmə (imkansız ID ilə)
      conditions.push(inArray(checklists.branch_id, branchIds.length ? branchIds : ['00000000-0000-0000-0000-000000000000']))
    }

    rows = await db
      .select({
        id: checklists.id,
        branchName: branches.name,
        shift: checklists.shift,
        score: checklists.score_pct,
        completedBy: checklists.completed_by,
        checkedBy: checklists.checked_by,
        createdAt: checklists.created_at,
      })
      .from(checklists)
      .leftJoin(branches, eq(checklists.branch_id, branches.id))
      .where(and(...conditions))
      .orderBy(desc(checklists.created_at))
      .limit(200)
  } catch (err) {
    console.error('Checklists view query error:', err)
  }

  const count = rows.length
  const avgScore = count > 0 ? Math.round(rows.reduce((s, r) => s + r.score, 0) / count) : 0
  const scoreColor = (s: number) => (s >= 90 ? '#166534' : s >= 70 ? '#b45309' : '#c0392b')

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
        KXT Nəticələri
      </h1>
      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 24px' }}>
        Filialların göndərdiyi vardiya checklist nəticələri
      </p>

      {/* Xülasə */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Göndərilən checklist', value: String(count), color: '#1a1a1a' },
          { label: 'Ortalama skor', value: `${avgScore}%`, color: scoreColor(avgScore) },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', fontWeight: 500 }}>{k.label}</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Cədvəl */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {count === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>Hələ checklist göndərilməyib</p>
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Filial müdiri vardiya checklist-i doldurub göndərəndə burada görünəcək.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
              <thead>
                <tr style={{ background: '#f7f7f7', borderBottom: '1px solid #ececec' }}>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Filial</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Vardiya</th>
                  <th style={{ textAlign: 'right', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Skor</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Dolduran</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Yoxlayan</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Tarix</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid #f2f2f2' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a1a1a' }}>{r.branchName ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#555' }}>{shiftLabel(r.shift)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: scoreColor(r.score) }}>{r.score}%</td>
                    <td style={{ padding: '10px 16px', color: '#333' }}>{r.completedBy}</td>
                    <td style={{ padding: '10px 16px', color: '#333' }}>{r.checkedBy}</td>
                    <td style={{ padding: '10px 16px', color: '#777' }}>
                      {new Date(r.createdAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
