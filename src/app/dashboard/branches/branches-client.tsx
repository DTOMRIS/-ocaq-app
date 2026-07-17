'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BranchForm from '@/components/branch-form'
import type { BranchBlockers, BranchFilter, BranchReadModel, ManagerCandidate, RegionOption } from './types'

type DialogState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; branch: BranchReadModel }
  | { kind: 'manager'; branch: BranchReadModel }
  | { kind: 'confirm'; action: 'activate' | 'deactivate' | 'archive' | 'restore'; branch: BranchReadModel }

interface Props {
  branches: BranchReadModel[]
  regions: RegionOption[]
  isSuperAdmin: boolean
  fetchError: string | null
  filter: BranchFilter
}

const FILTERS: Array<{ id: BranchFilter; label: string }> = [
  { id: 'current', label: 'Cari' }, { id: 'active', label: 'Aktiv' },
  { id: 'inactive', label: 'Hazırlıq / deaktiv' }, { id: 'archived', label: 'Arxiv' },
]

export default function BranchesClient({ branches, regions, isSuperAdmin, fetchError, filter }: Props) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [menu, setMenu] = useState<{ branch: BranchReadModel; top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null)
    }
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') setMenu(null) }
    function closeFloatingMenu() { setMenu(null) }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', closeFloatingMenu)
    window.addEventListener('scroll', closeFloatingMenu, true)
    return () => { document.removeEventListener('mousedown', closeMenu); document.removeEventListener('keydown', onKey); window.removeEventListener('resize', closeFloatingMenu); window.removeEventListener('scroll', closeFloatingMenu, true) }
  }, [])

  function openMenu(event: React.MouseEvent<HTMLButtonElement>, branch: BranchReadModel) {
    const rect = event.currentTarget.getBoundingClientRect()
    setMenu({ branch, top: Math.min(window.innerHeight - 280, rect.bottom + 4), left: Math.max(12, Math.min(window.innerWidth - 220, rect.right - 210)) })
  }

  function openManager(branch: BranchReadModel) { setMenu(null); setDialog({ kind: 'manager', branch }) }
  function closeDialog() { setDialog({ kind: 'closed' }) }

  return <div>
    <div className="branch-heading">
      <div className="title-row"><h1>Filiallar</h1><span className="count-badge">{branches.length}</span></div>
      {isSuperAdmin && <button type="button" className="new-button" onClick={() => setDialog({ kind: 'create' })}><span>+</span>Yeni filial</button>}
    </div>

    {isSuperAdmin && <nav className="filters" aria-label="Filial status filtri">
      {FILTERS.map((item) => <button key={item.id} type="button" aria-current={filter === item.id ? 'page' : undefined} className={filter === item.id ? 'active' : ''} onClick={() => router.push(item.id === 'current' ? '/dashboard/branches' : `/dashboard/branches?status=${item.id}`)}>{item.label}</button>)}
    </nav>}

    {fetchError && <div className="fetch-error" role="alert"><span>!</span>{fetchError}</div>}

    <div className="table-card">
      {branches.length === 0 ? <EmptyState archived={filter === 'archived'} isSuperAdmin={isSuperAdmin} /> : <div className="table-scroll" role="region" aria-label="Filiallar cədvəli" tabIndex={0}>
        <table>
          <thead><tr>{['Kod', 'Ad', 'Bölgə', 'Şəhər', 'Filial müdiri', 'Telefon', 'İş saatı', 'Status', ...(isSuperAdmin ? ['Əməliyyat'] : [])].map((column) => <th key={column} className={column === 'Əməliyyat' ? 'action-column' : ''}>{column}</th>)}</tr></thead>
          <tbody>{branches.map((branch) => <tr key={branch.id}>
            <td className="sticky-code"><span className="code-badge">{branch.code}</span></td>
            <td><strong className="branch-name">{branch.name}</strong></td>
            <td>{branch.region_name ? <span className="region-badge">{branch.region_name}</span> : <span className="empty-value">—</span>}</td>
            <td>{branch.city}</td>
            <td className="manager-cell"><ManagerSummary branch={branch} /></td>
            <td>{branch.phone ? <a href={`tel:${branch.phone}`}>{branch.phone}</a> : <span className="empty-value">—</span>}</td>
            <td className="nowrap">{formatWorkHours(branch.open_time, branch.close_time)}</td>
            <td><LifecycleBadge branch={branch} /></td>
            {isSuperAdmin && <td className="action-column sticky-action"><button type="button" className="more-button" aria-label={`${branch.name} əməliyyatları`} aria-haspopup="menu" onClick={(event) => openMenu(event, branch)}>⋯</button></td>}
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
    {branches.length > 0 && <p className="table-footer">{branches.length} filial · {filter === 'archived' ? 'arxiv görünüşü' : 'seçilmiş görünüş'}</p>}

    {menu && <div ref={menuRef} role="menu" className="action-menu" style={{ top: menu.top, left: menu.left }}>
      {!menu.branch.is_archived && <>
        <MenuButton label="Düzəlt" onClick={() => { setDialog({ kind: 'edit', branch: menu.branch }); setMenu(null) }} />
        <MenuButton label={menu.branch.manager_id ? 'Müdürü dəyiş' : 'Müdür təyin et'} onClick={() => openManager(menu.branch)} />
        <MenuButton label={menu.branch.is_active ? 'Deaktiv et' : 'Aktiv et'} onClick={() => { setDialog({ kind: 'confirm', action: menu.branch.is_active ? 'deactivate' : 'activate', branch: menu.branch }); setMenu(null) }} />
        <div className="menu-separator" />
        <MenuButton label="Arxivlə" danger onClick={() => { setDialog({ kind: 'confirm', action: 'archive', branch: menu.branch }); setMenu(null) }} />
      </>}
      {menu.branch.is_archived && <MenuButton label="Bərpa et" onClick={() => { setDialog({ kind: 'confirm', action: 'restore', branch: menu.branch }); setMenu(null) }} />}
    </div>}

    {dialog.kind === 'create' && <BranchForm onClose={closeDialog} regions={regions} onManagerStep={(branch) => setDialog({ kind: 'manager', branch })} />}
    {dialog.kind === 'edit' && <BranchForm mode="edit" branch={dialog.branch} onClose={closeDialog} regions={regions} />}
    {dialog.kind === 'manager' && <ManagerDialog initialBranch={dialog.branch} onClose={closeDialog} onChanged={() => router.refresh()} />}
    {dialog.kind === 'confirm' && <LifecycleDialog branch={dialog.branch} action={dialog.action} onClose={closeDialog} onChanged={() => router.refresh()} />}

    <style jsx>{`
      .branch-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px}.title-row{display:flex;align-items:center;gap:10px}.title-row h1{font-size:20px;font-weight:700;color:#1a1a1a;margin:0}.count-badge{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 8px;border-radius:12px;background:#1A1614;color:#F2A81D;font-size:12px;font-weight:700}.new-button{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:#C8102E;color:#fff;border:0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;min-height:44px}.new-button span{font-size:17px}
      .filters{display:flex;gap:6px;overflow-x:auto;margin:0 0 18px;padding-bottom:2px}.filters button{border:1px solid #e5e5e5;background:#fff;color:#666;border-radius:7px;padding:7px 12px;font-size:12px;white-space:nowrap;cursor:pointer;min-height:36px}.filters button.active{background:#1A1614;color:#fff;border-color:#1A1614}
      .fetch-error{padding:14px 18px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:20px;font-size:13px;color:#C8102E;display:flex;align-items:center;gap:8px}.table-card{background:#fff;border-radius:10px;border:.5px solid #e8e8e8;box-shadow:0 1px 4px rgba(0,0,0,.04);overflow:hidden}.table-scroll{overflow-x:auto}.table-scroll:focus{outline:2px solid rgba(200,16,46,.18);outline-offset:2px}table{width:100%;min-width:1120px;border-collapse:collapse;font-size:13px}th{padding:11px 16px;text-align:left;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;background:#fafafa;border-bottom:1px solid #f0f0f0}td{padding:13px 16px;color:#555;border-bottom:1px solid #f5f5f5;vertical-align:middle}tbody tr:last-child td{border-bottom:0}tbody tr:hover td{background:#fafafa}.code-badge{display:inline-block;padding:3px 9px;border-radius:6px;background:#1A1614;color:#F2A81D;font-size:12px;font-weight:700;letter-spacing:.5px}.branch-name{color:#1a1a1a}.region-badge{display:inline-block;padding:3px 9px;border-radius:6px;background:#f0eeff;color:#7C3AED;font-size:12px;font-weight:500}.empty-value{color:#ccc}.nowrap{white-space:nowrap}td a{color:#555;text-decoration:none}.manager-cell{min-width:190px}.action-column{text-align:right;width:72px}.more-button{width:44px;height:44px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;color:#555;font-size:20px;line-height:1;cursor:pointer}.more-button:hover{border-color:#C8102E;color:#C8102E}.table-footer{font-size:12px;color:#bbb;margin:12px 0 0;text-align:right}
      .action-menu{position:fixed;z-index:1100;width:210px;background:#fff;border:1px solid #e5e5e5;border-radius:9px;box-shadow:0 12px 30px rgba(0,0,0,.16);padding:6px}.menu-separator{height:1px;background:#eee;margin:5px 4px}
      @media(max-width:640px){.branch-heading{margin-bottom:12px}.new-button{padding:9px 14px}.filters{margin-bottom:14px}table{min-width:1080px}.sticky-code{position:sticky;left:0;z-index:2;background:#fff}.sticky-action{position:sticky;right:0;z-index:2;background:#fff}thead .action-column{position:sticky;right:0;z-index:3}.table-scroll:after{content:'Cədvəli sağa sürüşdürün →';display:block;position:sticky;left:12px;width:max-content;padding:8px 4px;color:#aaa;font-size:11px}}
    `}</style>
  </div>
}

function MenuButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" role="menuitem" onClick={onClick} style={{ width: '100%', minHeight: 40, padding: '8px 10px', border: 0, borderRadius: 6, background: 'transparent', textAlign: 'left', color: danger ? '#C8102E' : '#333', fontSize: 13, cursor: 'pointer' }}>{label}</button>
}

function ManagerSummary({ branch }: { branch: BranchReadModel }) {
  const invitation = branch.pending_manager_invitation
  return <div>
    {branch.manager_id ? <><strong style={{ color: '#333', display: 'block' }}>{branch.manager_name || branch.manager_email || 'Filial müdiri'}</strong>{branch.manager_email && branch.manager_name && <small style={{ color: '#999' }}>{branch.manager_email}</small>}</> : invitation ? null : <span style={{ color: '#aaa' }}>Təyin edilməyib</span>}
    {invitation && <div style={{ marginTop: branch.manager_id ? 5 : 0 }}><span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 10, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', fontSize: 11 }}>{invitation.replaces_manager_id ? 'Müdür dəyişikliyi gözləyir' : 'Dəvət gözləyir'}</span><small style={{ display: 'block', color: '#999', marginTop: 3 }}>{invitation.email}</small></div>}
  </div>
}

function LifecycleBadge({ branch }: { branch: BranchReadModel }) {
  const state = branch.is_archived ? 'Arxiv' : branch.is_active ? 'Aktiv' : branch.activated_at ? 'Deaktiv' : 'Hazırlıq'
  const colors = state === 'Aktiv' ? ['#ecfdf5', '#059669', '#a7f3d0'] : state === 'Hazırlıq' ? ['#fffbeb', '#92400e', '#fde68a'] : ['#f5f5f5', '#777', '#e0e0e0']
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: colors[0], color: colors[1], fontSize: 12, fontWeight: 500, border: `1px solid ${colors[2]}`, whiteSpace: 'nowrap' }}><i style={{ width: 6, height: 6, borderRadius: '50%', background: colors[1] }} />{state}</span>
}

