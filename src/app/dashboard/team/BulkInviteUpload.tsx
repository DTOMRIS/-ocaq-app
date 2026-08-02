'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseInvites, type InviteRow } from '@/lib/analytics/parse-invites'

// Toplu dəvət — super_admin Shaurma email Excel-ini atır → önizləmə → "Göndər" basınca dəvətlər gedir.
// E-poçt YALNIZ istifadəçi düyməyə basanda göndərilir (dryRun ilə əvvəl yoxlanır).
const ROL: Record<string, string> = { region_manager: 'Bölgə müdiri', branch_manager: 'Filial meneceri' }

export default function BulkInviteUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<InviteRow[] | null>(null)
  const [prev, setPrev] = useState<{ willSend: number; unmatched: string[]; regionsInDb: string[] } | null>(null)
  const [done, setDone] = useState<{ sent: number; emailFailed: string[]; skipped: string[]; failed: string[]; unmatched: string[]; links: Array<{ email: string; target: string; url: string }> } | null>(null)

  async function pick(f: File | null) {
    if (!f) return
    setBusy(true); setErr(null); setDone(null); setPrev(null); setRows(null)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
      let best: InviteRow[] = []
      for (const sn of wb.SheetNames) {
        const r = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
        const p = parseInvites(r)
        if (p.rows.length > best.length) best = p.rows
      }
      if (!best.length) throw new Error(`Menecer tapılmadı. "e-poçt / Adı Soyadı / Vəzifəsi" sütunları olan faylı yükləyin (Bölgə Müdiri + Filial Menecer sətirləri).`)
      setRows(best)
      // dryRun: eşleşme önizləməsi (e-poçt getmir)
      const res = await fetch('/api/invitations/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invites: best, dryRun: true }) })
      const d = await res.json()
      if (!res.ok) throw new Error([d.error, d.detail].filter(Boolean).join(' — ') || 'Önizləmə xətası')
      setPrev({ willSend: d.willSend, unmatched: d.unmatched || [], regionsInDb: d.regionsInDb || [] })
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  async function send() {
    if (!rows) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/invitations/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invites: rows, dryRun: false }) })
      const d = await res.json()
      if (!res.ok) throw new Error([d.error, d.detail].filter(Boolean).join(' — ') || 'Göndərmə xətası')
      setDone({ sent: d.sent, emailFailed: d.emailFailed || [], skipped: d.skipped || [], failed: d.failed || [], unmatched: d.unmatched || [], links: d.links || [] })
      setRows(null); setPrev(null)
      router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const byRole: Record<string, number> = {}
  rows?.forEach(r => { byRole[r.role] = (byRole[r.role] || 0) + 1 })

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
        background: '#fff', color: '#C8102E', border: '1px solid #C8102E', borderRadius: '8px',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer', minHeight: '44px',
      }}>📥 Toplu dəvət (Excel)</button>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '18px 20px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>📥 Toplu dəvət</h3>
        <button type="button" onClick={() => { setOpen(false); setRows(null); setPrev(null); setDone(null); setErr(null) }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>bağla ✕</button>
      </div>
      <p style={{ fontSize: '12.5px', color: '#888', margin: '0 0 12px' }}>
        Email siyahısını (e-poçt · ad · vəzifə) at → Bölgə müdiri + Filial menecerləri avtomatik seçilir → <b>sən “Göndər”ə basanda</b> dəvətlər gedir.
      </p>

      {!rows && !done && (
        <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null) }}
          style={{ border: '1px dashed #d8d2c6', borderRadius: '10px', background: '#faf8f4', padding: '28px 20px', textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: '26px' }}>📄</div>
          <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '6px' }}>{busy ? 'Oxunur…' : 'Email Excel-ini bura sürüklə və ya seç'}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>.xlsx · e-poçt / Adı Soyadı / Vəzifəsi</div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={e => pick(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#C8102E', fontSize: '13px', marginTop: '10px' }}>⚠ {err}</div>}

      {rows && prev && (
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '2px 0 12px' }}>
            <span style={{ background: '#f5f3ff', color: '#7C3AED', borderRadius: '999px', padding: '5px 12px', fontSize: '12.5px' }}>Bölgə müdiri: <b>{byRole.region_manager || 0}</b></span>
            <span style={{ background: '#eff6ff', color: '#2563EB', borderRadius: '999px', padding: '5px 12px', fontSize: '12.5px' }}>Filial meneceri: <b>{byRole.branch_manager || 0}</b></span>
            <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: '999px', padding: '5px 12px', fontSize: '12.5px' }}>Göndəriləcək: <b>{prev.willSend}</b></span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '5px 12px', borderBottom: '1px solid #f3f0ea' }}>{r.email}</td>
                    <td style={{ padding: '5px 12px', borderBottom: '1px solid #f3f0ea', color: '#888' }}>{ROL[r.role]}</td>
                    <td style={{ padding: '5px 12px', borderBottom: '1px solid #f3f0ea', textAlign: 'right', fontWeight: 600 }}>{r.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prev.unmatched.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '9px 12px', fontSize: '12.5px', color: '#92400e', marginBottom: '10px' }}>
              ⚠ Eşleşməyən ({prev.unmatched.length}) — bunlar göndərilməyəcək: {prev.unmatched.join(', ')}
              <div style={{ marginTop: '6px', color: '#78716c' }}>
                Sistemdəki bölgələr: {prev.regionsInDb.length ? prev.regionsInDb.join(', ') : '(heç bir bölgə yoxdur — əvvəl Bölgələr səhifəsində yarat)'}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" disabled={busy || !prev.willSend} onClick={send} style={{ padding: '11px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', minHeight: '44px' }}>
              {busy ? 'Göndərilir…' : `✉️ ${prev.willSend} dəvəti göndər`}
            </button>
            <button type="button" onClick={() => { setRows(null); setPrev(null) }} style={{ padding: '11px 16px', background: '#fff', color: '#888', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>başqa fayl</button>
          </div>
        </div>
      )}

      {done && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#166534' }}>
          ✅ <b>{done.sent}</b> dəvət e-poçtla göndərildi{done.links.length > 0 ? ` · ${done.links.length} dəvət yaradıldı` : ''}.
          {done.emailFailed.length > 0 && <div style={{ marginTop: '6px', color: '#92400e' }}>✉️ E-poçt getmədi ({done.emailFailed.length}) — amma aşağıdakı linklərlə əl ilə göndər (WhatsApp).</div>}
          {done.skipped.length > 0 && <div style={{ marginTop: '6px', color: '#555' }}>⏭ Atlanan ({done.skipped.length}): {done.skipped.join(', ')}</div>}
          {done.unmatched.length > 0 && <div style={{ marginTop: '6px', color: '#92400e' }}>⚠ Eşleşməyən ({done.unmatched.length}): {done.unmatched.join(', ')}</div>}
          {done.failed.length > 0 && <div style={{ marginTop: '6px', color: '#c8102e' }}>✗ Xəta ({done.failed.length}): {done.failed.slice(0, 3).join(' | ')}{done.failed.length > 3 ? '…' : ''}</div>}

          {done.links.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <b style={{ color: '#166534' }}>🔗 Dəvət linkləri ({done.links.length}) — WhatsApp ilə göndər</b>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(done.links.map(l => `${l.target} (${l.email}): ${l.url}`).join('\n')) }}
                  style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>📋 Hamısını kopyala</button>
              </div>
              <textarea readOnly value={done.links.map(l => `${l.target} (${l.email}): ${l.url}`).join('\n')}
                style={{ width: '100%', minHeight: '120px', fontSize: '11.5px', fontFamily: 'monospace', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px', color: '#26221d', background: '#fff', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11.5px', color: '#78716c', marginTop: '4px' }}>Hər link 48 saat etibarlıdır. Müdir linkə basıb ad+şifrə qoyacaq.</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
