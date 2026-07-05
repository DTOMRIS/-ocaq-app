'use client'

import { useState, useRef } from 'react'

interface AvatarUploadProps {
  staffId:       string
  currentUrl?:   string | null
  name:          string
  onSuccess:     (url: string) => void
}

export default function AvatarUpload({
  staffId, currentUrl, name, onSuccess,
}: AvatarUploadProps) {
  const [preview, setPreview]   = useState<string | null>(currentUrl ?? null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Yalnız şəkil faylları qəbul edilir')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fayl ölçüsü 5MB-dan çox olmamalıdır')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Presigned URL al
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      })
      const { large } = await res.json()

      // 2. R2-yə birbaşa yüklə
      await fetch(large.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'image/webp' },
      })

      // 3. DB-ni yenilə
      await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: large.publicUrl }),
      })

      setPreview(large.publicUrl)
      onSuccess(large.publicUrl)
    } catch {
      setError('Yükləmə zamanı xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {/* Avatar dairəsi */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: preview ? 'transparent' : '#C8102E',
        border: '2px solid #F2A81D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0, position: 'relative' as const,
      }}>
        {preview ? (
          <img src={preview} alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
        ) : (
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '20px' }}>
            {initials}
          </span>
        )}
        {loading && (
          <div style={{
            position: 'absolute' as const, inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: '12px' }}>...</span>
          </div>
        )}
      </div>

      {/* Yükləmə */}
      <div>
        <p style={{ fontSize: '12px', color: '#888', margin: '0 0 8px' }}>
          JPG, PNG, WebP · Maks 5MB · Avtomatik 400×400 kırpılır
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{
            padding: '6px 14px', fontSize: '12px',
            border: '0.5px solid #ddd', borderRadius: '6px',
            background: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            color: '#555',
          }}
        >
          {loading ? 'Yüklənir...' : 'Şəkil seç'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        {error && (
          <p style={{ fontSize: '12px', color: '#C8102E', margin: '6px 0 0' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