function EmptyState({ archived, isSuperAdmin }: { archived: boolean; isSuperAdmin: boolean }) {
  return <div style={{ padding: '60px 24px', textAlign: 'center' }}><div style={{ width: 56, height: 56, borderRadius: 14, background: '#f5f5f5', display: 'grid', placeItems: 'center', fontSize: 24, margin: '0 auto 16px' }}>⊞</div><p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>{archived ? 'Arxiv filial yoxdur' : 'Filial tapılmadı'}</p><p style={{ fontSize: 13, color: '#999', margin: 0 }}>{isSuperAdmin && !archived ? '“Yeni filial” düyməsindən başlayın' : 'Bu görünüşdə filial yoxdur'}</p></div>
}

function formatWorkHours(open: string | null, close: string | null) { return open && close ? `${open} – ${close}` : open ? `${open} –` : close ? `– ${close}` : '—' }

function ModalShell({ title, subtitle, busy, onClose, children }: { title: string; subtitle?: string; busy: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key !== 'Tab' || !ref.current) return
      const fields = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
      if (!fields.length) return
      if (event.shiftKey && document.activeElement === fields[0]) { event.preventDefault(); fields.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === fields.at(-1)) { event.preventDefault(); fields[0].focus() }
    }
    document.addEventListener('keydown', key)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('button,input,select,textarea')?.focus())
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = previous }
  }, [busy, onClose])
  return <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby="lifecycle-dialog-title" className="modal-card"><header><div><h2 id="lifecycle-dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} disabled={busy} aria-label="Bağla">×</button></header><div className="accent" />{children}</div><style jsx>{`
    .modal-overlay{position:fixed;inset:0;background:rgba(26,22,20,.55);display:flex;align-items:center;justify-content:center;z-index:1200;padding:16px}.modal-card{background:#fff;border-radius:12px;width:100%;max-width:500px;max-height:calc(100dvh - 32px);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column}.modal-card header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid #f0f0f0;flex-shrink:0}.modal-card h2{font-size:16px;font-weight:700;color:#1a1a1a;margin:0}.modal-card header p{font-size:12px;color:#999;margin:3px 0 0}.modal-card header button{width:32px;height:32px;border-radius:8px;border:0;background:#f5f5f5;color:#888;font-size:16px;cursor:pointer}.accent{height:3px;background:linear-gradient(90deg,#C8102E,#F2A81D);flex-shrink:0}@media(max-width:480px){.modal-overlay{padding:12px;align-items:flex-end}.modal-card{max-height:calc(100dvh - 24px)}.modal-card header{padding:16px 18px 13px}}
  `}</style></div>
}

function ManagerDialog({ initialBranch, onClose, onChanged }: { initialBranch: BranchReadModel; onClose: () => void; onChanged: () => void }) {
  const [branch, setBranch] = useState(initialBranch)
  const [candidates, setCandidates] = useState<ManagerCandidate[]>([])
  const [tab, setTab] = useState<'existing' | 'invite'>('existing')
  const [selected, setSelected] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/branches/${branch.id}/manager`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({})) as { branch?: BranchReadModel; candidates?: ManagerCandidate[]; error?: string }
      if (!response.ok || !data.branch) throw new Error(data.error ?? 'Müdür məlumatı yüklənmədi')
      setBranch(data.branch); setCandidates(data.candidates ?? [])
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Məlumat yüklənmədi') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
    // The manager dialog reloads itself explicitly after every mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function mutate(operation: 'assign_existing' | 'invite_new' | 'unassign') {
    setLoading(true); setError(''); setSuccess('')
    const body = operation === 'assign_existing'
      ? { operation, user_id: selected, expected_version: branch.version, expected_manager_id: branch.manager_id }
      : operation === 'invite_new'
        ? { operation, email, expected_version: branch.version, expected_manager_id: branch.manager_id }
        : { operation, expected_version: branch.version, expected_manager_id: branch.manager_id }
    try {
      const response = await fetch(`/api/branches/${branch.id}/manager`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json().catch(() => ({})) as { branch?: BranchReadModel; code?: string; error?: string }
      if (!response.ok || !data.branch) {
        if (data.code === 'BRANCH_VERSION_CONFLICT') { onChanged(); await load() }
        throw new Error(data.error ?? 'Müdür əməliyyatı tamamlanmadı')
      }
      setBranch(data.branch); setSelected(''); setEmail(''); setSuccess(operation === 'invite_new' ? 'Dəvət göndərildi.' : operation === 'unassign' ? 'Müdür filialdan ayrıldı.' : 'Filial müdiri təyin edildi.'); onChanged()
      await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Əməliyyat tamamlanmadı'); setLoading(false) }
  }

  async function invitationAction(method: 'PATCH' | 'DELETE') {
    const invitation = branch.pending_manager_invitation; if (!invitation) return
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/invitations/${invitation.id}`, { method, headers: method === 'DELETE' ? { 'Content-Type': 'application/json' } : undefined, body: method === 'DELETE' ? JSON.stringify({ reason: 'Filial ekranından ləğv edildi' }) : undefined })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Dəvət əməliyyatı tamamlanmadı')
      setSuccess(method === 'PATCH' ? 'Dəvət yenidən göndərildi.' : 'Dəvət ləğv edildi.'); onChanged(); await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Əməliyyat tamamlanmadı'); setLoading(false) }
  }

  async function activateBranch() {
    setLoading(true); setError(''); setSuccess('')
    try {
      const response = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', expected_version: branch.version }),
      })
      const data = await response.json().catch(() => ({})) as { branch?: BranchReadModel; code?: string; error?: string }
      if (!response.ok) {
        if (data.code === 'BRANCH_VERSION_CONFLICT') { onChanged(); await load() }
        throw new Error(data.error ?? 'Filial aktivləşdirilmədi')
      }
      setSuccess('Filial aktivləşdirildi.'); onChanged(); await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Filial aktivləşdirilmədi'); setLoading(false) }
  }

  const selectedCandidate = candidates.find((candidate) => candidate.id === selected)
  return <ModalShell title="Filial müdiri" subtitle={`${branch.code} · ${branch.name}`} busy={loading} onClose={onClose}><div className="manager-body">
    {branch.manager_id && <div className="current-manager"><span>Cari müdür</span><strong>{branch.manager_name || branch.manager_email}</strong>{branch.manager_email && branch.manager_name && <small>{branch.manager_email}</small>}<button type="button" disabled={loading} onClick={() => void mutate('unassign')}>Müdürü ayır</button></div>}
    {branch.pending_manager_invitation && <div className="pending"><span>Dəvət gözləyir</span><strong>{branch.pending_manager_invitation.email}</strong><div><button type="button" onClick={() => void invitationAction('PATCH')} disabled={loading}>Yenidən göndər</button><button type="button" onClick={() => void invitationAction('DELETE')} disabled={loading}>Ləğv et</button></div></div>}
    <div className="manager-tabs"><button type="button" className={tab === 'existing' ? 'active' : ''} onClick={() => setTab('existing')}>Mövcud hesab</button><button type="button" className={tab === 'invite' ? 'active' : ''} onClick={() => setTab('invite')}>Yeni dəvət</button></div>
    {tab === 'existing' ? <><label>Müdür seç<select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={loading}><option value="">Seçin</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || candidate.email} · {candidate.email}</option>)}</select></label>{selectedCandidate && selectedCandidate.assigned_branch_count > 0 && <div className="warning">Bu müdür artıq {selectedCandidate.assigned_branch_count} filialı idarə edir: {selectedCandidate.assigned_branches.map((item) => item.code).join(', ')}</div>}<button className="primary" type="button" disabled={loading || !selected} onClick={() => void mutate('assign_existing')}>{branch.manager_id ? 'Müdürü dəyiş' : 'Müdür təyin et'}</button></> : <><label>E-poçt<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading || Boolean(branch.pending_manager_invitation)} placeholder="manager@ocaq.az" /></label><button className="primary" type="button" disabled={loading || !email || Boolean(branch.pending_manager_invitation)} onClick={() => void mutate('invite_new')}>Dəvət göndər</button></>}
    {loading && <p role="status" className="status">Məlumat yenilənir...</p>}{error && <p role="alert" className="error">{error}</p>}{success && <p role="status" className="success">{success}</p>}
    {!branch.is_active && branch.manager_id && !branch.is_archived && <button type="button" className="activate-hint" disabled={loading} onClick={() => void activateBranch()}>Müdür hazırdır · filialı aktiv et</button>}
  </div><style jsx>{`
    .manager-body{padding:20px 24px 24px;overflow-y:auto}.current-manager,.pending{padding:12px 14px;border:1px solid #e8e8e8;border-radius:8px;margin-bottom:12px}.current-manager span,.pending span{display:block;color:#999;font-size:11px;margin-bottom:3px}.current-manager strong,.pending strong{display:block;color:#333;font-size:13px}.current-manager small{color:#999}.current-manager>button{float:right;margin-top:-28px;border:0;background:none;color:#C8102E;cursor:pointer}.pending{background:#fffbeb;border-color:#fde68a}.pending div{display:flex;gap:8px;margin-top:8px}.pending button{border:1px solid #e7d39a;background:#fff;border-radius:6px;padding:6px 9px;font-size:12px;cursor:pointer}.manager-tabs{display:flex;border-bottom:1px solid #eee;margin:18px 0 16px}.manager-tabs button{border:0;background:none;padding:9px 12px;color:#888;font-size:13px;cursor:pointer}.manager-tabs button.active{color:#C8102E;border-bottom:2px solid #C8102E;font-weight:600}.manager-body label{display:block;font-size:12px;color:#555;margin-bottom:14px}.manager-body select,.manager-body input{display:block;width:100%;margin-top:5px;min-height:42px;border:1px solid #e0e0e0;border-radius:7px;padding:9px 12px;background:#fafafa;box-sizing:border-box}.primary{width:100%;min-height:44px;border:0;border-radius:7px;background:#C8102E;color:#fff;font-weight:600;cursor:pointer}.primary:disabled{opacity:.5;cursor:not-allowed}.warning,.error,.success,.status{padding:10px 12px;border-radius:7px;font-size:12px;margin:0 0 12px}.warning{background:#fffbeb;color:#92400e;border:1px solid #fde68a}.error{background:#fef2f2;color:#C8102E}.success{background:#ecfdf5;color:#047857}.status{background:#f5f5f5;color:#777}.activate-hint{width:100%;margin-top:12px;border:1px solid #a7f3d0;background:#ecfdf5;color:#047857;border-radius:7px;min-height:42px;cursor:pointer}@media(max-width:480px){.manager-body{padding:16px 18px 18px}}
  `}</style></ModalShell>
}

function LifecycleDialog({ branch, action, onClose, onChanged }: { branch: BranchReadModel; action: 'activate' | 'deactivate' | 'archive' | 'restore'; onClose: () => void; onChanged: () => void }) {
  const [currentBranch, setCurrentBranch] = useState(branch)
  const [loading, setLoading] = useState(action === 'deactivate' || action === 'archive')
  const [blockers, setBlockers] = useState<BranchBlockers | null>(null)
  const [reason, setReason] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [error, setError] = useState('')
  async function reloadDetail() {
    const response = await fetch(`/api/branches/${branch.id}`, { cache: 'no-store' })
    const data = await response.json().catch(() => ({})) as { branch?: Partial<BranchReadModel>; blockers?: BranchBlockers; error?: string }
    if (!response.ok || !data.branch) throw new Error(data.error ?? 'Əməliyyat yoxlanılmadı')
    setCurrentBranch((current) => ({ ...current, ...data.branch }))
    setBlockers(data.blockers ?? null)
  }
  useEffect(() => {
    if (action !== 'deactivate' && action !== 'archive') return
    const timer = window.setTimeout(() => {
      void reloadDetail().catch((caught) => setError(caught instanceof Error ? caught.message : 'Əməliyyat yoxlanılmadı')).finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(timer)
    // The selected branch id and action define this dialog instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, branch.id])
  const blockerTotal = blockers ? blockers.pending_invitations + blockers.draft_shift_briefings + blockers.open_complaints : 0
  async function submit() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/branches/${currentBranch.id}`, {
        method: action === 'archive' ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'archive' ? { confirmation_code: confirmationCode, reason, expected_version: currentBranch.version } : { action, expected_version: currentBranch.version }),
      })
      const data = await response.json().catch(() => ({})) as { code?: string; error?: string; blockers?: BranchBlockers }
      if (!response.ok) {
        if (data.blockers) setBlockers(data.blockers)
        if (data.code === 'BRANCH_VERSION_CONFLICT') { onChanged(); await reloadDetail() }
        throw new Error(data.error ?? 'Əməliyyat tamamlanmadı')
      }
      onChanged(); onClose()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Əməliyyat tamamlanmadı'); setLoading(false) }
  }
  const titles = { activate: 'Filialı aktiv et', deactivate: 'Filialı deaktiv et', archive: 'Filialı arxivlə', restore: 'Filialı bərpa et' }
  const ready = !loading && blockerTotal === 0 && (action !== 'archive' || (confirmationCode.trim().toUpperCase() === currentBranch.code && reason.trim().length >= 5))
  return <ModalShell title={titles[action]} subtitle={`${currentBranch.code} · ${currentBranch.name}`} busy={loading} onClose={onClose}><div className="life-body">
    <p className="explanation">{action === 'activate' ? 'Filial əməliyyat əhatəsinə daxil olacaq.' : action === 'deactivate' ? 'Filial müvəqqəti olaraq əməliyyat əhatəsindən çıxacaq.' : action === 'restore' ? 'Filial arxivdən deaktiv vəziyyətə qaytarılacaq.' : 'Filial fiziki silinməyəcək; tarixçə qorunacaq.'}</p>
    {blockers && <div className={blockerTotal ? 'blockers blocked' : 'blockers'}><strong>Açıq əməliyyatlar</strong><span>Gözləyən dəvət: {blockers.pending_invitations}</span><span>Qaralama toplantı: {blockers.draft_shift_briefings}</span><span>Açıq şikayət: {blockers.open_complaints}</span>{blockerTotal > 0 && <small>Bu qeydlər bağlanmadan əməliyyat mümkün deyil.</small>}</div>}
    {action === 'archive' && <><label>Arxiv səbəbi<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Minimum 5 simvol" /></label><label>Təsdiq üçün <strong>{currentBranch.code}</strong> yazın<input value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value.toUpperCase())} /></label></>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="life-actions"><button type="button" className="secondary" onClick={onClose} disabled={loading}>Ləğv et</button><button type="button" className={action === 'archive' ? 'danger' : 'primary'} onClick={() => void submit()} disabled={!ready}>{loading ? 'Yoxlanılır...' : titles[action]}</button></div>
  </div><style jsx>{`
    .life-body{padding:20px 24px 24px;overflow-y:auto}.explanation{font-size:13px;color:#666;line-height:1.5;margin:0 0 16px}.blockers{display:grid;grid-template-columns:1fr;gap:5px;padding:12px 14px;border:1px solid #d1fae5;background:#ecfdf5;border-radius:8px;color:#047857;font-size:12px;margin-bottom:16px}.blockers.blocked{border-color:#fecaca;background:#fef2f2;color:#991b1b}.blockers strong{font-size:13px}.blockers small{margin-top:4px}.life-body label{display:block;font-size:12px;color:#555;margin:0 0 14px}.life-body input,.life-body textarea{display:block;width:100%;margin-top:5px;border:1px solid #e0e0e0;border-radius:7px;padding:9px 12px;background:#fafafa;box-sizing:border-box;font:inherit}.error{padding:10px 12px;background:#fef2f2;color:#C8102E;border-radius:7px;font-size:12px}.life-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.life-actions button{min-height:44px;padding:9px 18px;border-radius:7px;font-size:13px;cursor:pointer}.secondary{border:1px solid #e0e0e0;background:#fff;color:#555}.primary,.danger{border:0;color:#fff;font-weight:600}.primary{background:#C8102E}.danger{background:#991b1b}.life-actions button:disabled{opacity:.5;cursor:not-allowed}@media(max-width:480px){.life-body{padding:16px 18px 18px}.life-actions{flex-direction:column-reverse}.life-actions button{width:100%}}
  `}</style></ModalShell>
}
