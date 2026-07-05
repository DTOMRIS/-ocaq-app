'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Region {
  id: string
  name: string
}

interface BranchFormProps {
  onClose: () => void
  regions?: Region[]
}

interface FormState {
  code: string
  name: string
  city: string
  address: string
  phone: string
  open_time: string
  close_time: string
  region_id: string
}

const INITIAL_STATE: FormState = {
  code: '',
  name: '',
  city: 'Bakı',
  address: '',
  phone: '',
  open_time: '',
  close_time: '',
  region_id: '',
}

export default function BranchForm({ onClose, regions = [] }: BranchFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!form.code.trim()) {
      setError('Filial kodu tələb olunur')
      return
    }
    if (!form.name.trim()) {
      setError('Filial adı tələb olunur')
      return
    }

    // F-XX formatını yoxla
    if (!/^F-\d{2,}$/.test(form.code.trim())) {
      setError('Kod formatı: F-01, F-02 ... şəklində olmalıdır')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:       form.code.trim(),
          name:       form.name.trim(),
          city:       form.city.trim() || 'Bakı',
          address:    form.address.trim() || null,
          phone:      form.phone.trim() || null,
          open_time:  form.open_time.trim() || null,
          close_time: form.close_time.trim() || null,
          region_id:  form.region_id || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Xəta: ${res.status}`)
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinməyən xəta')
    } finally {
      setLoading(false)
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '7px',
    fontSize: '13px',
    color: '#1a1a1a',
    background: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#555',
    marginBottom: '5px',
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: '16px',
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,22,20,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
              Yeni filial
            </h2>
            <p style={{ fontSize: '12px', color: '#999', margin: '3px 0 0' }}>
              Bütün filiallar aktiv yaradılır
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#f5f5f5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#888',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Qızılı xətt */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #C8102E 0%, #F2A81D 100%)' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ padding: '20px 24px 24px' }}>

          {/* Kod + Ad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="bf-code" style={labelStyle}>
                Kod <span style={{ color: '#C8102E' }}>*</span>
              </label>
              <input
                id="bf-code"
                name="code"
                type="text"
                placeholder="F-01"
                value={form.code}
                onChange={handleChange}
                maxLength={10}
                disabled={loading}
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="bf-name" style={labelStyle}>
                Ad <span style={{ color: '#C8102E' }}>*</span>
              </label>
              <input
                id="bf-name"
                name="name"
                type="text"
                placeholder="Nərimanov, Xətai..."
                value={form.name}
                onChange={handleChange}
                maxLength={80}
                disabled={loading}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Bölgə */}
          {regions.length > 0 && (
            <div style={fieldStyle}>
              <label htmlFor="bf-region" style={labelStyle}>
                Bölgə
              </label>
              <select
                id="bf-region"
                name="region_id"
                value={form.region_id}
                onChange={handleChange}
                disabled={loading}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Bölgə seçin (istəyə bağlı)</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Şəhər */}
          <div style={fieldStyle}>
            <label htmlFor="bf-city" style={labelStyle}>
              Şəhər
            </label>
            <input
              id="bf-city"
              name="city"
              type="text"
              placeholder="Bakı"
              value={form.city}
              onChange={handleChange}
              maxLength={60}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* Ünvan */}
          <div style={fieldStyle}>
            <label htmlFor="bf-address" style={labelStyle}>
              Ünvan
            </label>
            <input
              id="bf-address"
              name="address"
              type="text"
              placeholder="Küçə, ev nömrəsi..."
              value={form.address}
              onChange={handleChange}
              maxLength={160}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* Telefon */}
          <div style={fieldStyle}>
            <label htmlFor="bf-phone" style={labelStyle}>
              Telefon
            </label>
            <input
              id="bf-phone"
              name="phone"
              type="tel"
              placeholder="+994 XX XXX XX XX"
              value={form.phone}
              onChange={handleChange}
              maxLength={20}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* İş saatları */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label htmlFor="bf-open" style={labelStyle}>
                Açılış saatı
              </label>
              <input
                id="bf-open"
                name="open_time"
                type="time"
                value={form.open_time}
                onChange={handleChange}
                disabled={loading}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="bf-close" style={labelStyle}>
                Bağlanış saatı
              </label>
              <input
                id="bf-close"
                name="close_time"
                type="time"
                value={form.close_time}
                onChange={handleChange}
                disabled={loading}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Xəta mesajı */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '7px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#C8102E',
            }}>
              {error}
            </div>
          )}

          {/* Düymələr */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                border: '1px solid #e0e0e0',
                borderRadius: '7px',
                background: '#fff',
                color: '#555',
                cursor: loading ? 'not-allowed' : 'pointer',
                minWidth: '88px',
                minHeight: '44px',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '7px',
                background: loading ? '#e0a0aa' : '#C8102E',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                minWidth: '120px',
                minHeight: '44px',
                transition: 'background .15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Saxlanılır...
                </>
              ) : (
                'Filial əlavə et'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Spinner animasiyası */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
