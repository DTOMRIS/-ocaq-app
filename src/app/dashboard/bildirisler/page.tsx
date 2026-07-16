'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type InboxItem = {
  id: string; type: NotificationType; title: string; message: string; sender_name: string | null
  created_at: string; read_at: string | null; acknowledged_at: string | null; requires_acknowledgement: boolean
}
type SentItem = {
  id: string; type: NotificationType; title: string; message: string; audience: string; created_at: string
  recipient_count: number; read_count: number; acknowledged_count: number; requires_acknowledgement: boolean
}
type Option = { id: string; name: string; email?: string }
type AudienceData = {
  capabilities: Record<AudienceKind, boolean>; roles: Option[]; regions: Option[]; branches: Option[]; users: Option[]
}
type NotificationType = 'urgent' | 'info' | 'task' | 'promo'
type AudienceKind = 'all' | 'role' | 'region' | 'branch' | 'selected'

const styles: Record<NotificationType, { icon: string; className: string; label: string }> = {
  urgent: { icon: '🚨', className: 'border-red-200 bg-red-50', label: 'Təcili' },
  task: { icon: '📋', className: 'border-amber-200 bg-amber-50', label: 'Tapşırıq' },
  promo: { icon: '🎁', className: 'border-emerald-200 bg-emerald-50', label: 'Kampaniya' },
  info: { icon: 'ℹ️', className: 'border-blue-200 bg-blue-50', label: 'Məlumat' },
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<'inbox' | 'sent' | 'compose'>('inbox')
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [sent, setSent] = useState<SentItem[]>([])
  const [audienceData, setAudienceData] = useState<AudienceData | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const inboxResponse = await fetch('/api/notifications')
      if (!inboxResponse.ok) throw new Error('Bildirişlər yüklənmədi')
      setInbox(await inboxResponse.json())

      const audienceResponse = await fetch('/api/notifications/audience')
      if (audienceResponse.ok) {
        setAudienceData(await audienceResponse.json())
        const sentResponse = await fetch('/api/notifications?mode=sent')
        if (sentResponse.ok) setSent(await sentResponse.json())
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Məlumatlar yüklənmədi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    fetchNotificationData().then((result) => {
      if (!active) return
      setInbox(result.inbox)
      setAudienceData(result.audience)
      setSent(result.sent)
    }).catch((error) => {
      if (active) setMessage(error instanceof Error ? error.message : 'Məlumatlar yüklənmədi')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function receipt(item: InboxItem, action: 'read' | 'acknowledge') {
    const response = await fetch(`/api/notifications/${item.id}/receipt`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error ?? 'Əməliyyat baş tutmadı')
    const timestamp = new Date().toISOString()
    setInbox((current) => current.map((entry) => entry.id === item.id ? {
      ...entry,
      read_at: entry.read_at ?? timestamp,
      acknowledged_at: action === 'acknowledge' ? timestamp : entry.acknowledged_at,
    } : entry))
  }

  const unread = useMemo(() => inbox.filter((item) => !item.read_at).length, [inbox])

  return <div className="space-y-5">
    <header>
      <h1 className="text-2xl font-bold text-slate-900">Bildirişlər</h1>
      <p className="mt-1 text-sm text-slate-500">{unread ? `${unread} oxunmamış bildiriş` : 'Bütün bildirişlər oxunub'}</p>
    </header>
    <nav className="flex gap-2 overflow-x-auto">
      <Tab active={tab === 'inbox'} onClick={() => setTab('inbox')}>Gələnlər</Tab>
      {audienceData && <><Tab active={tab === 'sent'} onClick={() => setTab('sent')}>Göndərilənlər</Tab><Tab active={tab === 'compose'} onClick={() => setTab('compose')}>Yeni bildiriş</Tab></>}
    </nav>
    {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
    {loading ? <p className="text-sm text-slate-500">Yüklənir...</p> : tab === 'inbox' ? <Inbox items={inbox} onReceipt={receipt} /> : tab === 'sent' ? <Sent items={sent} /> : audienceData && <Compose data={audienceData} onSent={async () => { await load(); setTab('sent') }} setMessage={setMessage} />}
  </div>
}

function Inbox({ items, onReceipt }: { items: InboxItem[]; onReceipt: (item: InboxItem, action: 'read' | 'acknowledge') => void }) {
  if (!items.length) return <Empty text="Hələ bildiriş yoxdur." />
  return <div className="space-y-3">{items.map((item) => {
    const style = styles[item.type]
    return <article key={item.id} className={`rounded-xl border p-4 ${item.read_at ? 'border-slate-200 bg-white' : style.className}`}>
      <div className="flex items-start gap-3"><span className="text-xl">{style.icon}</span><div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>{!item.read_at && <span className="h-2 w-2 rounded-full bg-red-500" />}</div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.message}</p>
        <p className="mt-2 text-xs text-slate-400">{item.sender_name ?? 'Sistem'} · {formatDate(item.created_at)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!item.read_at && <button onClick={() => onReceipt(item, 'read')} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium">Oxudum</button>}
          {item.requires_acknowledgement && !item.acknowledged_at && <button onClick={() => onReceipt(item, 'acknowledge')} className="rounded-lg bg-[var(--ocaq-red)] px-3 py-1.5 text-xs font-semibold text-white">Təsdiq edirəm</button>}
          {item.acknowledged_at && <span className="text-xs font-medium text-emerald-700">✓ Təsdiqləndi</span>}
        </div>
      </div></div>
    </article>
  })}</div>
}

function Sent({ items }: { items: SentItem[] }) {
  if (!items.length) return <Empty text="Hələ bildiriş göndərilməyib." />
  return <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-start gap-3"><span className="text-xl">{styles[item.type].icon}</span><div className="min-w-0 flex-1">
      <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><Stat value={item.recipient_count} label="Alıcı" /><Stat value={item.read_count} label="Oxudu" /><Stat value={item.acknowledged_count} label="Təsdiq etdi" /></div>
    </div></div>
  </article>)}</div>
}

function Compose({ data, onSent, setMessage }: { data: AudienceData; onSent: () => Promise<void>; setMessage: (message: string) => void }) {
  const firstKind = (['branch', 'region', 'all', 'role', 'selected'] as AudienceKind[]).find((kind) => data.capabilities[kind]) ?? 'selected'
  const [form, setForm] = useState({ type: 'info' as NotificationType, title: '', message: '', kind: firstKind, value: '', requires_acknowledgement: false })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const options = form.kind === 'branch' ? data.branches : form.kind === 'region' ? data.regions : form.kind === 'role' ? data.roles : []

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        type: form.type, title: form.title, message: form.message, requires_acknowledgement: form.requires_acknowledgement,
        audience: { kind: form.kind, value: form.value || undefined, user_ids: form.kind === 'selected' ? selectedUsers : undefined },
        idempotency_key: crypto.randomUUID(),
      }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Bildiriş göndərilmədi')
      setMessage(`Bildiriş ${result.recipient_count ?? 0} alıcıya göndərildi.`)
      await onSent()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Bildiriş göndərilmədi') }
    finally { setBusy(false) }
  }

  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Növ"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NotificationType })} className="input"><option value="info">Məlumat</option><option value="task">Tapşırıq</option><option value="urgent">Təcili</option><option value="promo">Kampaniya</option></select></Field>
      <Field label="Auditoriya"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AudienceKind, value: '' })} className="input">{data.capabilities.branch && <option value="branch">Filial</option>}{data.capabilities.region && <option value="region">Bölgə</option>}{data.capabilities.all && <option value="all">Bütün şirkət</option>}{data.capabilities.role && <option value="role">Rol</option>}{data.capabilities.selected && <option value="selected">Seçilmiş əməkdaşlar</option>}</select></Field>
    </div>
    {options.length > 0 && <Field label="Seçim"><select value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input" required><option value="">Seçin</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>}
    {form.kind === 'selected' && <fieldset><legend className="mb-2 text-xs font-medium text-slate-600">Əməkdaşlar</legend><div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">{data.users.map((user) => <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={(e) => setSelectedUsers((current) => e.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))} /><span>{user.name ?? user.email}<small className="ml-1 text-slate-400">{user.email}</small></span></label>)}</div></fieldset>}
    <Field label="Başlıq"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} required className="input" /></Field>
    <Field label="Mətn"><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={5000} rows={5} required className="input resize-y" /></Field>
    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.requires_acknowledgement} onChange={(e) => setForm({ ...form, requires_acknowledgement: e.target.checked })} />Alıcıdan “Təsdiq edirəm” cavabı tələb et</label>
    <div className="flex justify-end"><button disabled={busy || (form.kind === 'selected' && !selectedUsers.length)} className="rounded-lg bg-[var(--ocaq-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Göndərilir...' : 'Bildirişi göndər'}</button></div>
    <style jsx>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;background:white}.input:focus{outline:2px solid #ef4444;outline-offset:1px}`}</style>
  </form>
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-[var(--ocaq-red)] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{children}</button> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>{children}</label> }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div> }
function Stat({ value, label }: { value: number; label: string }) { return <div className="rounded-lg bg-slate-50 p-2"><strong className="block text-slate-900">{value}</strong><span className="text-slate-500">{label}</span></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat('az-AZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }

async function fetchNotificationData(): Promise<{ inbox: InboxItem[]; sent: SentItem[]; audience: AudienceData | null }> {
  const inboxResponse = await fetch('/api/notifications')
  if (!inboxResponse.ok) throw new Error('Bildirişlər yüklənmədi')
  const inbox = await inboxResponse.json() as InboxItem[]
  const audienceResponse = await fetch('/api/notifications/audience')
  if (!audienceResponse.ok) return { inbox, sent: [], audience: null }
  const audience = await audienceResponse.json() as AudienceData
  const sentResponse = await fetch('/api/notifications?mode=sent')
  const sent = sentResponse.ok ? await sentResponse.json() as SentItem[] : []
  return { inbox, sent, audience }
}
