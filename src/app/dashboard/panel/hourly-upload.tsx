'use client'

import Link from 'next/link'
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { parseHourlySales, hourlyToDailyFacts, type HourlySalesReport } from '@/lib/analytics/parse-iiko-reports'

/**
 * SAATLIQ satış hesabatını («Doğan Tomris Rapor») yükləyir.
 *
 * NİYƏ AYRICA KOMPONENT (DetailUpload-a əlavə edilmədi): axın FƏRQLİDİR.
 * Bu fayl KUMULYATİVDİR — ayın əvvəlindən bu günə qədərki cəm. Yazılış da
 * fərqlidir (görüntü + fərq), istifadəçidən əlavə bir məlumat alınır (faylın
 * əhatə etdiyi son gün), və nəticə ekranı tamam başqa şeyi göstərir.
 * İşləyən PRODMIX/ÇEK axınına toxunmuruq (AGENTS.md §4).
 *
 * NİYƏ SON GÜN İSTİFADƏÇİDƏN SORULUR: fayl başlığındakı «Dövrün: … sonu
 * 31.08.2026» İSTƏNİLƏN aralığı göstərir, DATANIN bitdiyi günü yox — real
 * faylda başlıq 31.08 yazırdı, data isə 21.08-də bitirdi. Ona görə başlığa
 * GÜVƏNMİRİK. Standart dəyər «dünən», çünki hesabat səhər çıxarılır və dünəni
 * əhatə edir («22 avqusta kimi, 21 avqust daxil»).
 *
 * NİYƏ BRAUZERDƏ PARSE: real fayl 8 MB / 203 293 sətirdir; Vercel body limiti
 * 4,5 MB. Brauzerdə oxunur, yalnız ~3 900 aqreqat sətir göndərilir.
 */

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼'
const int = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ')

/** Yerli vaxta görə dünənin ISO tarixi (UTC sürüşməsi olmadan). */
function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type SaveResult = {
  ok: true
  periodStart: string; periodEnd: string
  cumeWritten: number; cumeNet: number; merged: number; rejected: number
  prevEnd: string | null; deltaDate: string | null; spanDays: number
  deltaNet: number; deltaGuests: number; dailyWritten: number; derivation: 'delta' | 'direct'
  negatives: number; negativesSample: Array<{ filial: string; payType: string; hour: number; net: number }>
  vanished: number; warnings: string[]; unmatchedBranches: string[]
}

/** 'dated' rejiminin nəticəsi — faylda `Uçot günü` olanda bu qaytarılır. */
type DatedResult = {
  mode: 'dated'
  hourlyWritten: number
  dailyWritten: number
  net: number
  guests: number
  days: string[]
  unmatchedBranches: string[]
  unmapped: Array<{ payType: string; amount: number }>
}

/** Bir çağırışda göndərilən sətir sayı. 24 günlük fayl 43 074 sətirdir. */
const CHUNK = 4000

