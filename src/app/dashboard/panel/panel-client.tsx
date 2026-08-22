'use client'

import { useState, useRef, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { parseDaily, parseOlap, parseDailyWide, parsePlan, parseYoy, type PlanResult, type YoyResult } from '@/lib/analytics/parse-daily'
import DetailUpload from './detail-upload'
import HourlyUpload from './hourly-upload'
import { computeAttainment, attainmentByRegion } from '@/lib/analytics/target-attainment'
import { canonBranchKey } from '@/lib/analytics/filial-map'

const AY_ADI = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const donemAdi = (p: string) => { const [y, m] = p.split('-'); return `${AY_ADI[+m] ?? m} ${y}` }

type Daily = {
  period: string | null; gun: number; days: string[]
  daily: Record<string, { total: number; wolt: number; bolt: number }>
  branches: Array<{ filial: string; bolge: string | null; total: number; wolt: number; bolt: number }>
  regions: Array<[string, number]>
  // `own_delivery` YALNIZ fakt cədvəlindən gələn datada olur (blob-da yoxdur) →
  // istəyə bağlı. Delivery payına daxil edilir, yoxsa qarışıq cəmə çatmır.
  pay: { nagd: number; kart: number; wolt: number; bolt: number; own_delivery?: number }
  toplam: number; gedisat: number
  /** Fakt mənbəyində çek sayı və ortalama çek də var — blob-da yoxdur. */
  receipts?: number
  avgCheck?: number | null
}

const money = (n?: number | null) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼')
const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const RCOL: Record<string, string> = { 'İsmayıl': '#C8102E', 'Ramin': '#E07A1F', 'Ceyhun': '#F2A81D', 'Taleh': '#7A8B3F', 'Elnur': '#4A7A6A' }

function Tile({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...card, padding: '12px 15px 13px', flex: 1, minWidth: 130, borderTop: `3px solid ${tone ?? '#e2dccf'}`, boxShadow: '0 1px 3px rgba(38,34,29,.04)' }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 21, fontWeight: 800, marginTop: 4, letterSpacing: '-.4px', color: tone ?? '#26221d', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
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

type IngestRow = { period: string; engine: string; status: string; created: string; readable: boolean }

export default function PanelClient({ initial, targets = {}, canUpload = false, savedAt = null, periods = [], selectedPeriod = null, inventory = [], factSource = false }: {
  initial?: { daily: unknown; plan: unknown; yoy?: unknown } | null; targets?: Record<string, number>; canUpload?: boolean; savedAt?: string | null; periods?: string[]; selectedPeriod?: string | null; inventory?: IngestRow[]
  /** Panel datası fakt cədvəlindən quruldu (blob-dan deyil) — mənbə göstərilir. */
  factSource?: boolean
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [d, setD] = useState<Daily | null>((initial?.daily as Daily) ?? null)
  const [plan, setPlan] = useState<PlanResult | null>((initial?.plan as PlanResult) ?? null)
  const [yoy, setYoy] = useState<YoyResult | null>((initial?.yoy as YoyResult) ?? null)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [bolgeF, setBolgeF] = useState<string>('')     // bölgə filtresi
  const [yoyDown, setYoyDown] = useState(false)         // yalnız keçən ilə görə düşənlər
  const [sortK, setSortK] = useState<string>('Satış')   // tablo sıralaması
  const [sortAsc, setSortAsc] = useState(false)
  const [ara, setAra] = useState('')                    // filial arama
  const inputRef = useRef<HTMLInputElement>(null)

  function add(list: FileList | null) { if (list) { setFiles(p => [...p, ...Array.from(list)]); setErr(null) } }

  async function run() {
    if (!files.length) return
    setBusy(true); setErr(null)
    try {
      const XLSX = await import('xlsx')
      let daily: Daily | null = null, pl: PlanResult | null = null, yo: YoyResult | null = null
      let wideData: Daily | null = null, olapData: Daily | null = null  // gün-sütunlu + OLAP birləşəcək
      for (const f of files) {
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
        for (const sn of wb.SheetNames) {  // sheet-lər fərqli parser-lərə uyğun gələ bilər → müstəqil if
          const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
          const probe = rows.slice(0, 6).map(r => (r ?? []).join(' ')).join(' ')
          if (!daily && /uçot/i.test(probe)) { const dd = parseDaily(rows); if (dd.days.length) daily = dd as Daily }
          if (!wideData && /(müəssisə|ticarət|filial)/i.test(probe) && /\d{2}\.\d{2}\.\d{4}/.test(probe) && !/uçot/i.test(probe)) { const dw = parseDailyWide(rows); if (dw.days.length) wideData = dw as Daily }
          if (!olapData && /(müəssisə|ticarət)/i.test(probe) && /(ödəniş|ödeniş|növ)/i.test(probe) && !/uçot/i.test(probe)) { const oo = parseOlap(rows); if (oo.branches.length) olapData = oo as Daily }
          if (!pl && /filial/i.test(probe) && /\bplan\b/i.test(probe)) { const pp = parsePlan(rows); if (Object.keys(pp.branches).length) pl = pp }
          if (!yo && /filial|müəssisə|ticarət/i.test(probe) && /2025/.test(probe) && /gedişa|gedisa/i.test(probe)) { const yy = parseYoy(rows); if (Object.keys(yy.branches).length) yo = yy }
        }
      }
      // Günlük seçim: uzun-format > (gün-sütunlu qrafik + OLAP ödəniş/filial birləşməsi) > biri
      if (!daily) {
        if (wideData && olapData) daily = { ...olapData, days: wideData.days, daily: wideData.daily } as Daily
        else daily = wideData ?? olapData
      }
      if (!daily) throw new Error('Satış tapılmadı. Ham satış detayı (Uçot günü) və ya OLAP Hesabatı (filial × ödəniş növü) lazım — Proqnoz deyil.')
      setD(daily); setPlan(pl); setYoy(yo)
      // avtomatik yadda saxla → qalıcı olsun, bir daha yükləmə lazım olmasın
      try {
        const brs = daily.branches.map(b => ({ filial: b.filial, bolge: b.bolge, total: b.total, wolt: b.wolt, bolt: b.bolt, plan: pl?.branches[b.filial]?.plan, gedisat: pl?.branches[b.filial]?.gedisat }))
        const r = await fetch('/api/dashboard/analytics/panel-save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period: daily.period, toplam: daily.toplam, daily, plan: pl, yoy: yo, branches: brs }) })
        if (r.ok) { setSaved(true); setSaveErr(false); router.refresh() } else setSaveErr(true)   // refresh → dövr dropdown-u yeni ayı görsün
      } catch { setSaveErr(true) }   // sessizce yutma — istifadəçi bilsin (AGENTS.md: xəta udma)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  // Öz çatdırılma da delivery-dir (fakt mənbəyində ayrı sətirdir).
  const deliv = d ? d.pay.wolt + d.pay.bolt + (d.pay.own_delivery ?? 0) : 0
  // Ayın gerçək gün sayı (31 sabiti deyil) — filial proqnozu düzgün olsun
  const daysInMonth = d?.period ? new Date(+d.period.slice(0, 4), +d.period.slice(5, 7), 0).getDate() : 31
  const bolgeler = d ? [...new Set(d.branches.map(b => b.bolge).filter(Boolean))] as string[] : []
  const rows = d ? d.branches.filter(b => {
    const yb = yoy?.branches[b.filial]
    const down = yb && yb.y2025 ? yb.y2026 < yb.y2025 : false
    return (!bolgeF || b.bolge === bolgeF) && (!ara || b.filial.toLowerCase().includes(ara.toLowerCase())) && (!yoyDown || down)
  }) : []
  const rmax = d ? Math.max(...d.regions.map(r => r[1]), 1) : 1
  // Hədəf: plan faylı (Plana görə) VEYA manuel /sales hədəfləri (sales_targets)
  const netTarget = (plan?.network.plan ?? 0) || Object.values(targets).reduce((a, b) => a + b, 0)
  const hasTarget = netTarget > 0
  const branchTarget = (b: { filial: string; total: number }): { pct: number | null } => {
    const pb = plan?.branches[b.filial]
    if (pb && pb.plan) return { pct: pb.gedisat / pb.plan }
    // Açar KANONİK: `page.tsx` hədəfləri `canonBranchKey` ilə yazır (OCAQ adı
    // ilə iiko adı fərqli ola bilər — məs. «Əcəmi Shaurma» vs «Əcəmi»).
    const t = targets[canonBranchKey(b.filial)]
    if (t && d) return { pct: (d.gun && d.days.length ? b.total / d.gun * daysInMonth : b.total) / t }
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
  // Hesablama SAF funksiyada (`target-attainment.ts`) — iki səhvin izahı və
  // regresiya testləri oradadır. Burada yalnız məlumat forması bağlanır.
  const att = computeAttainment(
    (d?.branches ?? []).map(b => {
      const pb = plan?.branches[b.filial]
      return {
        filial: b.filial, bolge: b.bolge, actual: b.total,
        target: (pb && pb.plan) ? pb.plan : (targets[canonBranchKey(b.filial)] ?? 0),
      }
    }),
    { days: d?.gun ?? 0, daysInMonth },
  )
  const tutList = att.rows.map(r => ({
    filial: r.filial, bolge: r.bolge, planV: r.target, actualV: r.actual, diff: r.diff, pct: r.pct,
  }))
  const untargeted = att.untargeted.map(u => ({ filial: u.filial, bolge: u.bolge, actualV: u.actual }))
  const untargetedSales = att.untargetedSales
  const tutNet = { plan: att.net.target, actual: att.net.actual }
  const targetDenom = att.net.target > 0 ? att.net.target : netTarget
  const netTargetPct = att.projectionPct
  // Bölgə tutturması da eyni saf funksiyadan — iki yerdə hesablanmasın.
  const tutRegions = attainmentByRegion(att).map(r => ({
    bolge: r.bolge, plan: r.target, actual: r.actual, pct: r.pct,
  }))
  const tutRows = [...tutList].sort((a, b) => (a.pct ?? 9) - (b.pct ?? 9))
  const planByFilial: Record<string, number> = Object.fromEntries(tutList.map(t => [t.filial, t.planV]))

  // Tablo başlıqları + sıralama
  const tblCols = ['Filial', 'Bölgə', 'Satış', ...(hasTarget ? ['Hədəf', 'Hədəf%'] : []), ...(yoy ? ['YoY'] : []), 'Wolt', 'Bolt']
  const sortVal = (b: typeof rows[number], k: string): number | string => {
    switch (k) {
      case 'Filial': return b.filial
      case 'Bölgə': return b.bolge ?? ''
      case 'Satış': return b.total
      case 'Hədəf': return planByFilial[b.filial] ?? -1
      case 'Hədəf%': return branchTarget(b).pct ?? -1
      case 'YoY': return branchYoy(b) ?? -99
      case 'Wolt': return b.wolt
      case 'Bolt': return b.bolt
      default: return 0
    }
  }
  const sortedRows = [...rows].sort((a, b) => {
    const av = sortVal(a, sortK), bv = sortVal(b, sortK)
    if (typeof av === 'string' || typeof bv === 'string') return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    return sortAsc ? av - bv : bv - av
  })
  const toggleSort = (k: string) => { if (sortK === k) setSortAsc(v => !v); else { setSortK(k); setSortAsc(k === 'Filial' || k === 'Bölgə') } }

  return (
    <div style={{ padding: '8px 2px 56px', maxWidth: 1040, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#26221d' }}>
      <style>{`.ptbl tbody tr:hover td { background: #f3efe6 !important } .ptbl th:hover { background: #f5f1e8 } @media print { button, input, select { display: none !important } body { background: #fff } @page { margin: 12mm; size: A4 } }`}</style>
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

      {/* ── Diaqnostika: DB-də qeydə alınmış bütün dövrlər ────────────────────
          "Ay itdi" şikayətinin cavabı burada. Data silinmir — sadəcə bu səhifə
          yalnız `panel-1.0` yazılarını göstərə bilir (digər yazıcıların
          `network` sxemi fərqlidir). Bu siyahı DB-də NƏ OLDUĞUNU açıq göstərir. */}
      {inventory.length > 0 && (
        <details className="no-print" style={{ ...card, padding: '10px 14px', marginBottom: 16 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#26221d' }}>
            🗂️ Bazada qeydə alınmış dövrlər ({inventory.length})
            {inventory.some(r => !r.readable) && (
              <span style={{ color: '#b45309', fontWeight: 500 }}>
                {' '}— {inventory.filter(r => !r.readable).length} qeyd bu səhifədə göstərilə bilmir
              </span>
            )}
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 460 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#8b8378' }}>
                  <th style={{ padding: '6px 8px' }}>Dövr</th>
                  <th style={{ padding: '6px 8px' }}>Yazıcı</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Tarix</th>
                  <th style={{ padding: '6px 8px' }}>Panel-də</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((r, i) => (
                  <tr key={`${r.period}-${r.engine}-${i}`} style={{ borderTop: '1px solid #efe9dd' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.period}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#6b6259' }}>{r.engine}</td>
                    <td style={{ padding: '6px 8px', color: '#6b6259' }}>{r.status}</td>
                    <td style={{ padding: '6px 8px', color: '#6b6259' }}>{r.created}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {r.readable
                        ? <span style={{ color: '#1c8a5b', fontWeight: 600 }}>✓ görünür</span>
                        : <span style={{ color: '#b45309', fontWeight: 600 }}>✗ göstərilmir</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inventory.some(r => !r.readable) && (
              <p style={{ fontSize: 11.5, color: '#8b6914', margin: '10px 0 0', lineHeight: 1.55 }}>
                <b>«✗ göstərilmir» nə deməkdir:</b> həmin dövr bazada VAR, silinməyib — lakin
                başqa yükləmə yolu ilə yazılıb və onun saxladığı struktur bu səhifənin
                gözlədiyindən fərqlidir (yalnız ümumi ciro/delivery saxlanılıb, günlük
                detal yox). <b>Bərpa:</b> həmin ayın satış faylını bu səhifədən yenidən
                yükləyin — yükləmə idempotentdir, təkrar yazı yaratmır.
              </p>
            )}
          </div>
        </details>
      )}

      {/* Dövr seçilib, amma o dövr üçün panel verisi yoxdur → açıq izahat.
          Əks halda istifadəçi boş yükləmə ekranı görür və "ay itdi" sanır. */}
      {!d && selectedPeriod && (
        <div style={{ ...card, padding: '16px 18px', marginBottom: 16, borderLeft: '4px solid #F2A81D' }}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 650, color: '#26221d' }}>
            {donemAdi(selectedPeriod)} üçün panel verisi yoxdur
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: '#6b6259', lineHeight: 1.6 }}>
            Bu ay <b>silinməyib</b> — sadəcə bu səhifənin oxuduğu formatda (<code>panel-1.0</code>)
            saxlanılmayıb. Yuxarıdaki <b>🗂️ Bazada qeydə alınmış dövrlər</b> siyahısını açıb
            həmin ayın hansı yazıcı ilə qeydə alındığını görə bilərsiniz.
            {canUpload && ' Bərpa üçün həmin ayın satış faylını aşağıdan yenidən yükləyin.'}
          </p>
        </div>
      )}

      {/* ── Günlük detay (PRODMIX + ÇEK) → fact cədvəlləri ─────────────────────
          Aylıq panel faylından AYRI: bu fayllar hər gün atılır və
          `analytics_daily_fact` / `analytics_item_fact`-a upsert olunur.
          Ortalama çek, müştəri sayı və menyu analizinin mənbəyi budur.
          Panel verisi olsun-olmasın həmişə görünür (aşağıdaki bloklara toxunmur). */}
      {canUpload && <div className="no-print" style={{ marginBottom: 16 }}><DetailUpload /></div>}

      {/* SAATLIQ satış — AYRI komponent, çünki axın fərqlidir: fayl KUMULYATİVDİR
          (ayın əvvəlindən bu günə), iki ardıcıl görüntünün fərqi günlük datanı verir.
          Yuxarıdakı PRODMIX/ÇEK axınına toxunmur. */}
      {canUpload && <div className="no-print" style={{ marginBottom: 16 }}><HourlyUpload /></div>}

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
            <span>
              Dövr {d.period} · {d.gun} gün {plan ? '· plan ✓' : ''}
              {/* MƏNBƏ GÖRÜNSÜN — iyulda datanın «yoxa çıxması» oxucunun hansı
                  mənbəyə baxdığı bilinmədiyi üçün gec anlaşıldı. */}
              {factSource && <b style={{ color: '#1c7a4e' }}> · PRODMIX/ÇEK datası</b>}
              {d.receipts ? <> · {d.receipts.toLocaleString('ru-RU').replace(/,/g, ' ')} çek{d.avgCheck ? ` · ort.çek ${d.avgCheck.toFixed(2)}₼` : ''}</> : null}
              {saveErr ? <b style={{ color: '#c8102e' }}>· ⚠ saxlanmadı — yenidən yüklə</b> : saved ? '· yadda saxlanıldı ✓' : savedAt ? `· ${savedAt} yüklənib` : ''}
            </span>
            <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="no-print" onClick={() => window.print()} style={{ background: 'none', border: 'none', color: '#26221d', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontWeight: 600 }}>🖨️ Çap / PDF</button>
              {canUpload && <button className="no-print" onClick={() => { setD(null); setPlan(null); setYoy(null); setFiles([]); setSaved(false) }} style={{ background: 'none', border: 'none', color: '#c8102e', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontWeight: 600 }}>↻ yeni ay yüklə</button>}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile k="Toplam satış" v={money(d.toplam)} sub={`${d.gun} gün`} />
            <Tile k="Günlük ort." v={money(d.toplam / d.gun)} />
            {d.days.length > 0 && <Tile k="Ay proqnozu" v={money(d.gedisat)} sub="proqnoz (ay sonu)" />}
            {/* Alt yazı ARTIQ AÇIQ: bu, ay sonu PROQNOZUNUN hədəfə nisbətidir və
                YALNIZ hədəfi olan filialları əhatə edir. Əvvəl bu yazılmadığı
                üçün %102 (proqnoz) və %22 (bugünə qədər) yan-yana ziddiyyət
                kimi görünürdü. */}
            {netTargetPct != null && (
              <Tile
                k="Hədəfə görə (proqnoz)"
                v={Math.round(netTargetPct * 100) + '%'}
                sub={`ay sonu proqnozu / ${money(targetDenom)} hədəf${untargeted.length ? ` · ${untargeted.length} filial hədəfsiz` : ''}`}
                tone={netTargetPct >= 0.98 ? '#1c7a4e' : '#c8102e'}
              />
            )}
            {netYoyPct != null && <Tile k="Keçən ilə" v={(netYoyPct >= 0 ? '+' : '') + Math.round(netYoyPct * 100) + '%'} sub="2026 vs 2025" tone={netYoyPct >= 0 ? '#1c7a4e' : '#c8102e'} />}
            <Tile k="Delivery" v={d.toplam ? Math.round(deliv / d.toplam * 100) + '%' : '—'} sub={d.pay.own_delivery ? 'Wolt+Bolt+öz' : 'Wolt+Bolt'} />
          </div>

          {/* ── HƏDƏFİ OLMAYAN FİLİALLAR — satış İTMİR, görünür ─────────────── */}
          {untargeted.length > 0 && hasTarget && (
            <div style={{ ...card, borderColor: '#f5dea8', background: '#fffaf0', padding: '13px 15px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#8a5a00', marginBottom: 6 }}>
                ⚠ {untargeted.length} filialın satış hədəfi təyin edilməyib
              </div>
              <div style={{ fontSize: 12, color: '#8a5a00', lineHeight: 1.6, marginBottom: 8 }}>
                Bu filialların <b>{money(untargetedSales)}</b> satışı «Plan vs Gerçək» müqayisəsinə
                <b> daxil deyil</b> (hədəf olmadan tutturma hesablanmır). Şəbəkə satışı{' '}
                <b>{money(d.toplam)}</b>, müqayisəyə girən <b>{money(tutNet.actual)}</b>.{' '}
                <a href="/dashboard/sales" style={{ color: '#8a5a00', fontWeight: 700 }}>Satış hədəfi</a> səhifəsindən hədəf təyin edin.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {untargeted.sort((a, b) => b.actualV - a.actualV).map(u => (
                  <span key={u.filial} style={{ background: '#fff', border: '1px solid #f5dea8', borderRadius: 8, padding: '3px 9px', fontSize: 12 }}>
                    <b>{u.filial}</b> <span style={{ color: '#8a5a00' }}>{money(u.actualV)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

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
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  🎯 Plan vs Gerçək · Tutturma
                  <span style={{ fontWeight: 500, fontSize: 11.5, color: '#8b8378' }}> · {tutList.length} hədəfli filial · bugünə qədər</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#8b8378', textAlign: 'right' }}>
                  <div>
                    Plan <b style={{ color: '#26221d' }}>{money(tutNet.plan)}</b> · Gerçək <b style={{ color: '#26221d' }}>{money(tutNet.actual)}</b> · {(() => {
                      const p = tutNet.plan ? Math.round(tutNet.actual / tutNet.plan * 100) : 0, s = tutStat(tutNet.plan ? tutNet.actual / tutNet.plan : null)
                      return <span style={{ fontWeight: 800, color: s ? TUT[s].c : '#8b8378' }}>{s ? TUT[s].t(p) : '—'}</span>
                    })()}
                  </div>
                  {/* Cəm İZLƏNƏ BİLƏN olsun: hədəfsiz satış + müqayisə = şəbəkə satışı.
                      Əvvəl bu fərq heç yerdə görünmürdü və 53 186 ₼ yoxa çıxırdı. */}
                  {untargetedSales > 0 && (
                    <div style={{ fontSize: 11, color: '#8a5a00', marginTop: 2 }}>
                      + hədəfsiz {money(untargetedSales)} = şəbəkə satışı <b>{money(d.toplam)}</b>
                    </div>
                  )}
                </div>
              </div>

              {/* Bölgə özeti — bölgələrə rapor üçün */}
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, borderBottom: '1px solid #efeae0', background: '#faf8f4' }}>
                {tutRegions.map(r => { const s = tutStat(r.pct), p = r.pct != null ? Math.round(r.pct * 100) : 0; const bar = s ? TUT[s].c : '#8b8378'; return (
                  <div key={r.bolge} style={{ background: '#fff', border: '1px solid #e6e1d7', borderRadius: 10, padding: '9px 11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <b style={{ fontSize: 12.5 }}>{r.bolge}</b>
                      <span style={{ fontWeight: 800, fontSize: 12.5, color: bar }}>{s ? TUT[s].t(p) : '—'}</span>
                    </div>
                    <div style={{ height: 6, background: '#f1ede4', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(p, 100)}%`, height: '100%', background: bar, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#8b8378', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{money(r.actual)} / {money(r.plan)}</div>
                  </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                    <span>{r} <span style={{ color: '#b3aca0' }}>· {d.toplam ? Math.round(v / d.toplam * 100) : 0}%</span></span>
                    <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v)}</b>
                  </div>
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
            {yoy && <button onClick={() => setYoyDown(v => !v)} style={{ ...card, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', background: yoyDown ? '#c8102e' : '#fff', color: yoyDown ? '#fff' : '#c8102e', border: '1px solid #f0c9cf', marginLeft: 4 }}>📉 Keçən ilə düşənlər</button>}
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="ptbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: plan ? 620 : 480 }}>
                <thead><tr>
                  {tblCols.map((h, i) => (
                    <th key={h} onClick={() => toggleSort(h)} title="Sırala"
                      style={{ padding: '8px 10px', textAlign: i < 2 ? 'left' : 'right', fontSize: 10.5, textTransform: 'uppercase', color: sortK === h ? '#26221d' : '#8b8378', borderBottom: '2px solid ' + (sortK === h ? '#F2A81D' : '#e6e1d7'), background: '#faf7f1', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', position: 'sticky', top: 0 }}>
                      {h}{sortK === h ? (sortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {sortedRows.map((b, idx) => {
                    const pp = branchTarget(b).pct
                    const yp = branchYoy(b)
                    const zebra = idx % 2 ? '#fdfbf7' : '#fff'
                    return (
                      <tr key={b.filial} style={{ background: zebra }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid #efeae0' }}>{b.filial}</td>
                        <td style={{ padding: '8px 10px', color: '#8b8378', borderBottom: '1px solid #efeae0' }}>{b.bolge ?? '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{money(b.total)}</td>
                        {hasTarget && <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', color: '#8b8378', fontVariantNumeric: 'tabular-nums' }}>{planByFilial[b.filial] ? money(planByFilial[b.filial]) : '—'}</td>}
                        {hasTarget && <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontWeight: 700, color: pp == null ? '#8b8378' : pp >= 0.98 ? '#1c7a4e' : '#c8102e', fontVariantNumeric: 'tabular-nums' }}>{pp != null ? Math.round(pp * 100) + '%' : '—'}</td>}
                        {yoy && <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #efeae0', fontWeight: 700, color: yp == null ? '#8b8378' : yp >= 0 ? '#1c7a4e' : '#c8102e', fontVariantNumeric: 'tabular-nums' }}>{yp != null ? (yp >= 0 ? '+' : '') + Math.round(yp * 100) + '%' : '—'}</td>}
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{b.wolt ? `${money(b.wolt)} · ${(b.wolt / b.total * 100).toFixed(1)}%` : '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b8378', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{b.bolt ? `${money(b.bolt)} · ${(b.bolt / b.total * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
