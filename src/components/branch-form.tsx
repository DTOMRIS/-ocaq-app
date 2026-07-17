'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isBranchReadModel, type BranchReadModel, type RegionOption } from '@/app/dashboard/branches/types'

interface BranchFormProps {
  mode?: 'create' | 'edit'
  branch?: BranchReadModel
  onClose: () => void
  onManagerStep?: (branch: BranchReadModel) => void
  regions?: RegionOption[]
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

const EMPTY_FORM: FormState = {
  code: '', name: '', city: 'Bakı', address: '', phone: '',
  open_time: '09:00', close_time: '23:00', region_id: '',
}

function initialForm(branch?: BranchReadModel): FormState {
  if (!branch) return EMPTY_FORM
  return {
    code: branch.code,
    name: branch.name,
    city: branch.city,
    address: branch.address ?? '',
    phone: branch.phone ?? '',
    open_time: branch.open_time ?? '09:00',
    close_time: branch.close_time ?? '23:00',
    region_id: branch.region_id ?? '',
  }
}

export default function BranchForm({ mode = 'create', branch, onClose, onManagerStep, regions = [] }: BranchFormProps) {
  const router = useRouter()
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<FormState>(() => initialForm(branch))
  const [phase, setPhase] = useState<'loading_code' | 'details' | 'created'>(mode === 'create' ? 'loading_code' : 'details')
  const [created, setCreated] = useState<BranchReadModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const activeRegions = useMemo(() => regions.filter((region) => region.is_active), [regions])
  const pristine = useMemo(() => JSON.stringify(form) === JSON.stringify(initialForm(branch)), [branch, form])

  async function loadNextCode() {
    setPhase('loading_code')
    setCodeError(null)
    try {
      const response = await fetch('/api/branches/next-code', { cache: 'no-store' })
      const data = await response.json().catch(() => ({})) as { code?: string; error?: string }
      if (!response.ok || !data.code) throw new Error(data.error ?? 'Filial kodu alınmadı')
      setForm((current) => ({ ...current, code: data.code ?? '' }))
      setPhase('details')
      requestAnimationFrame(() => firstFieldRef.current?.focus())
    } catch (caught) {
      setCodeError(caught instanceof Error ? caught.message : 'Filial kodu alınmadı')
      setPhase('details')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (mode === 'create') void loadNextCode()
      else firstFieldRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
    // Modal instance is intentionally initialized once per open dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [loading, onClose])

  function requestClose() {
    if (loading) return
    if (!pristine && phase === 'details' && !window.confirm('Yadda saxlanılmamış dəyişikliklər itəcək. Bağlamaq istəyirsiniz?')) return
    onClose()
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!/^F-\d{2,6}$/.test(form.code.trim())) return setError('Kod formatı F-01, F-02 şəklində olmalıdır')
    if (form.name.trim().length < 2) return setError('Filial adı tələb olunur')
    if (!form.region_id) return setError('Bölgə seçilməlidir')
    if (form.open_time === form.close_time) return setError('Açılış və bağlanış saatı eyni ola bilməz')

    setLoading(true)
    try {
      const body = mode === 'create' ? {
        code: form.code.trim(), name: form.name.trim(), region_id: form.region_id,
        city: form.city.trim() || 'Bakı', address: form.address.trim() || null,
        phone: form.phone.trim() || null, open_time: form.open_time, close_time: form.close_time,
      } : {
        action: 'update_details', expected_version: branch?.version,
        name: form.name.trim(), region_id: form.region_id, city: form.city.trim() || 'Bakı',
        address: form.address.trim() || null, phone: form.phone.trim() || null,
        open_time: form.open_time, close_time: form.close_time,
      }
      const response = await fetch(mode === 'create' ? '/api/branches' : `/api/branches/${branch?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({})) as { branch?: unknown; code?: string; error?: string }
      if (!response.ok) {
        if (data.code === 'BRANCH_VERSION_CONFLICT') router.refresh()
        throw new Error(data.error ?? 'Filial yadda saxlanılmadı')
      }
      if (!isBranchReadModel(data.branch)) throw new Error('Filial yaradıldı, lakin server nəticəsi təsdiqlənmədi. Siyahını yeniləyin.')
      router.refresh()
      if (mode === 'edit') { onClose(); return }
      setCreated(data.branch)
      setPhase('created')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Filial yadda saxlanılmadı')
    } finally { setLoading(false) }
  }

  return <div className="branch-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && pristine) requestClose() }}>
    <div ref={dialogRef} className="branch-modal" role="dialog" aria-modal="true" aria-labelledby="branch-dialog-title">
      <div className="branch-modal-header">
        <div>
          <h2 id="branch-dialog-title">{phase === 'created' ? 'Filial yaradıldı' : mode === 'edit' ? 'Filialı düzəlt' : 'Yeni filial'}</h2>
          <p>{phase === 'created' ? 'Növbəti addım: filial müdiri təyin edin' : mode === 'edit' ? `${branch?.code} məlumatları` : 'Filial hazırlıq vəziyyətində yaradılacaq'}</p>
        </div>
        <button type="button" onClick={requestClose} disabled={loading} className="branch-modal-close" aria-label="Bağla">×</button>
      </div>
      <div className="branch-modal-accent" />

      {phase === 'created' && created ? <div className="branch-success" role="status">
        <div className="branch-success-icon">✓</div>
        <h3>{created.code} · {created.name}</h3>
        <p>Filial hazırlıq vəziyyətində saxlanıldı. Aktivləşdirmək üçün filial müdiri təyin olunmalıdır.</p>
        <div className="branch-modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Hələlik bağla</button>
          <button type="button" className="primary-button" onClick={() => onManagerStep?.(created)}>Filial müdiri təyin et</button>
        </div>
      </div> : <form onSubmit={handleSubmit} noValidate>
        <div className="branch-modal-body">
          <div className="branch-grid branch-code-name">
            <Field label="Kod" required>
              <input name="code" value={form.code} onChange={handleChange} disabled={loading || mode === 'edit' || phase === 'loading_code'} placeholder={phase === 'loading_code' ? 'Hazırlanır...' : 'F-01'} maxLength={10} />
            </Field>
            <Field label="Ad" required><input ref={firstFieldRef} name="name" value={form.name} onChange={handleChange} disabled={loading} placeholder="Nərimanov, Xətai..." maxLength={80} /></Field>
          </div>
          {codeError && <div className="inline-warning" role="alert">{codeError}<button type="button" onClick={() => void loadNextCode()}>Yenidən yoxla</button></div>}
          <Field label="Bölgə" required>
            <select name="region_id" value={form.region_id} onChange={handleChange} disabled={loading || !activeRegions.length}>
              <option value="">Bölgə seçin</option>
              {activeRegions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
          </Field>
          {!activeRegions.length && <div className="inline-warning" role="alert">Aktiv bölgə yoxdur. Əvvəlcə Bölgələr səhifəsində aktiv bölgə yaradın.</div>}
          <Field label="Şəhər"><input name="city" value={form.city} onChange={handleChange} disabled={loading} maxLength={80} /></Field>
          <Field label="Ünvan"><input name="address" value={form.address} onChange={handleChange} disabled={loading} placeholder="Küçə, ev nömrəsi..." maxLength={300} /></Field>
          <Field label="Telefon"><input name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={loading} placeholder="+994 XX XXX XX XX" maxLength={20} /></Field>
          <div className="branch-grid">
            <Field label="Açılış saatı"><input name="open_time" type="time" value={form.open_time} onChange={handleChange} disabled={loading} /></Field>
            <Field label="Bağlanış saatı"><input name="close_time" type="time" value={form.close_time} onChange={handleChange} disabled={loading} /></Field>
          </div>
          {error && <div className="branch-error" role="alert">{error}</div>}
        </div>
        <div className="branch-modal-footer">
          <button type="button" className="secondary-button" onClick={requestClose} disabled={loading}>Ləğv et</button>
          <button type="submit" className="primary-button" disabled={loading || phase === 'loading_code' || !activeRegions.length}>{loading ? 'Saxlanılır...' : mode === 'edit' ? 'Dəyişiklikləri saxla' : 'Filial əlavə et'}</button>
        </div>
      </form>}
    </div>
    <style jsx>{`
      .branch-modal-overlay{position:fixed;inset:0;background:rgba(26,22,20,.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}
      .branch-modal{background:#fff;border-radius:12px;width:100%;max-width:500px;max-height:calc(100dvh - 32px);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column}
      .branch-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid #f0f0f0;flex-shrink:0}.branch-modal-header h2{font-size:16px;font-weight:700;color:#1a1a1a;margin:0}.branch-modal-header p{font-size:12px;color:#999;margin:3px 0 0}
      .branch-modal-close{width:32px;height:32px;border-radius:8px;border:0;background:#f5f5f5;cursor:pointer;font-size:16px;color:#888}.branch-modal-close:disabled{cursor:not-allowed;opacity:.5}
      .branch-modal-accent{height:3px;background:linear-gradient(90deg,#C8102E 0%,#F2A81D 100%);flex-shrink:0}.branch-modal form{min-height:0;display:flex;flex-direction:column}.branch-modal-body{padding:20px 24px 4px;overflow-y:auto}.branch-modal-footer{padding:12px 24px 24px;display:flex;gap:10px;justify-content:flex-end;background:#fff;flex-shrink:0}
      .branch-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.branch-code-name{grid-template-columns:1fr 2fr}.branch-error,.inline-warning{padding:10px 14px;border-radius:7px;margin-bottom:16px;font-size:13px}.branch-error{background:#fef2f2;border:1px solid #fecaca;color:#C8102E}.inline-warning{background:#fffbeb;border:1px solid #fde68a;color:#92400e}.inline-warning button{border:0;background:none;color:#C8102E;font-weight:600;margin-left:8px;cursor:pointer}
      .primary-button,.secondary-button{padding:9px 20px;font-size:13px;border-radius:7px;min-height:44px;cursor:pointer}.primary-button{font-weight:600;border:0;background:#C8102E;color:#fff}.secondary-button{border:1px solid #e0e0e0;background:#fff;color:#555}.primary-button:disabled,.secondary-button:disabled{cursor:not-allowed;opacity:.55}
      .branch-success{padding:36px 24px 24px;text-align:center}.branch-success-icon{width:52px;height:52px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:#ecfdf5;color:#059669;font-size:24px;font-weight:700}.branch-success h3{margin:0 0 8px;color:#1a1a1a;font-size:18px}.branch-success p{margin:0 auto 28px;color:#777;font-size:13px;max-width:360px;line-height:1.5}.branch-success .branch-modal-actions{display:flex;justify-content:center;gap:10px}
      @media(max-width:480px){.branch-modal-overlay{padding:12px;align-items:flex-end}.branch-modal{max-height:calc(100dvh - 24px)}.branch-modal-header{padding:16px 18px 13px}.branch-modal-body{padding:16px 18px 4px}.branch-modal-footer{padding:12px 18px 18px;flex-direction:column-reverse}.branch-grid,.branch-code-name{grid-template-columns:1fr}.primary-button,.secondary-button{width:100%}.branch-success{padding:28px 18px 18px}.branch-success .branch-modal-actions{flex-direction:column-reverse}}
    `}</style>
  </div>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span>{children}<style jsx>{`
    .field{display:block;margin-bottom:16px}.field>span{display:block;font-size:12px;font-weight:500;color:#555;margin-bottom:5px}.field b{color:#C8102E}.field :global(input),.field :global(select){width:100%;padding:9px 12px;border:1px solid #e0e0e0;border-radius:7px;font-size:13px;color:#1a1a1a;background:#fafafa;outline:none;box-sizing:border-box;min-height:40px}.field :global(input:focus),.field :global(select:focus){border-color:#C8102E;box-shadow:0 0 0 2px rgba(200,16,46,.08)}.field :global(input:disabled),.field :global(select:disabled){color:#888;background:#f3f3f3}
  `}</style></label>
}
