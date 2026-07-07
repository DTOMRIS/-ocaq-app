'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Invitation {
  id: string
  email: string
  role: string
  branch_id: string | null
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
}

interface Branch {
  id: string
  code: string
  name: string
}

interface Props {
  invitations: unknown[]
  users: unknown[]
  branches: unknown[]
  isSuperAdmin: boolean
  fetchError: string | null
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Süper Admin',
  region_manager: 'Bölgə Meneceri',
  branch_manager: 'Filial Meneceri',
  staff: 'Əməkdaş',
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: '#fef2f2', text: '#C8102E' },
  region_manager: { bg: '#f5f3ff', text: '#7C3AED' },
  branch_manager: { bg: '#eff6ff', text: '#2563EB' },
  staff: { bg: '#ecfdf5', text: '#059669' },
}

export default function TeamClient({ invitations: rawInv, users: rawUsers, branches: rawBranches, isSuperAdmin, fetchError }: Props) {
  const router = useRouter()
  const invitations = rawInv as Invitation[]
  const users = rawUsers as User[]
  const branches = rawBranches as Branch[]

  const [showInvite, setShowInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('branch_manager')
  const [invBranch, setInvBranch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const pending = invitations.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date())
  const expired = invitations.filter(i => !i.accepted_at && new Date(i.expires_at) <= new Date())
  const accepted = invitations.filter(i => !!i.accepted_at)

  const branchName = (id: string | null) => {
    if (!id) return null
    const b = branches.find(br => br.id === id)
    return b ? `${b.code} ${b.name}` : null
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!invEmail.trim()) { setError('E-poçt daxil edin'); return }
    if (invRole === 'branch_manager' && !invBranch) { setError('Filial seçin'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invEmail.trim(),
          role: invRole,
          branch_id: invRole === 'branch_manager' ? invBranch : null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Xəta: ${res.status}`)
      }
      setSuccess(`${invEmail} adresinə dəvət göndərildi!`)
      setInvEmail('')
      setInvBranch('')
      setTimeout(() => { setShowInvite(false); setSuccess(null); router.refresh() }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend(inv: Invitation) {
    if (!confirm(`${inv.email} adresinə yenidən dəvət göndərilsin?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inv.email,
          role: inv.role,
          branch_id: inv.branch_id,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error ?? 'Xəta baş verdi')
      } else {
        alert('Yenidən göndərildi!')
        router.refresh()
      }
    } catch {
      alert('Xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0',
    borderRadius: '7px', fontSize: '13px', color: '#1a1a1a',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
  }

  function RoleBadge({ role }: { role: string }) {
    const c = ROLE_COLORS[role] ?? { bg: '#f5f5f5', text: '#888' }
    return (
      <span style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
        fontSize: '11px', fontWeight: '600', background: c.bg, color: c.text,
      }}>
        {ROLE_LABELS[role] ?? role}
      </span>
    )
  }

  function StatusBadge({ inv }: { inv: Invitation }) {
    if (inv.accepted_at) return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: '#ecfdf5', color: '#059669' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
        Qəbul edilib
      </span>
    )
    if (new Date(inv.expires_at) <= new Date()) return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: '#f5f5f5', color: '#888' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#bbb' }} />
        Müddəti bitib
      </span>
    )
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: '#fffbeb', color: '#d97706' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
        Gözləyir
      </span>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>Komanda</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            İstifadəçilər və dəvətlər — {users.length} aktiv, {pending.length} gözləyir
          </p>
        </div>
        <button type="button" onClick={() => { setShowInvite(true); setError(null); setSuccess(null) }} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '9px 18px', background: '#C8102E', color: '#fff', border: 'none',
          borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '44px',
        }}>
          + Dəvət göndər
        </button>
      </div>

      {fetchError && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#C8102E' }}>
          {fetchError}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Aktiv istifadəçi', value: users.length, color: '#059669' },
          { label: 'Gözləyən dəvət', value: pending.length, color: '#d97706' },
          { label: 'Qəbul edilən', value: accepted.length, color: '#2563EB' },
          { label: 'Müddəti bitən', value: expired.length, color: '#888' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: '16px 20px' }}>
            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Aktiv istifadəçilər */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Aktiv istifadəçilər</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                {['Ad', 'E-poçt', 'Rol'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{u.name ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: '#ccc' }}>İstifadəçi yoxdur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dəvətlər */}
      <div style={cardStyle}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Dəvətlər</h3>
        </div>
        {invitations.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#ccc', margin: 0 }}>Hələ dəvət göndərilməyib</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                  {['E-poçt', 'Rol', 'Filial', 'Status', 'Tarix', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < invitations.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{inv.email}</td>
                    <td style={{ padding: '12px 16px' }}><RoleBadge role={inv.role} /></td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{branchName(inv.branch_id) ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge inv={inv} /></td>
                    <td style={{ padding: '12px 16px', color: '#888', whiteSpace: 'nowrap' }}>
                      {new Date(inv.created_at).toLocaleDateString('az-AZ')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {!inv.accepted_at && (
                        <button onClick={() => handleResend(inv)} disabled={loading} style={{
                          padding: '5px 12px', fontSize: '11px', border: '1px solid #e0e0e0',
                          borderRadius: '6px', background: '#fff', color: '#555', cursor: 'pointer',
                        }}>
                          Yenidən göndər
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dəvət Modal */}
      {showInvite && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowInvite(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,22,20,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 3px' }}>Dəvət göndər</h2>
                <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>E-poçtuna dəvət linki göndəriləcək</p>
              </div>
              <button type="button" onClick={() => setShowInvite(false)} style={{
                width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                background: '#f5f5f5', cursor: 'pointer', fontSize: '16px', color: '#888',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #C8102E 0%, #F2A81D 100%)' }} />
            <form onSubmit={handleInvite} style={{ padding: '20px 24px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                  E-poçt <span style={{ color: '#C8102E' }}>*</span>
                </label>
                <input
                  type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)}
                  placeholder="ad.soyad@shaurma.az" disabled={loading} style={inputStyle} autoFocus
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                  Rol <span style={{ color: '#C8102E' }}>*</span>
                </label>
                <select value={invRole} onChange={e => setInvRole(e.target.value)} disabled={loading} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="branch_manager">Filial Meneceri</option>
                  <option value="staff">Əməkdaş</option>
                  {isSuperAdmin && <option value="region_manager">Bölgə Meneceri</option>}
                </select>
              </div>
              {invRole === 'branch_manager' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                    Filial <span style={{ color: '#C8102E' }}>*</span>
                  </label>
                  <select value={invBranch} onChange={e => setInvBranch(e.target.value)} disabled={loading} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Filial seçin</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{
                padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '7px', marginBottom: '16px', fontSize: '12px', color: '#92400e',
              }}>
                Dəvət linki 48 saat etibarlıdır. İstifadəçi linkə tıklayıb adını və şifrəsini qoyacaq.
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', marginBottom: '16px', fontSize: '13px', color: '#C8102E' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '7px', marginBottom: '16px', fontSize: '13px', color: '#059669' }}>
                  {success}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowInvite(false)} disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', border: '1px solid #e0e0e0', borderRadius: '7px',
                  background: '#fff', color: '#555', cursor: loading ? 'not-allowed' : 'pointer', minHeight: '44px',
                }}>Ləğv et</button>
                <button type="submit" disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '7px',
                  background: loading ? '#e0a0aa' : '#C8102E', color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer', minHeight: '44px',
                }}>{loading ? 'Göndərilir...' : 'Dəvət göndər'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
