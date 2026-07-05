'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Branch {
  id: string
  code: string
  name: string
}

interface Complaint {
  id: string
  branch_id: string | null
  branch_code: string | null
  branch_name: string | null
  channel: string
  category: string
  priority: string
  status: string
  fault: string
  customer_name: string | null
  customer_phone: string | null
  platform_order_id: string | null
  order_total: string | null
  refund_amount: string | null
  title: string
  description: string
  action_taken: string | null
  resolution_note: string | null
  response_due_at: string | null
  resolved_at: string | null
  closed_at: string | null
  rating: number | null
  created_at: string
  updated_at: string
}

interface Props {
  branches: Branch[]
  complaints: Complaint[]
}

const CHANNELS = [
  ['wolt', 'Wolt'],
  ['bolt', 'Bolt'],
  ['phone', 'Telefon'],
  ['whatsapp', 'WhatsApp'],
  ['instagram', 'Instagram'],
  ['in_store', 'Məkanda'],
  ['other', 'Digər'],
] as const

const CATEGORIES = [
  ['late_delivery', 'Gecikmə'],
  ['missing_item', 'Eksik məhsul'],
  ['wrong_item', 'Yanlış məhsul'],
  ['cold_food', 'Soyuq məhsul'],
  ['packaging', 'Paketləmə'],
  ['courier_behavior', 'Kurye davranışı'],
  ['food_quality', 'Keyfiyyət'],
  ['refund', 'İade'],
  ['pricing', 'Qiymət'],
  ['other', 'Digər'],
] as const

const PRIORITIES = [
  ['low', 'Aşağı'],
  ['normal', 'Normal'],
  ['high', 'Yüksək'],
  ['critical', 'Kritik'],
] as const

const STATUSES = [
  ['new', 'Yeni'],
  ['in_review', 'İncelənir'],
  ['sent_to_branch', 'Filiala göndərildi'],
  ['resolved', 'Həll edildi'],
  ['closed', 'Bağlandı'],
] as const

const FAULTS = [
  ['unknown', 'Bilinmir'],
  ['restaurant', 'Restoran'],
  ['platform', 'Platform'],
  ['courier', 'Kurye'],
  ['customer', 'Müştəri'],
] as const

const labelMap = (items: readonly (readonly [string, string])[]) =>
  Object.fromEntries(items.map(([value, label]) => [value, label]))

const CHANNEL_LABELS = labelMap(CHANNELS)
const CATEGORY_LABELS = labelMap(CATEGORIES)
const PRIORITY_LABELS = labelMap(PRIORITIES)
const STATUS_LABELS = labelMap(STATUSES)
const FAULT_LABELS = labelMap(FAULTS)

const priorityColors: Record<string, { bg: string; color: string }> = {
  low: { bg: '#f5f5f5', color: '#666' },
  normal: { bg: '#E0F2FE', color: '#0369A1' },
  high: { bg: '#FEF3C7', color: '#B45309' },
  critical: { bg: '#FEE2E2', color: '#C8102E' },
}

const statusColors: Record<string, { bg: string; color: string }> = {
  new: { bg: '#FEE2E2', color: '#C8102E' },
  in_review: { bg: '#FEF3C7', color: '#B45309' },
  sent_to_branch: { bg: '#E0F2FE', color: '#0369A1' },
  resolved: { bg: '#DCFCE7', color: '#047857' },
  closed: { bg: '#F3F4F6', color: '#6B7280' },
}

const initialForm = {
  title: '',
  description: '',
  branch_id: '',
  channel: 'wolt',
  category: 'late_delivery',
  priority: 'normal',
  fault: 'unknown',
  customer_name: '',
  customer_phone: '',
  platform_order_id: '',
  order_total: '',
  refund_amount: '',
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SelectField({
  label, value, onChange, children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block', fontSize: '12px', color: '#555', fontWeight: 500 }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          marginTop: '5px',
          minHeight: '40px',
          borderRadius: '7px',
          border: '1px solid #e0e0e0',
          background: '#fff',
          padding: '8px 10px',
          fontSize: '13px',
          color: '#1a1a1a',
        }}
      >
        {children}
      </select>
    </label>
  )
}

