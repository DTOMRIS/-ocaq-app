'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  parseHourlySales, hourlyToDailyFacts,
  parseProductDaily, productDailyToItemFacts, detectReportKind, explainUnrecognized,
  parseDeletions, type DeletionReport,
  type HourlySalesReport, type ProductDailyReport,
  parseWriteoffs,
} from '@/lib/analytics/parse-iiko-reports'

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

/** Sətirlərdəki ƏN ERKƏN … ƏN GEC tarix. Sətirlər sıralı olmaya bilər. */
function dateRange(rows: Array<{ date: string | null }>): string {
  const ds = rows.map(r => r.date).filter((d): d is string => !!d)
  if (!ds.length) return '—'
  let min = ds[0], max = ds[0]
  for (const d of ds) { if (d < min) min = d; if (d > max) max = d }
  return min === max ? min : `${min} … ${max}`
}

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

/**
 * `presetFile` — yuxarıdakı TƏK yükləmə qutusu iiko hesabatını tanıyıb bura
 * ötürəndə dolur. Onda komponent özü açılır və faylı OXUYUR: istifadəçi ikinci
 * dəfə fayl seçmək məcburiyyətində qalmır (iki qutu tələsi tam bitir).
 */
export default function HourlyUpload({ presetFile = null }: { presetFile?: File | null } = {}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(presetFile)
  const [rep, setRep] = useState<HourlySalesReport | null>(null)
  // Bir qutu İKİ hesabatı tanıyır: «Satış ay və gün» (saatlıq) və
  // «DT Məhsul sayı və qiyməti» (menyu). Səhv qutu problemi qalmır.
  const [prod, setProd] = useState<ProductDailyReport | null>(null)
  const [del, setDel] = useState<DeletionReport | null>(null)
  const [delDone, setDelDone] = useState<{ written: number; days: string[]; amount: number; replaced: number; unmatched: string[] } | null>(null)
  const [prodDone, setProdDone] = useState<{ written: number; days: string[]; items: number; amount: number; qty: number; unmatched: string[]; replaced: number } | null>(null)
  const [coverEnd, setCoverEnd] = useState(yesterdayISO())
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<SaveResult | null>(null)
  const [dated, setDated] = useState<DatedResult | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [open, setOpen] = useState(!!presetFile)
  // Yuxarıdakı qutudan gələn fayl AVTOMATİK oxunur — eyni fayl üçün bir dəfə.
  const autoRead = useRef<File | null>(null)

  useEffect(() => {
    if (!presetFile || autoRead.current === presetFile) return
    autoRead.current = presetFile
    setFile(presetFile); setOpen(true)
    setRep(null); setProd(null); setDel(null); setResult(null); setDated(null); setProdDone(null); setDelDone(null); setErr(null)
    void readFile(presetFile)
  }, [presetFile])

  function reset() {
    setFile(null); setRep(null); setProd(null); setDel(null); setErr(null); setResult(null); setDated(null); setProdDone(null); setDelDone(null); setProgress(null); setPhase('')
    setCoverEnd(yesterdayISO())
    if (inputRef.current) inputRef.current.value = ''
  }

  async function read() { if (file) await readFile(file) }

  async function readFile(f: File) {
    setBusy(true); setErr(null); setRep(null); setProd(null); setDel(null); setResult(null); setDated(null); setProdDone(null); setDelDone(null)
    try {
      setPhase('Fayl oxunur…')
      const XLSX = await import('xlsx')
      const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
      // Pivot tək vərəqdədir; yenə də bütün vərəqlərə baxırıq — başlıq tapılan
      // birincisi götürülür ki vərəq adı dəyişsə axın sınmasın.
      // 🔴 ƏVVƏLCƏ UCUZ TANIMA, SONRA TƏK PARSER.
      //
      // Əvvəl hər vərəqdə HƏR İKİ parser işlədilirdi. «DT Məhsul» faylı
      // 292 610 sətirdir — iki tam keçid brauzeri DONDURURDU və istifadəçi
      // «oxu düyməsinə basılmır» görürdü (əslində basılırdı, sonra səhifə
      // kilidlənirdi). İndi `detectReportKind` yalnız ilk 30 sətrə baxır və
      // yalnız DOĞRU parser işləyir — iş yarıya düşür.
      let best: HourlySalesReport | null = null
      let bestProd: ProductDailyReport | null = null
      let bestDel: DeletionReport | null = null
      // Tanınmadıqda SƏBƏBİ yaza bilmək üçün ilk vərəqin başlığını saxlayırıq.
      let firstHead: unknown[][] = []
      for (const sn of wb.SheetNames) {
        setPhase(`«${sn}» oxunur…`)
        // Brauzerin ekranı yeniləməsinə imkan ver — yoxsa «oxunur…» yazısı
        // heç görünmür və istifadəçi düymənin işləmədiyini sanır.
        await new Promise(r => setTimeout(r, 0))
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: true, defval: null }) as unknown[][]
        if (!firstHead.length) firstHead = rows.slice(0, 30)
        const kind = detectReportKind(rows)
        if (!kind) continue
        // Obyektlə: yeni hesabat növü əlavə olunanda TypeScript əskik açarı
        // göstərir. Üçlü şərtdə `'deletion'` səssizcə «saatlıq» yazılırdı.
        const kindLabel: Record<NonNullable<typeof kind>, string> = {
          hourly: 'saatlıq', product: 'məhsul', deletion: 'silinmə',
          writeoff: 'anbar silinməsi',
        }
        setPhase(`«${sn}» — ${kindLabel[kind]} hesabatı (${rows.length.toLocaleString('ru-RU')} sətir)…`)
        await new Promise(r => setTimeout(r, 0))
        // Anbar silinməsi — çek bazlı silinmə ilə EYNİ cədvələ yazılır, amma
        // `category` (QİDA/QEYRİ QİDA) ilə. Bu ayrım food cost üçün lazımdır və
        // yalnız bu faylda gəlir. `XÜLASƏ` vərəqi PİVOTDUR — oxunmur.
        if (kind === 'writeoff') {
          const w = parseWriteoffs(rows)
          if (w.rows.length) {
            const payload = w.rows.map(r => ({
              date: r.business_date, filial: r.filial, item: r.item,
              amount: r.amount, qty: r.qty, category: r.category,
              writtenOff: true, receipt: null, reason: null, comment: null,
            })).filter(r => r.date)
            for (let i = 0; i < payload.length; i += 4000) {
              const dilim = payload.slice(i, i + 4000)
              const res = await fetch('/api/dashboard/analytics/deletion-save', {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ rows: dilim, source: `anbar:${sn}`,
                  ...(i === 0 ? { replaceDays: w.days } : {}) }),
              })
              if (!res.ok) throw new Error((await res.json()).error ?? 'Anbar silinməsi yazılmadı')
            }
            const kat = Object.entries(w.byCategory)
              .map(([k, v]) => `${k} ${Math.round(v).toLocaleString('ru-RU')} ₼`).join(' · ')
            setPhase(`Anbar silinməsi yazıldı — ${w.rows.length.toLocaleString('ru-RU')} sətir · ` +
              `cəmi ${Math.round(w.total).toLocaleString('ru-RU')} ₼ · ${kat}` +
              (w.staffMealTotal ? ` · personal yeməyi ${Math.round(w.staffMealTotal).toLocaleString('ru-RU')} ₼` : ''))
          }
          continue
        }
        if (kind === 'deletion') {
          const dr = parseDeletions(rows)
          if (dr.rows.length && (!bestDel || dr.totals.amount > bestDel.totals.amount)) bestDel = dr
        } else if (kind === 'product') {
          const pr = parseProductDaily(rows)
          if (pr.rows.length && (!bestProd || pr.totals.amount > bestProd.totals.amount)) bestProd = pr
        } else {
          const h = parseHourlySales(rows)
          if (h.rows.length && (!best || h.totals.net > best.totals.net)) best = h
        }
      }
      if (bestDel) { setDel(bestDel); setPhase(''); return }
      if (bestProd && (!best || bestProd.rows.length > best.rows.length)) { setProd(bestProd); setPhase(''); return }
      if (!best) throw new Error(explainUnrecognized(firstHead))
      setRep(best)
      // Fayl `Uçot günü` daşıyırsa və ya tək günlükdürsə tarixi ondan götür.
      if (best.period.singleDay) setCoverEnd(best.period.singleDay)
      setPhase('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  async function save() {
    if (del && del.rows.length) { setBusy(true); setErr(null); setPhase('Yazılır…'); try { await saveDeletion() } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) } return }
    if (prod && prod.rows.length) { setBusy(true); setErr(null); setPhase('Yazılır…'); try { await saveProduct() } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) } return }
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

  /**
   * Məhsul hesabatı → MÖVCUD `analytics_item_fact` (fact-save, kind='item').
   * Ayrı endpoint yazmırıq: Analitika səhifəsi ONSUZ DA bu cədvəli oxuyur.
   */
  async function saveProduct() {
    if (!prod) return
    const src = file?.name?.slice(0, 120) ?? null
    const facts = productDailyToItemFacts(prod.rows)
    const days = prod.byDay.map(d => d.date)
    const unmatched = new Set<string>()
    let written = 0
    let replaced = 0
    // 🔴 SİLMƏ ARTIQ ƏVVƏLDƏ DEYİL, SONDADIR.
    //
    // Əvvəl birinci chunk həmin günləri DƏRHAL silirdi, sonra sətirlər 18 ayrı
    // HTTP çağırışı ilə yazılırdı. Bunlar bir tranzaksiya deyil — ortada bir
    // çağırış sınsa AY SİLİNMİŞ, yalnız bir hissəsi yazılmış qalırdı.
    //
    // İndi: birinci chunk yalnız `sweepFrom` (serverin `now()`-u) alır; bütün
    // chunk-lar yazılır; ƏN SONDA həmin günlərdə TƏZƏLƏNMƏYƏN sətirlər silinir.
    // Yükləmə yarıda qırılsa süpürmə HEÇ VAXT çağırılmır → heç nə silinmir.
    let sweepFrom: string | null = null
    setProgress({ done: 0, total: facts.length })
    for (let i = 0; i < facts.length; i += CHUNK) {
      const slice = facts.slice(i, i + CHUNK)
      setPhase(`Məhsul yazılır — ${i.toLocaleString('ru-RU')}/${facts.length.toLocaleString('ru-RU')}`)
      const res = await fetch('/api/dashboard/analytics/fact-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // `replaceDays` YALNIZ birinci chunk-da gedir və ARTIQ SİLMİR —
        // yalnız süpürmə həddini (`sweepFrom`) qaytarır.
        body: JSON.stringify({ kind: 'item', source: src, rows: slice, ...(i === 0 ? { replaceDays: days } : {}) }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(`Məhsul yazma: ${j?.error ?? 'xəta'}${j?.detail ? ` — ${j.detail}` : ''}`)
      written += Number(j.written ?? 0)
      if (i === 0) {
        replaced = Number(j.replacedRows ?? 0)
        sweepFrom = typeof j.sweepFrom === 'string' ? j.sweepFrom : null
      }
      for (const b of (j.unmatchedBranches ?? []) as string[]) unmatched.add(b)
      setProgress({ done: Math.min(i + CHUNK, facts.length), total: facts.length })
    }

    // ── SÜPÜRMƏ: yalnız BÜTÜN chunk-lar uğurla yazıldıqdan sonra ─────────────
    // Bu nöqtəyə çatmaq üçün yuxarıdakı dövrə tam bitməlidir; hər hansı chunk
    // `throw` etsə buraya heç vaxt gəlinmir və köhnə data toxunulmaz qalır.
    let swept = 0
    if (sweepFrom && days.length) {
      setPhase('Köhnə sətirlər təmizlənir…')
      const res = await fetch('/api/dashboard/analytics/fact-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'item', sweepDays: days, sweepFrom }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(`Təmizləmə: ${j?.error ?? 'xəta'}${j?.detail ? ` — ${j.detail}` : ''}`)
      swept = Number(j.sweptRows ?? 0)
    }
    setProdDone({
      written, days, items: prod.totals.items,
      amount: prod.totals.amount, qty: prod.totals.qty, unmatched: [...unmatched],
      replaced: swept,   // FAKTİKİ silinən sətir sayı (süpürmədən)
    })
    setProgress(null); setPhase('')
    router.refresh()
  }

  /**
   * Silinmə hesabatı → `analytics_deletion_fact` (gün əvəzləmə ilə).
   * Unikal açar YOXDUR: eyni qəbzdə eyni məhsul iki dəfə silinə bilər və
   * açar onları birləşdirib sayı azaldardı (kasa nəzarətində riski gizlədər).
   */
  async function saveDeletion() {
    if (!del) return
    const src = file?.name?.slice(0, 120) ?? null
    const all = del.rows.map(r => ({
      date: r.date, filial: r.filial, item: r.item, amount: r.amount,
      receipt: r.receipt, reason: r.reason, comment: r.comment, writtenOff: r.writtenOff,
    }))
    const days = [...new Set(all.map(r => r.date))].sort()
    const unmatched = new Set<string>()
    let written = 0, replaced = 0
    let sweepFrom: string | null = null
    setProgress({ done: 0, total: all.length })
    for (let i = 0; i < all.length; i += CHUNK) {
      const slice = all.slice(i, i + CHUNK)
      setPhase(`Silinmə yazılır — ${i.toLocaleString('ru-RU')}/${all.length.toLocaleString('ru-RU')}`)
      const res = await fetch('/api/dashboard/analytics/deletion-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // `replaceDays` YALNIZ birinci chunk-da — günlər bir dəfə təmizlənir.
        body: JSON.stringify({ source: src, rows: slice, ...(i === 0 ? { replaceDays: days } : {}) }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(`Silinmə yazma: ${j?.error ?? 'xəta'}${j?.detail ? ` — ${j.detail}` : ''}`)
      written += Number(j.written ?? 0)
      if (i === 0) {
        replaced = Number(j.replacedRows ?? 0)
        sweepFrom = typeof j.sweepFrom === 'string' ? j.sweepFrom : null
      }
      for (const x of (j.unmatchedBranches ?? []) as string[]) unmatched.add(x)
      setProgress({ done: Math.min(i + CHUNK, all.length), total: all.length })
    }

    // SÜPÜRMƏ — yalnız bütün chunk-lar keçdikdən sonra (bax `saveProduct` şərhi).
    let swept = 0
    if (sweepFrom && days.length) {
      setPhase('Köhnə sətirlər təmizlənir…')
      const res = await fetch('/api/dashboard/analytics/deletion-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sweepDays: days, sweepFrom }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(`Təmizləmə: ${j?.error ?? 'xəta'}${j?.detail ? ` — ${j.detail}` : ''}`)
      swept = Number(j.sweptRows ?? 0)
    }
    setDelDone({ written, days, amount: del.totals.amount, replaced: swept, unmatched: [...unmatched] })
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
          <div style={{ fontWeight: 700, fontSize: 14 }}>iiko hesabatı yüklə — saatlıq satış / məhsul</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 2 }}>
            «Satış ay və gün» → saatlıq ciro, ödəniş növü, çek · «DT Məhsul» → menyu analizi. Fayl özü tanınır.
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
        <div style={{ fontWeight: 800, fontSize: 15 }}>🕐 iiko hesabatı</div>
        <button onClick={() => { setOpen(false); reset() }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>bağla</button>
      </div>

      {err && <Note tone="red"><b>Xəta:</b> {err}</Note>}

      {!result && !dated && !prodDone && !delDone && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsb"
              onChange={e => { setFile(e.target.files?.[0] ?? null); setRep(null); setProd(null); setDel(null); setResult(null); setDated(null); setProdDone(null); setDelDone(null) }} />
            <button onClick={read} disabled={!file || busy} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: !file || busy ? '#9a9488' : '#26221d', color: '#fff', fontWeight: 700, cursor: !file || busy ? 'default' : 'pointer' }}>
              {busy ? (phase || 'oxunur…') : 'oxu'}
            </button>
            {/* Düymə boz olanda SƏBƏBİ yazılır — əvvəl səssizcə sönük dururdu
                və «basılmır» kimi görünürdü. */}
            {!file && !busy && <span style={{ fontSize: 12, color: '#8b8378' }}>əvvəlcə fayl seçin ↑</span>}
            {file && !busy && (
              <span style={{ fontSize: 12, color: '#6b655c' }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
                {file.size > 6 * 1024 * 1024 && <b style={{ color: '#8a6a1f' }}> · böyük fayl, oxumaq 30–60 san sürə bilər</b>}
              </span>
            )}
            {file && <button onClick={reset} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>təmizlə</button>}
          </div>

          {del && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
                <Mini k="Silinmə" v={money(del.totals.amount)} />
                <Mini k="Sətir" v={int(del.totals.count)} />
                <Mini k="Qəbz" v={int(del.totals.receipts)} />
                <Mini k="Gün" v={int(del.totals.days)} />
                <Mini k="Filial" v={int(del.totals.branches)} />
              </div>

              <Note tone="green">
                <b>Bu, SİLİNMƏ hesabatıdır</b> — kasa nəzarəti. Yazıldıqdan sonra
                <i> 🗑 Silinmə Nəzarəti</i> ekranında filial-filial nisbət və trend görünəcək.
              </Note>

              {del.outliers.length > 0 && (
                <Note tone="amber">
                  <b>{del.outliers.length} anomaliya</b> (tək silinmə ≥ 200 ₼) — bunlar çox vaxt
                  OĞURLUQ DEYİL, səhv girişdir. Ekranda ayrıca sayılır ki filial nisbətini şişirtməsin.
                  {' '}Ən böyüyü: {del.outliers[0].item} — {money(del.outliers[0].amount)} ({del.outliers[0].filial})
                </Note>
              )}

              <Note tone="amber">
                <b>Bu {del.totals.days} günün köhnə silinmə sətirləri ƏVƏZ OLUNACAQ.</b>
                {' '}Səbəb: eyni qəbzdə eyni məhsul iki dəfə silinə bilər — unikal açar qoysaydıq
                onları birləşdirib sayı AZ göstərərdi. Digər datalara toxunulmur.
              </Note>

              {del.warnings.map((w, i) => <Note key={i} tone={w.startsWith('⚠') ? 'amber' : 'grey'}>{w}</Note>)}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={reset} disabled={busy} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>ləğv et</button>
                {progress && (
                  <span style={{ fontSize: 12, color: '#6b655c' }}>
                    {progress.done.toLocaleString('ru-RU')} / {progress.total.toLocaleString('ru-RU')} sətir
                  </span>
                )}
                <button onClick={save} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: busy ? '#9a9488' : '#C8102E', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                  {busy ? (phase || 'yazılır…') : 'yaz'}
                </button>
              </div>
            </>
          )}

          {prod && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
                <Mini k="Məhsul cirosu" v={money(prod.totals.amount)} />
                <Mini k="Məhsul" v={int(prod.totals.items)} />
                <Mini k="Ədəd" v={int(prod.totals.qty)} />
                <Mini k="Gün" v={int(prod.totals.days)} sub={prod.byDay.length ? `${prod.byDay[0].date} … ${prod.byDay[prod.byDay.length - 1].date}` : undefined} />
                <Mini k="Filial" v={int(prod.totals.branches)} />
              </div>

              {prod.grandTotal !== null && (
                <Note tone={Math.abs(prod.totals.amount - prod.grandTotal) < Math.abs(prod.grandTotal) * 0.005 ? 'green' : 'amber'}>
                  Faylın «Grand Total» sətri: <b>{money(prod.grandTotal)}</b> · oxunan: <b>{money(prod.totals.amount)}</b>
                  {' '}(fərq {(prod.totals.amount - prod.grandTotal).toFixed(2)} ₼)
                </Note>
              )}

              <Note tone="green">
                <b>Bu, MƏHSUL hesabatıdır</b> — menyu analizi (top/flop, ədəd, orta qiymət) buradan gəlir.
                Saatlıq ciro və ödəniş kırılımı «Satış ay və gün» faylından gəlir, bu fayl onu əvəz etmir.
              </Note>

              {/* ƏVƏZLƏMƏ YAZMADAN ƏVVƏL DEYİLİR — sürpriz olmasın. */}
              <Note tone="amber">
                <b>Bu {prod.totals.days} günün köhnə məhsul sətirləri ƏVƏZ OLUNACAQ.</b>
                {' '}Səbəb: PRODMIX faylı məhsul KODUNU açar kimi işlədir, bu hesabatda kod yoxdur (ad işlədilir).
                Əvəz olunmasa eyni məhsul həmin günlərdə İKİ DƏFƏ sayılardı.
                {' '}Saatlıq/ödəniş datasına <b>toxunulmur</b>.
              </Note>

              <div style={{ background: '#faf8f4', border: '1px solid #eee9e0', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Ən çox ciro gətirən 5 məhsul</div>
                {prod.byItem.slice(0, 5).map(i => (
                  <div key={i.item} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '3px 0' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.item}</span>
                    <span style={{ whiteSpace: 'nowrap', color: '#6b655c' }}>
                      <b style={{ color: '#26221d' }}>{money(i.amount)}</b> · {int(i.qty)} əd · {i.avgPrice ? i.avgPrice.toFixed(2) : '—'} ₼
                    </span>
                  </div>
                ))}
              </div>

              {prod.warnings.map((w, i) => <Note key={i} tone={w.startsWith('⚠') ? 'amber' : 'grey'}>{w}</Note>)}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={reset} disabled={busy} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>ləğv et</button>
                {progress && (
                  <span style={{ fontSize: 12, color: '#6b655c' }}>
                    {progress.done.toLocaleString('ru-RU')} / {progress.total.toLocaleString('ru-RU')} sətir
                  </span>
                )}
                <button onClick={save} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: busy ? '#9a9488' : '#C8102E', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                  {busy ? (phase || 'yazılır…') : 'yaz'}
                </button>
              </div>
            </>
          )}

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
                  {/* ⚠️ İLK/SON SƏTİR DEYİL, MİN/MAX. Sətirlər tarixə görə sıralı
                      DEYİL — ilk/son sətri göstərəndə «24 gün (08-01 … 08-10)»
                      kimi ziddiyyətli mətn çıxırdı. */}
                  {rep.rows.length ? ` (${dateRange(rep.rows)})` : ''}.
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

      {/* ── SİLİNMƏ FAYLININ NƏTİCƏSİ ───────────────────────────────────── */}
      {delDone && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Note tone="green">
            <b>Silinmə datası yazıldı — {delDone.days.length} gün</b>
            {delDone.days.length ? ` (${delDone.days[0]} … ${delDone.days[delDone.days.length - 1]})` : ''}
            <div style={{ marginTop: 6 }}>
              {int(delDone.written)} sətir · {money(delDone.amount)}
              {delDone.replaced > 0 && ` · ${int(delDone.replaced)} köhnə sətir əvəz olundu`}
            </div>
          </Note>

          {delDone.unmatched.length > 0 && (
            <Note tone="amber">
              <b>OCAQ-da tapılmayan filial:</b> {delDone.unmatched.join(', ')} — data yazıldı,
              filial bağlantısı boşdur.
            </Note>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/silinme" style={{ padding: '9px 18px', borderRadius: 10, background: '#26221d', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              🗑 Silinmə Nəzarətinə bax →
            </Link>
            <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#faf8f4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              yeni fayl
            </button>
          </div>
        </div>
      )}

      {/* ── MƏHSUL FAYLININ NƏTİCƏSİ ────────────────────────────────────── */}
      {prodDone && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Note tone="green">
            <b>Məhsul datası yazıldı — {prodDone.days.length} gün</b>
            {prodDone.days.length ? ` (${prodDone.days[0]} … ${prodDone.days[prodDone.days.length - 1]})` : ''}
            <div style={{ marginTop: 6 }}>
              {int(prodDone.items)} məhsul · {int(prodDone.qty)} ədəd · {money(prodDone.amount)} ·
              {' '}{int(prodDone.written)} sətir
              {prodDone.replaced > 0 && (
                <div style={{ marginTop: 4, color: '#3d6b48' }}>
                  {int(prodDone.replaced)} köhnə məhsul sətri əvəz olundu (ikiqat sayım qarşısı alındı).
                </div>
              )}
            </div>
          </Note>

          {prodDone.unmatched.length > 0 && (
            <Note tone="amber">
              <b>OCAQ-da tapılmayan filial:</b> {prodDone.unmatched.join(', ')} — data yazıldı,
              filial bağlantısı boşdur. <i>/admin/filiallar</i>-da yaradıldıqdan sonra doldurulacaq.
            </Note>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/analitika" style={{ padding: '9px 18px', borderRadius: 10, background: '#26221d', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              📊 Menyu analizinə bax →
            </Link>
            <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #d8d2c6', background: '#faf8f4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              yeni fayl
            </button>
          </div>
        </div>
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
