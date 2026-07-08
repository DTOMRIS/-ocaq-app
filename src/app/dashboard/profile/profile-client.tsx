'use client'

import { useState } from 'react'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Süper Admin',
  region_manager: 'Bölgə Meneceri',
  branch_manager: 'Filial Meneceri',
  staff: 'Əməkdaş',
}

interface Props {
  name: string
  email: string
  role: string
}

export default function ProfileClient({ name, email, role }: Props) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!currentPw) { setError('Mövcud şifrəni daxil edin'); return }
    if (newPw.length < 8) { setError('Yeni şifrə minimum 8 simvol olmalıdır'); return }
    if (newPw !== confirmPw) { setError('Şifrələr uyğun gəlmir'); return }
    if (currentPw === newPw) { setError('Yeni şifrə köhnə ilə eyni ola bilməz'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Xəta: ${res.status}`)
      }
      setSuccess('Şifrə uğurla dəyişdirildi!')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xəta baş verdi')
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

  return (
    <div style={{ maxWidth: '560px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 24px' }}>Profil</h1>

      {/* Info kartı */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: '#1A1614',
              color: '#F2A81D', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: '700',
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 2px' }}>{name}</p>
              <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
              background: role === 'super_admin' ? '#fef2f2' : role === 'region_manager' ? '#f5f3ff' : '#eff6ff',
              color: role === 'super_admin' ? '#C8102E' : role === 'region_manager' ? '#7C3AED' : '#2563EB',
            }}>
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
        </div>
      </div>

      {/* Şifrə dəyişmə */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Şifrə dəyişdir</h3>
        </div>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #C8102E 0%, #F2A81D 100%)' }} />
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
              Mövcud şifrə <span style={{ color: '#C8102E' }}>*</span>
            </label>
            <input
              type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              placeholder="Hazırkı şifrəniz" disabled={loading} style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
              Yeni şifrə <span style={{ color: '#C8102E' }}>*</span>
            </label>
            <input
              type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Minimum 8 simvol" disabled={loading} style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
              Yeni şifrə (təkrar) <span style={{ color: '#C8102E' }}>*</span>
            </label>
            <input
              type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Eyni şifrəni yenidən daxil edin" disabled={loading} style={inputStyle}
            />
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

          <button type="submit" disabled={loading} style={{
            padding: '9px 24px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '7px',
            background: loading ? '#e0a0aa' : '#C8102E', color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer', minHeight: '44px',
          }}>
            {loading ? 'Yenilənir...' : 'Şifrəni dəyişdir'}
          </button>
        </form>
      </div>
    </div>
  )
}
