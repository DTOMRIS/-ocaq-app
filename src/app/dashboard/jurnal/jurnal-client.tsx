'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export type Istifadeci = {
  id: string; ad: string | null; email: string; rol: string
  aktiv: boolean; sonGiris: string | null; yaradilib: string
}
export type Qeyd = {
  id: string; action: string; entity: string | null
  metadata: string | null; ip: string | null; tarix: string; kim: string
}

const ROL_ADI: Record<string, string> = {
  super_admin: 'Baş admin', region_manager: 'Bölgə müdiri',
  branch_manager: 'Filial müdiri', staff: 'İşçi',
}

/** Hadisə kodu → insan dili. Tanınmayan kod olduğu kimi göstərilir. */
const HADISE: Record<string, string> = {
  'user.login': 'sistemə girdi',
  'user.login.failed': 'giriş uğursuz (şifrə səhv)',
  'user.invite': 'dəvət göndərdi',
  'user.invite.resend': 'dəvəti təkrar göndərdi',
  'user.invite.cancel': 'dəvəti ləğv etdi',
  'user.invite.delivery_failed': 'dəvət e-poçtu çatmadı',
  'user.invite.stale': 'dəvətin müddəti bitdi',
  'user.register': 'hesabını yaratdı',
  'user.create.direct': 'istifadəçi yaratdı',
  'user.role.change': 'rol dəyişdi',
  'user.password.reset_by_admin': 'şifrəni admin sıfırladı',
  'branch.activate': 'filialı aktivləşdirdi', 'branch.deactivate': 'filialı dayandırdı',
  'branch.archive': 'filialı arxivlədi', 'branch.restore': 'filialı bərpa etdi',
  'branch.update': 'filialı yenilədi',
  'complaint.create': 'şikayət yazdı', 'complaint.update': 'şikayəti yenilədi',
  'staff.create': 'personel əlavə etdi',
  'kasa.banka.recon': 'kasa–bank uyğunlaşdırdı',
  'analytics.fact.item.sweep': 'məhsul datasını təmizlədi',
  'analytics.deletion.save': 'silinmə datası yüklədi',
  'analytics.deletion.sweep': 'silinmə datasını təmizlədi',
  'analytics.hourly.cume': 'saatlıq data yüklədi',
  'analytics.hourly.dated': 'saatlıq data yüklədi (tarixli)',
}
const hadiseAdi = (a: string) => HADISE[a] ?? a

const gunFerqi = (iso: string | null): number | null =>
  iso == null ? null : Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

