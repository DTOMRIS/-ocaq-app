'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BulkInviteUpload from './BulkInviteUpload'

interface Invitation {
  id: string
  email: string
  role: string
  branch_id: string | null
  region_id: string | null
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
  replaces_manager_id: string | null
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

interface Region {
  id: string
  name: string
}

interface Props {
  invitations: unknown[]
  users: unknown[]
  branches: unknown[]
  regions: unknown[]
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

export default function TeamClient({ invitations: rawInv, users: rawUsers, branches: rawBranches, regions: rawRegions, isSuperAdmin, fetchError }: Props) {
  const router = useRouter()
  const invitations = rawInv as Invitation[]
  const users = rawUsers as User[]
  const branches = rawBranches as Branch[]
  const regions = rawRegions as Region[]

  const [showInvite, setShowInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('region_manager')
  const [invRegion, setInvRegion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // E-poçt getmədikdə əl ilə göndərilməli olan dəvət linki (WhatsApp fallback)
  const [manualLink, setManualLink] = useState<{ email: string; url: string; warning: string | null } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const pending = invitations.filter(i => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date())
  const expired = invitations.filter(i => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) <= new Date())
  const accepted = invitations.filter(i => !!i.accepted_at)
  const revoked = invitations.filter(i => !i.accepted_at && !!i.revoked_at)

  const branchName = (id: string | null) => {
    if (!id) return null
    const b = branches.find(br => br.id === id)
    return b ? `${b.code} ${b.name}` : null
  }

  const regionName = (id: string | null) => {
    if (!id) return null
    return regions.find(region => region.id === id)?.name ?? null
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!invEmail.trim()) { setError('E-poçt daxil edin'); return }
    if (invRole === 'region_manager' && !invRegion) { setError('Bölgə seçin'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invEmail.trim(),
          role: invRole,
          branch_id: null,
          region_id: invRole === 'region_manager' ? invRegion : null,
        }),
      })
      const d = await res.json().catch(() => ({})) as {
        error?: string; emailFailed?: boolean; acceptUrl?: string; warning?: string
      }
      if (!res.ok) {
        throw new Error(d.error ?? `Xəta: ${res.status}`)
      }

      // E-poçt getməyibsə dəvət yenə yaradılıb — linki göstər ki əl ilə göndərilsin.
      // Modal QAPANMIR və avtomatik refresh olmur: link kopyalanmadan itməməlidir.
      if (d.emailFailed && d.acceptUrl) {
        setManualLink({ email: invEmail.trim(), url: d.acceptUrl, warning: d.warning ?? null })
        setInvEmail('')
        setInvRegion('')
        router.refresh()
        return
      }

      setSuccess(`${invEmail} adresinə dəvət göndərildi!`)
      setInvEmail('')
      setInvRegion('')
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
      const res = await fetch(`/api/invitations/${inv.id}`, { method: 'PATCH' })
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

