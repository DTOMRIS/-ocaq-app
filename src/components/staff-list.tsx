'use client'

import { useState, useCallback } from 'react'

interface Staff {
  id: string
  user_id: string
  employee_code: string | null
  position: string | null
  department: string | null
  status: 'active' | 'on_leave' | 'suspended' | 'terminated'
  branch_id: string | null
  avatar_url: string | null
  hire_date: string | null
  contract_type: 'full_time' | 'part_time' | 'casual' | 'intern'
  name: string | null
  email: string
  role: string
  is_active: boolean
}

interface Branch {
  id: string
  code: string
  name: string
}

interface StaffListProps {
  staff: Staff[]
  branches: Branch[]
  userRole: string
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  Staff['status'],
  { label: string; bg: string; color: string }
> = {
  active:     { label: 'Aktiv',        bg: '#DCFCE7', color: '#059669' },
  on_leave:   { label: 'İcazədə',      bg: '#FEF9C3', color: '#D97706' },
  suspended:  { label: 'Dayandırılıb', bg: '#FFEDD5', color: '#EA580C' },
  terminated: { label: 'Xitam',        bg: '#FEE2E2', color: '#C8102E' },
}

// ─── Contract type config ─────────────────────────────────────────────────────
const CONTRACT_CONFIG: Record<Staff['contract_type'], string> = {
  full_time: 'Tam',
  part_time: 'Yarım',
  casual:    'Müvəqqəti',
  intern:    'Stajyer',
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = (() => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  })()

  const circleStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  if (avatarUrl) {
    return (
      <div style={circleStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name ?? 'avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return (
    <div style={{
      ...circleStyle,
      background: '#C8102E',
      color: '#fff',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.5px',
    }}>
      {initials}
    </div>
  )
}

// ─── Format hire date ─────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StaffList({ staff, branches, userRole: _userRole }: StaffListProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>(staff)
  const [loading, setLoading] = useState<boolean>(false)

  // ─── Branch filter → server refetch ────────────────────────────────────────
  const handleBranchChange = useCallback(async (branchId: string) => {
    setSelectedBranchId(branchId)
    setSearchQuery('')
    setLoading(true)

    try {
      const url = branchId === 'all'
        ? '/api/staff'
        : `/api/staff?branch_id=${encodeURIComponent(branchId)}`

      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const data: Staff[] = await res.json()
      setFilteredStaff(data)
    } catch {
      // Fetch uğursuz olsa mövcud data qalır
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Client-side search ─────────────────────────────────────────────────────
  const displayedStaff = (() => {
    if (!searchQuery.trim()) return filteredStaff

    const q = searchQuery.toLowerCase().trim()
    return filteredStaff.filter((s) => {
      const nameMatch = s.name?.toLowerCase().includes(q) ?? false
      const emailMatch = s.email.toLowerCase().includes(q)
      const codeMatch = s.employee_code?.toLowerCase().includes(q) ?? false
      return nameMatch || emailMatch || codeMatch
    })
  })()

  // ─── Row click ──────────────────────────────────────────────────────────────
  function handleRowClick(_id: string) {
    alert('Profil səhifəsi tezliklə')
  }

  // ─── Branch name lookup ─────────────────────────────────────────────────────
  const branchMap = new Map<string, string>(
    branches.map((b) => [b.id, `${b.code} — ${b.name}`])
  )

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '16px',
        alignItems: 'center',
      }}>
        {/* Axtarış */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#aaa',
            fontSize: '13px',
            pointerEvents: 'none',
          }}>
            ⌕
          </span>
          <input
            type="text"
            placeholder="Ad, e-poçt və ya P-kod axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 30px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              fontSize: '13px',
              color: '#1a1a1a',
              background: '#fff',
              outline: 'none',
              minHeight: '44px',
            }}
          />
        </div>

        {/* Filial filter */}
        <select
          value={selectedBranchId}
          onChange={(e) => void handleBranchChange(e.target.value)}
          disabled={loading}
          style={{
            padding: '9px 32px 9px 12px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            fontSize: '13px',
            color: '#1a1a1a',
            background: '#fff',
            outline: 'none',
            cursor: 'pointer',
            minHeight: '44px',
            minWidth: '180px',
            appearance: 'none',
            WebkitAppearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <option value="all">Bütün filiallar</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cədvəl */}
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        border: '0.5px solid #e8e8e8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#aaa',
            fontSize: '14px',
          }}>
            Yüklənir...
          </div>
        ) : displayedStaff.length === 0 ? (
          <div style={{
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>
              Personel tapılmadı
            </p>
            <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>
              {searchQuery
                ? `"${searchQuery}" axtarışına uyğun nəticə yoxdur`
                : 'Bu filialda hələ əməkdaş yoxdur'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  {[
                    'Əməkdaş',
                    'E-poçt',
                    'Kod',
                    'Vəzifə',
                    'Filial',
                    'Status',
                    'İşə başlama',
                  ].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#888',
                        fontSize: '11px',
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedStaff.map((member, idx) => {
                  const statusCfg = STATUS_CONFIG[member.status]
                  const contractLabel = CONTRACT_CONFIG[member.contract_type]
                  const branchName = member.branch_id
                    ? (branchMap.get(member.branch_id) ?? '—')
                    : '—'

                  return (
                    <tr
                      key={member.id}
                      onClick={() => handleRowClick(member.id)}
                      style={{
                        borderBottom: idx < displayedStaff.length - 1
                          ? '1px solid #f5f5f5'
                          : 'none',
                        cursor: 'pointer',
                        transition: 'background .1s',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                      }}
                    >
                      {/* Ad + avatar */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar name={member.name} avatarUrl={member.avatar_url} />
                          <div>
                            <p style={{
                              margin: 0,
                              fontWeight: '500',
                              color: '#1a1a1a',
                              fontSize: '13px',
                            }}>
                              {member.name ?? '—'}
                            </p>
                            {/* Contract type badge */}
                            <span style={{
                              display: 'inline-block',
                              marginTop: '2px',
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#f0f0f0',
                              color: '#666',
                              fontWeight: '500',
                            }}>
                              {contractLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* E-poçt */}
                      <td style={{ padding: '12px 14px', color: '#555' }}>
                        {member.email}
                      </td>

                      {/* Kod */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {member.employee_code ? (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            background: '#F2A81D18',
                            color: '#92600A',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid #F2A81D30',
                          }}>
                            {member.employee_code}
                          </span>
                        ) : (
                          <span style={{ color: '#ccc' }}>—</span>
                        )}
                      </td>

                      {/* Vəzifə */}
                      <td style={{ padding: '12px 14px', color: '#555', whiteSpace: 'nowrap' }}>
                        {member.position ?? '—'}
                      </td>

                      {/* Filial */}
                      <td style={{ padding: '12px 14px', color: '#555', maxWidth: '160px' }}>
                        <span style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {branchName}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: statusCfg.bg,
                          color: statusCfg.color,
                        }}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* İşə başlama tarixi */}
                      <td style={{ padding: '12px 14px', color: '#888', whiteSpace: 'nowrap' }}>
                        {formatDate(member.hire_date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nəticə sayı */}
      {!loading && displayedStaff.length > 0 && (
        <p style={{
          fontSize: '12px',
          color: '#aaa',
          margin: '10px 0 0',
          textAlign: 'right',
        }}>
          {displayedStaff.length} əməkdaş göstərilir
        </p>
      )}
    </div>
  )
}
