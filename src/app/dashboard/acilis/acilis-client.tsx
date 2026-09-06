'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type AcilisSatir = {
  id: string; name: string; address: string | null; zone: string | null
  format: string; gate: string; status: string
  plannedOpenDate: string | null; m2Inside: string | null
  hasTerrace: boolean; hasSeating: boolean
  total: number; done: number; late: number
}

const FORMAT_ADI: Record<string, string> = {
  kuce: 'Küçə', mall: 'Mall', flagship: 'Flagship', kiosk: 'Kiosk',
}
const GATE_ADI: Record<string, string> = {
  G0: 'Strateji qapı', G1: 'Ön eleme', G2: 'LOI / şərtlər', G3: 'Texniki DD (MEP)',
  G4: 'İnvestisiya komitəsi', G5: 'Tikinti & satınalma', G6: 'Açılış hazırlığı',
}
const STATUS_ADI: Record<string, string> = {
  planlasdirilir: 'Planlaşdırılır', davam_edir: 'Davam edir',
  acildi: 'Açıldı', dayandirildi: 'Dayandırıldı',
}
const STATUS_RENG: Record<string, string> = {
  planlasdirilir: 'bg-slate-100 text-slate-600',
  davam_edir: 'bg-amber-100 text-amber-700',
  acildi: 'bg-emerald-100 text-emerald-700',
  dayandirildi: 'bg-rose-100 text-rose-700',
}

function qalanGun(d: string | null): number | null {
  if (!d) return null
  const t = new Date(d + 'T00:00:00Z').getTime()
  const bugun = new Date(); bugun.setUTCHours(0, 0, 0, 0)
  return Math.round((t - bugun.getTime()) / 86400000)
}

