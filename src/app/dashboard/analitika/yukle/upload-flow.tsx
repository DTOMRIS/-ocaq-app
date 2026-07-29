'use client'

import { useState, useRef, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import type { ParseResult } from '@/lib/analytics/parse-sales'

const money = (n?: number | null) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼')
const pct = (x?: number | null) => (x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(0) + '%')

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const th: CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.3px', color: '#8b8378', borderBottom: '1px solid #e6e1d7' }
const td: CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }

function Tile({ k, v, tone }: { k: string; v: string; tone?: 'ok' | 'warn' }) {
  const c = tone === 'ok' ? '#1c7a4e' : tone === 'warn' ? '#c8102e' : '#26221d'
  return (
    <div style={{ ...card, padding: '12px 14px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 3, color: c }}>{v}</div>
    </div>
  )
}

export default function UploadFlow() {
  const router = useRouter()
  const [step, setStep] = useState<'yukle' | 'dogrula' | 'netice'>('yukle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [done, setDone] = useState<{ branchCount: number; matched: number; duplicate?: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function send(f: File, mode: 'preview' | 'commit') {
    const fd = new FormData()
    fd.append('file', f)
    fd.append('mode', mode)
    const res = await fetch('/api/dashboard/analytics/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Xəta baş verdi')
    return data
  }

  async function onPick(f: File | null) {
    if (!f) return
    setErr(null); setFile(f); setBusy(true)
    try {
      const data = await send(f, 'preview')
      setPreview(data as ParseResult)
      setStep('dogrula')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setFile(null)
    } finally { setBusy(false) }
  }

  async function commit() {
    if (!file) return
    setErr(null); setBusy(true)
    try {
      const data = await send(file, 'commit')
      setDone({ branchCount: data.branchCount ?? preview?.branches.length ?? 0, matched: data.matched ?? 0, duplicate: data.duplicate })
      setStep('netice')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  return (
    <main style={{ padding: '24px 26px 60px', maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <div style={{ height: 3, background: '#F2A81D', borderRadius: 2, marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>📥 Satış Excel-i yüklə</h1>
      <p style={{ color: '#8b8378', fontSize: 13, margin: '0 0 20px' }}>
        Aylıq satış hesabatını yüklə → yoxla → təsdiqlə. Nəticə Analitika səhifəsində görünəcək.
      </p>

      {/* Addım göstəricisi */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 12, fontWeight: 600 }}>
        {(['yukle', 'dogrula', 'netice'] as const).map((s, i) => {
          const labels = ['1 · Yüklə', '2 · Doğrula', '3 · Nəticə']
          const active = step === s
          const passed = (['yukle', 'dogrula', 'netice'].indexOf(step) > i)
          return (
            <div key={s} style={{
              padding: '6px 12px', borderRadius: 999,
              background: active ? '#26221d' : passed ? '#e8f3ec' : '#f2efe8',
              color: active ? '#fff' : passed ? '#1c7a4e' : '#8b8378',
            }}>{labels[i]}</div>
          )
        })}
      </div>

      {err && (
        <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '12px 14px', marginBottom: 16, color: '#c8102e', fontSize: 13 }}>
          ⚠ {err}
        </div>
      )}

      {/* ADDIM 1 — YÜKLƏ */}
      {step === 'yukle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(e.dataTransfer.files?.[0] ?? null) }}
          onClick={() => inputRef.current?.click()}
          style={{
            ...card, borderStyle: 'dashed', borderColor: drag ? '#F2A81D' : '#d8d2c6',
            background: drag ? '#fffaf0' : '#faf8f4', padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{busy ? 'Oxunur…' : 'Excel faylını bura sürüklə və ya klik et'}</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 6 }}>
            .xlsx · aylıq satış hesabatı (filial × günlük satış). Format: 2026 / 2025 vərəqləri, tarix başlıqlı.
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden
            onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {/* ADDIM 2 — DOĞRULA */}
      {step === 'dogrula' && preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile k="Dövr" v={preview.period ?? '—'} />
            <Tile k="Oxundu" v={`${preview.meta.okunan} filial`} />
            <Tile k="Uyğunlaşdı" v={`${preview.meta.eslesen}`} tone="ok" />
            <Tile k="Uyğunlaşmadı" v={`${preview.meta.eslesmeyen}`} tone={preview.meta.eslesmeyen ? 'warn' : undefined} />
            <Tile k="Toplam ciro" v={money(preview.meta.toplamCiro)} />
          </div>

          {preview.meta.uyarilar.length > 0 && (
            <div style={{ ...card, borderColor: '#f0e2c0', background: '#fffdf5', padding: '10px 14px', fontSize: 12.5, color: '#8a6d1f' }}>
              {preview.meta.uyarilar.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}

          <div style={{ ...card, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <th style={th}>Filial</th><th style={th}>Bölgə</th>
                <th style={{ ...th, textAlign: 'right' }}>Ciro</th>
                <th style={{ ...th, textAlign: 'right' }}>Keçən il</th>
                <th style={{ ...th, textAlign: 'right' }}>Gidişat</th>
                <th style={{ ...th, textAlign: 'center' }}>Uyğun</th>
              </tr></thead>
              <tbody>
                {preview.branches.map((b) => (
                  <tr key={b.filial} style={{ background: b.eslesdi ? undefined : '#fdf6ec' }}>
                    <td style={{ ...td, fontWeight: 600 }}>{b.filial}{!b.eslesdi && b.xam !== b.filial ? ` (${b.xam})` : ''}</td>
                    <td style={{ ...td, color: '#8b8378' }}>{b.bolge ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{money(b.ciro)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{money(b.ciroKecen)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: (b.yoy ?? 0) < 0 ? '#c8102e' : '#1c7a4e' }}>{pct(b.yoy)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{b.eslesdi ? '✓' : '⚠'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.meta.eslesmeyen > 0 && (
            <p style={{ color: '#8a6d1f', fontSize: 12, margin: 0 }}>
              ⚠ {preview.meta.eslesmeyen} filial tanınmadı (sarı sətirlər). Yenə də yükləyə bilərsən — sonra ad uyğunlaşdırması əlavə edərik.
            </p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setStep('yukle'); setPreview(null); setFile(null) }} disabled={busy}
              style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              ← Geri
            </button>
            <button onClick={commit} disabled={busy}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: busy ? '#9a9488' : '#26221d', color: '#fff', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Yüklənir…' : 'Təsdiqlə və yüklə →'}
            </button>
          </div>
        </div>
      )}

      {/* ADDIM 3 — NƏTİCƏ */}
      {step === 'netice' && done && (
        <div style={{ ...card, padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{done.duplicate ? '↺' : '✅'}</div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>
            {done.duplicate ? 'Bu fayl artıq yüklənmişdi' : 'Yükləndi!'}
          </div>
          <p style={{ color: '#8b8378', fontSize: 13, margin: '8px 0 18px' }}>
            {done.duplicate
              ? 'Eyni məlumat təkrar yazılmadı (idempotent).'
              : `${done.branchCount} filial yazıldı · ${done.matched} OCAQ filialı ilə uyğunlaşdı.`}
          </p>
          <button onClick={() => router.push('/dashboard/analitika')}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#26221d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            📊 Analitikaya bax
          </button>
        </div>
      )}
    </main>
  )
}
