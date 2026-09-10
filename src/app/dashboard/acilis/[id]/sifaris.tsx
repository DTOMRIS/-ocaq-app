'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { tekrarSetirleri, SIFARIS_KATLAR, type SifarisKat } from '@/lib/acilis/sifaris'

export type SifarisSetriDb = {
  id: string; kat: string; ad: string; vahid: string; dept: string
  qty: string | null; perMasa: string | null; qtyManual: boolean
  status: string; qeyd: string | null
}

const ST_ADI: Record<string, string> = {
  planlandi: 'planlandı', sifaris_verildi: 'sifariş verildi',
  geldi: 'gəldi', lazim_deyil: 'lazım deyil',
}
const ST_RENG: Record<string, string> = {
  planlandi: 'bg-slate-100 text-slate-600',
  sifaris_verildi: 'bg-amber-100 text-amber-700',
  geldi: 'bg-emerald-100 text-emerald-700',
  lazim_deyil: 'bg-slate-50 text-slate-400',
}
const KAT_IZAH: Record<SifarisKat, string> = {
  'Qida': 'Ərzaq və içki — açılış günü təzə gəlməlidir',
  'Qeyri-qida': 'Zal, təmizlik, qab-qacaq, forma',
  'Bar': 'Ayran, çay, kofe, dondurma',
  'Fırın': 'Pizza · lahmacun · pide — yalnız fırını olan filiala',
}

function nf(v: string | null): string {
  if (v == null) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? (n === Math.round(n) ? String(n) : n.toFixed(2).replace(/0$/, '')) : v
}