export default function AcilisClient({ rows, canManage }: { rows: AcilisSatir[]; canManage: boolean }) {
  const router = useRouter()
  const [acik, setAcik] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [f, setF] = useState({
    name: '', address: '', zone: '', format: 'kuce', planned_open_date: '',
    m2_inside: '', m2_terrace: '', m2_garden: '', seats: '',
    has_terrace: false, has_garden: false, has_seating: true, has_pizza: true,
    has_delivery: true, has_gas: false, has_generator: false, was_cafe: false,
    has_coffee: true, multi_floor: false, has_bar: false, is_merge: false, in_park: false,
  })

  async function yarat() {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/dashboard/acilis', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Yaradıla bilmədi')
      setAcik(false); router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const cb = (k: keyof typeof f, label: string, ipucu?: string) => (
    <label key={k} className="flex items-start gap-2 py-1.5 cursor-pointer">
      <input type="checkbox" checked={f[k] as boolean} className="mt-1 accent-emerald-600"
             onChange={e => setF({ ...f, [k]: e.target.checked })} />
      <span className="text-sm text-slate-700">{label}
        {ipucu && <span className="block text-xs text-slate-400">{ipucu}</span>}</span>
    </label>
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Açılış Takibi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Profil girilir → vəzifələr filiala uyğun olaraq yaranır → G0–G6 qapılarından keçilir
          </p>
        </div>
        <div className="flex gap-2">
        <Link href="/dashboard/acilis/departament"
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50">
          Departament siyahısı
        </Link>
        {canManage && (
          <button onClick={() => setAcik(v => !v)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
            {acik ? 'Bağla' : '+ Yeni açılış'}
          </button>
        )}
        </div>
      </div>

      {acik && canManage && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900 mb-1">Yeni filial profili</h2>
          <p className="text-xs text-slate-500 mb-4">
            Bu profil vəzifə siyahısını müəyyən edir. Mall-da masa/stul yaranmır,
            terası yoxdursa teras icazəsi yaranmır. Sonra dəyişdirmək üçün siyahı
            yenidən yaradılmalıdır — ona görə indi düzgün doldur.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className="text-xs font-medium text-slate-600">Filial adı *</span>
              <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
                     className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Səbail 4" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Ünvan</span>
              <input value={f.address} onChange={e => setF({ ...f, address: e.target.value })}
                     className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Zona / rayon</span>
              <input value={f.zone} onChange={e => setF({ ...f, zone: e.target.value })}
                     className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Format *</span>
              <select value={f.format} onChange={e => setF({ ...f, format: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {Object.entries(FORMAT_ADI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Planlanan açılış *</span>
              <input type="date" value={f.planned_open_date} onChange={e => setF({ ...f, planned_open_date: e.target.value })}
                     className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <span className="text-xs text-slate-400">Bütün geri sayım bundan hesablanır</span></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Oturacaq sayı</span>
              <input type="number" value={f.seats} onChange={e => setF({ ...f, seats: e.target.value })}
                     className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            {(['m2_inside', 'm2_terrace', 'm2_garden'] as const).map(k => (
              <label key={k} className="block">
                <span className="text-xs font-medium text-slate-600">
                  m² — {k === 'm2_inside' ? 'içəri' : k === 'm2_terrace' ? 'teras' : 'bağça'}
                </span>
                <input type="number" step="0.1" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}
                       className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            ))}
          </div>
          <div className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3 border-t border-slate-100 pt-3">
            {cb('has_seating', 'Oturma sahəsi var', 'Yoxsa masa/stul/çini/musiqi vəzifələri yaranmır')}
            {cb('has_terrace', 'Teras var', 'Teras icazəsi + mebel + tente əlavə olunur')}
            {cb('has_garden', 'Bağça var')}
            {cb('has_pizza', 'Pizza var', 'Yoxsa pizza sobası/taxtası/xəmiri yaranmır')}
            {cb('has_delivery', 'Çatdırılma (Wolt/Bolt)')}
            {cb('has_gas', 'Qaz xətti var', 'Yoxsa tam elektrik mətbəx — güc tələbi artır')}
            {cb('has_generator', 'Generator mümkün')}
            {cb('was_cafe', 'Keçmiş kafe binası', 'MEP retrofit riski — G3-də kritik')}
            {cb('has_coffee', 'Qəhvə xətti var', 'Yoxsa kofe/qrinder/türk qəhvəsi/filtr yaranmır')}
            {cb('has_bar', 'Bar var', 'Bar tezgahı + ƏL YUMA lavabosu + qapı tipi əlavə olunur')}
            {cb('multi_floor', 'Mətbəx ayrı mərtəbədə', 'Yemək lifti · pilləkən · servis axını · mal marşrutu')}
            {cb('in_park', 'Park ərazisində', 'Park idarəsindən ayrıca icazə')}
            {cb('is_merge', 'Mövcud filialla birləşir', 'Transfer ölçümü · kadro köçürməsi · yönləndirmə')}
          </div>
          {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
          <button onClick={yarat} disabled={busy}
                  className="mt-4 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
            {busy ? 'Yaradılır…' : 'Yarat və vəzifələri hazırla'}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-slate-500">Hələ açılış layihəsi yoxdur.</p>
          {canManage && <p className="text-sm text-slate-400 mt-1">«Yeni açılış» ilə başla.</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(r => {
            const gun = qalanGun(r.plannedOpenDate)
            const faiz = r.total ? Math.round((r.done / r.total) * 100) : 0
            return (
              <Link key={r.id} href={`/dashboard/acilis/${r.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{r.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {FORMAT_ADI[r.format] ?? r.format}
                      {r.m2Inside && ` · ${Number(r.m2Inside)} m²`}
                      {r.hasTerrace && ' · teras'}
                      {!r.hasSeating && ' · oturmasız'}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded font-semibold whitespace-nowrap ${STATUS_RENG[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_ADI[r.status] ?? r.status}
                  </span>
                </div>
                <p className="mt-3 text-xs font-mono text-slate-500">
                  {r.gate} · {GATE_ADI[r.gate] ?? ''}
                </p>
                {r.plannedOpenDate && (
                  <p className="mt-1 text-sm text-slate-700">
                    {new Date(r.plannedOpenDate).toLocaleDateString('az-AZ')}
                    {gun != null && (
                      <span className={`ml-2 font-semibold ${gun < 0 ? 'text-slate-400' : gun <= 7 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {gun < 0 ? `${-gun} gün keçdi` : `${gun} gün qaldı`}
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{r.done} / {r.total} vəzifə</span>
                    <span>{faiz}%</span>
                  </div>
                  <div className="h-2 rounded bg-slate-100 overflow-hidden">
                    <div className="h-2 bg-emerald-500" style={{ width: `${faiz}%` }} />
                  </div>
                  {r.late > 0 && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{r.late} vəzifə gecikib</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
