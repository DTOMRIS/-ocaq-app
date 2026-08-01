'use client'

import { useState, useRef, type CSSProperties } from 'react'
import { parseMenu, type MenuResult, type MenuProduct } from '@/lib/analytics/parse-menu'

const azn = (n?: number | null) => (n == null ? '—' : n.toFixed(2) + ' ₼')
const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const td: CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }
const th: CSSProperties = { padding: '8px 10px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }

function fcColor(fc: number) { return fc > 0.40 ? '#c8102e' : fc < 0.25 ? '#1c7a4e' : '#8a6d1f' }

function Tile({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div style={{ ...card, padding: '13px 15px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: tone ?? '#26221d' }}>{v}</div>
    </div>
  )
}

function Row({ p }: { p: MenuProduct }) {
  return (
    <tr>
      <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{p.mehsul}{p.variant ? ` · ${p.variant}` : ''}</td>
      <td style={{ ...td, textAlign: 'left', color: '#8b8378' }}>{p.kateqoriya}</td>
      <td style={{ ...td, textAlign: 'right' }}>{azn(p.qiymet)}</td>
      <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{azn(p.maya)}</td>
      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: fcColor(p.foodCost) }}>{Math.round(p.foodCost * 100)}%</td>
      <td style={{ ...td, textAlign: 'right' }}>{azn(p.marja)}</td>
    </tr>
  )
}

export default function MenyuClient() {
  const [m, setM] = useState<MenuResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [kat, setKat] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function run(f: File | null) {
    if (!f) return
    setBusy(true); setErr(null)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
      let res: MenuResult | null = null
      for (const sn of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
        const mm = parseMenu(rows)   // hər sheet-i birbaşa dene (başlıq harda olursa)
        if (mm.products.length) { res = mm; break }
      }
      if (!res) throw new Error(`Menü analizi tapılmadı. Faylda sheet-lər: ${wb.SheetNames.join(', ')}. "Maya və Qiymət Analizi" faylını (Menyu Analizi + Kateqoriya/Food Cost sütunları) yükləyin.`)
      setM(res)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const kats = m ? [...new Set(m.products.map(p => p.kateqoriya).filter(Boolean))] : []
  const rows = m ? m.products.filter(p => !kat || p.kateqoriya === kat).sort((a, b) => b.foodCost - a.foodCost) : []
  const kritik = m ? m.products.filter(p => p.foodCost > 0.40).sort((a, b) => b.foodCost - a.foodCost) : []

  return (
    <div style={{ padding: '8px 2px 56px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <style>{`@media print { button, input { display: none !important } @page { margin: 12mm; size: A4 } }`}</style>
      <div style={{ height: 3, background: '#F2A81D', borderRadius: 2, marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>🍔 Menü / Food Cost</h1>
      <p style={{ color: '#8b8378', fontSize: 13, margin: '0 0 20px' }}>Maya və Qiymət analizini at → hər məhsul food cost, kritik məhsullar, marja.</p>

      {!m && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); run(e.dataTransfer.files?.[0] ?? null) }}
          onClick={() => inputRef.current?.click()}
          style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#F2A81D' : '#d8d2c6', background: drag ? '#fffaf0' : '#faf8f4', padding: '44px 24px', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 34 }}>🍔</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{busy ? 'Oxunur…' : 'Maya və Qiymət Analizini bura sürüklə'}</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 4 }}>.xlsx · Menyu Analizi (Kateqoriya · Qiymət · Maya · Food Cost)</div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={e => run(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {err && <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '12px 14px', margin: '14px 0', color: '#c8102e', fontSize: 13 }}>⚠ {err}</div>}

      {m && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#8b8378', display: 'flex', justifyContent: 'space-between' }}>
            <span>{m.summary.n} məhsul · hədəf food cost %30</span>
            <button onClick={() => setM(null)} style={{ background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>başqa fayl</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile k="Ort. food cost" v={`${Math.round(m.summary.avgFoodCost * 100)}%`} tone={m.summary.avgFoodCost <= 0.30 ? '#1c7a4e' : '#c8102e'} />
            <Tile k="Kritik (>%40)" v={`${m.summary.kritik}`} tone="#c8102e" />
            <Tile k="Əla (<%25)" v={`${m.summary.ela}`} tone="#1c7a4e" />
            <Tile k="Ən pis" v={m.summary.enPis ? `${Math.round(m.summary.enPis.foodCost * 100)}%` : '—'} tone="#c8102e" />
          </div>

          {kritik.length > 0 && (
            <div style={{ ...card, borderColor: '#f0c9cf', overflow: 'hidden' }}>
              <div style={{ padding: '12px 15px', fontWeight: 800, fontSize: 13, color: '#c8102e', background: '#fdf2f3' }}>🔴 Kritik məhsullar ({kritik.length}) — food cost {'>'}%40, qiymət/maya baxılmalı</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 560 }}>
                  <thead><tr><th style={{ ...th, textAlign: 'left' }}>Məhsul</th><th style={{ ...th, textAlign: 'left' }}>Kateqoriya</th><th style={{ ...th, textAlign: 'right' }}>Qiymət</th><th style={{ ...th, textAlign: 'right' }}>Maya</th><th style={{ ...th, textAlign: 'right' }}>Food Cost</th><th style={{ ...th, textAlign: 'right' }}>Marja</th></tr></thead>
                  <tbody>{kritik.map((p, i) => <Row key={i} p={p} />)}</tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setKat('')} style={{ ...card, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', background: kat ? '#fff' : '#26221d', color: kat ? '#26221d' : '#fff', border: 'none' }}>Hamısı</button>
            {kats.map(k => <button key={k} onClick={() => setKat(k)} style={{ ...card, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', background: kat === k ? '#26221d' : '#fff', color: kat === k ? '#fff' : '#26221d', border: '1px solid #e6e1d7' }}>{k}</button>)}
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 560 }}>
                <thead><tr><th style={{ ...th, textAlign: 'left' }}>Məhsul</th><th style={{ ...th, textAlign: 'left' }}>Kateqoriya</th><th style={{ ...th, textAlign: 'right' }}>Qiymət</th><th style={{ ...th, textAlign: 'right' }}>Maya</th><th style={{ ...th, textAlign: 'right' }}>Food Cost</th><th style={{ ...th, textAlign: 'right' }}>Marja</th></tr></thead>
                <tbody>{rows.map((p, i) => <Row key={i} p={p} />)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