export default function Sifaris({ openingId, masaSayi, setirler, canManage }:
  { openingId: string; masaSayi: number | null; setirler: SifarisSetriDb[]; canManage: boolean }) {
  const router = useRouter()
  const [masa, setMasa] = useState<string>(masaSayi != null ? String(masaSayi) : '')
  const [busy, setBusy] = useState<string | null>(null)
  const [xeta, setXeta] = useState<string | null>(null)
  const [acik, setAcik] = useState<SifarisKat | null>(null)
  const [gizle, setGizle] = useState(true)     // «gəldi» olanları gizlə

  const tekrarlar = useMemo(() => tekrarSetirleri(), [])
  const eksik = setirler.filter(r => r.qty == null && r.status !== 'lazim_deyil')

  const kats = useMemo(() => SIFARIS_KATLAR.map(k => {
    const rows = setirler.filter(r => r.kat === k)
    return {
      k, rows,
      hamisi: rows.length,
      geldi: rows.filter(r => r.status === 'geldi').length,
      lazimsiz: rows.filter(r => r.status === 'lazim_deyil').length,
    }
  }).filter(x => x.hamisi > 0), [setirler])

  async function yarat() {
    setBusy('yarat'); setXeta(null)
    try {
      const r = await fetch(`/api/dashboard/acilis/${openingId}/sifaris`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masaSayi: masa === '' ? null : masa }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Xəta')
      router.refresh()
    } catch (e) {
      setXeta(e instanceof Error ? e.message : 'Naməlum xəta')   // xəta udulmur
    } finally { setBusy(null) }
  }

  async function setirYenile(rowId: string, patch: Record<string, unknown>) {
    setBusy(rowId); setXeta(null)
    try {
      const r = await fetch(`/api/dashboard/acilis/${openingId}/sifaris`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId, ...patch }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Xəta')
      router.refresh()
    } catch (e) {
      setXeta(e instanceof Error ? e.message : 'Naməlum xəta')
    } finally { setBusy(null) }
  }

  /** Anbara göndərmək üçün CSV — sətirlər Excel-ə yapışdırılır. */
  function csvYukle() {
    const head = ['Kateqoriya', 'Məhsul', 'Miqdar', 'Vahid', 'Departament', 'Status', 'Qeyd']
    const body = setirler.filter(r => r.status !== 'lazim_deyil').map(r =>
      [r.kat, r.ad, r.qty ?? '', r.vahid, r.dept, ST_ADI[r.status] ?? r.status, r.qeyd ?? ''])
    const csv = '﻿' + [head, ...body]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `sifaris-${openingId.slice(0, 8)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Yeni filial sifarişi</p>
          <p className="text-xs text-slate-500 mt-1">
            Şəbəkə standartı — 4 siyahı. Yeganə dəyişən <b>masa sayıdır</b>: duz qabı,
            istiot qabı, salfet qabı və masa stikeri ona görə hesablanır.
          </p>
        </div>
        {setirler.length > 0 && (
          <button onClick={csvYukle}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            CSV yüklə
          </button>
        )}
      </div>

      {/* ── Masa sayı ── */}
      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
        <label className="text-sm">
          <span className="block text-xs text-slate-500 mb-1">Masa sayı</span>
          <input type="number" min={0} max={500} value={masa} disabled={!canManage}
                 onChange={e => setMasa(e.target.value)} placeholder="məs. 24"
                 className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm tabular-nums" />
        </label>
        {canManage && (
          <button onClick={yarat} disabled={busy === 'yarat'}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy === 'yarat' ? 'gözləyin…'
              : setirler.length ? 'Miqdarları yenilə' : 'Sifariş siyahısını yarat'}
          </button>
        )}
        {masa !== '' && Number(masa) > 0 && (
          <p className="text-xs text-slate-500">
            duz {Math.ceil(Number(masa) * 2)} · istiot {Math.ceil(Number(masa) * 2)} ·
            salfet {Math.ceil(Number(masa) * 1)} · stiker {Math.ceil(Number(masa) * 1)} əd
          </p>
        )}
      </div>

      {xeta && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{xeta}</p>}

      {setirler.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Siyahı hələ yaradılmayıb. Masa sayını girib düyməni basın — 4 kateqoriyada
          444 standart sətir + masaya bağlı 4 sətir yaranacaq.
        </p>
      ) : (
        <>
          {eksik.length > 0 && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              ⚠ {eksik.length} sətrin miqdarı yoxdur — <b>masa sayı girilməyib</b>.
              Sifariş verilməmişdən əvvəl doldurun: {eksik.map(r => r.ad).join(', ')}
            </p>
          )}

          {tekrarlar.length > 0 && (
            <details className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <summary className="cursor-pointer font-semibold">
                {tekrarlar.length} məhsul birdən çox siyahıda var — anbar cəmi görsün
              </summary>
              <ul className="mt-2 space-y-0.5 text-xs">
                {tekrarlar.map(t => (
                  <li key={t.ad}>
                    <b>{t.ad}</b> — {t.katlar.join(' + ')} = <b>{t.cem}</b> {t.vahid}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={gizle} className="accent-emerald-600"
                   onChange={e => setGizle(e.target.checked)} />
            gələnləri və lazım olmayanları gizlə
          </label>

          <div className="mt-2 space-y-2">
            {kats.map(({ k, rows, hamisi, geldi, lazimsiz }) => {
              const gorunen = gizle
                ? rows.filter(r => r.status !== 'geldi' && r.status !== 'lazim_deyil')
                : rows
              const acildi = acik === k
              return (
                <div key={k} className="rounded-lg border border-slate-200">
                  <button onClick={() => setAcik(acildi ? null : k)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{k}</p>
                      <p className="text-xs text-slate-500">{KAT_IZAH[k]}</p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-sm tabular-nums text-slate-700">{geldi} / {hamisi - lazimsiz}</p>
                      <p className="text-[11px] text-slate-400">gəldi{lazimsiz > 0 && ` · ${lazimsiz} lazımsız`}</p>
                    </div>
                    <span className="text-slate-400">{acildi ? '▾' : '▸'}</span>
                  </button>

                  {acildi && (
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-left">
                            <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Məhsul</th>
                            <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Miqdar</th>
                            <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vahid</th>
                            <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gorunen.map(r => (
                            <tr key={r.id} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-1.5 text-slate-900">
                                {r.ad}
                                {r.perMasa && (
                                  <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                                    masa × {nf(r.perMasa)}
                                  </span>
                                )}
                                {r.dept !== 'Satın Alma' && (
                                  <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">{r.dept}</span>
                                )}
                                {r.qtyManual && (
                                  <span className="ml-2 text-[10px] text-slate-400">əl ilə</span>
                                )}
                                {r.qeyd && <span className="block text-xs text-slate-400 mt-0.5">{r.qeyd}</span>}
                              </td>
                              <td className="px-3 py-1.5">
                                <input defaultValue={r.qty ?? ''} type="number" min={0} step="0.01"
                                       disabled={!canManage || busy === r.id}
                                       onBlur={e => {
                                         const v = e.target.value
                                         if (v !== (r.qty ?? '')) void setirYenile(r.id, { qty: v === '' ? null : v })
                                       }}
                                       className={`w-24 rounded border px-2 py-1 text-sm tabular-nums ${
                                         r.qty == null ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`} />
                              </td>
                              <td className="px-3 py-1.5 text-xs text-slate-500 whitespace-nowrap">{r.vahid}</td>
                              <td className="px-3 py-1.5">
                                <select value={r.status} disabled={!canManage || busy === r.id}
                                        onChange={e => void setirYenile(r.id, { status: e.target.value })}
                                        className={`rounded px-2 py-1 text-xs font-semibold border-0 ${ST_RENG[r.status] ?? ''}`}>
                                  {Object.entries(ST_ADI).map(([k2, t]) => <option key={k2} value={k2}>{t}</option>)}
                                </select>
                              </td>
                            </tr>
                          ))}
                          {gorunen.length === 0 && (
                            <tr><td colSpan={4} className="px-3 py-4 text-center text-sm text-slate-400">
                              hamısı gəldi ✓
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
