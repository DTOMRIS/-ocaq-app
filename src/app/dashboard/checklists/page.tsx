import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { checklists } from '@/db/schema/checklists'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { getBakuBusinessDate } from '@/lib/checklist-validation'

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
    id: string; branchId: string | null; branchName: string | null; shift: string; score: number;
    completedBy: string; checkedBy: string; businessDate: string; createdAt: Date
  }> = []
  let scopeBranches: Array<{ id: string; code: string; name: string }> = []

  try {
    if (role === 'super_admin') {
      scopeBranches = await db.select({ id: branches.id, code: branches.code, name: branches.name }).from(branches)
        .where(and(eq(branches.tenant_id, session.user.tenant_id), eq(branches.is_active, true), eq(branches.is_archived, false)))
    } else if (role === 'region_manager') {
      scopeBranches = await db.select({ id: branches.id, code: branches.code, name: branches.name }).from(branches)
        .innerJoin(regions, eq(branches.region_id, regions.id))
        .where(and(eq(branches.tenant_id, session.user.tenant_id), eq(branches.is_active, true), eq(branches.is_archived, false), eq(regions.manager_id, session.user.id)))
    } else {
      scopeBranches = await db.select({ id: branches.id, code: branches.code, name: branches.name }).from(branches)
        .where(and(eq(branches.tenant_id, session.user.tenant_id), eq(branches.is_active, true), eq(branches.is_archived, false), eq(branches.manager_id, session.user.id)))
    }

    const branchIds = scopeBranches.map((branch) => branch.id)
    const conditions = [
      eq(checklists.tenant_id, session.user.tenant_id),
      inArray(checklists.branch_id, branchIds.length ? branchIds : ['00000000-0000-0000-0000-000000000000']),
    ]

    rows = await db
      .select({
        id: checklists.id,
        branchId: checklists.branch_id,
        branchName: branches.name,
        shift: checklists.shift,
        score: checklists.score_pct,
        completedBy: checklists.completed_by,
        checkedBy: checklists.checked_by,
        businessDate: checklists.business_date,
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
  const today = getBakuBusinessDate()
  const todayRows = rows.filter((row) => row.businessDate === today)
  const submittedKeys = new Set(todayRows.map((row) => `${row.branchId ?? ''}:${row.shift}`))
  const missing = scopeBranches.flatMap((branch) => ['sabah', 'axsam']
    .filter((shift) => !submittedKeys.has(`${branch.id}:${shift}`))
    .map((shift) => ({ ...branch, shift })))
  const expectedToday = scopeBranches.length * 2
  const avgScore = todayRows.length > 0 ? Math.round(todayRows.reduce((sum, row) => sum + row.score, 0) / todayRows.length) : 0
  const scoreColor = (s: number) => (s >= 90 ? '#166534' : s >= 70 ? '#b45309' : '#c0392b')

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
        {role === 'branch_manager' ? 'KXT Nəticələri' : 'KXT İzləmə'}
      </h1>
      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 24px' }}>
        {role === 'branch_manager' ? 'Filialınızın göndərdiyi vardiya checklist nəticələri' : 'Bu gün hansı filial və növbənin göndərib-göndərmədiyini izləyin'}
      </p>

      {/* Xülasə */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Əhatədə filial', value: String(scopeBranches.length), color: '#1a1a1a' },
          { label: 'Bu gün göndərilən', value: `${todayRows.length}/${expectedToday}`, color: missing.length === 0 ? '#166534' : '#b45309' },
          { label: 'Gözlənilən', value: String(missing.length), color: missing.length === 0 ? '#166534' : '#c0392b' },
          { label: 'Bu gün orta skor', value: todayRows.length ? `${avgScore}%` : '—', color: todayRows.length ? scoreColor(avgScore) : '#94a3b8' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', fontWeight: 500 }}>{k.label}</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {role !== 'branch_manager' && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-bold text-slate-900">Bu gün göndərməyən filial/növbələr</h2><p className="mt-1 text-xs text-slate-500">Bakı iş günü: {today}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${missing.length ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{missing.length ? `${missing.length} gözlənilir` : 'Hamısı tamamdır'}</span>
          </div>
          {missing.length > 0 && <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {missing.map((item) => <div key={`${item.id}-${item.shift}`} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm"><span className="font-medium text-slate-800">{item.code} · {item.name}</span><span className="text-xs font-bold text-red-700">{shiftLabel(item.shift)}</span></div>)}
          </div>}
        </div>
      )}

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