  async function handleCancel(inv: Invitation) {
    if (!confirm(`${inv.email} üçün dəvət ləğv edilsin?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invitations/${inv.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error ?? 'Xəta baş verdi')
      } else {
        alert('Dəvət ləğv edildi')
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
    if (inv.revoked_at) return (
      <span title={inv.revoked_reason ?? undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: '#fef2f2', color: '#C8102E' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C8102E' }} />
        Ləğv edilib
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
        {isSuperAdmin && (
          <button type="button" onClick={() => { setShowInvite(true); setError(null); setSuccess(null) }} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', background: '#C8102E', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '44px',
          }}>
            + Bölgə meneceri dəvət et
          </button>
        )}
      </div>

      {fetchError && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#C8102E' }}>
          {fetchError}
        </div>
      )}

      {isSuperAdmin && <BulkInviteUpload />}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Aktiv istifadəçi', value: users.length, color: '#059669' },
          { label: 'Gözləyən dəvət', value: pending.length, color: '#d97706' },
          { label: 'Qəbul edilən', value: accepted.length, color: '#2563EB' },
          { label: 'Müddəti bitən', value: expired.length, color: '#888' },
          { label: 'Ləğv edilən', value: revoked.length, color: '#C8102E' },
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
                  {['E-poçt', 'Rol', 'Əhatə', 'Status', 'Tarix', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < invitations.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{inv.email}</td>
                    <td style={{ padding: '12px 16px' }}><RoleBadge role={inv.role} /></td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{branchName(inv.branch_id) ?? regionName(inv.region_id) ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge inv={inv} /></td>
                    <td style={{ padding: '12px 16px', color: '#888', whiteSpace: 'nowrap' }}>
                      {new Date(inv.created_at).toLocaleDateString('az-AZ')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {!inv.accepted_at && !inv.revoked_at && (
                        <div style={{ display: 'flex', gap: '6px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => handleResend(inv)} disabled={loading} style={{
                            padding: '5px 12px', fontSize: '11px', border: '1px solid #e0e0e0',
                            borderRadius: '6px', background: '#fff', color: '#555', cursor: 'pointer',
                          }}>
                            Yenidən göndər
                          </button>
                          <button onClick={() => handleCancel(inv)} disabled={loading} style={{
                            padding: '5px 12px', fontSize: '11px', border: '1px solid #fecaca',
                            borderRadius: '6px', background: '#fff', color: '#C8102E', cursor: 'pointer',
                          }}>
                            Ləğv et
                          </button>
                        </div>
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
                <select value={invRole} onChange={e => {
                  setInvRole(e.target.value)
                  setInvRegion('')
                }} disabled={loading} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="region_manager">Bölgə Meneceri</option>
                </select>
              </div>
              {isSuperAdmin && (
                <div style={{
                  padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: '7px', marginBottom: '16px', fontSize: '12px', color: '#1d4ed8',
                }}>
                  Filial müdiri dəyişiklikləri təhlükəsizlik üçün Komanda ekranından deyil, Filiallar ekranında müvafiq filialın “⋯” menyusundan edilir.
                </div>
              )}
              {invRole === 'region_manager' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                    Bölgə <span style={{ color: '#C8102E' }}>*</span>
                  </label>
                  <select value={invRegion} onChange={e => setInvRegion(e.target.value)} disabled={loading} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Bölgə seçin</option>
                    {regions.map(region => (
                      <option key={region.id} value={region.id}>{region.name}</option>
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

              {/* E-poçt getməyəndə: dəvət YARADILDI, link əl ilə göndərilir (WhatsApp) */}
              {manualLink && (
                <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '7px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
                    ⚠️ Dəvət yaradıldı, amma e-poçt göndərilmədi
                  </p>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#78350f', lineHeight: '1.5' }}>
                    <b>{manualLink.email}</b> üçün link aşağıdadır — WhatsApp və ya digər yolla göndərin.
                    Link <b>48 saat</b> etibarlıdır.
                  </p>
                  <textarea
                    readOnly
                    value={manualLink.url}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      width: '100%', minHeight: '64px', padding: '8px 10px', fontSize: '16px',
                      border: '1px solid #fcd34d', borderRadius: '6px', background: '#fff',
                      fontFamily: 'monospace', wordBreak: 'break-all', resize: 'vertical', color: '#1f2937',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(manualLink.url)
                          .then(() => setLinkCopied(true))
                          .catch(() => setLinkCopied(false))
                      }}
                      style={{
                        padding: '9px 16px', fontSize: '13px', fontWeight: '600', border: 'none',
                        borderRadius: '7px', background: '#92400e', color: '#fff', cursor: 'pointer', minHeight: '44px',
                      }}
                    >{linkCopied ? '✓ Kopyalandı' : 'Linki kopyala'}</button>
                    <button
                      type="button"
                      onClick={() => { setManualLink(null); setLinkCopied(false); setShowInvite(false) }}
                      style={{
                        padding: '9px 16px', fontSize: '13px', border: '1px solid #e0e0e0',
                        borderRadius: '7px', background: '#fff', color: '#555', cursor: 'pointer', minHeight: '44px',
                      }}
                    >Bağla</button>
                  </div>
                  {manualLink.warning && (
                    <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#a16207' }}>{manualLink.warning}</p>
                  )}
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