export default function HourlyUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rep, setRep] = useState<HourlySalesReport | null>(null)
  const [coverEnd, setCoverEnd] = useState(yesterdayISO())
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<SaveResult | null>(null)
  const [dated, setDated] = useState<DatedResult | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [open, setOpen] = useState(false)

  function reset() {
    setFile(null); setRep(null); setErr(null); setResult(null); setDated(null); setProgress(null); setPhase('')
    setCoverEnd(yesterdayISO())
    if (inputRef.current) inputRef.current.value = ''
  }

  async function read() {
    if (!file) return
    setBusy(true); setErr(null); setRep(null); setResult(null); setDated(null)
    try {
      setPhase('Fayl oxunur…')
      const XLSX = await import('xlsx')
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
      // Pivot tək vərəqdədir; yenə də bütün vərəqlərə baxırıq — başlıq tapılan
      // birincisi götürülür ki vərəq adı dəyişsə axın sınmasın.
      let best: HourlySalesReport | null = null
      for (const sn of wb.SheetNames) {
        setPhase(`«${sn}» oxunur…`)
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: true, defval: null }) as unknown[][]
        const r = parseHourlySales(rows)
        if (r.rows.length && (!best || r.totals.net > best.totals.net)) best = r
      }
      if (!best) throw new Error('Saatlıq hesabat tapılmadı — başlıqlar gözlənildiyi kimi deyil (Ticarət müəssisəsi / Ödəniş növü / Bağlama saatı / Endirimli məbləğ).')
      setRep(best)
      // Fayl `Uçot günü` daşıyırsa və ya tək günlükdürsə tarixi ondan götür.
      if (best.period.singleDay) setCoverEnd(best.period.singleDay)
      setPhase('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  async function save() {
    if (!rep || !rep.rows.length) return
    setBusy(true); setErr(null); setPhase('Yazılır…')
    try {
      // ── REJİM SEÇİMİ ────────────────────────────────────────────────────────
      // Faylda `Uçot günü` varsa (yəni hər sətir öz gününü daşıyırsa) FƏRQ
      // HESABINA EHTİYAC YOXDUR — birbaşa yazılır. Bu, tərcih edilən yoldur.
      if (rep.hasDayColumn && rep.canWriteDaily) { await saveDated(); return }
      await saveCumulative()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  /** Tarixli fayl: saatlıq sətirlər chunk-la, günlük fakt mövcud endpoint-lə. */
  async function saveDated() {
    if (!rep) return
    const src = file?.name?.slice(0, 120) ?? null
    const all = rep.rows.map(r => ({
      date: r.date, filial: r.filial, payType: r.payType, hour: r.hour, net: r.net, guests: r.guests,
    }))

    // 1) SAATLIQ — chunk-lı, hər çağırış müstəqil idempotentdir.
    let hourlyWritten = 0
    const daySet = new Set<string>()
    const unmatched = new Set<string>()
    setProgress({ done: 0, total: all.length })
    for (let i = 0; i < all.length; i += CHUNK) {
      const slice = all.slice(i, i + CHUNK)
      setPhase(`Saatlıq yazılır — ${i.toLocaleString('ru-RU')}/${all.length.toLocaleString('ru-RU')}`)
      const res = await fetch('/api/dashboard/analytics/hourly-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'dated', source: src, rows: slice }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(`Saatlıq yazma: ${j?.error ?? 'xəta'}${j?.detail ? ` — ${j.detail}` : ''}`)
      hourlyWritten += Number(j.written ?? 0)
      for (const d of (j.days ?? []) as string[]) daySet.add(d)
      for (const b of (j.unmatchedBranches ?? []) as string[]) unmatched.add(b)
      setProgress({ done: Math.min(i + CHUNK, all.length), total: all.length })
    }

    // 2) GÜNLÜK FAKT — mövcud, sınanmış endpoint (`fact-save`, kind='daily').
    //    Ayrı kod yazmırıq: dashboard və Analitika ONSUZ DA bu cədvəli oxuyur.
    const df = hourlyToDailyFacts(rep.rows)
    let dailyWritten = 0
    for (let i = 0; i < df.rows.length; i += CHUNK) {
      const slice = df.rows.slice(i, i + CHUNK)
      setPhase(`Günlük fakt yazılır — ${i.toLocaleString('ru-RU')}/${df.rows.length.toLocaleString('ru-RU')}`)
      const res = await fetch('/api/dashboard/analytics/fact-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'daily', source: src, rows: slice }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(`Günlük yazma: ${j?.error ?? 'xəta'}${j?.detail ? ` — ${j.detail}` : ''}`)
      dailyWritten += Number(j.written ?? 0)
      for (const b of (j.unmatchedBranches ?? []) as string[]) unmatched.add(b)
    }

    setDated({
      mode: 'dated', hourlyWritten, dailyWritten,
      net: df.totals.amount, guests: df.totals.receipts,
      days: [...daySet].sort(),
      unmatchedBranches: [...unmatched],
      unmapped: df.unmapped,
    })
    setProgress(null); setPhase('')
    router.refresh()
  }

  /** Tarixsiz (kumulyativ) fayl: görüntü + fərq. Köhnə format üçün saxlanılır. */
  async function saveCumulative() {
    if (!rep) return
    // Başlıqdan dövr başlanğıcı oxunmasa ayın 1-i götürülür — hesabat həmişə
    // ayın əvvəlindən çıxarılır. Seçim ekranda da yazılır.
    const periodStart = rep.period.from ?? `${coverEnd.slice(0, 8)}01`
    const res = await fetch('/api/dashboard/analytics/hourly-save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodStart, periodEnd: coverEnd,
        source: file?.name?.slice(0, 120) ?? null,
        rows: rep.rows.map(r => ({ filial: r.filial, payType: r.payType, hour: r.hour, net: r.net, guests: r.guests })),
      }),
    })
    const j = await res.json()
    // Xəta UDULMUR — serverin teşhis məlumatı olduğu kimi göstərilir.
    if (!res.ok) throw new Error(`${j?.error ?? 'Yazma xətası'}${j?.detail ? ` — ${j.detail}` : ''}`)
    setResult(j as SaveResult)
    setPhase('')
    router.refresh()
  }

  if (!open) {
    return (
      <div style={{ ...card, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>🕐</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Saatlıq satış yüklə — «Doğan Tomris Rapor»</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 2 }}>
            Saat-saat ciro, ödəniş növü, qonaq. Fayl KUMULYATİVDİR — hər gün yenisini at, toplamdan davam edir.
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#faf8f4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Aç →
        </button>
      </div>
    )
  }

  return (
    <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>🕐 Saatlıq satış hesabatı</div>
        <button onClick={() => { setOpen(false); reset() }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>bağla</button>
      </div>

      {err && <Note tone="red"><b>Xəta:</b> {err}</Note>}

      {!result && !dated && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsb" onChange={e => { setFile(e.target.files?.[0] ?? null); setRep(null); setResult(null) }} />
            <button onClick={read} disabled={!file || busy} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: !file || busy ? '#9a9488' : '#26221d', color: '#fff', fontWeight: 700, cursor: !file || busy ? 'default' : 'pointer' }}>
              {busy ? (phase || 'oxunur…') : 'oxu'}
            </button>
            {file && <button onClick={reset} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>təmizlə</button>}
          </div>

          {rep && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
                <Mini k="Kumulyativ ciro" v={money(rep.totals.net)} sub={rep.period.from ? `${rep.period.from}-dən` : undefined} />
                <Mini k="Filial" v={int(rep.totals.branches)} />
                <Mini k="Saat" v={int(rep.totals.hours)} sub="24 saatın örtüyü" />
                <Mini k="Qonaq" v={int(rep.totals.guests)} sub={rep.totals.guests > 0 ? `${(rep.totals.net / rep.totals.guests).toFixed(2)} ₼/qonaq` : undefined} />
                <Mini k="Sətir" v={int(rep.rows.length)} sub={`${int(rep.skippedSubtotals)} ara cəm süzüldü`} />
              </div>

              {/* Faylın öz «Grand Total» sətri ilə tutuşdurma — GÖRÜNSÜN. */}
              {rep.grandTotal !== null && (
                <Note tone={Math.abs(rep.totals.net - rep.grandTotal) < Math.abs(rep.grandTotal) * 0.005 ? 'green' : 'amber'}>
                  Faylın öz «Grand Total» sətri: <b>{money(rep.grandTotal)}</b> · oxunan: <b>{money(rep.totals.net)}</b>
                  {' '}(fərq {(rep.totals.net - rep.grandTotal).toFixed(2)} ₼)
                </Note>
              )}

              {/* TARİX SUALI YALNIZ `Uçot günü` OLMAYAN FAYLDA VERİLİR.
                  Fayl günü daşıyırsa soruşmaq mənasızdır — və səhv cavab
                  datanı yanlış günə yazardı. */}
              {rep.hasDayColumn ? (
                <Note tone="green">
                  <b>Faylda «Uçot günü» var</b> — {rep.totals.days} gün ayrı-ayrı oxundu
                  {rep.rows.length ? ` (${rep.rows[0].date} … ${rep.rows[rep.rows.length - 1].date})` : ''}.
                  Tarix soruşmağa ehtiyac yoxdur, sətirlər öz gününə yazılacaq.
                </Note>
              ) : (
              <div style={{ background: '#faf8f4', border: '1px solid #e6e1d7', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700 }}>Bu fayl hansı günə qədərdir? <span style={{ fontWeight: 400, color: '#6b655c' }}>(həmin gün DAXİL)</span></label>
                <input type="date" value={coverEnd} onChange={e => setCoverEnd(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d8d2c6', fontSize: 14, maxWidth: 200 }} />
                <div style={{ fontSize: 12, color: '#6b655c', lineHeight: 1.6 }}>
                  Fayl başlığı «{rep.period.raw ?? '—'}» yazır — bu, <b>istənilən</b> aralıqdır, datanın bitdiyi gün deyil.
                  Ona görə soruşuruq. «22 avqusta kimi, 21 avqust daxil» faylı üçün <b>21.08</b> seçilməlidir.
                  {' '}Dövrün başlanğıcı: <b>{rep.period.from ?? `${coverEnd.slice(0, 8)}01`}</b>
                  {!rep.period.from && ' (başlıqdan oxunmadı — ayın 1-i götürüldü)'}.
                </div>
              </div>
              )}

              {rep.warnings.map((w, i) => (
                <Note key={i} tone={w.startsWith('⚠') ? 'amber' : 'grey'}>{w}</Note>
              ))}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={reset} disabled={busy} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>ləğv et</button>
                {progress && (
                  <span style={{ fontSize: 12, color: '#6b655c' }}>
                    {progress.done.toLocaleString('ru-RU')} / {progress.total.toLocaleString('ru-RU')} sətir
                  </span>
                )}
                <button onClick={save} disabled={busy || (!rep.hasDayColumn && !coverEnd)} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: busy || (!rep.hasDayColumn && !coverEnd) ? '#9a9488' : '#C8102E', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                  {busy ? (phase || 'yazılır…') : 'yaz'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── TARİXLİ FAYLIN NƏTİCƏSİ ─────────────────────────────────────── */}
      {dated && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Note tone="green">
            <b>Yazıldı — {dated.days.length} gün</b> ({dated.days[0]} … {dated.days[dated.days.length - 1]})
            <div style={{ marginTop: 6 }}>
              Ciro <b>{money(dated.net)}</b> · çek <b>{int(dated.guests)}</b> ·
              {' '}ortalama çek <b>{dated.guests > 0 ? (dated.net / dated.guests).toFixed(2) : '—'} ₼</b>
            </div>
            <div style={{ marginTop: 6, color: '#3d6b48' }}>
              {int(dated.hourlyWritten)} saatlıq sətir + {int(dated.dailyWritten)} günlük fakt sətri
            </div>
          </Note>

          {dated.unmapped.length > 0 && (
            <Note tone="amber">
              <b>Tanınmayan ödəniş növü:</b>{' '}
              {dated.unmapped.map(u => `${u.payType} (${money(u.amount)})`).join(' · ')}
              <div style={{ marginTop: 4 }}>
                Məbləğ günün cəmində QALDI — itmədi. Səbətə (nağd/kart/wolt/bolt) düşməsi üçün
                <i> filial-map</i>-a əlavə olunmalıdır.
              </div>
            </Note>
          )}

          {dated.unmatchedBranches.length > 0 && (
            <Note tone="amber">
              <b>OCAQ-da tapılmayan filial:</b> {dated.unmatchedBranches.join(', ')} — data yazıldı,
              amma filial bağlantısı boşdur. <i>/admin/filiallar</i>-da yaradıldıqdan sonra
              növbəti yükləmə doldurur.
            </Note>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/saatlik" style={{ padding: '9px 18px', borderRadius: 10, background: '#26221d', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              🕐 Saatlıq satış →
            </Link>
            <Link href="/dashboard/analitika" style={{ padding: '9px 18px', borderRadius: 10, background: '#26221d', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              📊 Analitika →
            </Link>
            <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#faf8f4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              yeni fayl
            </button>
          </div>
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Note tone="green">
            <b>Kumulyativ görüntü yazıldı:</b> {result.periodStart} → {result.periodEnd} ·
            {' '}{int(result.cumeWritten)} sətir · {money(result.cumeNet)}
          </Note>

          {result.dailyWritten > 0 ? (
            <Note tone="green">
              <b>Günlük data çıxarıldı: {result.deltaDate}</b> — {money(result.deltaNet)} ·
              {' '}{int(result.deltaGuests)} qonaq · {int(result.dailyWritten)} saat sətri.
              {' '}<span style={{ color: '#6b655c' }}>
                ({result.derivation === 'direct'
                  ? 'dövr tək gündür — birbaşa yazıldı'
                  : `əvvəlki görüntü ${result.prevEnd} ilə fərq`})
              </span>
            </Note>
          ) : (
            <Note tone="amber">
              Günlük data çıxarılmadı{result.prevEnd ? ` (əvvəlki görüntü: ${result.prevEnd})` : ''}.
              {' '}Səbəb aşağıda.
            </Note>
          )}

          {result.warnings.map((w, i) => <Note key={i} tone="amber">{w}</Note>)}

          {result.negatives > 0 && (
            <Note tone="amber">
              <b>{result.negatives} sətirdə mənfi fərq</b> — keçmiş günə düzəliş girilib. Nümunə:{' '}
              {result.negativesSample.map(n => `${n.filial}/${n.payType}/${String(n.hour).padStart(2, '0')}:00 → ${n.net.toFixed(2)} ₼`).join(' · ')}
            </Note>
          )}

          {result.unmatchedBranches.length > 0 && (
            <Note tone="amber">
              <b>OCAQ-da tapılmayan filial:</b> {result.unmatchedBranches.join(', ')} — data yazıldı, amma
              filial bağlantısı boşdur. <i>/admin/filiallar</i>-da yaradıldıqdan sonra növbəti yükləmə doldurur.
            </Note>
          )}

          {/* Yazdıqdan sonra datanın GÖRÜNDÜYÜ yerə birbaşa keçid. Əvvəl belə bir
              keçid yox idi və istifadəçi «yüklədim, çıxmadı» dedi — haqlıydı. */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/saatlik" style={{ padding: '9px 18px', borderRadius: 10, background: '#26221d', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              🕐 Saatlıq satışa bax →
            </Link>
            <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#faf8f4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              yeni fayl
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Mini({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ background: '#faf8f4', border: '1px solid #eee9e0', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: '#8b8378', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{k}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: '#8b8378', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Note({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'grey'; children: ReactNode }) {
  const c = {
    green: { bg: '#f1f8f2', bd: '#cfe6d3', fg: '#1f5130' },
    amber: { bg: '#fdf6e9', bd: '#eddcb6', fg: '#6b4e12' },
    red:   { bg: '#fdf0f1', bd: '#f0c9cd', fg: '#8a1f2a' },
    grey:  { bg: '#f7f6f3', bd: '#e6e1d7', fg: '#4d483f' },
  }[tone]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.bd}`, color: c.fg, borderRadius: 10, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}
