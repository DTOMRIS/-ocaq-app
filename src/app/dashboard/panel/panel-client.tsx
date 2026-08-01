'use client'

import { useState, useRef, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { parseDaily, parseOlap, parsePlan, parseYoy, type PlanResult, type YoyResult } from '@/lib/analytics/parse-daily'

const AY_ADI = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const donemAdi = (p: string) => { const [y, m] = p.split('-'); return `${AY_ADI[+m] ?? m} ${y}` }

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

export default function PanelClient({ initial, targets = {}, canUpload = false, savedAt = null, periods = [], selectedPeriod = null }: {
  initial?: { daily: unknown; plan: unknown; yoy?: unknown } | null; targets?: Record<string, number>; canUpload?: boolean; savedAt?: string | null; periods?: string[]; selectedPeriod?: string | null
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [d, setD] = useState<Daily | null>((initial?.daily as Daily) ?? null)
  const [plan, setPlan] = useState<PlanResult | null>((initial?.plan as PlanResult) ?? null)
  const [yoy, setYoy] = useState<YoyResult | null>((initial?.yoy as YoyResult) ?? null)
  const [saved, setSaved] = useState(false)
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
      let daily: Daily | null = null, pl: PlanResult | null = null, yo: YoyResult | null = null
      for (const f of files) {
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
        for (const sn of wb.SheetNames) {  // gedişat raporu: plan + yoy ayrı sheet-lərdə → break yox
          const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
          const probe = rows.slice(0, 6).map(r => (r ?? []).join(' ')).join(' ')
          if (!daily && /uçot/i.test(probe)) { const dd = parseDaily(rows); if (dd.days.length) daily = dd as Daily }
          else if (!daily && /(müəssisə|ticarət)/i.test(probe) && /(ödəniş|ödeniş|növ)/i.test(probe) && !/uçot/i.test(probe)) { const oo = parseOlap(rows); if (oo.branches.length) daily = oo as Daily }
          else if (!pl && /filial/i.test(probe) && /\bplan\b/i.test(probe)) { const pp = parsePlan(rows); if (Object.keys(pp.branches).length) pl = pp }
          else if (!yo && /filial/i.test(probe) && /2025/.test(probe)) { const yy = parseYoy(rows); if (Object.keys(yy.branches).length) yo = yy }
        }
      }
      if (!daily) throw new Error('Satış tapılmadı. Ham satış detayı (Uçot günü) və ya OLAP Hesabatı (filial × ödəniş növü) lazım — Proqnoz deyil.')
      setD(daily); setPlan(pl); setYoy(yo)
      // avtomatik yadda saxla → qalıcı olsun, bir daha yükləmə lazım olmasın
      try {
        const brs = daily.branches.map(b => ({ filial: b.filial, bolge: b.bolge, total: b.total, wolt: b.wolt, bolt: b.bolt, plan: pl?.branches[b.filial]?.plan, gedisat: pl?.branches[b.filial]?.gedisat }))
        const r = await fetch('/api/dashboard/analytics/panel-save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period: daily.period, toplam: daily.toplam, daily, plan: pl, yoy: yo, branches: brs }) })
        if (r.ok) setSaved(true)
      } catch { /* saxlama xətası paneli pozmasın */ }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const deliv = d ? d.pay.wolt + d.pay.bolt : 0
  const bolgeler = d ? [...new Set(d.branches.map(b => b.bolge).filter(Boolean))] as string[] : []
  const rows = d ? d.branches.filter(b =>
    (!bolgeF || b.bolge === bolgeF) && (!ara || b.filial.toLowerCase().includes(ara.toLowerCase()))
  ) : []
  const rmax = d ? Math.max(...d.regions.map(r => r[1]), 1) : 1
  // Hədəf: plan faylı (Plana görə) VEYA manuel /sales hədəfləri (sales_targets)
  const netTarget = (plan?.network.plan ?? 0) || Object.values(targets).reduce((a, b) => a + b, 0)
  const netTargetPct = netTarget && d ? d.gedisat / netTarget : null
  const hasTarget = netTarget > 0
  const branchTarget = (b: { filial: string; total: number }): { pct: number | null } => {
    const pb = plan?.branches[b.filial]
    if (pb && pb.plan) return { pct: pb.gedisat / pb.plan }
    const t = targets[b.filial]
    if (t && d) return { pct: (d.gun ? b.total / d.gun * 31 : b.total) / t }
    return { pct: null }
  }
  const netYoyPct = yoy && yoy.network.y2025 ? yoy.network.y2026 / yoy.network.y2025 - 1 : null
  const branchYoy = (b: { filial: string }): number | null => {
    const yb = yoy?.branches[b.filial]
    return yb && yb.y2025 ? yb.y2026 / yb.y2025 - 1 : null
  }
  // Diqqət istəyən filiallar: hədəf %90 altı VEYA keçən ilə görə %5+ düşən
  const flagged = d ? d.branches.map(b => {
    const t = branchTarget(b).pct, y = branchYoy(b)
    const r: string[] = []
    if (t != null && t < 0.90) r.push(`hədəf %${Math.round(t * 100)}`)
    if (y != null && y < -0.05) r.push(`keçən ilə ${Math.round(y * 100)}%`)
    return { filial: b.filial, r }
  }).filter(x => x.r.length).sort((a, b) => b.r.length - a.r.length) : []

  // ── Plan vs Gerçək · Tutturma (plan faylı gedişat/plan VEYA sales_targets) ──
  const tutStat = (pct: number | null) => pct == null ? null : pct >= 1 ? 'hit' : pct >= 0.9 ? 'edge' : 'miss'
  const TUT: Record<string, { bg: string; c: string; t: (p: number) => string }> = {
    hit: { bg: '#dcfce7', c: '#166534', t: p => `✓ %${p}` },
    edge: { bg: '#fef9c3', c: '#854d0e', t: p => `~ %${p}` },
    miss: { bg: '#fee2e2', c: '#991b1b', t: p => `✗ %${p}` },
  }
  const tutList = d ? d.branches.map(b => {
    const pb = plan?.branches[b.filial]
    const planV = (pb && pb.plan) ? pb.plan : (targets[b.filial] ?? 0)
    const actualV = b.total                          // yüklənən satış = gerçək
    const pct = planV ? actualV / planV : null
    return { filial: b.filial, bolge: b.bolge, planV, actualV, diff: actualV - planV, pct }
  }).filter(x => x.planV > 0) : []
  const tutNet = tutList.reduce((a, t) => ({ plan: a.plan + t.planV, actual: a.actual + t.actualV }), { plan: 0, actual: 0 })
  const tutRegions = (() => {
    const m: Record<string, { plan: number; actual: number }> = {}
    tutList.forEach(t => { const r = (m[t.bolge ?? '—'] ??= { plan: 0, actual: 0 }); r.plan += t.planV; r.actual += t.actualV })
    return Object.entries(m).map(([bolge, v]) => ({ bolge, ...v, pct: v.plan ? v.actual / v.plan : null })).sort((a, b) => (a.pct ?? 9) - (b.pct ?? 9))
  })()
  const tutRows = [...tutList].sort((a, b) => (a.pct ?? 9) - (b.pct ?? 9))

  return (
    <main style={{ padding: '24px 26px 60px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <style>{`@media print { button, input { display: none !important } body { background: #fff } @page { margin: 12mm; size: A4 } }`}</style>
      <div style={{ height: 3, background: '#F2A81D', borderRadius: 2, marginBottom: 16 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>📈 Günlük Panel</h1>
          <p style={{ color: '#8b8378', fontSize: 13, margin: '0 0 20px' }}>Satış detayı (+ plan raporu) at → günlük satış, plana görə, bölgə, delivery, proqnoz.</p>
        </div>
        {periods.length > 0 && (
          <label className="no-print" style={{ fontSize: 12, color: '#8b8378', display: 'flex', alignItems: 'center', gap: 6 }}>
            🗓️ Dövr:
            <select value={selectedPeriod ?? ''} onChange={e => router.push(`/dashboard/panel?period=${e.target.value}`)}
              style={{ ...card, padding: '6px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#26221d' }}>
              {periods.map(p => <option key={p} value={p}>{donemAdi(p)}</option>)}
            </select>
          </label>
        )}
      </div>

      {!d && !canUpload && (
        <div style={{ ...card, padding: '44px 24px', textAlign: 'center', color: '#8b8378', fontSize: 13.5 }}>
          Hələ panel məlumatı yüklənməyib. Sistem admini aylıq satışı yükləyəndə burada görünəcək.
        </div>
      )}
      {!d && canUpload && (
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
          <div style={{ fontSize: 12, color: '#8b8378', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span>Dövr {d.period} · {d.gun} gün {plan ? '· plan ✓' : ''} {saved ? '· yadda saxlanıldı ✓' : savedAt ? `· ${savedAt} yüklənib` : ''}</span>
            <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="no-print" onClick={() => window.print()} style={{ background: 'none', border: 'none', color: '#26221d', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontWeight: 600 }}>🖨️ Çap / PDF</button>
              {canUpload && <button className="no-print" onClick={() => { setD(null); setPlan(null); setYoy(null); setFiles([]); setSaved(false) }} style={{ background: 'none', border: 'none', color: '#c8102e', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontWeight: 600 }}>↻ yeni ay yüklə</button>}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile k="Toplam satış" v={money(d.toplam)} sub={`${d.gun} gün`} />
            <Tile k="Günlük ort." v={money(d.toplam / d.gun)} />
            <Tile k="Ay proqnozu" v={money(d.gedisat)} sub="gedişat" />
            {netTargetPct != null && <Tile k="Hədəfə görə" v={Math.round(netTargetPct * 100) + '%'} sub={money(netTarget) + ' hədəf'} tone={netTargetPct >= 0.98 ? '#1c7a4e' : '#c8102e'} />}
            {netYoyPct != null && <Tile k="Keçən ilə" v={(netYoyPct >= 0 ? '+' : '') + Math.round(netYoyPct * 100) + '%'} sub="2026 vs 2025" tone={netYoyPct >= 0 ? '#1c7a4e' : '#c8102e'} />}
            <Tile k="Delivery" v={d.toplam ? Math.round(deliv / d.toplam * 100) + '%' : '—'} sub="Wolt+Bolt" />
          </div>

          {flagged.length > 0 && (
            <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '13px 15px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#c8102e', marginBottom: 6 }}>🚨 Diqqət istəyən filiallar ({flagged.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {flagged.map(f => (
                  <span key={f.filial} style={{ background: '#fff', border: '1px solid #f0c9cf', borderRadius: 8, padding: '3px 9px', fontSize: 12 }}>
                    <b>{f.filial}</b> <span style={{ color: '#8a3a3a' }}>{f.r.join(' · ')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {tutList.length > 0 && (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #efeae0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>🎯 Plan vs Gerçək · Tutturma</div>
                <div style={{ fontSize: 12.5, color: '#8b8378' }}>
                  Plan <b style={{ color: '#26221d' }}>{money(tutNet.plan)}</b> · Gerçək <b style={{ color: '#26221d' }}>{money(tutNet.actual)}</b> · {(() => {
                    const p = tutNet.plan ? Math.round(tutNet.actual / tutNet.plan * 100) : 0, s = tutStat(tutNet.plan ? tutNet.actual / tutNet.plan : null)
                    return <span style={{ fontWeight: 800, color: s ? TUT[s].c : '#8b8378' }}>{s ? TUT[s].t(p) : '—'}</span>
                  })()}
                </div>
              </div>

              {/* Bölgə özeti — bölgələrə rapor üçün */}
              <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #efeae0', background: '#faf8f4' }}>
                {tutRegions.map(r => { const s = tutStat(r.pct), p = r.pct != null ? Math.round(r.pct * 100) : 0; return (
                  <span key={r.bolge} style={{ background: '#fff', border: '1px solid #e6e1d7', borderRadius: 8, padding: '5px 10px', fontSize: 12 }}>
                    <b>{r.bolge}</b> · {money(r.actual)}/{money(r.plan)} <span style={{ fontWeight: 800, color: s ? TUT[s].c : '#8b8378' }}>{s ? TUT[s].t(p) : ''}</span>
                  </span>
                )})}
              </div>

              {/* Filial-filial */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 560 }}>
                  <thead><tr>
                    {['Filial', 'Bölgə', 'Plan', 'Gerçək', 'Fərq', 'Tutturma'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: i < 2 ? 'left' : 'right', fontSize: 10.5, textTransform: 'uppercase', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {tutRows.map(t => { const s = tutStat(t.pct), p = t.pct != null ? Math.round(t.pct * 100) : 0; return (
                      <tr key={t.filial}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid #efeae0' }}>{t.filial}</td>
                        <td style={{ padding: '8px 10px', color: '#8b8378', borderBottom: '1px solid #efeae0' }}>{t.bolge ?? '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(t.planV)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(t.actualV)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums', color: t.diff >= 0 ? '#1c7a4e' : '#c8102e' }}>{t.diff >= 0 ? '+' : ''}{money(t.diff)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0' }}>
                          {s ? <span style={{ background: TUT[s].bg, color: TUT[s].c, borderRadius: 7, padding: '2px 8px', fontWeight: 700, fontSize: 11.5 }}>{TUT[s].t(p)}</span> : '—'}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {d.days.length > 0 ? (
            <div style={{ ...card, padding: '16px 16px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>📈 Günlük satış</div>
              <Chart d={d} />
              <div style={{ fontSize: 11.5, color: '#8b8378', display: 'flex', gap: 14 }}>
                <span><span style={{ display: 'inline-block', width: 11, height: 3, background: '#C8102E', verticalAlign: 'middle', marginRight: 4 }} />Satış</span>
                <span><span style={{ display: 'inline-block', width: 11, height: 3, background: '#F2A81D', verticalAlign: 'middle', marginRight: 4 }} />Delivery</span>
              </div>
            </div>
          ) : (
            <div style={{ ...card, padding: '13px 16px', fontSize: 12.5, color: '#8b8378' }}>
              📄 Aylıq özet (OLAP) — günlük detay yoxdur. Günlük qrafik üçün <b>Uçot günü</b> olan satış detayını yükləyin.
            </div>
          )}

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
                  {['Filial', 'Bölgə', 'Satış', ...(hasTarget ? ['Hədəf%'] : []), ...(yoy ? ['YoY'] : []), 'Wolt %', 'Bolt %'].map((h, i) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: i < 2 ? 'left' : 'right', fontSize: 10.5, textTransform: 'uppercase', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map(b => {
                    const pp = branchTarget(b).pct
                    const yp = branchYoy(b)
                    return (
                      <tr key={b.filial}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid #efeae0' }}>{b.filial}</td>
                        <td style={{ padding: '8px 10px', color: '#8b8378', borderBottom: '1px solid #efeae0' }}>{b.bolge ?? '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{money(b.total)}</td>
                        {hasTarget && <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontWeight: 700, color: pp == null ? '#8b8378' : pp >= 0.98 ? '#1c7a4e' : '#c8102e', fontVariantNumeric: 'tabular-nums' }}>{pp != null ? Math.round(pp * 100) + '%' : '—'}</td>}
                        {yoy && <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontWeight: 700, color: yp == null ? '#8b8378' : yp >= 0 ? '#1c7a4e' : '#c8102e', fontVariantNumeric: 'tabular-nums' }}>{yp != null ? (yp >= 0 ? '+' : '') + Math.round(yp * 100) + '%' : '—'}</td>}
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{b.total ? (b.wolt / b.total * 100).toFixed(1) + '%' : '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }}>{b.total ? (b.bolt / b.total * 100).toFixed(1) + '%' : '—'}</td>
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
