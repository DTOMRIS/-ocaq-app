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

  async function resizeToWebp(file: File, size: number) {
    const bitmap = await createImageBitmap(file)
    const crop = Math.min(bitmap.width, bitmap.height)
    const sourceX = (bitmap.width - crop) / 2
    const sourceY = (bitmap.height - crop) / 2
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Şəkil emal edilə bilmədi')
    context.drawImage(bitmap, sourceX, sourceY, crop, crop, 0, 0, size, size)
    bitmap.close()
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Şəkil emal edilə bilmədi')), 'image/webp', 0.88)
    })
  }

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
      const payload = await res.json().catch(() => ({})) as {
        error?: string
        large?: { uploadUrl: string; publicUrl: string }
        thumb?: { uploadUrl: string; publicUrl: string }
      }
      if (!res.ok || !payload.large || !payload.thumb) {
        throw new Error(payload.error ?? 'Yükləmə icazəsi alınmadı')
      }

      // 2. Faylı həqiqətən kvadrat WebP-yə çevir və hər iki ölçünü yüklə
      const [largeBlob, thumbBlob] = await Promise.all([
        resizeToWebp(file, 400),
        resizeToWebp(file, 150),
      ])
      const uploadResponses = await Promise.all([
        fetch(payload.large.uploadUrl, {
          method: 'PUT', body: largeBlob, headers: { 'Content-Type': 'image/webp' },
        }),
        fetch(payload.thumb.uploadUrl, {
          method: 'PUT', body: thumbBlob, headers: { 'Content-Type': 'image/webp' },
        }),
      ])
      if (uploadResponses.some(response => !response.ok)) {
        throw new Error('Şəkil yaddaşa yüklənmədi')
      }

      // 3. DB-ni yenilə
      const updateResponse = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: payload.large.publicUrl }),
      })
      if (!updateResponse.ok) {
        const updatePayload = await updateResponse.json().catch(() => ({})) as { error?: string }
        throw new Error(updatePayload.error ?? 'Profil şəkli yenilənmədi')
      }

      setPreview(payload.large.publicUrl)
      onSuccess(payload.large.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükləmə zamanı xəta baş verdi')
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
