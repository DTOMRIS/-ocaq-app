'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Region {
  id: string
  name: string
  manager_id: string | null
  manager_name: string | null
  is_active: boolean
}

interface Manager {
  id: string
  name: string | null
  email: string
}

interface Branch {
  id: string
  code: string
  name: string
  region_id: string | null
}

interface Props {
  regions: unknown[]
  managers: Manager[]
  branches: Branch[]
  isSuperAdmin: boolean
  fetchError: string | null
}

export default function RegionsClient({ regions: rawRegions, managers, branches, isSuperAdmin, fetchError }: Props) {
  const router = useRouter()
  const regions = rawRegions as Region[]
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formManager, setFormManager] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function branchesInRegion(regionId: string) {
    return branches.filter(b => b.region_id === regionId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formName.trim()) { setError('Bölgə adı tələb olunur'); return }

    setLoading(true)
    try {
      const isEdit = !!editId
      const res = await fetch('/api/regions', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editId } : {}),
          name: formName.trim(),
          manager_id: formManager || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Xəta: ${res.status}`)
      }
      setShowForm(false)
      setEditId(null)
      setFormName('')
      setFormManager('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(r: Region) {
    setEditId(r.id)
    setFormName(r.name)
    setFormManager(r.manager_id ?? '')
    setShowForm(true)
  }

  function startNew() {
    setEditId(null)
    setFormName('')
    setFormManager('')
    setShowForm(true)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0',
    borderRadius: '7px', fontSize: '13px', color: '#1a1a1a',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div>
      {/* Başlıq */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Bölgələr</h1>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '24px', height: '24px', padding: '0 8px', borderRadius: '12px',
            background: '#1A1614', color: '#F2A81D', fontSize: '12px', fontWeight: '700',
          }}>
            {regions.length}
          </span>
        </div>
        {isSuperAdmin && (
          <button type="button" onClick={startNew} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', background: '#C8102E', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '44px',
          }}>
            <span style={{ fontSize: '17px', lineHeight: 1 }}>+</span>
            Yeni bölgə
          </button>
        )}
      </div>

      {fetchError && (
        <div style={{
          padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#C8102E',
        }}>
          {fetchError}
        </div>
      )}

      {/* Bölgə kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {regions.map(r => {
          const rBranches = branchesInRegion(r.id)
          return (
            <div key={r.id} style={{
              background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>{r.name}</h3>
                  <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                    {r.manager_name ? `Müdür: ${r.manager_name}` : 'Müdür təyin edilməyib'}
                  </p>
                </div>
                {(isSuperAdmin || true) && (
                  <button onClick={() => startEdit(r)} style={{
                    padding: '6px 12px', fontSize: '12px', border: '1px solid #e0e0e0',
                    borderRadius: '6px', background: '#fff', color: '#555', cursor: 'pointer',
                  }}>
                    Düzəlt
                  </button>
                )}
              </div>

              {/* Qızılı xətt */}
              <div style={{ height: '2px', background: 'linear-gradient(90deg, #7C3AED 0%, #C8102E 100%)' }} />

              {/* Filiallar */}
              <div style={{ padding: '12px 20px 16px' }}>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
                  Filiallar ({rBranches.length})
                </p>
                {rBranches.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#ccc', margin: 0 }}>Bu bölgəyə filial təyin edilməyib</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {rBranches.map(b => (
                      <span key={b.id} style={{
                        display: 'inline-block', padding: '3px 9px', borderRadius: '6px',
                        background: '#1A1614', color: '#F2A81D', fontSize: '11px', fontWeight: '600',
                      }}>
                        {b.code} {b.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {regions.length === 0 && !fetchError && (
          <div style={{ gridColumn: '1 / -1', padding: '60px 24px', textAlign: 'center', background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 6px' }}>Hələ bölgə yaradılmayıb</p>
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
              {isSuperAdmin ? 'Yuxarıdakı "Yeni bölgə" düyməsindən başlayın' : 'Administrator bölgə yaratmayıb'}
            </p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditId(null) } }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,22,20,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
                {editId ? 'Bölgəni düzəlt' : 'Yeni bölgə'}
              </h2>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} style={{
                width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                background: '#f5f5f5', cursor: 'pointer', fontSize: '16px', color: '#888',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #C8102E 0%, #F2A81D 100%)' }} />
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                  Bölgə adı <span style={{ color: '#C8102E' }}>*</span>
                </label>
                <input
                  type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="Bakı Mərkəz, Abşeron..." maxLength={80} disabled={loading}
                  style={inputStyle} autoFocus
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '5px' }}>
                  Bölgə müdürü
                </label>
                <select
                  value={formManager} onChange={e => setFormManager(e.target.value)}
                  disabled={loading} style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Seçin (istəyə bağlı)</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '7px', marginBottom: '16px', fontSize: '13px', color: '#C8102E',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', border: '1px solid #e0e0e0', borderRadius: '7px',
                  background: '#fff', color: '#555', cursor: loading ? 'not-allowed' : 'pointer',
                  minWidth: '88px', minHeight: '44px', opacity: loading ? 0.6 : 1,
                }}>
                  Ləğv et
                </button>
                <button type="submit" disabled={loading} style={{
                  padding: '9px 20px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '7px',
                  background: loading ? '#e0a0aa' : '#C8102E', color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer', minWidth: '120px', minHeight: '44px',
                }}>
                  {loading ? 'Saxlanılır...' : (editId ? 'Yenilə' : 'Bölgə yarat')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
