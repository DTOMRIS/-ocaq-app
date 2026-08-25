'use client'

import { useState, useRef, type CSSProperties } from 'react'
import {
  reconcile, parseUnibankRepHtml, parseATBRows, parseCardSalesRows, parseKapitalPosRows,
  type BankByBranch,
} from '@/lib/analytics/bank-reconcile'

function mergeInto(dst: BankByBranch, src: BankByBranch) { for (const k in src) dst[k] = (dst[k] ?? 0) + src[k] }

type ReconRow = {
  filial: string; kartSatis: number; unibank: number; atb: number; kapital: number
  bankaCemi: number; ortu: number | null; qalan: number
  status: 'over' | 'missing' | 'full' | 'partial' | 'closed'
}
type Result = {
  rows: ReconRow[]
  network: { kartSatis: number; unibank: number; atb: number; kapital: number; ortu: number | null }
  tanindi: string[]; atlanan: string[]
}

const money = (n?: number | null) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼')
const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const th: CSSProperties = { textAlign: 'right', padding: '8px 9px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.3px', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }
const td: CSSProperties = { padding: '8px 9px', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }

const STAT: Record<ReconRow['status'], { t: string; c: string; bg?: string }> = {
  over: { t: '🔴 Banka > satış', c: '#c8102e', bg: '#fdecec' },
  missing: { t: '⚠ Bankaya düşməyib', c: '#c8102e', bg: '#fdecec' },
  full: { t: '✓ tam', c: '#1c7a4e' },
  partial: { t: '○ qismən', c: '#8b8378' },
  closed: { t: '— bağlı', c: '#8b8378' },
}

