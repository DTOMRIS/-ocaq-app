'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type Branch = { id: string; name: string }
type Briefing = {
  id: string
  branch_id: string
  shift_date: string
  shift: string
  status: 'draft' | 'completed'
  service_focus: string
  sales_focus: string
  sales_target: string
  quality_focus: string
  training_completed_count: number
  training_pending_count: number
  manager_note: string
  handover_note: string
  conversations?: { sequence: number; note: string }[]
}

const today = new Date().toISOString().slice(0, 10)
const emptyForm = {
  branch_id: '', shift_date: today, shift: 'morning', service_focus: '', sales_focus: '', sales_target: '',
  quality_focus: '', training_completed_count: 0, training_pending_count: 0, manager_note: '', handover_note: '',
}

export default function ShiftLeadershipPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [form, setForm] = useState(emptyForm)
  const [notes, setNotes] = useState<string[]>(Array(5).fill(''))
  const [briefingId, setBriefingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([fetch('/api/notifications/audience'), fetch(`/api/shift-briefings?date=${today}`)])
      .then(async ([audienceResponse, briefingResponse]) => {
        if (!audienceResponse.ok || !briefingResponse.ok) throw new Error('Məlumatlar yüklənmədi')
        const branchList = (await audienceResponse.json() as { branches: Branch[] }).branches
        setBranches(branchList)
        setBriefings(await briefingResponse.json() as Briefing[])
        if (branchList[0]) setForm((current) => ({ ...current, branch_id: branchList[0].id }))
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Məlumatlar yüklənmədi'))
  }, [])

  const readyCount = useMemo(() => notes.filter((note) => note.trim()).length, [notes])

  function loadBriefing(item: Briefing) {
    setBriefingId(item.id)
    setForm({
      branch_id: item.branch_id, shift_date: item.shift_date, shift: item.shift,
      service_focus: item.service_focus, sales_focus: item.sales_focus, sales_target: item.sales_target,
      quality_focus: item.quality_focus, training_completed_count: item.training_completed_count,
      training_pending_count: item.training_pending_count, manager_note: item.manager_note, handover_note: item.handover_note,
    })
    const loaded = Array(5).fill('')
    item.conversations?.forEach((conversation) => { loaded[conversation.sequence - 1] = conversation.note })
    setNotes(loaded)
    setMessage('')
  }

  async function save(event?: FormEvent, complete = false) {
    event?.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      let id = briefingId
      if (!id) {
        const response = await fetch('/api/shift-briefings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Toplantı yaradılmadı')
        id = data.id
        setBriefingId(id)
      } else {
        const response = await fetch(`/api/shift-briefings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Toplantı saxlanmadı')
      }

      const noteResponse = await fetch(`/api/shift-briefings/${id}/conversations`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
      const noteData = await noteResponse.json()
      if (!noteResponse.ok) throw new Error(noteData.error ?? 'Müştəri qeydləri saxlanmadı')

      if (complete) {
        const completionResponse = await fetch(`/api/shift-briefings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: 'completed' }) })
        const completionData = await completionResponse.json()
        if (!completionResponse.ok) throw new Error(completionData.error ?? 'Toplantı tamamlanmadı')
      }
      setMessage(complete ? 'Toplantı tamamlandı və növbə təhvil verildi.' : 'Qaralama yadda saxlanıldı.')
      const refreshed = await fetch(`/api/shift-briefings?date=${form.shift_date}`)
      if (refreshed.ok) setBriefings(await refreshed.json())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Əməliyyat baş tutmadı')
    } finally { setBusy(false) }
  }

  const update = (key: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [key]: value }))
  const disabled = briefings.find((item) => item.id === briefingId)?.status === 'completed'

  return <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-bold text-slate-900">Vardiya liderliyi</h1>
      <p className="mt-1 text-sm text-slate-500">5 dəqiqəlik motivasiya, günün prioritetləri və müştəri səsini bir yerdə idarə edin.</p>
    </header>

    {briefings.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Bugünkü toplantılar</h2>
      <div className="flex flex-wrap gap-2">{briefings.map((item) => <button key={item.id} type="button" onClick={() => loadBriefing(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:border-slate-400">
        <strong>{branches.find((branch) => branch.id === item.branch_id)?.name ?? 'Filial'}</strong><br />{item.shift === 'morning' ? 'Səhər' : item.shift === 'evening' ? 'Axşam' : 'Gecə'} · {item.status === 'completed' ? 'Tamamlandı' : 'Qaralama'}
      </button>)}</div>
    </section>}

    <form onSubmit={(event) => save(event)} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Filial"><select value={form.branch_id} onChange={(e) => update('branch_id', e.target.value)} disabled={Boolean(briefingId)} className="input" required><option value="">Seçin</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field>
        <Field label="Tarix"><input type="date" value={form.shift_date} onChange={(e) => update('shift_date', e.target.value)} disabled={Boolean(briefingId)} className="input" required /></Field>
        <Field label="Növbə"><select value={form.shift} onChange={(e) => update('shift', e.target.value)} disabled={Boolean(briefingId)} className="input"><option value="morning">Səhər</option><option value="evening">Axşam</option><option value="night">Gecə</option></select></Field>
      </div>

      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-900"><strong>Müdürün tonu:</strong> müfəttiş kimi deyil, komandanın yanında olan rol model kimi danışın. Dünəni qısa analiz edin, bu gün üçün aydın istiqamət verin.</div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea label="Servis fokusu" hint="Qarşılama, sifarişin düzgün alınması və vaxtında təqdimat" value={form.service_focus} onChange={(value) => update('service_focus', value)} disabled={disabled} />
        <TextArea label="Satış fokusu" hint="Tövsiyəli satış və komandanın bugünkü yanaşması" value={form.sales_focus} onChange={(value) => update('sales_focus', value)} disabled={disabled} />
        <TextArea label="Keyfiyyət fokusu" hint="Əl yuma, resept, porsiya və qramaja uyğunluq" value={form.quality_focus} onChange={(value) => update('quality_focus', value)} disabled={disabled} />
        <TextArea label="Müdür qeydi" hint="Dünənin qısa analizi və komandaya motivasiya" value={form.manager_note} onChange={(value) => update('manager_note', value)} disabled={disabled} />
      </div>
      <Field label="Satış hədəfi"><input value={form.sales_target} onChange={(e) => update('sales_target', e.target.value)} disabled={disabled} placeholder="Məsələn: hər 3 sifarişdən 1-də əlavə məhsul təklif et" className="input" /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dünən təlimi tamamlayanlar"><input type="number" min="0" value={form.training_completed_count} onChange={(e) => update('training_completed_count', Number(e.target.value))} disabled={disabled} className="input" /></Field>
        <Field label="Təlimi gözləyənlər"><input type="number" min="0" value={form.training_pending_count} onChange={(e) => update('training_pending_count', Number(e.target.value))} disabled={disabled} className="input" /></Field>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-900">5 müştəri söhbəti</h2><span className="text-xs text-slate-500">{readyCount}/5 qeyd</span></div>
        <p className="mb-3 text-xs text-slate-500">Kəşf sualları verin: razı qaldınızmı, pulunuzun qarşılığını aldınızmı, yemək isti və vaxtında gəldimi?</p>
        <div className="space-y-3">{notes.map((note, index) => <Field key={index} label={`${index + 1}. müştəri`}><textarea value={note} onChange={(e) => setNotes((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} disabled={disabled} rows={2} className="input resize-y" placeholder="Müştərinin fikri və görüləcək addım" /></Field>)}</div>
      </section>

      <TextArea label="Növbə təhvil qeydi" hint="Növbəti müdür nələri bilməli və hansı işi davam etdirməlidir?" value={form.handover_note} onChange={(value) => update('handover_note', value)} disabled={disabled} />
      {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
      {!disabled && <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><button disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">Qaralama saxla</button><button type="button" onClick={() => save(undefined, true)} disabled={busy || readyCount !== 5 || !form.handover_note.trim()} className="rounded-lg bg-[var(--ocaq-red)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Toplantını tamamla</button></div>}
    </form>
    <style jsx>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;background:white}.input:focus{outline:2px solid #ef4444;outline-offset:1px}.input:disabled{background:#f1f5f9;color:#64748b}`}</style>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>{children}</label>
}

function TextArea({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <Field label={label}><textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} placeholder={hint} className="input resize-y" /></Field>
}
