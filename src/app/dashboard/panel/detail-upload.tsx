'use client'

import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  parseProdmix, parseReceipts, reconcileProdmixReceipts,
  PARTIAL_LAST_DAY_NOTE,
  type ProdmixResult, type ReceiptsResult, type DayReconcile,
} from '@/lib/analytics/parse-sales-detail'

/**
 * PRODMIX (məhsul detayı) + ÇEK (ödəniş şərtləri) fayllarını yükləyir.
 *
 * NİYƏ AYRICA KOMPONENT: bu fayllar HƏR GÜN atılır (aylıq panel faylından
 * fərqli tempdə) və `analytics_daily_fact` / `analytics_item_fact` cədvəllərinə
 * yazılır — aylıq `panel-save` JSON blob-una deyil. Panel verisi olsa da olmasa
 * da görünür.
 *
 * NİYƏ BRAUZERDƏ PARSE: Vercel body limiti 4,5 MB, 7 günlük fayl 83 361 sətirdir.
 * Mövcud panel deseni ilə eynidir (`panel-client.tsx:84`) — fayl brauzerdə
 * oxunur, yalnız aqreqat sətirlər hissə-hissə göndərilir.
 *
 * NİYƏ ƏVVƏLCƏ TUTUŞDURMA, SONRA YAZMA: 08.08.2026-da çek faylının 7 avqustu
 * prodmix-dən 40 652 ₼ əskik idi (1–6 avqust kuruşuna uyğun) — natamam export.
 * İstifadəçi YAZMADAN ƏVVƏL bunu görməlidir; yazı upsert olduğu üçün səhv
 * deyil, amma «bu gün hələ tam deyil» bilinməlidir.
 */

const CHUNK = 4000   // server limiti 5000; ~1 MB body-də qalsın

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼'
const int = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ')

type SaveResult = {
  ok: true; written: number; merged: number; rejected: number
  rejectedSample: string[]; days: string[]; unmatchedBranches: string[]
}

type Parsed = {
  prodmix: ProdmixResult | null
  receipts: ReceiptsResult | null
  recon: { days: DayReconcile[]; warnings: string[] } | null
  fileNames: string[]
}

