'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseTargets, type TargetRow } from '@/lib/analytics/parse-targets'

// Toplu aylıq hədəf yükləmə — super_admin PLAN.xlsx atır, bütün filial/aylar sales_targets-ə yazılır.
// Fayl BROWSER-də parse olunur (böyük fayl / Vercel 4.5MB limitindən qaçmaq üçün).
const AY = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

export default function BulkTargetUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [preview, setPreview] = useState<TargetRow[] | null>(null)
  const [done, setDone] = useState<{ saved: number; unmatched: string[] } | null>(null)

  async function pick(f: File | null) {
    if (!f) return
    setBusy(true); setErr(null); setDone(null); setPreview(null)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
      let all: TargetRow[] = []
      for (const sn of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
        const t = parseTargets(rows)
        if (t.length > all.length) all = t   // ən çox hədəf tapılan sheet
      }
      if (!all.length) throw new Error(`Hədəf tapılmadı. Sheet-lər: ${wb.SheetNames.join(', ')}. "Ticarət müəssisəsi" + "avqust plan / sentyabr plan…" sütunları olan faylı yükləyin.`)
      setPreview(all)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  async function save() {
    if (!preview) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/sales/targets/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: preview }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || d.detail || 'Xəta')
      setDone({ saved: d.saved, unmatched: d.unmatched || [] })
      setPreview(null)
      router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  // ay → filial sayı özəti
  const byMonth: Record<string, number> = {}
  preview?.forEach(t => { byMonth[t.month] = (byMonth[t.month] || 0) + 1 })

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
        background: '#fff', color: '#C8102E', border: '1px solid #C8102E', borderRadius: '8px',
        fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '44px',
      }}>📥 Toplu hədəf yüklə</button>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>📥 Toplu aylıq hədəf (PLAN.xlsx)</h3>
        <button type="button" onClick={() => { setOpen(false); setPreview(null); setDone(null); setErr(null) }}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>bağla ✕</button>
      </div>
      <p style={{ fontSize: '12.5px', color: '#888', margin: '0 0 14px' }}>
        Filial × aylıq plan cədvəlini at → bütün filialların hər ayının hədəfi girilir. Filial müdirləri dərhal öz hesabında görür.
      </p>

      {!preview && !done && (
        <div onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null) }}
          style={{ border: '1px dashed #d8d2c6', borderRadius: '10px', background: '#faf8f4', padding: '30px 20px', textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: '28px' }}>📄</div>
          <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '6px' }}>{busy ? 'Oxunur…' : 'PLAN.xlsx-i bura sürüklə və ya seç'}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>.xlsx · Ticarət müəssisəsi + aylıq plan sütunları</div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={e => pick(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#C8102E', fontSize: '13px', marginTop: '10px' }}>⚠ {err}</div>}

      {preview && (
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 14px' }}>
            {Object.keys(byMonth).sort().map(m => (
              <span key={m} style={{ background: '#f6f4ef', border: '1px solid #e6e1d7', borderRadius: '999px', padding: '5px 12px', fontSize: '12px' }}>
                {AY[+m.slice(5, 7)]}: <b>{byMonth[m]}</b> filial
              </span>
            ))}
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', marginBottom: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <tbody>
                {preview.filter(t => t.month === (Object.keys(byMonth).sort()[0])).map((t, i) => (
                  <tr key={i}>
                    <td style={{ padding: '5px 12px', borderBottom: '1px solid #f3f0ea' }}>{t.filial}</td>
                    <td style={{ padding: '5px 12px', borderBottom: '1px solid #f3f0ea', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{t.amount.toLocaleString('az-AZ')} ₼</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" disabled={busy} onClick={save} style={{
              padding: '10px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', minHeight: '44px',
            }}>{busy ? 'Yadda saxlanır…' : `✓ ${preview.length} hədəfi filiallara ver`}</button>
            <button type="button" onClick={() => setPreview(null)} style={{
              padding: '10px 16px', background: '#fff', color: '#888', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
            }}>başqa fayl</button>
          </div>
        </div>
      )}

      {done && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#166534' }}>
          ✓ <b>{done.saved}</b> hədəf filiallara verildi. Filial müdirləri artıq öz hesabında görür.
          {done.unmatched.length > 0 && (
            <div style={{ marginTop: '8px', color: '#92400e' }}>
              ⚠ Eşleşməyən filial ({done.unmatched.length}): {done.unmatched.join(', ')} — bu adlar sistemdə yoxdur (yeni filial əlavə edin).
            </div>
          )}
        </div>
      )}
    </div>
  )
}
