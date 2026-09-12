'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Fayllar, { type Fayl } from './fayllar'
import Sifaris, { type SifarisSetriDb } from './sifaris'

export type Layihe = {
  id: string; name: string; address: string | null; zone: string | null; format: string
  gate: string; status: string; plannedOpenDate: string | null
  m2Inside: string | null; m2Terrace: string | null; m2Garden: string | null; seats: number | null
  hasTerrace: boolean; hasGarden: boolean; hasSeating: boolean; hasPizza: boolean
  hasDelivery: boolean; hasGas: boolean; hasGenerator: boolean; wasCafe: boolean
  decisionNote: string | null; tableCount: number | null; counterLenM: string | null
  hasCoffee: boolean; multiFloor: boolean; hasBar: boolean; isMerge: boolean; inPark: boolean
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

export default function DetayClient({ layihe, vezifeler, fayllar, sifarisler, canManage }:
  { layihe: Layihe; vezifeler: Vezife[]; fayllar: Fayl[]
    sifarisler: SifarisSetriDb[]; canManage: boolean }) {
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

  /**
   * Vəzifə siyahısını cari şablonla uyğunlaşdırır.
   * ƏVVƏL dryRun ilə nə olacağı göstərilir — kor-koranə silmə olmasın.
   */
  const [redakte, setRedakte] = useState(false)

  /**
   * PROFİL REDAKTƏSİ.
   *
   * NİYƏ VƏZİFƏ SİYAHISI AVTOMATİK YENİLƏNMİR: profil dəyişəndə şablon da
   * dəyişir, amma üzərində iş görülmüş sətri səssizcə silmək tarixçəni pozar.
   * Server «şablon yenilənsin» bayrağı qaytarır, biz soruşuruq — qərar insanın.
   */
  async function profilYaz(form: HTMLFormElement) {
    setBusy('profil')
    try {
      const fd = new FormData(form)
      const BAYRAQ = ['has_terrace', 'has_garden', 'has_seating', 'has_pizza', 'has_delivery',
                      'has_gas', 'has_generator', 'was_cafe', 'has_coffee', 'multi_floor',
                      'has_bar', 'is_merge', 'in_park']
      const govde: Record<string, unknown> = {}
      for (const [k, v] of fd.entries()) if (!BAYRAQ.includes(k)) govde[k] = v
      for (const k of BAYRAQ) govde[k] = fd.get(k) === 'on'

      const r = await fetch(`/api/dashboard/acilis/${layihe.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(govde),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Xəta')
      setRedakte(false)
      router.refresh()
      if (j.sablonYenilensin) {
        alert('Profil dəyişdi. Vəzifə siyahısı AVTOMATİK yenilənmir — dəyişikliyin '
            + 'siyahıya düşməsi üçün «Şablonla uyğunlaşdır» düyməsini basın.')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Naməlum xəta')   // xəta udulmur
    } finally { setBusy(null) }
  }

  /** Silmə — server yalnız ÜZƏRİNDƏ İŞ GÖRÜLMƏMİŞ açılışı silir. */
  async function acilisiSil() {
    if (!confirm(`«${layihe.name}» açılışı silinsin?\n\nÜzərində iş görülübsə server silməyi rədd edəcək.`)) return
    setBusy('sil')
    try {
      const r = await fetch(`/api/dashboard/acilis/${layihe.id}`, { method: 'DELETE' })
      const j = await r.json()
      if (!r.ok) {
        const d = j.detay
        alert(`${j.error}\n\n${d ? `bağlanmış vəzifə: ${d.vezife} · fayl: ${d.fayl} · sifariş: ${d.sifaris}\n\n` : ''}${j.teklif ?? ''}`)
        return
      }
      router.push('/dashboard/acilis')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Naməlum xəta')
    } finally { setBusy(null) }
  }

  async function sablonlaUygunlasdir() {
    setBusy('sync')
    try {
      const on = await fetch(`/api/dashboard/acilis/${layihe.id}/sync?dryRun=1`, { method: 'POST' })
      const p = await on.json()
      if (!on.ok) throw new Error(p.error ?? 'Xəta')

      const yox = p.elave.length + p.silinecek.length + p.yenilenecek + p.saxlanilan.length === 0
      if (yox) { alert('Siyahı artıq şablonla eynidir — dəyişiklik yoxdur.'); return }

      const sr = (b: string, l: string[]) => l.length ? `\n${b} (${l.length}):\n  · ${l.slice(0, 12).join('\n  · ')}${l.length > 12 ? `\n  … və ${l.length - 12} sətir` : ''}` : ''
      const metn = [
        sr('ƏLAVƏ EDİLƏCƏK', p.elave),
        sr('SİLİNƏCƏK (üzərində iş yoxdur)', p.silinecek),
        p.yenilenecek ? `\nQEYD/TARİX YENİLƏNƏCƏK: ${p.yenilenecek} sətir` : '',
        sr('SAXLANILACAQ (şablonda yoxdur, amma üzərində iş var — əl ilə baxın)', p.saxlanilan),
      ].filter(Boolean).join('\n')

      if (!confirm(`Şablonla uyğunlaşdırma:\n${metn}\n\nStatus, şərh və məsul şəxs TOXUNULMUR.\n\nDavam edilsin?`)) return

      const r = await fetch(`/api/dashboard/acilis/${layihe.id}/sync`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Xəta')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Naməlum xəta')   // xəta udulmur
    } finally { setBusy(null) }
  }

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
          {canManage && (
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setRedakte(v => !v)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                {redakte ? 'Bağla' : 'Profili redaktə et'}
              </button>
              <button onClick={() => void acilisiSil()} disabled={busy === 'sil'}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                Sil
              </button>
            </div>
          )}
        </div>
      </div>

      {redakte && canManage && (
        <form className="mt-4 rounded-xl border border-slate-200 bg-white p-4"
              onSubmit={e => { e.preventDefault(); void profilYaz(e.currentTarget) }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profil</p>
          <p className="mt-1 text-xs text-slate-500">
            Profil vəzifə siyahısını müəyyən edir. Dəyişdikdən sonra siyahını yeniləmək
            üçün «Şablonla uyğunlaşdır» basılmalıdır — avtomatik olmur ki, görülmüş iş itməsin.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['name', 'Filial adı', layihe.name, 'text'],
              ['address', 'Ünvan', layihe.address ?? '', 'text'],
              ['zone', 'Rayon / zona', layihe.zone ?? '', 'text'],
              ['planned_open_date', 'Planlanan açılış', layihe.plannedOpenDate ?? '', 'date'],
              ['m2_inside', 'Daxili m²', layihe.m2Inside ?? '', 'number'],
              ['m2_terrace', 'Teras m²', layihe.m2Terrace ?? '', 'number'],
              ['m2_garden', 'Bağça m²', layihe.m2Garden ?? '', 'number'],
            ] as const).map(([ad, etiket, deyer, tip]) => (
              <label key={ad} className="text-sm">
                <span className="block text-xs text-slate-500 mb-1">{etiket}</span>
                <input name={ad} type={tip} defaultValue={String(deyer)} step={tip === 'number' ? '0.1' : undefined}
                       className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              </label>
            ))}
            <label className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">Format</span>
              <select name="format" defaultValue={layihe.format}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                <option value="kuce">küçə</option><option value="mall">mall</option>
                <option value="flagship">flagship</option><option value="kiosk">kiosk</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {([
              ['has_seating', 'oturma', layihe.hasSeating], ['has_terrace', 'teras', layihe.hasTerrace],
              ['has_garden', 'bağça', layihe.hasGarden], ['has_pizza', 'pizza', layihe.hasPizza],
              ['has_delivery', 'çatdırılma', layihe.hasDelivery], ['has_coffee', 'qəhvə', layihe.hasCoffee],
              ['has_bar', 'bar', layihe.hasBar], ['has_gas', 'qaz', layihe.hasGas],
              ['has_generator', 'generator', layihe.hasGenerator], ['multi_floor', 'çox mərtəbə', layihe.multiFloor],
              ['was_cafe', 'keçmiş kafe', layihe.wasCafe], ['is_merge', 'birləşmə', layihe.isMerge],
              ['in_park', 'park içi', layihe.inPark],
            ] as const).map(([ad, etiket, deyer]) => (
              <label key={ad} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" name={ad} defaultChecked={deyer} className="accent-slate-900" />
                {etiket}
              </label>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy === 'profil'}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy === 'profil' ? 'gözləyin…' : 'Yadda saxla'}
            </button>
            <button type="button" onClick={() => setRedakte(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
              İmtina
            </button>
          </div>
        </form>
      )}

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
        {canManage && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button onClick={() => void sablonlaUygunlasdir()} disabled={busy === 'sync'}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {busy === 'sync' ? 'yoxlanılır…' : 'Şablonla uyğunlaşdır'}
            </button>
            <span className="ml-2 text-xs text-slate-500">
              Vəzifələr açılış yaradılanda kopyalanır. Şablon sonradan düzəlsə bu siyahı
              köhnə qalır — düymə onu yeniləyir. Status və şərhlərə toxunmur.
            </span>
          </div>
        )}
      </div>

      <Fayllar openingId={layihe.id} fayllar={fayllar} canManage={canManage} />

      <Sifaris openingId={layihe.id} setirler={sifarisler} canManage={canManage}
               masaSayi={layihe.tableCount} oturacaqSayi={layihe.seats}
               bankoUzunlugu={layihe.counterLenM}
               profil={{ teras: layihe.hasTerrace, bagca: layihe.hasGarden,
                         oturma: layihe.hasSeating, pizza: layihe.hasPizza,
                         catdirilma: layihe.hasDelivery, format: layihe.format }} />

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
