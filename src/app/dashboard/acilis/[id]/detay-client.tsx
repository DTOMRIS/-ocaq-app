'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Fayllar from './fayllar'

export type Layihe = {
  id: string; name: string; address: string | null; zone: string | null; format: string
  gate: string; status: string; plannedOpenDate: string | null
  m2Inside: string | null; m2Terrace: string | null; m2Garden: string | null; seats: number | null
  hasTerrace: boolean; hasGarden: boolean; hasSeating: boolean; hasPizza: boolean
  hasDelivery: boolean; hasGas: boolean; hasGenerator: boolean; wasCafe: boolean
  decisionNote: string | null
}
export type Vezife = {
  id: string; gate: string; dept: string; task: string; note: string | null
  cond: string | null; dueDate: string | null; status: string; comment: string | null
}

const GATES = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'] as const
const GATE_ADI: Record<string, string> = {
  G0: 'Strateji + servis uyğunluğu', G1: 'Ön eleme', G2: 'LOI / şərtlər',
  G3: 'Texniki DD (MEP)', G4: 'İnvestisiya komitəsi', G5: 'Tikinti & satınalma',
  G6: 'Açılış hazırlığı',
}
const GATE_SERT: Record<string, string> = {
  G0: 'Servis-icra hazırlığı təsdiq. Portföy qərarı.',
  G1: 'Ad·ünvan·m² girildi. Ən yaxın N1 <300 m → qırmızı bayraq.',
  G2: 'İcarə + vergi rejimi aydın. DEPOZİT YALNIZ G3-DƏN SONRA.',
  G3: 'Baca · elektrik · qaz · su. Qırmızı varsa STOP.',
  G4: 'Şəbəkə Δ EBITDA + breakeven transfer + skor. QƏRAR BURADA.',
  G5: 'Proyekt → smeta → vendor. Açılış tarixi yalnız bundan sonra elan olunur.',
  G6: 'Geri sayım. Sanitar + yanğın icazəsi (CO).',
}
const ST_ADI: Record<string, string> = {
  gozleyir: 'gözləyir', davam_edir: 'davam edir', bitdi: 'bitdi',
  gecikdi: 'gecikdi', tetbiq_olunmur: 'tətbiq olunmur',
}
const ST_RENG: Record<string, string> = {
  gozleyir: 'bg-slate-100 text-slate-600', davam_edir: 'bg-amber-100 text-amber-700',
  bitdi: 'bg-emerald-100 text-emerald-700', gecikdi: 'bg-rose-100 text-rose-700',
  tetbiq_olunmur: 'bg-slate-50 text-slate-400',
}

