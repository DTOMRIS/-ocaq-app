'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export type Fayl = {
  id: string; kind: string; fileName: string; mime: string | null
  size: number | null; note: string | null; createdAt: string; url: string | null
}

const KIND_ADI: Record<string, string> = {
  proyekt: 'Proyekt', smeta: 'Smeta', teklif: 'Təklif',
  olcu: 'Ölçü cədvəli', foto: 'Foto', icaze: 'İcazə', diger: 'Digər',
}
const olcu = (n: number | null) =>
  n == null ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`

export default function Fayllar({ openingId, fayllar, canManage }:
  { openingId: string; fayllar: Fayl[]; canManage: boolean }) {
  const router = useRouter()
  const [yuk, setYuk] = useState(false)
  const [kind, setKind] = useState('proyekt')
  const [err, setErr] = useState<string | null>(null)
  const [faiz, setFaiz] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function gonder(file: File) {
    setYuk(true); setErr(null); setFaiz(0)
    try {
      const u = await fetch(`/api/dashboard/acilis/${openingId}/file`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: 'url', fileName: file.name, contentType: file.type, size: file.size }),
      })
      const uj = await u.json()
      if (!u.ok) throw new Error(uj.error ?? 'Link alınmadı')

      // Birbaşa R2-yə — server body limitinə dəymir
      await new Promise<void>((ok, xeta) => {
        const x = new XMLHttpRequest()
        x.open('PUT', uj.uploadUrl)
        x.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        x.upload.onprogress = e => e.lengthComputable && setFaiz(Math.round(e.loaded / e.total * 100))
        x.onload = () => (x.status >= 200 && x.status < 300) ? ok() : xeta(new Error(`R2 ${x.status}`))
        x.onerror = () => xeta(new Error('Şəbəkə xətası'))
        x.send(file)
      })

      const c = await fetch(`/api/dashboard/acilis/${openingId}/file`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: 'confirm', key: uj.key, fileName: file.name,
          contentType: file.type, size: file.size, kind }),
      })
      const cj = await c.json()
      if (!c.ok) throw new Error(cj.error ?? 'Qeydiyyat alınmadı')
      router.refresh()
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setYuk(false); setFaiz(null) }
  }

  async function sil(fileId: string, ad: string) {
    if (!confirm(`«${ad}» silinsin?`)) return
    const r = await fetch(`/api/dashboard/acilis/${openingId}/file`, {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileId }),
    })
    if (r.ok) router.refresh(); else alert('Silinmədi')
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fayllar</p>
        <p className="text-xs text-slate-400">{fayllar.length} fayl · maks 60 MB</p>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Proyekt, smeta, təklif, ölçü cədvəli, foto. Fayl saxlanılır və açılır —
        <b> rəqəmlər buradan avtomatik oxunmur</b>, profil formunda əl ilə girilir.
      </p>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={kind} onChange={e => setKind(e.target.value)} disabled={yuk}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            {Object.entries(KIND_ADI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input ref={inputRef} type="file" disabled={yuk}
                 onChange={e => e.target.files?.[0] && gonder(e.target.files[0])}
                 className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white file:text-sm" />
          {faiz != null && <span className="text-sm font-mono text-slate-600">{faiz}%</span>}
        </div>
      )}
      {err && <p className="mb-3 text-sm text-rose-600">{err}</p>}

      {fayllar.length === 0 ? (
        <p className="text-sm text-slate-400">Hələ fayl yoxdur.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {fayllar.map(f => (
            <li key={f.id} className="flex items-center gap-3 py-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 whitespace-nowrap">
                {KIND_ADI[f.kind] ?? f.kind}
              </span>
              {f.url
                ? <a href={f.url} className="text-sm text-slate-900 hover:underline truncate">{f.fileName}</a>
                : <span className="text-sm text-slate-400 truncate">{f.fileName}</span>}
              <span className="text-xs text-slate-400 whitespace-nowrap ml-auto">{olcu(f.size)}</span>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(f.createdAt).toLocaleDateString('az-AZ')}
              </span>
              {canManage && (
                <button onClick={() => sil(f.id, f.fileName)}
                        className="text-xs text-slate-400 hover:text-rose-600">sil</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
