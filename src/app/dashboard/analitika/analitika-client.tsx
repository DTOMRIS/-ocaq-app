'use client'

import Link from 'next/link'
import { useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

const AY = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const donem = (p: string) => { const [y, m] = p.split('-'); return `${AY[+m] ?? m} ${y}` }

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const td: CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }
const th: CSSProperties = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.3px', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1', whiteSpace: 'nowrap' }

const money = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼'
const money2 = (v: number) => v.toFixed(2) + '₼'
const int = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ')
const pct = (v: number) => (v * 100).toFixed(1) + '%'

const PAY_LABEL: Record<string, string> = {
  nagd: 'Nağd', kart: 'Bank kartı', wolt: 'Wolt', bolt: 'Bolt',
  own_delivery: 'Öz çatdırılma', yango_legacy: 'Yango (2025 arxivi)',
}
const KIND_LABEL: Record<string, string> = {
  service: 'Servis/zal sayğacı', packaging: 'Qablaşdırma (stəkan, paket)',
  modifier: 'Modifikator', included: 'Kombo daxilində (pulsuz)',
}

type Product = { name: string; qty: number; amount: number; branches: number; codes: number }
type BranchRow = { filial: string; amount: number; receipts: number; delivery: number }
type Attach = { filial: string; name: string; qty: number }

/** Kasavana-Smith kvadrantı — POPULYARLIQ × CİRO PAYI. */
type Quad = 'ulduz' | 'at' | 'tapmaca' | 'it'
const QUAD: Record<Quad, { label: string; icon: string; color: string; bg: string; desc: string }> = {
  ulduz:   { label: 'Ulduz',   icon: '⭐', color: '#1c7a4e', bg: '#f2fbf5', desc: 'Çox satılır, çox ciro gətirir → qoru, menyuda ön sırada saxla, endirim etmə.' },
  at:      { label: 'At',      icon: '🐎', color: '#8a5a00', bg: '#fffaf0', desc: 'Çox satılır, ciro payı zəif → qiyməti/porsiyanı gözdən keçir, yanına yüksək marjalı əlavə sat.' },
  tapmaca: { label: 'Tapmaca', icon: '🧩', color: '#1f5a8a', bg: '#f2f8fd', desc: 'Az satılır, ciro gətirir → görünürlüyü artır, personala təklif etdir (upsell).' },
  it:      { label: 'İt',      icon: '🐕', color: '#8a3a3a', bg: '#fdf2f3', desc: 'Az satılır, az ciro → menyudan çıxarmağı və ya yenidən qurmağı düşün.' },
}