export default function DetayClient({ layihe, vezifeler, canManage }:
  { layihe: Layihe; vezifeler: Vezife[]; canManage: boolean }) {
  const router = useRouter()
  const [dept, setDept] = useState<string>('')
  const [gate, setGate] = useState<string>('')
  const [yalnizAcik, setYalnizAcik] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const bugun = new Date().toISOString().slice(0, 10)
  const deptler = useMemo(
    () => [...new Set(vezifeler.map(v => v.dept))].sort((a, b) => a.localeCompare(b)), [vezifeler])

  const gorunen = vezifeler.filter(v =>
    (!dept || v.dept === dept) && (!gate || v.gate === gate) &&
    (!yalnizAcik || (v.status !== 'bitdi' && v.status !== 'tetbiq_olunmur')))

  const sayac = useMemo(() => {
    const m: Record<string, { hamisi: number; bitdi: number; gecikdi: number }> = {}
    for (const v of vezifeler) {
      const e = m[v.dept] ??= { hamisi: 0, bitdi: 0, gecikdi: 0 }
      e.hamisi++
      if (v.status === 'bitdi') e.bitdi++
      else if (v.status !== 'tetbiq_olunmur' && v.dueDate && v.dueDate < bugun) e.gecikdi++
    }
    return m
  }, [vezifeler, bugun])

  const hamisi = vezifeler.length
  const bitdi = vezifeler.filter(v => v.status === 'bitdi').length
  const faiz = hamisi ? Math.round((bitdi / hamisi) * 100) : 0

  async function statusDeyis(taskId: string, status: string) {
    setBusy(taskId)
    try {
      const r = await fetch(`/api/dashboard/acilis/${layihe.id}/task`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      })
      if (!r.ok) { const j = await r.json(); alert(j.error ?? 'Yenilənmədi') }
      else router.refresh()
    } finally { setBusy(null) }
  }
  async function qapiDeyis(g: string) {
    const r = await fetch('/api/dashboard/acilis', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: layihe.id, gate: g }),
    })
    if (r.ok) router.refresh(); else alert('Qapı yenilənmədi')
  }

  const cari = GATES.indexOf(layihe.gate as typeof GATES[number])
  const profilEtiket = [
    layihe.format, layihe.hasSeating ? 'oturma' : 'oturmasız',
    layihe.hasTerrace && 'teras', layihe.hasGarden && 'bağça',
    layihe.hasPizza && 'pizza', layihe.hasDelivery && 'çatdırılma',
    layihe.hasGas ? 'qaz var' : 'qazsız', layihe.wasCafe && 'keçmiş kafe',
  ].filter(Boolean) as string[]

  return (
    <div>
      <Link href="/dashboard/acilis" className="text-sm text-slate-500 hover:text-slate-800">← Açılış siyahısı</Link>
      <div className="mt-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{layihe.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {[layihe.address, layihe.zone].filter(Boolean).join(' · ') || '—'}
            {layihe.plannedOpenDate && ` · açılış ${new Date(layihe.plannedOpenDate).toLocaleDateString('az-AZ')}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profilEtiket.map(t => (
              <span key={t} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">{t}</span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{faiz}%</p>
          <p className="text-xs text-slate-500">{bitdi} / {hamisi} vəzifə</p>
        </div>
      </div>

      {/* ── Qapılar ── */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Qapılar</p>
        <div className="flex flex-wrap gap-2">
          {GATES.map((g, i) => {
            const kecdi = i < cari, aktiv = i === cari
            return (
              <button key={g} onClick={() => canManage && qapiDeyis(g)} disabled={!canManage}
                      title={GATE_SERT[g]}
                      className={`px-3 py-2 rounded-lg text-left transition ${canManage ? 'cursor-pointer hover:ring-2 hover:ring-slate-300' : 'cursor-default'} ${
                        aktiv ? 'bg-slate-900 text-white' : kecdi ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-400'}`}>
                <span className="block text-xs font-mono font-bold">{g}{kecdi && ' ✓'}</span>
                <span className="block text-[11px] mt-0.5 max-w-[120px] leading-tight">{GATE_ADI[g]}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">{GATE_SERT[layihe.gate]}</p>
      </div>

      <Fayllar openingId={layihe.id} canManage={canManage} />

      {/* ── Departament xülasəsi ── */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(sayac).sort((a, b) => b[1].hamisi - a[1].hamisi).map(([d, s]) => (
          <button key={d} onClick={() => setDept(dept === d ? '' : d)}
                  className={`text-left rounded-lg border p-3 transition ${dept === d ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
            <p className="text-sm font-semibold text-slate-900">{d}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.bitdi} / {s.hamisi}
              {s.gecikdi > 0 && <span className="ml-2 font-semibold text-rose-600">{s.gecikdi} gecikib</span>}</p>
            <div className="mt-2 h-1.5 rounded bg-slate-100 overflow-hidden">
              <div className="h-1.5 bg-emerald-500" style={{ width: `${s.hamisi ? (s.bitdi / s.hamisi) * 100 : 0}%` }} />
            </div>
          </button>
        ))}
      </div>

      {/* ── Filtrlər ── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={dept} onChange={e => setDept(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Bütün departamentlər</option>
          {deptler.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={gate} onChange={e => setGate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Bütün qapılar</option>
          {GATES.map(g => <option key={g} value={g}>{g} — {GATE_ADI[g]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={yalnizAcik} className="accent-emerald-600"
                 onChange={e => setYalnizAcik(e.target.checked)} />
          yalnız açıq olanlar
        </label>
        <span className="ml-auto text-sm text-slate-500">{gorunen.length} sətir</span>
      </div>

      {/* ── Vəzifələr ── */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Qapı</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Son tarix</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Departament</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vəzifə</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {gorunen.map(v => {
              const gecikdi = v.status !== 'bitdi' && v.status !== 'tetbiq_olunmur' && v.dueDate && v.dueDate < bugun
              return (
                <tr key={v.id} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{v.gate}</td>
                  <td className={`px-3 py-2 font-mono text-xs whitespace-nowrap ${gecikdi ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                    {v.dueDate ? new Date(v.dueDate).toLocaleDateString('az-AZ') : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{v.dept}</td>
                  <td className="px-3 py-2 text-slate-900">
                    {v.task}
                    {v.note && <span className="block text-xs text-slate-400 mt-0.5">{v.note}</span>}
                    {v.cond && <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">şərt: {v.cond}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <select value={v.status} disabled={busy === v.id}
                            onChange={e => statusDeyis(v.id, e.target.value)}
                            className={`rounded px-2 py-1 text-xs font-semibold border-0 ${ST_RENG[v.status] ?? ''}`}>
                      {Object.entries(ST_ADI).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
