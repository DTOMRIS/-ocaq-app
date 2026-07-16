'use client'

import { useState } from 'react'

type AuditLog = {
  id: string
  created_at: string
  action: string
  entity: string
  metadata?: string | null
}

const CHANNELS = [
  { label: 'Sistem bildirişi', status: 'Aktiv', active: true, note: 'Bildirişlər OCAQ daxilində seçilmiş əməkdaşlara çatdırılır.' },
  { label: 'E-poçt', status: 'Qoşulmayıb', active: false, note: 'Göndərmə xidməti və alıcı qaydası qurulmadan istifadə edilmir.' },
  { label: 'WhatsApp', status: 'Qoşulmayıb', active: false, note: 'WhatsApp Business inteqrasiyası hazır deyil.' },
  { label: 'SMS', status: 'Qoşulmayıb', active: false, note: 'SMS provayderi qoşulmayıb.' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'status' | 'audit'>('status')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const openAudit = async () => {
    setActiveTab('audit')
    if (logs.length > 0 || loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/audit-logs')
      if (!response.ok) throw new Error('Audit jurnalı yüklənmədi.')
      const data = await response.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Xəta baş verdi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button onClick={() => setActiveTab('status')} className={`pb-3 text-sm font-semibold border-b-2 ${activeTab === 'status' ? 'border-[var(--ocaq-red)] text-slate-900' : 'border-transparent text-slate-500'}`}>İnteqrasiya vəziyyəti</button>
        <button onClick={openAudit} className={`pb-3 text-sm font-semibold border-b-2 ${activeTab === 'audit' ? 'border-[var(--ocaq-red)] text-slate-900' : 'border-transparent text-slate-500'}`}>Audit jurnalı</button>
      </div>

      {activeTab === 'status' ? <>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Bildiriş kanalları</h1>
        <p className="text-sm text-slate-500 mb-6">Burada yalnız həqiqətən işləyən kanallar aktiv göstərilir.</p>
        <div className="space-y-3">
          {CHANNELS.map((channel) => <div key={channel.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="font-bold text-slate-900">{channel.label}</h2><p className="text-xs text-slate-500 mt-1">{channel.note}</p></div>
              <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${channel.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{channel.status}</span>
            </div>
          </div>)}
        </div>
      </> : <>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Sistem audit jurnalı</h1>
        <p className="text-sm text-slate-500 mb-6">Son sistem və əməliyyat dəyişiklikləri.</p>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? <div className="p-8 text-center text-sm text-slate-500">Yüklənir...</div>
            : error ? <div className="p-8 text-center text-sm text-red-600">{error}</div>
            : logs.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Heç bir qeyd tapılmadı.</div>
            : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase"><th className="p-4">Tarix</th><th className="p-4">Əməl</th><th className="p-4">Modul</th><th className="p-4">Detallar</th></tr></thead>
              <tbody>{logs.map((log) => <tr key={log.id} className="border-b border-slate-100 last:border-0"><td className="p-4 text-slate-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('az-AZ')}</td><td className="p-4 font-semibold whitespace-nowrap">{log.action}</td><td className="p-4 whitespace-nowrap">{log.entity}</td><td className="p-4 text-xs text-slate-500">{log.metadata || '—'}</td></tr>)}</tbody>
            </table></div>}
        </div>
      </>}
    </div>
  )
}
