'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type DeptSetir = {
  id: string; openingId: string; opening: string; openDate: string | null
  gate: string; dept: string; task: string; note: string | null; cond: string | null
  dueDate: string | null; status: string
}
export type AvadSetir = { kat: string; ad: string; filiallar: string[]; sayPerFilial: number | null }

const ST_ADI: Record<string, string> = {
  gozleyir: 'gözləyir', davam_edir: 'davam edir', bitdi: 'bitdi',
  gecikdi: 'gecikdi', tetbiq_olunmur: 'tətbiq olunmur',
}

function csv(rows: string[][]): string {
  return rows.map(r => r.map(c => {
    const s = String(c ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(';')).join('\n')
}
function yukle(ad: string, metn: string) {
  // BOM — Excel AZ hərflərini düzgün açsın
  const blob = new Blob(['﻿' + metn], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = ad; a.click()
  URL.revokeObjectURL(a.href)
}

export default function DeptClient({ setirler, avadanliq, canManage = false }:
  { setirler: DeptSetir[]; avadanliq: AvadSetir[]; canManage?: boolean }) {
  const [gonderme, setGonderme] = useState<string | null>(null)

  async function xulaseGonder(dryRun: boolean) {
    setGonderme('...')
    try {
      const r = await fetch(`/api/dashboard/acilis/digest${dryRun ? '?dryRun=1' : ''}`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { setGonderme(`Xəta: ${j.error}`); return }
      if (j.gonderilen === 0) { setGonderme(j.qeyd ?? 'Göndəriləcək bir şey yoxdur'); return }
      setGonderme((dryRun ? 'SINAQ — göndərilməyəcək: ' : 'Göndərildi: ') +
        j.netice.map((n: { dept: string; alicilar: number; gecikmis: number }) =>
          `${n.dept} (${n.alicilar} ünvan, ${n.gecikmis} gecikmiş)`).join(' · '))
    } catch (e) { setGonderme(e instanceof Error ? e.message : 'Xəta') }
  }
  const [dept, setDept] = useState('')
  const [acilis, setAcilis] = useState('')
  const [yalnizAcik, setYalnizAcik] = useState(true)
  const [gorunus, setGorunus] = useState<'vezife' | 'avadanliq'>('vezife')

  const bugun = new Date().toISOString().slice(0, 10)
  const deptler = useMemo(() => [...new Set(setirler.map(s => s.dept))].sort((a, b) => a.localeCompare(b)), [setirler])
  const acilislar = useMemo(() => [...new Set(setirler.map(s => s.opening))].sort(), [setirler])

  const gorunen = setirler
    .filter(s => (!dept || s.dept === dept) && (!acilis || s.opening === acilis) &&
      (!yalnizAcik || (s.status !== 'bitdi' && s.status !== 'tetbiq_olunmur')))
    .sort((a, b) => {
      // Tarixsiz (qapıya bağlı) sətirlər sona
      if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
      return a.dept.localeCompare(b.dept) || a.opening.localeCompare(b.opening)
    })

  const sayac = useMemo(() => {
    const m: Record<string, { acik: number; gecikdi: number }> = {}
    for (const s of setirler) {
      if (s.status === 'bitdi' || s.status === 'tetbiq_olunmur') continue
      const e = m[s.dept] ??= { acik: 0, gecikdi: 0 }
      e.acik++
      if (s.dueDate && s.dueDate < bugun) e.gecikdi++
    }
    return m
  }, [setirler, bugun])

  const avadGorunen = acilis ? avadanliq.filter(a => a.filiallar.includes(acilis)) : avadanliq

  function vezifeCsv() {
    yukle(`acilis-vezifeler${dept ? '-' + dept : ''}.csv`, csv([
      ['Departament', 'Açılış', 'Açılış tarixi', 'Qapı', 'Son tarix', 'Vəzifə', 'Qeyd', 'Şərt', 'Status'],
      ...gorunen.map(s => [s.dept, s.opening, s.openDate ?? '', s.gate, s.dueDate ?? '',
        s.task, s.note ?? '', s.cond ?? '', ST_ADI[s.status] ?? s.status]),
    ]))
  }
  function avadCsv() {
    yukle('acilis-avadanliq.csv', csv([
      ['Kateqoriya', 'Avadanlıq', 'Filial sayı', 'Filiallar', 'Ümumi sifariş (siyahıdan)'],
      ...avadGorunen.map(a => [a.kat, a.ad, String(a.filiallar.length),
        a.filiallar.join(', '), a.sayPerFilial == null ? '' : String(a.sayPerFilial)]),
    ]))
  }

  return (
    <div>
      <Link href="/dashboard/acilis" className="text-sm text-slate-500 hover:text-slate-800">← Açılışlar</Link>
      <div className="mt-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departament siyahısı</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bütün açılışlar BİR siyahıda. Satın Alma beş ayrı siyahı deyil, bir sifariş siyahısı görür.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setGorunus('vezife')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${gorunus === 'vezife' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            Vəzifələr
          </button>
          <button onClick={() => setGorunus('avadanliq')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${gorunus === 'avadanliq' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            Avadanlıq
          </button>
        </div>
      </div>

      {/* ── Departament sayğacları ── */}
      <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(sayac).sort((a, b) => b[1].acik - a[1].acik).map(([d, s]) => (
          <button key={d} onClick={() => setDept(dept === d ? '' : d)}
                  className={`text-left rounded-lg border p-3 transition ${dept === d ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
            <p className="text-sm font-semibold text-slate-900">{d}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {s.acik} açıq
              {s.gecikdi > 0 && <span className="ml-2 font-semibold text-rose-600">{s.gecikdi} gecikib</span>}
            </p>
          </button>
        ))}
      </div>

      {/* ── Filtrlər ── */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select value={dept} onChange={e => setDept(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Bütün departamentlər</option>
          {deptler.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={acilis} onChange={e => setAcilis(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Bütün açılışlar</option>
          {acilislar.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {gorunus === 'vezife' && (
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={yalnizAcik} className="accent-emerald-600"
                   onChange={e => setYalnizAcik(e.target.checked)} />
            yalnız açıq olanlar
          </label>
        )}
        <button onClick={gorunus === 'vezife' ? vezifeCsv : avadCsv}
                className="ml-auto px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">
          ⭳ Excel-ə yüklə
        </button>
        {canManage && (
          <>
            <button onClick={() => xulaseGonder(true)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">
              ✉ Sınaq
            </button>
            <button onClick={() => xulaseGonder(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold">
              ✉ Xülasə göndər
            </button>
          </>
        )}
      </div>
      {gonderme && (
        <p className="mt-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {gonderme}
        </p>
      )}

      {gorunus === 'vezife' ? (
        <>
          <p className="mt-3 text-sm text-slate-500">{gorunen.length} sətir</p>
          <div className="mt-1 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  {['Son tarix', 'Departament', 'Açılış', 'Qapı', 'Vəzifə', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gorunen.map(s => {
                  const gecikdi = s.dueDate && s.dueDate < bugun
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 align-top">
                      <td className={`px-3 py-2 font-mono text-xs whitespace-nowrap ${gecikdi ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                        {s.dueDate ? new Date(s.dueDate).toLocaleDateString('az-AZ') : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{s.dept}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link href={`/dashboard/acilis/${s.openingId}`} className="text-slate-900 hover:underline font-medium">
                          {s.opening}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{s.gate}</td>
                      <td className="px-3 py-2 text-slate-900">
                        {s.task}
                        {s.note && <span className="block text-xs text-slate-400 mt-0.5">{s.note}</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{ST_ADI[s.status] ?? s.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-500">
            {avadGorunen.length} sətir · «Filial sayı» neçə açılışa lazım olduğunu göstərir
          </p>
          <div className="mt-1 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  {['Kateqoriya', 'Avadanlıq', 'Filial sayı', 'Hansı filiallar', 'Siyahıdakı say'].map(h => (
                    <th key={h} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {avadGorunen.map(a => (
                  <tr key={a.kat + a.ad} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-xs font-mono text-slate-500 whitespace-nowrap">{a.kat}</td>
                    <td className="px-3 py-2 text-slate-900">{a.ad}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{a.filiallar.length}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{a.filiallar.join(' · ')}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{a.sayPerFilial ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