function Tile({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div style={{ ...card, padding: '11px 14px 12px', flex: 1, minWidth: 120, borderTop: `3px solid ${tone ?? '#e2dccf'}`, boxShadow: '0 1px 3px rgba(38,34,29,.04)' }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4, color: tone ?? '#26221d', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
    </div>
  )
}

export default function KasaBankaClient() {
  const [files, setFiles] = useState<File[]>([])
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Banka çıxarışı DÖVR üzrədir — hesablama nəticəsi bu dövrə yazılır.
  // Standart: cari ayın 1-i → bu gün. İstifadəçi dəyişə bilər.
  const today = new Date()
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const [pStart, setPStart] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [pEnd, setPEnd] = useState(iso(today))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ written: number; unmatched: string[] } | null>(null)

  function add(list: FileList | null) { if (list) { setFiles(p => [...p, ...Array.from(list)]); setErr(null) } }

  async function run() {
    if (!files.length) return
    setBusy(true); setErr(null)
    try {
      const XLSX = await import('xlsx')
      const cardB: BankByBranch = {}, unibank: BankByBranch = {}, atb: BankByBranch = {}, kapital: BankByBranch = {}
      const tanindi: string[] = [], atlanan: string[] = []
      for (const f of files) {
        try {
          const buf = await f.arrayBuffer()
          const bytes = new Uint8Array(buf)
          const head = new TextDecoder().decode(bytes.slice(0, 400)).toLowerCase()
          if (head.includes('<html') || head.includes('<table')) {
            mergeInto(unibank, parseUnibankRepHtml(await f.text())); tanindi.push(`${f.name} → Unibank`); continue
          }
          const wb = XLSX.read(bytes, { type: 'array' })
          let done = ''
          for (const sn of wb.SheetNames) {
            const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
            const probe = rows.slice(0, 20).map(r => (r ?? []).join(' ')).join(' ')
            if (/terminal nömrəsi/i.test(probe)) { mergeInto(kapital, parseKapitalPosRows(rows)); done = 'Kapital POS'; break }
            if (/təsvir/i.test(probe) && /card no/i.test(probe)) { mergeInto(atb, parseATBRows(rows)); done = 'ATB'; break }
            if (/uçot/i.test(probe)) { mergeInto(cardB, parseCardSalesRows(rows)); done = 'satış (kart)'; break }
          }
          if (done) tanindi.push(`${f.name} → ${done}`)
          else atlanan.push(`${f.name} (məzmun tanınmadı)`)
        } catch { atlanan.push(`${f.name} (oxuna bilmədi)`) }
      }
      if (!tanindi.length) throw new Error('Heç bir fayl tanınmadı. Unibank REP, ATB, Kapital POS və ya satış detayı gözlənilir.')
      setRes({ ...reconcile(cardB, unibank, atb, kapital), tanindi, atlanan })
      setSaved(null)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  /**
   * Nəticəni bazaya yazır. ƏVVƏL YOXDU: hesablama yalnız ekranda qalırdı,
   * səhifə bağlananda itirdi və keçmiş yığılmırdı — «bu filial hər ay əskik
   * verir» sualı cavabsız qalırdı.
   */
  async function save() {
    if (!res || !res.rows.length) return
    setSaving(true); setErr(null)
    try {
      const r = await fetch('/api/dashboard/kasa-banka/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: pStart, periodEnd: pEnd,
          source: files.map(f => f.name).join(', ').slice(0, 120) || null,
          rows: res.rows.map(x => ({
            filial: x.filial, cardSales: x.kartSatis, unibank: x.unibank,
            atb: x.atb, kapital: x.kapital, bankTotal: x.bankaCemi,
            diff: x.qalan, status: x.status,
          })),
        }),
      })
      const j = await r.json()
      // Xəta UDULMUR — serverin teşhis məlumatı göstərilir.
      if (!r.ok) throw new Error(`${j?.error ?? 'Yazma xətası'}${j?.detail ? ` — ${j.detail}` : ''}`)
      setSaved({ written: Number(j.written ?? 0), unmatched: (j.unmatchedBranches ?? []) as string[] })
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setSaving(false) }
  }

  const flagged = res?.rows.filter(x => x.status === 'over' || x.status === 'missing') ?? []

  return (
    <div style={{ padding: '8px 2px 56px', maxWidth: 1080, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <style>{`.kbtbl tbody tr:hover td { filter: brightness(0.97) }`}</style>
      <div style={{ height: 3, background: '#F2A81D', borderRadius: 2, marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>🏦 Kasa / Banka Mutabakatı</h1>
      <p style={{ color: '#8b8378', fontSize: 13, margin: '0 0 20px' }}>
        Banka dökümləri (Unibank REP, ATB, Kapital POS) + satış detayını at → hər filial: kart satış = bankaya düşən mi.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#F2A81D' : '#d8d2c6', background: drag ? '#fffaf0' : '#faf8f4', padding: '30px 24px', textAlign: 'center', cursor: 'pointer' }}
      >
        <div style={{ fontSize: 30 }}>🏦</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>Banka + satış Excel-lərini bura sürüklə</div>
        <div style={{ color: '#8b8378', fontSize: 12, marginTop: 4 }}>Unibank REP · ATB · Kapital POS (.xls/.xlsb/.xlsx) · satış detayı — bir neçə fayl birdən</div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsb" multiple hidden onChange={e => add(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div style={{ margin: '12px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {files.map((f, i) => <span key={i} style={{ ...card, padding: '4px 10px', fontSize: 12 }}>📄 {f.name}</span>)}
          <button onClick={() => { setFiles([]); setRes(null) }} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>təmizlə</button>
          <button onClick={run} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: busy ? '#9a9488' : '#26221d', color: '#fff', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Hesablanır…' : 'Mutabakatı çıxar →'}
          </button>
        </div>
      )}

      {err && <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '12px 14px', margin: '14px 0', color: '#c8102e', fontSize: 13 }}>⚠ {err}</div>}

      {res && (
        <div style={{ ...card, padding: 13, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Dövr:</span>
          <input type="date" value={pStart} onChange={e => { setPStart(e.target.value); setSaved(null) }}
            style={{ padding: '6px 9px', borderRadius: 8, border: '1px solid #d8d2c6', fontSize: 13 }} />
          <span style={{ color: '#8b8378' }}>→</span>
          <input type="date" value={pEnd} onChange={e => { setPEnd(e.target.value); setSaved(null) }}
            style={{ padding: '6px 9px', borderRadius: 8, border: '1px solid #d8d2c6', fontSize: 13 }} />
          <span style={{ fontSize: 11.5, color: '#8b8378' }}>banka çıxarışının əhatə etdiyi aralıq</span>
          {saved ? (
            <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#1f5130', fontWeight: 700 }}>
              ✓ yazıldı — {saved.written} filial
              {saved.unmatched.length > 0 && ` · tapılmayan: ${saved.unmatched.join(', ')}`}
            </span>
          ) : (
            <button onClick={save} disabled={saving || !pStart || !pEnd}
              style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 10, border: 'none', background: saving ? '#9a9488' : '#C8102E', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'yazılır…' : 'bazaya yaz'}
            </button>
          )}
        </div>
      )}

      {res && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#8b8378' }}>✓ Oxunan: {res.tanindi.join(' · ')}</div>
          {res.atlanan.length > 0 && (
            <div style={{ ...card, borderColor: '#f0e2c0', background: '#fffdf5', padding: '9px 12px', fontSize: 12, color: '#8a6d1f' }}>⚠ Atlanan: {res.atlanan.join(' · ')}</div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile k="Kart satış" v={money(res.network.kartSatis)} />
            <Tile k="Unibank" v={money(res.network.unibank)} />
            <Tile k="ATB" v={money(res.network.atb)} />
            <Tile k="Kapital" v={money(res.network.kapital)} />
            <Tile k="Bankada örtü" v={res.network.ortu != null ? Math.round(res.network.ortu * 100) + '%' : '—'} tone="#1c7a4e" />
          </div>

          {res.network.kartSatis === 0 && (
            <div style={{ ...card, borderColor: '#f0e2c0', background: '#fffdf5', padding: '10px 13px', fontSize: 12.5, color: '#8a6d1f' }}>
              ℹ️ Kart satış = 0 → satış detayı (Uçot günü) əlavə edilməyib. Banka tərəfi göstərilir; örtü üçün satış detayını da at.
            </div>
          )}

          {flagged.length > 0 && (
            <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '12px 14px' }}>
              <b style={{ color: '#c8102e', fontSize: 13 }}>🚨 {flagged.length} filial diqqət:</b>
              <div style={{ fontSize: 12.5, color: '#8a3a3a', marginTop: 4 }}>{flagged.map(f => `${f.filial} (${STAT[f.status].t})`).join(' · ')}</div>
            </div>
          )}

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="kbtbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 720 }}>
                <thead><tr>
                  <th style={{ ...th, textAlign: 'left' }}>Filial</th>
                  <th style={th}>Kart satış</th><th style={th}>Unibank</th><th style={th}>ATB</th><th style={th}>Kapital</th>
                  <th style={th}>Banka cəmi</th><th style={th}>Örtü</th><th style={{ ...th, textAlign: 'left' }}>Status</th>
                </tr></thead>
                <tbody>
                  {res.rows.map(r => {
                    const s = STAT[r.status]
                    return (
                      <tr key={r.filial} style={{ background: s.bg }}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{r.filial}</td>
                        <td style={td}>{money(r.kartSatis)}</td>
                        <td style={td}>{money(r.unibank)}</td>
                        <td style={td}>{money(r.atb)}</td>
                        <td style={td}>{money(r.kapital)}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{money(r.bankaCemi)}</td>
                        <td style={{ ...td, fontWeight: 700, color: s.c }}>{r.ortu != null ? Math.round(r.ortu * 100) + '%' : '—'}</td>
                        <td style={{ ...td, textAlign: 'left', color: s.c, fontSize: 11 }}>{s.t}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ color: '#8b8378', fontSize: 11.5, lineHeight: 1.6 }}>
            Banka cəmi = Unibank + ATB + Kapital. Örtü = banka ÷ kart satış. 🔴 Banka&gt;satış = satış eksik qeydə alına bilər, incele.
          </p>
        </div>
      )}
    </div>
  )
}
