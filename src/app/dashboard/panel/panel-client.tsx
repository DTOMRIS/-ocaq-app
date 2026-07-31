'use client'

import { useState, useRef, type CSSProperties } from 'react'
import { parseDaily } from '@/lib/analytics/parse-daily'

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

function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: '13px 15px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 21, fontWeight: 800, marginTop: 4, letterSpacing: '-.4px' }}>{v}</div>
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
  const [d, setD] = useState<Daily | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function run(f: File | null) {
    if (!f) return
    setBusy(true); setErr(null)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: null }) as unknown[][]
      const data = parseDaily(rows)
      if (!data.days.length) throw new Error('Günlük satış tapılmadı — ham satış detayı (Uçot günü) gözlənilir. Proqnoz/özet fayl deyil.')
      setD(data as Daily)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const deliv = d ? d.pay.wolt + d.pay.bolt : 0
  const rmax = d ? Math.max(...d.regions.map(r => r[1]), 1) : 1

  return (
    <main style={{ padding: '24px 26px 60px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <div style={{ height: 3, background: '#F2A81D', borderRadius: 2, marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>📈 Günlük Panel</h1>
      <p style={{ color: '#8b8378', fontSize: 13, margin: '0 0 20px' }}>Satış detayını (Uçot günü + Ödəniş növü) at → günlük satış, bölgə, delivery, proqnoz.</p>

      {!d && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); run(e.dataTransfer.files?.[0] ?? null) }}
          onClick={() => inputRef.current?.click()}
          style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#F2A81D' : '#d8d2c6', background: drag ? '#fffaf0' : '#faf8f4', padding: '44px 24px', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 36 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{busy ? 'Oxunur…' : 'Satış Excel-ini bura sürüklə'}</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 4 }}>.xlsx · filial × gün × ödəniş növü</div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={e => run(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {err && <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '12px 14px', margin: '14px 0', color: '#c8102e', fontSize: 13 }}>⚠ {err}</div>}

      {d && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#8b8378', display: 'flex', justifyContent: 'space-between' }}>
            <span>Dövr {d.period} · {d.gun} gün</span>
            <button onClick={() => setD(null)} style={{ background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>başqa fayl</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile k="Toplam satış" v={money(d.toplam)} sub={`${d.gun} gün`} />
            <Tile k="Günlük ort." v={money(d.toplam / d.gun)} />
            <Tile k="Ay proqnozu" v={money(d.gedisat)} sub="gedişat" />
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

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 480 }}>
                <thead><tr>
                  {['Filial', 'Bölgə', 'Satış', 'Wolt', 'Bolt'].map((h, i) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: i < 2 ? 'left' : 'right', fontSize: 10.5, textTransform: 'uppercase', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {d.branches.map(b => (
                    <tr key={b.filial}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid #efeae0' }}>{b.filial}</td>
                      <td style={{ padding: '8px 10px', color: '#8b8378', borderBottom: '1px solid #efeae0' }}>{b.bolge ?? '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(b.total)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(b.wolt)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(b.bolt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
