'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import BulkTargetUpload from './BulkTargetUpload'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Branch {
  id: string
  code: string
  name: string
  region_id: string | null
  manager_id: string | null
}

interface Target {
  id: string
  branch_id: string
  branch_name: string | null
  branch_code: string | null
  month: string
  target_amount: string
}

interface DailySale {
  id: string
  branch_id: string
  sale_date: string
  amount: string
  notes: string | null
}

interface Region {
  id: string
  name: string
  manager_id: string | null
}

interface Props {
  role: string
  userId: string
  branches: unknown[]
  targets: unknown[]
  dailySales: unknown[]
  regions: unknown[]
  monthStart: string
  monthEnd: string
  totalDays: number
  currentDay: number
  fetchError: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('az-AZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pct(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.round((current / target) * 100)
}

function statusColor(percent: number): { bg: string; text: string; bar: string } {
  if (percent >= 90) return { bg: '#ecfdf5', text: '#059669', bar: '#059669' }
  if (percent >= 70) return { bg: '#fffbeb', text: '#d97706', bar: '#d97706' }
  return { bg: '#fef2f2', text: '#C8102E', bar: '#C8102E' }
}

function statusIcon(percent: number): string {
  if (percent >= 90) return '✅'
  if (percent >= 70) return '⚠️'
  return '❌'
}

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

// ─── Component ──────────────────────────────────────────────────────────────
export default function SalesClient({
  role, userId, branches: rawBranches, targets: rawTargets, dailySales: rawDailySales,
  regions: rawRegions, monthStart, monthEnd, totalDays, currentDay, fetchError,
}: Props) {
  const router = useRouter()
  const branches = rawBranches as Branch[]
  const targets = rawTargets as Target[]
  const dailySales = rawDailySales as DailySale[]
  const regions = rawRegions as Region[]

  const now = new Date()
  const monthLabel = `${AZ_MONTHS[now.getMonth()]} ${now.getFullYear()}`
  const remainingDays = totalDays - currentDay

  // ── Branch-level calculations ──
  const branchStats = useMemo(() => {
    return branches.map(b => {
      const target = targets.find(t => t.branch_id === b.id)
      const sales = dailySales.filter(d => d.branch_id === b.id)
      const totalSales = sales.reduce((sum, s) => sum + Number(s.amount), 0)
      const targetAmount = target ? Number(target.target_amount) : 0
      const percent = pct(totalSales, targetAmount)
      const daysEntered = sales.length
      const dailyAvg = daysEntered > 0 ? totalSales / daysEntered : 0
      const projection = daysEntered > 0 ? dailyAvg * totalDays : 0
      const dailyNeeded = remainingDays > 0 ? (targetAmount - totalSales) / remainingDays : 0

      return {
        ...b,
        targetAmount,
        totalSales,
        percent,
        daysEntered,
        dailyAvg,
        projection,
        dailyNeeded: Math.max(0, dailyNeeded),
        sales,
        targetId: target?.id,
      }
    })
  }, [branches, targets, dailySales, totalDays, remainingDays])

  // ── State ──
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [showTargetForm, setShowTargetForm] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    if (role === 'branch_manager') {
      const mine = branchStats.filter(b => b.manager_id === userId)
      return mine.length > 0 ? mine[0].id : ''
    }
    return ''
  })
  const [entryDate, setEntryDate] = useState(now.toISOString().split('T')[0])
  const [entryAmount, setEntryAmount] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [targetBranch, setTargetBranch] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── My branches (for branch_manager) ──
  const myBranches = role === 'branch_manager'
    ? branchStats.filter(b => b.manager_id === userId)
    : branchStats

  // ── Region grouping (for region_manager) ──
  const myRegions = role === 'region_manager'
    ? regions.filter(r => r.manager_id === userId)
    : regions

  const regionBranches = (regionId: string) => branchStats.filter(b => b.region_id === regionId)

  // ── Submit daily sales ──
  async function handleEntrySubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedBranch) { setError('Filial seçin'); return }
    if (!entryAmount || Number(entryAmount) < 0) { setError('Məbləğ daxil edin'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/sales/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: selectedBranch,
          sale_date: entryDate,
          amount: Number(entryAmount),
          notes: entryNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Xəta: ${res.status}`)
      }
      setShowEntryForm(false)
      setEntryAmount('')
      setEntryNotes('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit target ──
  async function handleTargetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!targetBranch) { setError('Filial seçin'); return }
    if (!targetAmount || Number(targetAmount) <= 0) { setError('Hədəf məbləği daxil edin'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/sales/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: targetBranch,
          month: monthStart,
          target_amount: Number(targetAmount),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Xəta: ${res.status}`)
      }
      setShowTargetForm(false)
      setTargetAmount('')
      setTargetBranch('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  // ── Styles ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0',
    borderRadius: '7px', fontSize: '13px', color: '#1a1a1a',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
  }

  // ─── Branch Stat Card Component ───
  function BranchCard({ b }: { b: typeof branchStats[0] }) {
    const colors = statusColor(b.percent)
    return (
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{
              display: 'inline-block', padding: '3px 9px', borderRadius: '6px',
              background: '#1A1614', color: '#F2A81D', fontSize: '11px', fontWeight: '700',
              marginRight: '8px',
            }}>{b.code}</span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>{b.name}</span>
          </div>
          <span style={{
            padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
            background: colors.bg, color: colors.text,
          }}>
            {b.percent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ padding: '0 20px', marginBottom: '16px' }}>
          <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(b.percent, 100)}%`,
              background: colors.bar, borderRadius: '4px', transition: 'width 0.5s',
            }} />
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Aylıq hədəf</p>
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
              {b.targetAmount > 0 ? `${fmt(b.targetAmount)} ₼` : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Cari satış</p>
            <p style={{ fontSize: '16px', fontWeight: '700', color: colors.text, margin: 0 }}>
              {fmt(b.totalSales)} ₼
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Gündəlik lazım</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
              {remainingDays > 0 && b.targetAmount > 0 ? `${fmt(b.dailyNeeded)} ₼` : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Proqnoz</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: b.projection >= b.targetAmount ? '#059669' : '#C8102E', margin: 0 }}>
              {b.daysEntered > 0 ? `${fmt(b.projection)} ₼` : '—'}
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999',
        }}>
          <span>{b.daysEntered} gün daxil edilib</span>
          <span>Qalan: {remainingDays} gün</span>
        </div>
      </div>
    )
  }

  // ─── Recent Sales Table ───
  function RecentSales({ sales, limit = 7 }: { sales: DailySale[]; limit?: number }) {
    const sorted = [...sales].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).slice(0, limit)
    if (sorted.length === 0) return (
      <p style={{ fontSize: '13px', color: '#ccc', textAlign: 'center', padding: '20px' }}>
        Hələ satış daxil edilməyib
      </p>
    )

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
            {['Tarix', 'Məbləğ', 'Qeyd'].map(h => (
              <th key={h} style={{
                padding: '9px 16px', textAlign: 'left', fontSize: '11px',
                fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr key={s.id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <td style={{ padding: '10px 16px' }}>
                {new Date(s.sale_date).toLocaleDateString('az-AZ')}
              </td>
              <td style={{ padding: '10px 16px', fontWeight: '600' }}>
                {fmt(Number(s.amount))} ₼
              </td>
              <td style={{ padding: '10px 16px', color: '#888' }}>
                {s.notes ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
            Satış hədəfi
          </h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            {monthLabel} · {currentDay}/{totalDays} gün · {remainingDays} gün qalıb
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(role === 'branch_manager' || role === 'super_admin' || role === 'region_manager') && (
            <button type="button" onClick={() => { setShowEntryForm(true); setError(null) }} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', background: '#059669', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '44px',
            }}>
              + Satış daxil et
            </button>
          )}
          {(role === 'super_admin' || role === 'region_manager') && (
            <button type="button" onClick={() => { setShowTargetForm(true); setError(null) }} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', background: '#C8102E', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '44px',
            }}>
              + Hədəf qoy
            </button>
          )}
        </div>
      </div>

      {fetchError && (
        <div style={{
          padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#C8102E',
        }}>
          {fetchError}
        </div>
      )}

      {role === 'super_admin' && <BulkTargetUpload />}

      {/* ═══ BRANCH MANAGER VIEW ═══ */}
      {role === 'branch_manager' && (
        <div>
          {myBranches.length === 0 ? (
            <div style={{ ...cardStyle, padding: '60px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 6px' }}>
                Sizə təyin edilmiş filial yoxdur
              </p>
            </div>
          ) : (
            myBranches.map(b => (
              <div key={b.id}>
                <BranchCard b={b} />
                <div style={{ ...cardStyle, marginTop: '16px' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Son daxiletmələr</h3>
                  </div>
                  <RecentSales sales={b.sales} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ REGION MANAGER VIEW ═══ */}
      {role === 'region_manager' && (
        <div>
          {myRegions.map(region => {
            const rBranches = regionBranches(region.id)
            const totalTarget = rBranches.reduce((s, b) => s + b.targetAmount, 0)
            const totalSales = rBranches.reduce((s, b) => s + b.totalSales, 0)
            const totalPercent = pct(totalSales, totalTarget)
            const colors = statusColor(totalPercent)

            return (
              <div key={region.id} style={{ marginBottom: '32px' }}>
                {/* Region summary */}
                <div style={{ ...cardStyle, marginBottom: '16px' }}>
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>{region.name}</h2>
                      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{rBranches.length} filial</p>
                    </div>
                    <span style={{
                      padding: '6px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                      background: colors.bg, color: colors.text,
                    }}>
                      {totalPercent}%
                    </span>
                  </div>
                  <div style={{ height: '3px', background: 'linear-gradient(90deg, #7C3AED 0%, #C8102E 100%)' }} />
                  <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>CƏM hədəf</p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{fmt(totalTarget)} ₼</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>CƏM satış</p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>{fmt(totalSales)} ₼</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Fərq</p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: totalSales >= totalTarget ? '#059669' : '#C8102E', margin: 0 }}>
                        {totalSales >= totalTarget ? '+' : ''}{fmt(totalSales - totalTarget)} ₼
                      </p>
                    </div>
                  </div>
                </div>

                {/* Branch comparison table */}
                <div style={cardStyle}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                          {['Filial', 'Hədəf', 'Cari', '%', 'Gündəlik lazım', 'Proqnoz', ''].map(h => (
                            <th key={h} style={{
                              padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600',
                              color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rBranches.map((b, idx) => {
                          const c = statusColor(b.percent)
                          return (
                            <tr key={b.id} style={{ borderBottom: idx < rBranches.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 8px', borderRadius: '5px',
                                  background: '#1A1614', color: '#F2A81D', fontSize: '11px', fontWeight: '700',
                                  marginRight: '8px',
                                }}>{b.code}</span>
                                <span style={{ fontWeight: '500' }}>{b.name}</span>
                              </td>
                              <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                {b.targetAmount > 0 ? `${fmt(b.targetAmount)} ₼` : '—'}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                {fmt(b.totalSales)} ₼
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
                                  background: c.bg, color: c.text, fontSize: '12px', fontWeight: '600',
                                }}>{b.percent}%</span>
                              </td>
                              <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#555' }}>
                                {remainingDays > 0 && b.targetAmount > 0 ? `${fmt(b.dailyNeeded)} ₼` : '—'}
                              </td>
                              <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                {b.daysEntered > 0 ? (
                                  <span style={{ color: b.projection >= b.targetAmount ? '#059669' : '#C8102E' }}>
                                    {fmt(b.projection)} ₼
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                {statusIcon(b.percent)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {rBranches.length > 0 && (
                        <tfoot>
                          <tr style={{ background: '#fafafa', borderTop: '2px solid #e0e0e0' }}>
                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1a1a1a' }}>CƏM</td>
                            <td style={{ padding: '12px 16px', fontWeight: '700' }}>{fmt(totalTarget)} ₼</td>
                            <td style={{ padding: '12px 16px', fontWeight: '700' }}>{fmt(totalSales)} ₼</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
                                background: colors.bg, color: colors.text, fontSize: '12px', fontWeight: '700',
                              }}>{totalPercent}%</span>
                            </td>
                            <td colSpan={3} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Bölgəsiz filiallar */}
          {branchStats.filter(b => !b.region_id).length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#888', margin: '0 0 12px' }}>Bölgəsiz filiallar</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {branchStats.filter(b => !b.region_id).map(b => <BranchCard key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SUPER ADMIN VIEW ═══ */}
      {role === 'super_admin' && (
        <div>
          {/* Global özet */}
          {(() => {
            const totalTarget = branchStats.reduce((s, b) => s + b.targetAmount, 0)
            const totalSales = branchStats.reduce((s, b) => s + b.totalSales, 0)
            const globalPercent = pct(totalSales, totalTarget)
            const colors = statusColor(globalPercent)
            return (
              <div style={{ ...cardStyle, marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Ümumi nəticə</h2>
                  <span style={{
                    padding: '6px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                    background: colors.bg, color: colors.text,
                  }}>{globalPercent}%</span>
                </div>
                <div style={{ height: '3px', background: 'linear-gradient(90deg, #C8102E 0%, #F2A81D 100%)' }} />
                <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>CƏM hədəf</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{fmt(totalTarget)} ₼</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>CƏM satış</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>{fmt(totalSales)} ₼</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Filiallar</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{branches.length}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>Hədəfi olan</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
                      {branchStats.filter(b => b.targetAmount > 0).length}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Tüm filiallar tablosu */}
          <div style={cardStyle}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Filial bazında</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                    {['Filial', 'Bölgə', 'Hədəf', 'Cari', '%', 'Gündəlik lazım', 'Proqnoz', ''].map(h => (
                      <th key={h} style={{
                        padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600',
                        color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map((b, idx) => {
                    const c = statusColor(b.percent)
                    const regionObj = regions.find(r => r.id === b.region_id)
                    return (
                      <tr key={b.id} style={{ borderBottom: idx < branchStats.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 8px', borderRadius: '5px',
                            background: '#1A1614', color: '#F2A81D', fontSize: '11px', fontWeight: '700',
                            marginRight: '8px',
                          }}>{b.code}</span>
                          <span style={{ fontWeight: '500' }}>{b.name}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {regionObj ? (
                            <span style={{
                              display: 'inline-block', padding: '3px 9px', borderRadius: '6px',
                              background: '#f0eeff', color: '#7C3AED', fontSize: '12px', fontWeight: '500',
                            }}>{regionObj.name}</span>
                          ) : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {b.targetAmount > 0 ? `${fmt(b.targetAmount)} ₼` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {fmt(b.totalSales)} ₼
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
                            background: c.bg, color: c.text, fontSize: '12px', fontWeight: '600',
                          }}>{b.percent}%</span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#555' }}>
                          {remainingDays > 0 && b.targetAmount > 0 ? `${fmt(b.dailyNeeded)} ₼` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: '500' }}>
                          {b.daysEntered > 0 ? (
                            <span style={{ color: b.projection >= b.targetAmount ? '#059669' : '#C8102E' }}>
                              {fmt(b.projection)} ₼
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {b.targetAmount > 0 ? statusIcon(b.percent) : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

      {/* Satış daxiletmə modal */}
      {showEntryForm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowEntryForm(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,22,20,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Satış daxil et</h2>
              <button type="button" onClick={() => setShowEntryForm(false)} style={{
                width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                background: '#f5f5f5', cursor: 'pointer', fontSize: '16px', color: '#888',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #059669 0%, #F2A81D 100%)' }} />
            <form onSubmit={handleEntrySubmit} style={{ padding: '20px 24px 24px' }}>
              {role !== 'branch_manager' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                    Filial <span style={{ color: '#C8102E' }}>*</span>
                  </label>
                  <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} disabled={loading} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Filial seçin</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
                  </select>
                </div>
              )}
              {role === 'branch_manager' && myBranches.length > 0 && !selectedBranch && (
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
                  Filial: <strong>{myBranches[0].code} — {myBranches[0].name}</strong>
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                    Tarix <span style={{ color: '#C8102E' }}>*</span>
                  </label>
                  <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} disabled={loading} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                    Məbləğ (₼) <span style={{ color: '#C8102E' }}>*</span>
                  </label>
                  <input
                    type="number" value={entryAmount} onChange={e => setEntryAmount(e.target.value)}
                    placeholder="0" min="0" step="0.01" disabled={loading} style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>Qeyd</label>
                <input type="text" value={entryNotes} onChange={e => setEntryNotes(e.target.value)} placeholder="İstəyə bağlı..." maxLength={200} disabled={loading} style={inputStyle} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', marginBottom: '16px', fontSize: '13px', color: '#C8102E' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEntryForm(false)} disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', border: '1px solid #e0e0e0', borderRadius: '7px',
                  background: '#fff', color: '#555', cursor: loading ? 'not-allowed' : 'pointer', minHeight: '44px',
                }}>Ləğv et</button>
                <button type="submit" disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '7px',
                  background: loading ? '#86d9b0' : '#059669', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', minHeight: '44px',
                }}>{loading ? 'Saxlanılır...' : 'Daxil et'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hədəf qoyma modal */}
      {showTargetForm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowTargetForm(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,22,20,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Satış hədəfi qoy</h2>
              <button type="button" onClick={() => setShowTargetForm(false)} style={{
                width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                background: '#f5f5f5', cursor: 'pointer', fontSize: '16px', color: '#888',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #C8102E 0%, #F2A81D 100%)' }} />
            <form onSubmit={handleTargetSubmit} style={{ padding: '20px 24px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                  Filial <span style={{ color: '#C8102E' }}>*</span>
                </label>
                <select value={targetBranch} onChange={e => setTargetBranch(e.target.value)} disabled={loading} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Filial seçin</option>
                  {branches.map(b => {
                    const existing = branchStats.find(bs => bs.id === b.id)
                    return (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name} {existing && existing.targetAmount > 0 ? `(mövcud: ${fmt(existing.targetAmount)} ₼)` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                  Ay
                </label>
                <input type="text" value={monthStart} disabled style={{ ...inputStyle, background: '#f0f0f0', color: '#888' }} />
                <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>Cari ay avtomatik seçilir</p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                  Hədəf məbləğ (₼) <span style={{ color: '#C8102E' }}>*</span>
                </label>
                <input
                  type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
                  placeholder="50000" min="1" step="1" disabled={loading} style={inputStyle} autoFocus
                />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', marginBottom: '16px', fontSize: '13px', color: '#C8102E' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowTargetForm(false)} disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', border: '1px solid #e0e0e0', borderRadius: '7px',
                  background: '#fff', color: '#555', cursor: loading ? 'not-allowed' : 'pointer', minHeight: '44px',
                }}>Ləğv et</button>
                <button type="submit" disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '7px',
                  background: loading ? '#e0a0aa' : '#C8102E', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', minHeight: '44px',
                }}>{loading ? 'Saxlanılır...' : 'Hədəf qoy'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
