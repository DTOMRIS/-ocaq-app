'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { tekrarSetirleri, SIFARIS_KATLAR, SIFARIS_OLCULU, olcuEtiketi,
         type SifarisKat, type Olculer } from '@/lib/acilis/sifaris'

export type SifarisSetriDb = {
  id: string; kat: string; ad: string; vahid: string; dept: string
  qty: string | null; olcuEtiket: string | null; qtyManual: boolean
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

export default function Sifaris({ openingId, setirler, canManage, masaSayi, oturacaqSayi, bankoUzunlugu }:
  { openingId: string; setirler: SifarisSetriDb[]; canManage: boolean
    masaSayi: number | null; oturacaqSayi: number | null; bankoUzunlugu: string | null }) {
  const router = useRouter()
  const [masa, setMasa] = useState(masaSayi != null ? String(masaSayi) : '')
  const [oturacaq, setOturacaq] = useState(oturacaqSayi != null ? String(oturacaqSayi) : '')
  const [banko, setBanko] = useState(bankoUzunlugu != null ? String(Number(bankoUzunlugu)) : '')
  const [busy, setBusy] = useState<string | null>(null)
  const [xeta, setXeta] = useState<string | null>(null)
  const [acik, setAcik] = useState<SifarisKat | null>(null)
  const [gizle, setGizle] = useState(true)     // «gəldi» olanları gizlə

  const tekrarlar = useMemo(() => tekrarSetirleri(), [])
  const eksik = setirler.filter(r => r.qty == null && r.status !== 'lazim_deyil')

  /** Girilən ölçülərlə canlı önizləmə — düyməyə basmadan nə çıxacağı görünsün. */
  const onizleme = useMemo(() => {
    const say = (v: string) => (v.trim() === '' ? null : Number(v))
    const o: Olculer = { masa: say(masa), oturacaq: say(oturacaq), banko: say(banko) }
    return SIFARIS_OLCULU.map(r => {
      const baza = o[r.olcu!.esas]
      const qty = baza == null || baza <= 0 ? null
        : Math.ceil(r.olcu!.kat != null ? baza * r.olcu!.kat : baza / r.olcu!.herBir!) + (r.olcu!.ehtiyat ?? 0)
      return { ad: r.ad, qty, etiket: olcuEtiketi(r.olcu!), cond: r.olcu!.cond ?? null }
    })
  }, [masa, oturacaq, banko])

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
        body: JSON.stringify({ masaSayi: masa, oturacaqSayi: oturacaq, bankoUzunlugu: banko }),
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
            Şəbəkə standartı — 4 siyahı. Üç ölçü siyahını dəyişir: <b>masa</b> (duz,
            istiot, salfet, stolüstü zibil, stiker, külqabı), <b>oturacaq</b> (menyu),
            <b>banko uzunluğu</b> (menyu ekranı). Qalan hər şey sabitdir.
          </p>
        </div>
        {setirler.length > 0 && (
          <button onClick={csvYukle}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            CSV yüklə
          </button>
        )}
      </div>

      {/* ── Ölçülər ── */}
      <div className="mt-3 rounded-lg bg-slate-50 p-3">
        <div className="flex flex-wrap items-end gap-3">
          {([
            ['Masa sayı', masa, setMasa, 1, 'məs. 24'],
            ['Oturacaq sayı', oturacaq, setOturacaq, 1, 'məs. 60'],
            ['Banko uzunluğu (m)', banko, setBanko, 0.1, 'məs. 3.6'],
          ] as const).map(([etiket, deyer, setDeyer, addim, ph]) => (
            <label key={etiket} className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">{etiket}</span>
              <input type="number" min={0} step={addim} value={deyer} disabled={!canManage}
                     onChange={e => setDeyer(e.target.value)} placeholder={ph}
                     className={`w-32 rounded-lg border px-3 py-1.5 text-sm tabular-nums ${
                       deyer.trim() === '' ? 'border-rose-300 bg-rose-50' : 'border-slate-300'}`} />
            </label>
          ))}
          {canManage && (
            <button onClick={yarat} disabled={busy === 'yarat'}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy === 'yarat' ? 'gözləyin…'
                : setirler.length ? 'Miqdarları yenilə' : 'Sifariş siyahısını yarat'}
            </button>
          )}
        </div>

        {/* Düyməyə basmadan nə çıxacağı görünür */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {onizleme.map(o => (
            <span key={o.ad} className={o.qty == null ? 'text-rose-600' : ''}>
              {o.ad} <b className="tabular-nums">{o.qty ?? '—'}</b>
              <span className="text-slate-400"> ({o.etiket}{o.cond ? `, ${o.cond}` : ''})</span>
            </span>
          ))}
        </div>
      </div>

      {xeta && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{xeta}</p>}

      {setirler.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Siyahı hələ yaradılmayıb. Ölçüləri girib düyməni basın — 4 kateqoriyada
          441 standart sətir + ölçüyə bağlı 8 sətir yaranacaq.
        </p>
      ) : (
        <>
          {eksik.length > 0 && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              ⚠ {eksik.length} sətrin miqdarı yoxdur — <b>ölçü girilməyib</b>.
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
                                {r.olcuEtiket && (
                                  <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                                    {r.olcuEtiket}
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
