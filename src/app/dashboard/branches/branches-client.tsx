'use client'

import { useState } from 'react'
import BranchForm from '@/components/branch-form'

interface Branch {
  id: string
  tenant_id: string
  region_id: string | null
  code: string
  name: string
  city: string
  address: string | null
  phone: string | null
  manager_id: string | null
  iiko_org_id: string | null
  open_time: string | null
  close_time: string | null
  is_active: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface Region {
  id: string
  name: string
}

interface BranchesClientProps {
  branches: Branch[]
  regions?: Region[]
  isSuperAdmin: boolean
  fetchError: string | null
}

function formatWorkHours(open: string | null, close: string | null): string {
  if (!open && !close) return '—'
  if (open && close) return `${open} – ${close}`
  if (open) return `${open} –`
  return `– ${close}`
}

export default function BranchesClient({
  branches,
  regions = [],
  isSuperAdmin,
  fetchError,
}: BranchesClientProps) {
  // Bölgə adını tap
  const regionName = (b: Branch) => {
    if (!b.region_id) return null
    return regions.find(r => r.id === b.region_id)?.name ?? null
  }
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {/* Başlıq sətri */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1a1a1a',
            margin: 0,
          }}>
            Filiallar
          </h1>
          {/* Sayı badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '24px',
            height: '24px',
            padding: '0 8px',
            borderRadius: '12px',
            background: '#1A1614',
            color: '#F2A81D',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '0.3px',
          }}>
            {branches.length}
          </span>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              background: '#C8102E',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            <span style={{ fontSize: '17px', lineHeight: 1 }}>+</span>
            Yeni filial
          </button>
        )}
      </div>

      {/* Fetch xətası */}
      {fetchError && (
        <div style={{
          padding: '14px 18px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#C8102E',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>!</span>
          {fetchError}
        </div>
      )}

      {/* Kart — cədvəl */}
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        border: '0.5px solid #e8e8e8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {branches.length === 0 ? (
          /* Boş vəziyyət */
          <div style={{
            padding: '60px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px',
            }}>
              ⊞
            </div>
            <p style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 6px',
            }}>
              Hələ filial əlavə edilməyib
            </p>
            <p style={{
              fontSize: '13px',
              color: '#999',
              margin: 0,
            }}>
              {isSuperAdmin
                ? 'Yuxarıdakı "Yeni filial" düyməsindən başlayın'
                : 'Administrator filial əlavə etməyib'}
            </p>
          </div>
        ) : (
          /* Cədvəl */
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fafafa',
                }}>
                  {['Kod', 'Ad', 'Bölgə', 'Şəhər', 'Telefon', 'İş saatı', 'Status'].map((col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: '11px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        whiteSpace: 'nowrap',
                        // Son sütunu sağa hizala
                        ...(i === 6 ? { textAlign: 'right' as const } : {}),
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.map((branch, idx) => (
                  <tr
                    key={branch.id}
                    style={{
                      borderBottom: idx < branches.length - 1 ? '1px solid #f5f5f5' : 'none',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    {/* Kod */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: '#1A1614',
                        color: '#F2A81D',
                        fontSize: '12px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                      }}>
                        {branch.code}
                      </span>
                    </td>

                    {/* Ad */}
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontWeight: '500', color: '#1a1a1a' }}>
                        {branch.name}
                      </span>
                    </td>

                    {/* Bölgə */}
                    <td style={{ padding: '13px 16px' }}>
                      {regionName(branch) ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: '#f0eeff',
                          color: '#7C3AED',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}>
                          {regionName(branch)}
                        </span>
                      ) : (
                        <span style={{ color: '#ccc' }}>—</span>
                      )}
                    </td>

                    {/* Şəhər */}
                    <td style={{ padding: '13px 16px', color: '#555' }}>
                      {branch.city}
                    </td>

                    {/* Telefon */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      {branch.phone ? (
                        <a
                          href={`tel:${branch.phone}`}
                          style={{ color: '#555', textDecoration: 'none' }}
                        >
                          {branch.phone}
                        </a>
                      ) : (
                        <span style={{ color: '#ccc' }}>—</span>
                      )}
                    </td>

                    {/* İş saatı */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', color: '#555' }}>
                      {formatWorkHours(branch.open_time, branch.close_time)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      {branch.is_active ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: '#ecfdf5',
                          color: '#059669',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: '1px solid #a7f3d0',
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#059669',
                            flexShrink: 0,
                          }} />
                          Aktiv
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: '#f5f5f5',
                          color: '#888',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: '1px solid #e0e0e0',
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#bbb',
                            flexShrink: 0,
                          }} />
                          Deaktiv
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer — cədvəl məlumatı */}
      {branches.length > 0 && (
        <p style={{
          fontSize: '12px',
          color: '#bbb',
          margin: '12px 0 0',
          textAlign: 'right',
        }}>
          {branches.length} filial · arxivlənənlər göstərilmir
        </p>
      )}

      {/* Modal */}
      {showForm && (
        <BranchForm onClose={() => setShowForm(false)} regions={regions} />
      )}
    </div>
  )
}