function Tile({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...card, padding: '12px 15px', flex: 1, minWidth: 132, borderTop: `3px solid ${tone ?? '#e2dccf'}` }}>
      <div style={{ fontSize: 10, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: tone ?? '#26221d', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: '#8b8378', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AnalitikaClient({
  empty, period, periods = [], summary, pay = [], products = [], nonRevenue = [],
  branchRows = [], attach = [], topNames = [], daily = [], isNetwork = false,
  drillFilial = null, drillBolge = null, baseline = null, regionRows = [], branchRegion = {},
}: {
  empty?: string
  period?: string
  periods?: string[]
  summary?: { amount: number; receipts: number; days: number }
  pay?: Array<{ kind: string; amount: number }>
  products?: Product[]
  nonRevenue?: Array<{ kind: string; qty: number; items: number }>
  branchRows?: BranchRow[]
  attach?: Attach[]
  topNames?: string[]
  daily?: Array<{ date: string; amount: number; receipts: number }>
  isNetwork?: boolean
  /** Drill-down: seçilmiş filial / bölgə (yoxsa bütün əhatə). */
  drillFilial?: string | null
  drillBolge?: string | null
  /** Müqayisə bazası — bütün RBAC əhatəsi (yalnız drill-down zamanı gəlir). */
  baseline?: { amount: number; receipts: number } | null
  regionRows?: Array<{ bolge: string; amount: number; receipts: number; branches: number }>
  branchRegion?: Record<string, string | null>
}) {
  const router = useRouter()
  const [sortK, setSortK] = useState<'amount' | 'qty' | 'name' | 'attach'>('amount')
  const [asc, setAsc] = useState(false)
  const [ara, setAra] = useState('')
  const [quadF, setQuadF] = useState<Quad | ''>('')
  const [upsellItem, setUpsellItem] = useState(topNames[0] ?? '')

  const totalAmount = products.reduce((s, p) => s + p.amount, 0)
  const totalQty = products.reduce((s, p) => s + p.qty, 0)
  const receipts = summary?.receipts ?? 0

  // ── Kasavana-Smith eşikləri ────────────────────────────────────────────────
  // Klassik qayda: orta payın %70-i. Orta pay = 1 / məhsul sayı.
  const avgShare = products.length ? 1 / products.length : 0
  const cut = avgShare * 0.7

  const enriched = useMemo(() => products.map(p => {
    const qShare = totalQty ? p.qty / totalQty : 0
    const aShare = totalAmount ? p.amount / totalAmount : 0
    const popular = qShare >= cut
    const rich = aShare >= cut
    const quad: Quad = popular && rich ? 'ulduz' : popular ? 'at' : rich ? 'tapmaca' : 'it'
    return {
      ...p, qShare, aShare, quad,
      avgPrice: p.qty ? p.amount / p.qty : 0,
      perReceipt: receipts ? p.qty / receipts : 0,   // çek başına ədəd (attach rate)
    }
  }), [products, totalQty, totalAmount, cut, receipts])

  // Say + CİRO PAYI birlikdə: 286 məhsulda «İt» kvadrantına 221 çeşid düşür,
  // lakin onların birləşmiş ciro payı kiçikdir. Yalnız sayı göstərmək
  // yanıldıcı olur — pay da göstərilir ki uzun quyruq görünsün.
  const quadStat = useMemo(() => {
    const c: Record<Quad, { n: number; share: number }> = {
      ulduz: { n: 0, share: 0 }, at: { n: 0, share: 0 },
      tapmaca: { n: 0, share: 0 }, it: { n: 0, share: 0 },
    }
    for (const p of enriched) { c[p.quad].n++; c[p.quad].share += p.aShare }
    return c
  }, [enriched])

  const rows = useMemo(() => {
    const f = enriched.filter(p =>
      (!ara || p.name.toLowerCase().includes(ara.toLowerCase()))
      && (!quadF || p.quad === quadF))
    const dir = asc ? 1 : -1
    return [...f].sort((a, b) => {
      if (sortK === 'name') return a.name.localeCompare(b.name, 'az') * dir
      if (sortK === 'qty') return (a.qty - b.qty) * dir
      if (sortK === 'attach') return (a.perReceipt - b.perReceipt) * dir
      return (a.amount - b.amount) * dir
    })
  }, [enriched, ara, quadF, sortK, asc])

  // ── UPSELL: seçilmiş məhsulda filial vs şəbəkə attach rate ─────────────────
  const upsell = useMemo(() => {
    if (!upsellItem) return null
    const byBranch = new Map(attach.filter(a => a.name === upsellItem).map(a => [a.filial, a.qty]))
    const netQty = [...byBranch.values()].reduce((s, q) => s + q, 0)
    const netRec = branchRows.reduce((s, b) => s + b.receipts, 0)
    if (!netRec) return null
    const netRate = netQty / netRec
    const prod = enriched.find(p => p.name === upsellItem)
    const price = prod?.avgPrice ?? 0
    const list = branchRows.map(b => {
      const q = byBranch.get(b.filial) ?? 0
      const rate = b.receipts ? q / b.receipts : 0
      // Şəbəkə tempinə çatsa nə qədər ƏLAVƏ ədəd satardı → ₼ ilə fürsət.
      const gapQty = Math.max(0, netRate * b.receipts - q)
      return { filial: b.filial, qty: q, receipts: b.receipts, rate, gapQty, gapAmount: gapQty * price }
    }).sort((a, b) => b.gapAmount - a.gapAmount)
    return { netRate, price, list, total: list.reduce((s, x) => s + x.gapAmount, 0) }
  }, [upsellItem, attach, branchRows, enriched])

  const SortTh = ({ k, children, align = 'right' }: { k: typeof sortK; children: React.ReactNode; align?: 'left' | 'right' }) => (
    <th
      style={{ ...th, textAlign: align, cursor: 'pointer' }}
      onClick={() => { if (sortK === k) setAsc(!asc); else { setSortK(k); setAsc(false) } }}
    >
      {children}{sortK === k ? (asc ? ' ▲' : ' ▼') : ''}
    </th>
  )

  if (empty) {
    return (
      <div style={{ padding: '8px 2px 56px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>📊 Məhsul Analizi</h1>
        <div style={{ ...card, padding: '40px 24px', textAlign: 'center', color: '#8b8378', fontSize: 13.5, marginTop: 16 }}>
          {empty}
          <div style={{ marginTop: 14 }}>
            <Link href="/dashboard/panel" style={{ color: '#C8102E', fontWeight: 700, fontSize: 13 }}>→ Günlük Panel</Link>
          </div>
        </div>
      </div>
    )
  }

  const netDelivery = branchRows.reduce((s, b) => s + b.delivery, 0)
  const avgCheck = receipts ? (summary?.amount ?? 0) / receipts : null
  const maxDay = Math.max(...daily.map(d => d.amount), 1)

  // ── Drill-down naviqasiyası ────────────────────────────────────────────────
  const go = (q: Record<string, string | null>) => {
    const p = new URLSearchParams()
    if (period) p.set('period', period)
    for (const [k, v] of Object.entries(q)) if (v) p.set(k, v)
    router.push(`/dashboard/analitika?${p.toString()}`)
  }
  const scopeLabel = drillFilial ?? (drillBolge ? `${drillBolge} bölgəsi` : (isNetwork ? 'Bütün şəbəkə' : 'Sizin filiallarınız'))
  // Müqayisə: seçilmiş əhatənin ortalama çeki vs bütün əhatənin ortalaması.
  const baseAvg = baseline && baseline.receipts ? baseline.amount / baseline.receipts : null
  const avgDelta = avgCheck != null && baseAvg ? avgCheck / baseAvg - 1 : null
  const shareOfBase = baseline?.amount && summary?.amount ? summary.amount / baseline.amount : null

  return (
    <div style={{ padding: '8px 2px 56px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <style>{`.atbl tbody tr:hover td { background:#f3efe6 } @media print { button,input,select { display:none !important } }`}</style>
      <div style={{ height: 3, background: '#C8102E', borderRadius: 2, marginBottom: 16 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>📊 Məhsul Analizi</h1>
          {/* Kırılım yolu (breadcrumb) — hansı əhatəyə baxdığın hər zaman görünsün */}
          <div style={{ fontSize: 13, color: '#8b8378', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <button onClick={() => go({})} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: drillFilial || drillBolge ? '#C8102E' : '#26221d', fontWeight: 700, fontSize: 13 }}>
              {isNetwork ? 'Şəbəkə' : 'Mənim əhatəm'}
            </button>
            {drillBolge && <><span>›</span><b style={{ color: '#26221d' }}>{drillBolge} bölgəsi</b></>}
            {drillFilial && <>
              <span>›</span>
              {branchRegion[drillFilial] && (
                <><button onClick={() => go({ bolge: branchRegion[drillFilial]! })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#C8102E', fontWeight: 600, fontSize: 13 }}>
                  {branchRegion[drillFilial]} bölgəsi
                </button><span>›</span></>
              )}
              <b style={{ color: '#26221d' }}>{drillFilial}</b>
            </>}
          </div>
          <p style={{ color: '#8b8378', fontSize: 12.5, margin: 0 }}>
            PRODMIX + ÇEK datası ·{' '}
            <Link href="/dashboard/panel" style={{ color: '#C8102E', fontWeight: 600 }}>Günlük Panel →</Link>
          </p>
        </div>
        {periods.length > 0 && (
          <label className="no-print" style={{ fontSize: 12, color: '#8b8378', display: 'flex', alignItems: 'center', gap: 6 }}>
            🗓️ Dövr:
            <select value={period ?? ''} onChange={e => router.push(`/dashboard/analitika?period=${e.target.value}`)}
              style={{ ...card, padding: '6px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#26221d' }}>
              {periods.map(p => <option key={p} value={p}>{donem(p)}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* ── BÖLGƏLƏR — basılabilir ──────────────────────────────────────────── */}
      {!drillFilial && regionRows.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {regionRows.map(r => {
            const on = drillBolge === r.bolge
            const ac = r.receipts ? r.amount / r.receipts : null
            return (
              <button key={r.bolge} onClick={() => go(on ? {} : { bolge: r.bolge })}
                style={{ textAlign: 'left', cursor: 'pointer', ...card, borderColor: on ? '#C8102E' : '#e6e1d7', background: on ? '#fdf2f3' : '#fff', padding: '9px 13px', minWidth: 138, flex: '1 1 138px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: on ? '#C8102E' : '#26221d' }}>{r.bolge}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{money(r.amount)}</div>
                <div style={{ fontSize: 10.5, color: '#8b8378', marginTop: 1 }}>
                  {r.branches} filial · ort.çek {ac == null ? '—' : money2(ac)}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── MÜQAYİSƏ — tək rəqəm məna daşımır ───────────────────────────────── */}
      {baseline && shareOfBase != null && (
        <div style={{ ...card, background: '#faf8f4', padding: '10px 14px', marginTop: 14, fontSize: 12.5, lineHeight: 1.6 }}>
          <b>{scopeLabel}</b> · {isNetwork ? 'şəbəkə' : 'əhatə'} cirosunun <b>{pct(shareOfBase)}</b>-i
          {avgDelta != null && <>
            {' · '}ortalama çek {avgCheck == null ? '—' : money2(avgCheck)}, {isNetwork ? 'şəbəkə' : 'əhatə'} ortalaması {money2(baseAvg!)}
            {' → '}
            <b style={{ color: avgDelta >= 0 ? '#1c7a4e' : '#c8102e' }}>
              {avgDelta >= 0 ? '+' : ''}{(avgDelta * 100).toFixed(1)}%
            </b>
            {avgDelta < -0.05 && <span style={{ color: '#c8102e' }}> — upsell hədəfi</span>}
          </>}
        </div>
      )}

      {/* ── ÖZET ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0 16px' }}>
        <Tile k="Ciro (çek)" v={money(summary?.amount ?? 0)} sub={`${summary?.days ?? 0} gün`} tone="#C8102E" />
        <Tile k="Çek sayı" v={int(receipts)} sub="unikal qəbz = müştəri" />
        <Tile k="Ortalama çek" v={avgCheck == null ? '—' : money2(avgCheck)} />
        <Tile k="Satılan ədəd" v={int(totalQty)} sub={`${int(products.length)} məhsul çeşidi`} />
        <Tile k="Çek başına ədəd" v={receipts ? (totalQty / receipts).toFixed(2) : '—'} sub="məhsul/çek" />
        <Tile k="Delivery payı" v={summary?.amount ? pct(netDelivery / summary.amount) : '—'} sub="Wolt+Bolt+öz" tone="#F2A81D" />
      </div>

      {/* ── GÜNLÜK SERİYA ───────────────────────────────────────────────────── */}
      {daily.length > 1 && (
        <div style={{ ...card, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Günlük ciro və çek sayı</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
            {daily.map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }} title={`${d.date}\n${money(d.amount)}\n${int(d.receipts)} çek`}>
                <div style={{ width: '100%', maxWidth: 34, height: `${(d.amount / maxDay) * 78}px`, background: '#C8102E', opacity: .82, borderRadius: '3px 3px 0 0' }} />
                <div style={{ fontSize: 9.5, color: '#8b8378' }}>{+d.date.slice(8, 10)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MENYU MÜHƏNDİSLİYİ ──────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '15px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🍔 Menyu mühəndisliyi (Kasavana-Smith)</div>
          {quadF && <button onClick={() => setQuadF('')} style={{ background: 'none', border: 'none', color: '#C8102E', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>süzgəci sıfırla</button>}
        </div>
        {/* DÜRÜSTLÜK: klassik matris MARJA ilə qurulur. Maya datası ayrı fayldadır
            (`/dashboard/menyu`) və hələ bazaya yazılmır → burada CİRO payı işlədilir.
            Bunu gizlətmək istifadəçini yanıldar. */}
        <div style={{ fontSize: 11.5, color: '#8a5a00', background: '#fffaf0', border: '1px solid #f5dea8', borderRadius: 10, padding: '9px 12px', margin: '10px 0 12px', lineHeight: 1.55 }}>
          ⚠ Bu matris <b>ciro payı</b> ilə qurulub, <b>marja</b> ilə deyil — maya (cost) datası
          bazada saxlanmır, ayrıca <Link href="/dashboard/menyu" style={{ color: '#8a5a00', fontWeight: 700 }}>Menü / Food Cost</Link> səhifəsində
          fayldan oxunur. Marja əsaslı «əsl» Kasavana-Smith üçün maya faylı da bazaya yazılmalıdır.
          Eşik: orta payın %70-i ({pct(cut)}) — {int(products.length)} çeşid üzərində.
          Qeyd: klassik üsul KATEQORİYA daxilində tətbiq olunur (əsas yemək, içki, desert ayrı-ayrı);
          burada kateqoriya sütunu olmadığı üçün bütün çeşid birlikdə qiymətləndirilir, ona görə
          «İt» kvadrantı uzun quyruğu da yığır — aşağıdaki <b>ciro payı</b> rəqəminə baxın.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: 10 }}>
          {(Object.keys(QUAD) as Quad[]).map(k => {
            const q = QUAD[k]
            const on = quadF === k
            return (
              <button key={k} onClick={() => setQuadF(on ? '' : k)}
                style={{ textAlign: 'left', cursor: 'pointer', background: q.bg, border: `1px solid ${on ? q.color : '#e6e1d7'}`, borderRadius: 12, padding: '11px 13px', boxShadow: on ? `0 0 0 2px ${q.color}22` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 15 }}>{q.icon}</span>
                  <b style={{ color: q.color, fontSize: 13.5 }}>{q.label}</b>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 16, color: q.color }}>{quadStat[k].n}</span>
                </div>
                <div style={{ fontSize: 11, color: q.color, marginTop: 2, fontWeight: 600 }}>
                  ciro payı {pct(quadStat[k].share)} · {money(quadStat[k].share * totalAmount)}
                </div>
                <div style={{ fontSize: 11, color: '#6b655c', marginTop: 5, lineHeight: 1.5 }}>{q.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── UPSELL FIRSATI ──────────────────────────────────────────────────── */}
      {upsell && upsell.list.length > 1 && (
        <div style={{ ...card, padding: '15px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>💰 Upsell fırsatı — çek başına satış</div>
            <select value={upsellItem} onChange={e => setUpsellItem(e.target.value)}
              style={{ ...card, padding: '6px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', maxWidth: 300 }}>
              {topNames.map(nm => <option key={nm} value={nm}>{nm}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11.5, color: '#8b8378', margin: '8px 0 12px', lineHeight: 1.55 }}>
            Şəbəkə tempi: <b>{upsell.netRate.toFixed(3)} ədəd/çek</b> · orta qiymət {money2(upsell.price)}.
            Aşağıdaki filiallar bu tempdən geridədir. «Fürsət» = şəbəkə tempinə çatsalar həmin dövrdə
            nə qədər ƏLAVƏ ciro olardı. Şəbəkə cəmi: <b style={{ color: '#C8102E' }}>{money(upsell.total)}</b>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="atbl" style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr>
                <th style={{ ...th, textAlign: 'left' }}>Filial</th>
                <th style={{ ...th, textAlign: 'right' }}>Satılan</th>
                <th style={{ ...th, textAlign: 'right' }}>Çek</th>
                <th style={{ ...th, textAlign: 'right' }}>Ədəd/çek</th>
                <th style={{ ...th, textAlign: 'right' }}>Şəbəkəyə görə</th>
                <th style={{ ...th, textAlign: 'right' }}>Fürsət</th>
              </tr></thead>
              <tbody>
                {upsell.list.filter(x => x.gapAmount > 0).slice(0, 12).map(x => (
                  <tr key={x.filial}>
                    <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{x.filial}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{int(x.qty)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{int(x.receipts)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{x.rate.toFixed(3)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#c8102e' }}>
                      −{pct(upsell.netRate ? 1 - x.rate / upsell.netRate : 0)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(x.gapAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {upsell.list.every(x => x.gapAmount <= 0) && (
            <div style={{ fontSize: 12, color: '#1c7a4e' }}>✓ Bütün filiallar şəbəkə tempində və ya üstündədir.</div>
          )}
        </div>
      )}

      {/* ── MƏHSUL CƏDVƏLİ ──────────────────────────────────────────────────── */}
      <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid #efeae0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            Məhsullar ({int(rows.length)}{rows.length !== products.length ? ` / ${int(products.length)}` : ''})
          </div>
          <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Məhsul axtar…"
            style={{ ...card, padding: '7px 12px', fontSize: 13, minWidth: 170 }} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="atbl" style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr>
              <SortTh k="name" align="left">Məhsul</SortTh>
              <th style={{ ...th, textAlign: 'center' }}>Kvadrant</th>
              <SortTh k="qty">Ədəd</SortTh>
              <SortTh k="amount">Ciro</SortTh>
              <th style={{ ...th, textAlign: 'right' }}>Ciro payı</th>
              <th style={{ ...th, textAlign: 'right' }}>Orta qiymət</th>
              <SortTh k="attach">Ədəd/çek</SortTh>
              <th style={{ ...th, textAlign: 'right' }}>Filial</th>
            </tr></thead>
            <tbody>
              {rows.map(p => {
                const q = QUAD[p.quad]
                return (
                  <tr key={p.name}>
                    <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>
                      {p.name}
                      {p.codes > 1 && <span style={{ color: '#8b8378', fontWeight: 400, fontSize: 11 }}> · {p.codes} kod</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span title={q.label} style={{ background: q.bg, color: q.color, border: `1px solid ${q.color}33`, borderRadius: 7, padding: '2px 7px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {q.icon} {q.label}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{int(p.qty)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(p.amount)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{pct(p.aShare)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{money2(p.avgPrice)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{p.perReceipt.toFixed(3)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{p.branches}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FİLİALLAR ───────────────────────────────────────────────────────── */}
      {branchRows.length > 1 && (
        <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #efeae0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Filiallar ({branchRows.length})</span>
            <span style={{ fontSize: 11.5, color: '#8b8378' }}>Sətrə basın → həmin filialın öz analizi</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="atbl" style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr>
                <th style={{ ...th, textAlign: 'left' }}>Filial</th>
                <th style={{ ...th, textAlign: 'right' }}>Ciro</th>
                <th style={{ ...th, textAlign: 'right' }}>Çek</th>
                <th style={{ ...th, textAlign: 'right' }}>Ortalama çek</th>
                <th style={{ ...th, textAlign: 'right' }}>Delivery</th>
              </tr></thead>
              <tbody>
                {branchRows.map(b => {
                  const ac = b.receipts ? b.amount / b.receipts : null
                  // Ortalama çek şəbəkə ortalamasından aşağıdırsa vurğula — upsell hədəfi.
                  const low = ac != null && avgCheck != null && ac < avgCheck * 0.95
                  return (
                    <tr key={b.filial} onClick={() => go({ filial: b.filial })} style={{ cursor: 'pointer' }} title={`${b.filial} — öz analizini aç`}>
                      <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>
                        {b.filial}
                        {branchRegion[b.filial] && <span style={{ color: '#8b8378', fontWeight: 400, fontSize: 11 }}> · {branchRegion[b.filial]}</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>{money(b.amount)}</td>
                      <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{int(b.receipts)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: low ? '#c8102e' : '#26221d' }}>
                        {ac == null ? '—' : money2(ac)}
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{b.amount ? pct(b.delivery / b.amount) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ÖDƏNİŞ QARIŞIĞI + GƏLİRSİZ SƏTİRLƏR ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {pay.length > 0 && (
          <div style={{ ...card, padding: '14px 16px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>Ödəniş qarışığı</div>
            {pay.map(x => {
              const share = summary?.amount ? x.amount / summary.amount : 0
              return (
                <div key={x.kind} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span>{PAY_LABEL[x.kind] ?? x.kind}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}><b>{money(x.amount)}</b> <span style={{ color: '#8b8378' }}>{pct(share)}</span></span>
                  </div>
                  <div style={{ height: 5, background: '#efeae0', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${Math.min(share * 100, 100)}%`, background: '#C8102E', opacity: .75, borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {nonRevenue.length > 0 && (
          <div style={{ ...card, padding: '14px 16px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>Gəlir gətirməyən sətirlər</div>
            {/* Bunlar SİLİNMİR — sayğac/qablaşdırma sətirləridir və zal/götür-apar
                qarışığı kimi ayrıca məlumat verir. */}
            <div style={{ fontSize: 11.5, color: '#8b8378', marginBottom: 9, lineHeight: 1.5 }}>
              Ciroya daxil deyil, silinmir — sayğac və qablaşdırma sətirləri.
            </div>
            {nonRevenue.map(x => (
              <div key={x.kind} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderTop: '1px solid #efeae0' }}>
                <span>{KIND_LABEL[x.kind] ?? x.kind}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}><b>{int(x.qty)}</b> <span style={{ color: '#8b8378' }}>· {x.items} çeşid</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="no-print" style={{ marginTop: 18, textAlign: 'right' }}>
        <button onClick={() => window.print()} style={{ background: 'none', border: 'none', color: '#26221d', cursor: 'pointer', textDecoration: 'underline', fontSize: 12.5, fontWeight: 600 }}>
          🖨️ Çap / PDF
        </button>
      </div>
    </div>
  )
}