export default function DetailUpload() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<{ daily: SaveResult | null; item: SaveResult | null } | null>(null)
  const [drag, setDrag] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function add(list: FileList | null) {
    if (!list?.length) return
    setFiles(p => [...p, ...Array.from(list)])
    setErr(null); setResult(null); setParsed(null)
  }

  function reset() {
    setFiles([]); setParsed(null); setResult(null); setErr(null); setProgress(null); setPhase('')
  }

  // ── 1) Oxu və tutuşdur (DB-yə HEÇ NƏ yazılmır) ─────────────────────────────
  async function read() {
    if (!files.length) return
    setBusy(true); setErr(null); setResult(null); setPhase('Fayllar oxunur…')
    try {
      const XLSX = await import('xlsx')
      let prodmix: ProdmixResult | null = null
      let receipts: ReceiptsResult | null = null

      for (const f of files) {
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
        for (const sn of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: null }) as unknown[][]
          // Parser-lər başlıq tapmasa boş + warning qaytarır → «tapdı/tapmadı»
          // testi nəticənin özüdür, ad/heuristika ilə təxmin etmirik.
          if (!prodmix) { const p = parseProdmix(rows); if (p.lines.length) prodmix = p }
          if (!receipts) { const r = parseReceipts(rows); if (r.days.length) receipts = r }
        }
      }

      if (!prodmix && !receipts) {
        throw new Error(
          'Nə PRODMIX nə də ÇEK cədvəli tapılmadı. PRODMIX-də «Uçot günü / Ticarət müəssisəsi / ' +
          'Məhsulun kodu / Məhsul / Məhsulların sayı / Endirimli məbləğ», ÇEK-də «Ticarət müəssisəsi / ' +
          'Tarix / Ödəniş növü / Qəbzin nömrəsi / Endirimli məbləğ» sütunları gözlənilir.',
        )
      }

      const recon = prodmix && receipts ? reconcileProdmixReceipts(prodmix, receipts) : null
      setParsed({ prodmix, receipts, recon, fileNames: files.map(f => f.name) })
      setPhase('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  // ── 2) Fact cədvəllərinə yaz (chunk-lı, idempotent upsert) ─────────────────
  async function post(kind: 'daily' | 'item', rows: unknown[], source: string, onChunk: () => void): Promise<SaveResult> {
    const acc: SaveResult = { ok: true, written: 0, merged: 0, rejected: 0, rejectedSample: [], days: [], unmatchedBranches: [] }
    const allDays = new Set<string>(), allUnmatched = new Set<string>()
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK)
      const r = await fetch('/api/dashboard/analytics/fact-save', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, rows: slice, source }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) {
        // Xəta UDULMUR — serverin real `detail`-i göstərilir.
        throw new Error(`${kind}: ${j?.error ?? r.status}${j?.detail ? ` — ${j.detail}` : ''}`)
      }
      acc.written += j.written ?? 0
      acc.merged += j.merged ?? 0
      acc.rejected += j.rejected ?? 0
      if (acc.rejectedSample.length < 5 && j.rejectedSample?.length) acc.rejectedSample.push(...j.rejectedSample.slice(0, 5 - acc.rejectedSample.length))
      for (const d of j.days ?? []) allDays.add(d)
      for (const b of j.unmatchedBranches ?? []) allUnmatched.add(b)
      onChunk()
    }
    acc.days = [...allDays].sort()
    acc.unmatchedBranches = [...allUnmatched]
    return acc
  }

  async function save() {
    if (!parsed) return
    const { prodmix, receipts, fileNames } = parsed
    const source = fileNames.join(' + ').slice(0, 120)

    // ÇEK → gün sətirləri. Ödəniş növü başına bir sətir + bir `__day__` sətri:
    // çek sayı ödəniş növlərinə BÖLÜNMÜR (bir qəbz həm nağd həm kart ola bilər,
    // paylasaydıq müştəri sayı şişərdi) → yalnız `__day__` sətrində saxlanır.
    const dailyRows = receipts ? receipts.days.flatMap(day => {
      const out: Array<Record<string, unknown>> = [{
        filial: day.filial, date: day.date, payment_type: '__day__',
        amount: day.amount, receipts: day.receipts,
      }]
      for (const [pt, amt] of Object.entries(day.byPayment)) {
        if (amt) out.push({ filial: day.filial, date: day.date, payment_type: pt, amount: amt })
      }
      return out
    }) : []

    const itemRows = prodmix ? prodmix.lines.map(l => ({
      filial: l.filial, date: l.date, item_code: l.itemCode, item_name: l.itemName,
      qty: l.qty, amount: l.amount, line_kind: l.kind,
    })) : []

    const total = Math.ceil(dailyRows.length / CHUNK) + Math.ceil(itemRows.length / CHUNK)
    setBusy(true); setErr(null); setProgress({ done: 0, total })
    let done = 0
    const tick = () => { done++; setProgress({ done, total }) }

    try {
      let daily: SaveResult | null = null, item: SaveResult | null = null
      if (dailyRows.length) { setPhase('Çek/ödəniş sətirləri yazılır…'); daily = await post('daily', dailyRows, source, tick) }
      if (itemRows.length) { setPhase('Məhsul sətirləri yazılır…'); item = await post('item', itemRows, source, tick) }
      setResult({ daily, item })
      setPhase('')
      router.refresh()   // dashboard KPI kartları təzələnsin
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false); setProgress(null) }
  }

  const p = parsed?.prodmix, r = parsed?.receipts
  const badDays = parsed?.recon?.days.filter(d => !d.ok) ?? []
  const rowCount = (r ? r.days.length : 0) + (p ? p.lines.length : 0)

  if (!open) {
    return (
      <div style={{ ...card, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>📦</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Günlük detay yüklə — məhsul (PRODMIX) + çek</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 2 }}>
            Ortalama çek, müştəri sayı və menyu analizi bu fayllardan gəlir. Hər gün atıla bilər — üzərinə yazılır.
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#faf8f4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Aç →
        </button>
      </div>
    )
  }

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>📦 Günlük detay — PRODMIX + ÇEK</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 3 }}>
            İki fayl birlikdə atıla bilər. {PARTIAL_LAST_DAY_NOTE}
          </div>
        </div>
        <button onClick={() => { setOpen(false); reset() }} style={{ background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>bağla</button>
      </div>

      {/* Dropzone */}
      {!parsed && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#F2A81D' : '#d8d2c6', background: drag ? '#fffaf0' : '#faf8f4', padding: '32px 20px', textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}
          >
            <div style={{ fontSize: 30 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 6 }}>{busy ? phase || 'Oxunur…' : 'Faylları bura sürüklə'}</div>
            <div style={{ color: '#8b8378', fontSize: 12, marginTop: 4 }}>
              .xlsx · məhsul detayı (Uçot günü · Məhsul) · ödəniş şərtləri (Qəbzin nömrəsi · Ödəniş növü)
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsb" multiple hidden onChange={e => add(e.target.files)} />
          </div>
          {files.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {files.map((f, i) => <span key={i} style={{ ...card, padding: '4px 10px', fontSize: 12 }}>📄 {f.name}</span>)}
              <button onClick={reset} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>təmizlə</button>
              <button onClick={read} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: busy ? '#9a9488' : '#26221d', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Oxunur…' : 'Oxu və tutuşdur →'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Önizləmə — DB-yə hələ yazılmadı */}
      {parsed && !result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {r && <>
              <Mini k="Çek sayı" v={int(r.totals.receipts)} sub="unikal qəbz" />
              <Mini k="Ortalama çek" v={r.totals.avgCheck == null ? '—' : money(r.totals.avgCheck)} />
              <Mini k="Çek cirosu" v={money(r.totals.amount)} sub={`${r.dates.length} gün`} />
            </>}
            {p && <>
              <Mini k="Məhsul cirosu" v={money(p.totals.productAmount)} sub={`${int(p.lines.length)} sətir`} />
              <Mini k="Məhsul sayı" v={int(p.totals.qty)} />
            </>}
          </div>

          {/* Yalnız biri gəldiyində tutuşdurma mümkün deyil — sükutla keçmirik */}
          {(!p || !r) && (
            <Note tone="amber">
              {!p ? 'PRODMIX faylı yoxdur' : 'ÇEK faylı yoxdur'} — gün-gün tutuşdurma edilə bilmədi.
              Tək fayl da yazıla bilər, amma natamam export ancaq iki fayl müqayisəsində görünür.
            </Note>
          )}

          {/* Tutuşdurma — əsl natamamlıq detektoru */}
          {parsed.recon && (
            badDays.length === 0
              ? <Note tone="green">✓ Tutuşdurma təmiz: {parsed.recon.days.length} günün hamısında prodmix və çek cirosu üst-üstə düşür.</Note>
              : <div style={{ ...card, borderColor: '#f5dEA8', background: '#fffaf0', padding: '12px 14px' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#8a5a00', marginBottom: 8 }}>
                    ⚠ {badDays.length} gündə fərq var — həmin gün(lər) natamam ola bilər
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead><tr style={{ textAlign: 'right', color: '#8b8378' }}>
                        <th style={{ textAlign: 'left', padding: '4px 6px' }}>Gün</th>
                        <th style={{ padding: '4px 6px' }}>Prodmix</th>
                        <th style={{ padding: '4px 6px' }}>Çek</th>
                        <th style={{ padding: '4px 6px' }}>Fərq</th>
                      </tr></thead>
                      <tbody>
                        {badDays.map(d => (
                          <tr key={d.date} style={{ borderTop: '1px solid #f0e6d0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            <td style={{ textAlign: 'left', padding: '4px 6px' }}>{d.date}</td>
                            <td style={{ padding: '4px 6px' }}>{money(d.prodmixAmount)}</td>
                            <td style={{ padding: '4px 6px' }}>{money(d.receiptsAmount)}</td>
                            <td style={{ padding: '4px 6px', color: '#c8102e', fontWeight: 700 }}>{money(Math.abs(d.diff))} · %{Math.abs(d.diffPct * 100).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8a5a00', marginTop: 8 }}>
                    Yazmaq təhlükəsizdir — açar üzrə üzərinə yazılır. Sabah tam fayl gələndə həmin gün düzələcək, İKİ DƏFƏ sayılmayacaq.
                  </div>
                </div>
          )}

          {/* Parser xəbərdarlıqları — udulmur */}
          {[...(p?.warnings ?? []), ...(r?.warnings ?? [])].length > 0 && (
            <Note tone="amber">
              {[...(p?.warnings ?? []), ...(r?.warnings ?? [])].map((w, i) => <div key={i}>• {w}</div>)}
            </Note>
          )}

          {/* Naməlum ödəniş növləri — sükutla atılmır */}
          {r && Object.keys(r.totals.unknownPayments).length > 0 && (
            <Note tone="amber">
              Tanınmayan ödəniş növü: {Object.entries(r.totals.unknownPayments).map(([k, v]) => `${k} (${money(v)})`).join(', ')}
              {' '}— «kart» kimi sayılmadı, xəritəyə əlavə edilməlidir.
            </Note>
          )}

          {progress && (
            <div>
              <div style={{ fontSize: 12, color: '#8b8378', marginBottom: 4 }}>{phase} {progress.done}/{progress.total}</div>
              <div style={{ height: 6, background: '#efeae0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`, background: '#C8102E', transition: 'width .2s' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset} disabled={busy} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>ləğv et</button>
            <span style={{ fontSize: 12, color: '#8b8378' }}>{int(rowCount)} aqreqat sətir yazılacaq</span>
            <button onClick={save} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: busy ? '#9a9488' : '#C8102E', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Yazılır…' : 'Bazaya yaz →'}
            </button>
          </div>
        </div>
      )}

      {/* Nəticə */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Note tone="green">
            ✓ Yazıldı.
            {result.daily && <div>Çek/ödəniş: <b>{int(result.daily.written)}</b> sətir · günlər: {result.daily.days.join(', ')}</div>}
            {result.item && <div>Məhsul: <b>{int(result.item.written)}</b> sətir · günlər: {result.item.days.join(', ')}</div>}
          </Note>
          {(() => {
            const un = [...new Set([...(result.daily?.unmatchedBranches ?? []), ...(result.item?.unmatchedBranches ?? [])])]
            const rej = (result.daily?.rejected ?? 0) + (result.item?.rejected ?? 0)
            const mrg = (result.daily?.merged ?? 0) + (result.item?.merged ?? 0)
            return (
              <>
                {un.length > 0 && (
                  <Note tone="amber">
                    Bu filial adları OCAQ-da tapılmadı: <b>{un.join(', ')}</b>. Data <b>itməyib</b> (yazıldı), amma
                    filial bağlantısı boşdur → rol əsaslı filtr işləməz. <a href="/admin/filiallar" style={{ color: '#8a5a00' }}>/admin/filiallar</a>-da yaradın,
                    növbəti yükləmə bağlantını özü dolduracaq.
                  </Note>
                )}
                {rej > 0 && <Note tone="amber">{rej} sətir validasiyadan keçmədi (tarix/ödəniş növü/say). Nümunə: {[...(result.daily?.rejectedSample ?? []), ...(result.item?.rejectedSample ?? [])].join(', ')}</Note>}
                {mrg > 0 && <Note tone="amber">{mrg} təkrar açar bir sətirdə toplandı.</Note>}
              </>
            )
          })()}
          <button onClick={reset} style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#faf8f4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ↻ yeni fayl yüklə
          </button>
        </div>
      )}

      {err && (
        <div style={{ ...card, borderColor: '#f0c9cf', background: '#fdf2f3', padding: '12px 14px', marginTop: 12, color: '#c8102e', fontSize: 13 }}>
          ⚠ {err}
        </div>
      )}
    </div>
  )
}

function Mini({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: '10px 13px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: '#8b8378', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function Note({ tone, children }: { tone: 'green' | 'amber'; children: ReactNode }) {
  const c = tone === 'green'
    ? { border: '#c5e3d0', bg: '#f2fbf5', fg: '#1c7a4e' }
    : { border: '#f5dea8', bg: '#fffaf0', fg: '#8a5a00' }
  return (
    <div style={{ ...card, borderColor: c.border, background: c.bg, padding: '11px 14px', fontSize: 12.5, color: c.fg, lineHeight: 1.55 }}>
      {children}
    </div>
  )
}