export default function ComplaintsClient({ branches, complaints }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [form, setForm] = useState(initialForm)

  const filtered = useMemo(() => complaints.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (channelFilter !== 'all' && item.channel !== channelFilter) return false
    return true
  }), [complaints, statusFilter, channelFilter])

  const stats = useMemo(() => {
    const open = complaints.filter((item) => !['resolved', 'closed'].includes(item.status)).length
    const critical = complaints.filter((item) => item.priority === 'critical' && item.status !== 'closed').length
    const woltBolt = complaints.filter((item) => ['wolt', 'bolt'].includes(item.channel)).length
    const refund = complaints.reduce((sum, item) => sum + Number(item.refund_amount ?? 0), 0)
    return { open, critical, woltBolt, refund }
  }, [complaints])

  function updateForm(field: keyof typeof initialForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function createComplaint(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!form.title.trim() || !form.description.trim()) {
      setError('Başlıq və təsvir tələb olunur')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          branch_id: form.branch_id || null,
          order_total: form.order_total || null,
          refund_amount: form.refund_amount || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Xəta: ${res.status}`)
      }

      setForm(initialForm)
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinməyən xəta')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '22px',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Şikayət Mərkəzi
          </h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            Wolt, Bolt və digər kanallardan gələn müştəri şikayətləri
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            minHeight: '42px',
            border: 'none',
            borderRadius: '8px',
            background: '#C8102E',
            color: '#fff',
            padding: '9px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Yeni şikayət
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '18px',
      }}>
        {[
          { label: 'Açıq şikayət', value: stats.open, color: '#C8102E' },
          { label: 'Kritik', value: stats.critical, color: '#B45309' },
          { label: 'Wolt/Bolt', value: stats.woltBolt, color: '#0369A1' },
          { label: 'İade məbləği', value: `${stats.refund.toFixed(2)} ₼`, color: '#047857' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: '#fff',
            border: '0.5px solid #e8e8e8',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px' }}>{stat.label}</p>
            <p style={{ fontSize: '24px', color: stat.color, margin: 0, fontWeight: 700 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterStyle}>
          <option value="all">Bütün statuslar</option>
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} style={filterStyle}>
          <option value="all">Bütün kanallar</option>
          {CHANNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div style={{
        background: '#fff',
        border: '0.5px solid #e8e8e8',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
            Şikayət tapılmadı
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  {['Kanal', 'Şikayət', 'Filial', 'Prioritet', 'Status', 'Səbəb', 'SLA', 'Aksiyon'].map((col) => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <td style={tdStyle}>
                      <span style={pill('#F3F4F6', '#374151')}>
                        {CHANNEL_LABELS[item.channel] ?? item.channel}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, minWidth: '260px' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#1a1a1a' }}>{item.title}</p>
                      <p style={{ margin: 0, color: '#777', maxWidth: '360px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.description}
                      </p>
                      {item.platform_order_id && (
                        <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: '11px' }}>
                          Sifariş: {item.platform_order_id}
                        </p>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {item.branch_code ? `${item.branch_code} - ${item.branch_name}` : '-'}
                    </td>
                    <td style={tdStyle}>
                      <span style={pill(
                        priorityColors[item.priority]?.bg ?? '#f5f5f5',
                        priorityColors[item.priority]?.color ?? '#666',
                      )}>
                        {PRIORITY_LABELS[item.priority] ?? item.priority}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={pill(
                        statusColors[item.status]?.bg ?? '#f5f5f5',
                        statusColors[item.status]?.color ?? '#666',
                      )}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div>{CATEGORY_LABELS[item.category] ?? item.category}</div>
                      <div style={{ color: '#aaa', fontSize: '11px', marginTop: '2px' }}>
                        {FAULT_LABELS[item.fault] ?? item.fault}
                      </div>
                    </td>
                    <td style={tdStyle}>{formatDate(item.response_due_at)}</td>
                    <td style={tdStyle}>
                      {item.status === 'new' && (
                        <button type="button" onClick={() => void updateStatus(item.id, 'in_review')} style={smallButton}>
                          İncele
                        </button>
                      )}
                      {['new', 'in_review', 'sent_to_branch'].includes(item.status) && (
                        <button type="button" onClick={() => void updateStatus(item.id, 'resolved')} style={smallButton}>
                          Həll et
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

      {showForm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#1a1a1a' }}>Yeni şikayət</h2>
              <button type="button" onClick={() => setShowForm(false)} style={closeButton}>x</button>
            </div>
            <form onSubmit={createComplaint} style={{ padding: '20px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <SelectField label="Kanal" value={form.channel} onChange={(value) => updateForm('channel', value)}>
                  {CHANNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </SelectField>
                <SelectField label="Kateqoriya" value={form.category} onChange={(value) => updateForm('category', value)}>
                  {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </SelectField>
                <SelectField label="Prioritet" value={form.priority} onChange={(value) => updateForm('priority', value)}>
                  {PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </SelectField>
                <SelectField label="Səbəb" value={form.fault} onChange={(value) => updateForm('fault', value)}>
                  {FAULTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </SelectField>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <SelectField label="Filial" value={form.branch_id} onChange={(value) => updateForm('branch_id', value)}>
                  <option value="">Seçilməyib</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>
                  ))}
                </SelectField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <input style={inputStyle} placeholder="Müştəri adı" value={form.customer_name} onChange={(e) => updateForm('customer_name', e.target.value)} />
                <input style={inputStyle} placeholder="Telefon" value={form.customer_phone} onChange={(e) => updateForm('customer_phone', e.target.value)} />
                <input style={inputStyle} placeholder="Platform sifariş no" value={form.platform_order_id} onChange={(e) => updateForm('platform_order_id', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <input style={inputStyle} placeholder="Sifariş məbləği" value={form.order_total} onChange={(e) => updateForm('order_total', e.target.value)} />
                <input style={inputStyle} placeholder="İade məbləği" value={form.refund_amount} onChange={(e) => updateForm('refund_amount', e.target.value)} />
              </div>

              <input
                style={{ ...inputStyle, marginBottom: '12px' }}
                placeholder="Başlıq"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
              />
              <textarea
                style={{ ...inputStyle, minHeight: '110px', resize: 'vertical', marginBottom: '12px' }}
                placeholder="Şikayətin təsviri"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
              />

              {error && (
                <div style={{ padding: '10px 12px', background: '#fef2f2', color: '#C8102E', borderRadius: '7px', fontSize: '13px', marginBottom: '12px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} style={secondaryButton}>
                  Ləğv et
                </button>
                <button type="submit" disabled={saving} style={primaryButton}>
                  {saving ? 'Saxlanılır...' : 'Şikayəti yarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const filterStyle: React.CSSProperties = {
  minHeight: '40px',
  minWidth: '170px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  background: '#fff',
  padding: '8px 10px',
  color: '#1a1a1a',
  fontSize: '13px',
}

const thStyle: React.CSSProperties = {
  padding: '11px 14px',
  textAlign: 'left',
  color: '#888',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '13px 14px',
  color: '#555',
  verticalAlign: 'top',
}

function pill(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '3px 9px',
    background: bg,
    color,
    fontSize: '11px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }
}

const smallButton: React.CSSProperties = {
  minHeight: '30px',
  border: '1px solid #e0e0e0',
  borderRadius: '7px',
  background: '#fff',
  color: '#1a1a1a',
  fontSize: '12px',
  padding: '5px 9px',
  marginRight: '6px',
  cursor: 'pointer',
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(26,22,20,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
}

const modalBox: React.CSSProperties = {
  width: '100%',
  maxWidth: '760px',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}

const closeButton: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: 'none',
  borderRadius: '8px',
  background: '#f5f5f5',
  color: '#888',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: '40px',
  borderRadius: '7px',
  border: '1px solid #e0e0e0',
  background: '#fff',
  padding: '9px 11px',
  fontSize: '13px',
  color: '#1a1a1a',
  outline: 'none',
}

const primaryButton: React.CSSProperties = {
  minHeight: '42px',
  border: 'none',
  borderRadius: '7px',
  background: '#C8102E',
  color: '#fff',
  padding: '9px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
  minHeight: '42px',
  border: '1px solid #e0e0e0',
  borderRadius: '7px',
  background: '#fff',
  color: '#555',
  padding: '9px 16px',
  fontSize: '13px',
  cursor: 'pointer',
}
