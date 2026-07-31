'use client'

import { useState, useRef, type CSSProperties } from 'react'
import { parseDaily, parsePlan, type PlanResult } from '@/lib/analytics/parse-daily'

type Daily = {
  period: string | null; gun: number; days: string[]
  daily: Record<string, { total: number; wolt: number; bolt: number }>
  branches: Array<{ filial: string; bolge: string | null; total: number; wolt: number; bolt: number }>
  regions: Array<[string, number]>
  pay: { nagd: number; kart: number; wolt: number; bolt: number }
  toplam: number; gedisat: number
}

const money = (n?: number | null) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼')
const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const RCOL: Record<string, string> = { 'İsmayıl': '#C8102E', 'Ramin': '#E07A1F', 'Ceyhun': '#F2A81D', 'Taleh': '#7A8B3F', 'Elnur': '#4A7A6A' }

function Tile({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...card, padding: '13px 15px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, letterSpacing: '-.4px', color: tone ?? '#26221d' }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: '#8b8378', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Chart({ d }: { d: Daily }) {
  const W = 920, H = 200, PL = 42, PR = 10, PT = 12, PB = 22
  const vals = d.days.map(day => d.daily[day].total)
  const del = d.days.map(day => d.daily[day].wolt + d.daily[day].bolt)
  const mx = Math.max(...vals, 1) * 1.08
  const X = (i: number) => PL + (W - PL - PR) * i / Math.max(d.days.length - 1, 1)
  const Y = (v: number) => PT + (H - PT - PB) * (1 - v / mx)
  const line = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'} ${X(i)} ${Y(v)}`).join(' ')
  const area = `${line(vals)} L ${X(vals.length - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }} preserveAspectRatio="none">
      {[0, 1, 2, 3].map(k => { const v = mx * k / 3, y = Y(v); return (
        <g key={k}><line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#efeae0" /><text x={PL - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#8b8378">{Math.round(v / 1000)}k</text></g>) })}
      <path d={area} fill="#C8102E" opacity={0.08} />
      <path d={line(vals)} fill="none" stroke="#C8102E" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={line(del)} fill="none" stroke="#F2A81D" strokeWidth={2} strokeLinejoin="round" />
      {d.days.map((day, i) => (i % 2 === 0 || i === d.days.length - 1) && (
        <text key={day} x={X(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#8b8378">{+day.slice(8, 10)}</text>
      ))}
    </svg>
  )
}

export default function PanelClient() {
  const [files, setFiles] = useState<File[]>([])
  const [d, setD] = useState<Daily | null>(null)
  const [plan, setPlan] = useState<PlanResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [bolgeF, setBolgeF] = useState<string>('')     // bölgə filtresi
  const [ara, setAra] = useState('')                    // filial arama
  const inputRef = useRef<HTMLInputElement>(null)

  function add(list: FileList | null) { if (list) { setFiles(p => [...p, ...Array.from(list)]); setErr(null) } }

  async function run() {
    if (!files.length) return
    setBusy(true); setErr(null)
    try {
      const XLSX = await import('xlsx')
      let daily: Daily | null = null, pl: PlanResult | null = null
      for (const f of files) {
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
        for (const sn of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
          const probe = rows.slice(0, 6).map(r => (r ?? []).join(' ')).join(' ')
          if (!daily && /uçot/i.test(probe)) { const dd = parseDaily(rows); if (dd.days.length) { daily = dd as Daily; break } }
          if (!pl && /filial/i.test(probe) && /\bplan\b/i.test(probe)) { const pp = parsePlan(rows); if (Object.keys(pp.branches).length) { pl = pp; break } }
        }
      }
      if (!daily) throw new Error('Satış detayı (Uçot günü) tapılmadı. Ham detay lazım — Proqnoz/özet deyil.')
      setD(daily); setPlan(pl)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const deliv = d ? d.pay.wolt + d.pay.bolt : 0
  const bolgeler = d ? [...new Set(d.branches.map(b => b.bolge).filter(Boolean))] as string[] : []
  const rows = d ? d.branches.filter(b =>
    (!bolgeF || b.bolge === bolgeF) && (!ara || b.filial.toLowerCase().includes(ara.toLowerCase()))
  ) : []
  const rmax = d ? Math.max(...d.regions.map(r => r[1]), 1) : 1
  const planPct = plan && plan.network.plan ? plan.network.gedisat / plan.network.plan : null

  return (
    <main style={{ padding: '24px 26px 60px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <div style={{ height: 3, background: '#F2A81D', borderRadius: 2, marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>📈 Günlük Panel</h1>
      <p style={{ color: '#8b8378', fontSize: 13, margin: '0 0 20px' }}>Satış detayı (+ plan raporu) at → günlük satış, plana görə, bölgə, delivery, proqnoz.</p>

      {!d && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#F2A81D' : '#d8d2c6', background: drag ? '#fffaf0' : '#faf8f4', padding: '40px 24px', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 34 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{busy ? 'Oxunur…' : 'Satış detayı + plan raporunu bura sürüklə'}</div>
            <div style={{ color: '#8b8378', fontSize: 12, marginTop: 4 }}>.xlsx · satış (Uçot günü) · plan (Plan gerçəkləşmə) — bir neçə fayl</div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsb" multiple hidden onChange={e => add(e.target.files)} />
          </div>
          {files.length > 0 && (
            <div style={{ margin: '12px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {files.map((f, i) => <span key={i} style={{ ...card, padding: '4px 10px', fontSize: 12 }}>📄 {f.name}</span>)}
              <button onClick={() => setFiles([])} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>təmizlə</button>
              <button onClick={run} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: busy ? '#9a9488' : '#26221d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Oxunur…' : 'Panel çıxar →'}</button>
            </div>
          )}
        </>
      )}

      {err && <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '12px 14px', margin: '14px 0', color: '#c8102e', fontSize: 13 }}>⚠ {err}</div>}

      {d && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#8b8378', display: 'flex', justifyContent: 'space-between' }}>
            <span>Dövr {d.period} · {d.gun} gün {plan ? '· plan yükləndi ✓' : ''}</span>
            <button onClick={() => { setD(null); setPlan(null); setFiles([]) }} style={{ background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>başqa fayl</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile k="Toplam satış" v={money(d.toplam)} sub={`${d.gun} gün`} />
            <Tile k="Günlük ort." v={money(d.toplam / d.gun)} />
            <Tile k="Ay proqnozu" v={money(d.gedisat)} sub="gedişat" />
            {planPct != null && <Tile k="Plana görə" v={Math.round(planPct * 100) + '%'} sub={money(plan!.network.plan) + ' plan'} tone={planPct >= 0.98 ? '#1c7a4e' : '#c8102e'} />}
            <Tile k="Delivery" v={d.toplam ? Math.round(deliv / d.toplam * 100) + '%' : '—'} sub="Wolt+Bolt" />
          </div>

          <div style={{ ...card, padding: '16px 16px 8px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>📈 Günlük satış</div>
            <Chart d={d} />
            <div style={{ fontSize: 11.5, color: '#8b8378', display: 'flex', gap: 14 }}>
              <span><span style={{ display: 'inline-block', width: 11, height: 3, background: '#C8102E', verticalAlign: 'middle', marginRight: 4 }} />Satış</span>
              <span><span style={{ display: 'inline-block', width: 11, height: 3, background: '#F2A81D', verticalAlign: 'middle', marginRight: 4 }} />Delivery</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ ...card, padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>🗺️ Bölgə satış</div>
              {d.regions.map(([r, v]) => (
                <div key={r} style={{ margin: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}><span>{r}</span><b>{money(v)}</b></div>
                  <div style={{ height: 8, background: '#faf7f1', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${v / rmax * 100}%`, height: '100%', background: RCOL[r] ?? '#8b8378', borderRadius: 99 }} /></div>
                </div>
              ))}
            </div>
            <div style={{ ...card, padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>💳 Ödəniş qarışığı</div>
              {([['Nağd', d.pay.nagd, '#1C7A4E'], ['Kart', d.pay.kart, '#C8102E'], ['Wolt', d.pay.wolt, '#E07A1F'], ['Bolt', d.pay.bolt, '#F2A81D']] as const).map(([n, v, c]) => {
                const t = d.pay.nagd + d.pay.kart + d.pay.wolt + d.pay.bolt || 1
                return (
                  <div key={n} style={{ margin: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}><span>{n}</span><b>{(v / t * 100).toFixed(1)}%</b></div>
                    <div style={{ height: 8, background: '#faf7f1', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${v / t * 100}%`, height: '100%', background: c, borderRadius: 99 }} /></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filtre */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Filial axtar…" style={{ ...card, padding: '7px 12px', fontSize: 13, minWidth: 160 }} />
            <button onClick={() => setBolgeF('')} style={{ ...card, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', background: bolgeF ? '#fff' : '#26221d', color: bolgeF ? '#26221d' : '#fff', border: 'none' }}>Hamısı</button>
            {bolgeler.map(b => (
              <button key={b} onClick={() => setBolgeF(b)} style={{ ...card, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', background: bolgeF === b ? RCOL[b] ?? '#26221d' : '#fff', color: bolgeF === b ? '#fff' : '#26221d', border: '1px solid #e6e1d7' }}>{b}</button>
            ))}
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: plan ? 620 : 480 }}>
                <thead><tr>
                  {['Filial', 'Bölgə', 'Satış', ...(plan ? ['Plan%'] : []), 'Wolt', 'Bolt'].map((h, i) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: i < 2 ? 'left' : 'right', fontSize: 10.5, textTransform: 'uppercase', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map(b => {
                    const pb = plan?.branches[b.filial]
                    const pp = pb && pb.plan ? pb.gedisat / pb.plan : null
                    return (
                      <tr key={b.filial}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid #efeae0' }}>{b.filial}</td>
                        <td style={{ padding: '8px 10px', color: '#8b8378', borderBottom: '1px solid #efeae0' }}>{b.bolge ?? '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(b.total)}</td>
                        {plan && <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontWeight: 700, color: pp == null ? '#8b8378' : pp >= 0.98 ? '#1c7a4e' : '#c8102e', fontVariantNumeric: 'tabular-nums' }}>{pp != null ? Math.round(pp * 100) + '%' : '—'}</td>}
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(b.wolt)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(b.bolt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