function nevaxt(iso: string | null): { metn: string; reng: string } {
  const g = gunFerqi(iso)
  if (g == null) return { metn: 'heç vaxt girməyib', reng: '#c8102e' }
  if (g === 0) return { metn: 'bu gün', reng: '#1c7a4e' }
  if (g === 1) return { metn: 'dünən', reng: '#1c7a4e' }
  if (g <= 7) return { metn: `${g} gün əvvəl`, reng: '#1c7a4e' }
  if (g <= 30) return { metn: `${g} gün əvvəl`, reng: '#b8860b' }
  return { metn: `${g} gün əvvəl`, reng: '#c8102e' }
}
const tarixSaat = (iso: string) =>
  new Date(iso).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function JurnalClient({ istifadeciler, qeydler, gun, hadise, kim }: {
  istifadeciler: Istifadeci[]; qeydler: Qeyd[]; gun: number; hadise: string; kim: string
}) {
  const router = useRouter(); const sp = useSearchParams(); const pathname = usePathname()
  const [ara, setAra] = useState('')

  function setParam(k: string, v: string) {
    const q = new URLSearchParams(Array.from(sp.entries()))
    if (v) q.set(k, v); else q.delete(k)
    router.replace(`${pathname}${q.toString() ? `?${q}` : ''}`, { scroll: false })
  }

  /** Rola görə «neçəsi heç vaxt girməyib» — əsas sual budur. */
  const xulase = useMemo(() => {
    const m = new Map<string, { hamisi: number; hecVaxt: number; son7: number }>()
    for (const u of istifadeciler) {
      if (!u.aktiv) continue
      const e = m.get(u.rol) ?? { hamisi: 0, hecVaxt: 0, son7: 0 }
      e.hamisi++
      const g = gunFerqi(u.sonGiris)
      if (g == null) e.hecVaxt++
      else if (g <= 7) e.son7++
      m.set(u.rol, e)
    }
    return [...m.entries()].sort((a, b) => b[1].hamisi - a[1].hamisi)
  }, [istifadeciler])

  const hadiseler = useMemo(
    () => [...new Set(qeydler.map(q => q.action))].sort(), [qeydler])

  const gorunen = qeydler.filter(q =>
    (!hadise || q.action === hadise) &&
    (!kim || q.kim === kim) &&
    (!ara || (q.kim + ' ' + hadiseAdi(q.action) + ' ' + (q.metadata ?? ''))
      .toLowerCase().includes(ara.toLowerCase())))

  return (
    <div style={{ maxWidth: 1060 }}>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Jurnal</h1>
      <p className="mt-1 max-w-[68ch] text-sm text-slate-500">
        Kim sistemə girir, kim nə dəyişir. «Müdirlər sistemi işlədirmi?» sualının
        cavabı buradadır.
      </p>

      {/* ── ① Rola görə istifadə ── */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {xulase.map(([rol, s]) => (
          <div key={rol} className="ocaq-kart p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.09em] text-slate-400">
              {ROL_ADI[rol] ?? rol}
            </p>
            <p className="mt-1.5 text-[26px] font-extrabold leading-none tabular-nums text-slate-900">
              {s.son7}<span className="text-base font-semibold text-slate-400"> / {s.hamisi}</span>
            </p>
            <p className="mt-1.5 text-xs text-slate-500">son 7 gündə girib</p>
            {s.hecVaxt > 0 && (
              <p className="mt-1.5 text-xs font-bold text-rose-600">
                ⚠ {s.hecVaxt} nəfər HEÇ VAXT girməyib
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── İstifadəçi siyahısı ── */}
      <h2 className="mt-7 text-[17px] font-bold tracking-tight text-slate-900">Son giriş</h2>
      <div className="mt-2 overflow-x-auto ocaq-kart">
        <table className="w-full min-w-[560px] text-sm kart-cedvel">
          <thead>
            <tr className="bg-slate-50 text-left">
              {['Ad', 'Rol', 'Son giriş', 'Vəziyyət'].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {istifadeciler.map(u => {
              const n = nevaxt(u.sonGiris)
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td data-label="Ad" className="px-3 py-2">
                    <span className="font-semibold text-slate-900">{u.ad || u.email}</span>
                    {u.ad && <span className="block text-xs text-slate-400">{u.email}</span>}
                  </td>
                  <td data-label="Rol" className="px-3 py-2 text-slate-600">{ROL_ADI[u.rol] ?? u.rol}</td>
                  <td data-label="Son giriş" className="px-3 py-2 font-semibold" style={{ color: n.reng }}>
                    {n.metn}
                    {u.sonGiris && <span className="block text-xs font-normal text-slate-400">{tarixSaat(u.sonGiris)}</span>}
                  </td>
                  <td data-label="Vəziyyət" className="px-3 py-2">
                    {u.aktiv
                      ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">aktiv</span>
                      : <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">bağlı</span>}
                  </td>
                </tr>
              )
            })}
            {istifadeciler.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">İstifadəçi tapılmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── ② Hadisə jurnalı ── */}
      <h2 className="mt-8 text-[17px] font-bold tracking-tight text-slate-900">Hadisələr</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={String(gun)} onChange={e => setParam('gun', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          {[7, 30, 90, 365].map(g => <option key={g} value={g}>son {g} gün</option>)}
        </select>
        <select value={hadise} onChange={e => setParam('hadise', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">bütün hadisələr</option>
          {hadiseler.map(h => <option key={h} value={h}>{hadiseAdi(h)}</option>)}
        </select>
        <select value={kim} onChange={e => setParam('kim', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">hamısı</option>
          {[...new Set(qeydler.map(q => q.kim))].sort().map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Axtar…"
               className="min-w-[150px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <span className="text-sm text-slate-500">{gorunen.length} qeyd</span>
      </div>

      <div className="mt-2 overflow-x-auto ocaq-kart">
        <table className="w-full min-w-[620px] text-sm kart-cedvel">
          <thead>
            <tr className="bg-slate-50 text-left">
              {['Vaxt', 'Kim', 'Nə etdi', 'IP'].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gorunen.map(q => (
              <tr key={q.id} className="border-t border-slate-100">
                <td data-label="Vaxt" className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500">{tarixSaat(q.tarix)}</td>
                <td data-label="Kim" className="px-3 py-2 text-slate-900">{q.kim}</td>
                <td data-label="Nə etdi" className="px-3 py-2">
                  <span className={q.action.includes('failed') ? 'font-semibold text-rose-600' : 'text-slate-700'}>
                    {hadiseAdi(q.action)}
                  </span>
                  {q.metadata && q.metadata !== '{}' && (
                    <span className="block font-mono text-[11px] text-slate-400">{q.metadata.slice(0, 120)}</span>
                  )}
                </td>
                <td data-label="IP" data-bos={q.ip ? undefined : '1'}
                    className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-400">{q.ip ?? '—'}</td>
              </tr>
            ))}
            {gorunen.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">
                Bu aralıqda qeyd yoxdur. Girişlər 12.09.2026-dan etibarən yazılır.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
