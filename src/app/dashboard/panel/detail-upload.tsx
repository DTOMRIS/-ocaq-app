'use client'

import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  parseProdmix, parseReceipts, reconcileProdmixReceipts,
  mergeProdmix, mergeReceipts,
  PARTIAL_LAST_DAY_NOTE,
  type ProdmixResult, type ReceiptsResult, type DayReconcile,
} from '@/lib/analytics/parse-sales-detail'
import { detectReportKind, explainUnrecognized, type ReportKind } from '@/lib/analytics/parse-iiko-reports'
import HourlyUpload from './hourly-upload'

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

// Başlanğıc chunk. 09.08.2026-da 4000 sətir Neon HTTP-də sındı; endpoint artıq
// `unnest` işlədir (sabit 10 parametr), amma yenə də ehtiyatlı başlayırıq və
// sınarsa AVTOMATİK YARIYA ENİRİK (aşağı `post`). Limit sənədləşdirilmədiyi
// üçün sabit rəqəmə güvənmirik — davranışa uyğunlaşırıq.
const CHUNK = 2000
const MIN_CHUNK = 250   // bundan aşağı düşmürük — səbəb ölçü deyil, xəta göstərilir

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼'
const int = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ')

/**
 * Tanınan iiko hesabat növü — `null` çıxarılmış hal (yəni «tanındı»).
 *
 * `ReportKind` mənbədə `'hourly' | 'product' | 'deletion' | null`-dur. Burada
 * `null`-u kənarlaşdırırıq, amma SİYAHINI TƏKRAR YAZMIRIQ: parser-ə yeni növ
 * əlavə olunanda bu fayl özü uyğunlaşsın, tip uyğunsuzluğu build-i sındırmasın.
 */
type IikoKind = NonNullable<ReportKind>

/**
 * Ekranda göstərilən ad. Obyekt olduğu üçün YENİ NÖV ƏLAVƏ EDİLƏNDƏ TypeScript
 * burada əskik açarı GÖSTƏRİR. Əvvəl üçlü şərt (`kind === 'product' ? … : …`)
 * vardı və `'deletion'` səssizcə «SAATLIQ» kimi yazılırdı — istifadəçiyə yalan
 * ad göstərən sinif səhv budur.
 */
const KIND_LABEL: Record<IikoKind, string> = {
  hourly: 'SAATLIQ SATIŞ',
  product: 'MƏHSUL',
  deletion: 'SİLİNMƏ',
  writeoff: 'ANBAR SİLİNMƏSİ',
}

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

export default function DetailUpload({ buildSha = 'local' }: { buildSha?: string } = {}) {
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
  // iiko hesabatı (saatlıq / məhsul / silinmə) bu qutuya atılsa XƏTA VERMİRİK —
  // faylı olduğu kimi doğru axına ötürürük. Səhifədə TƏK giriş nöqtəsi qalır.
  //
  // ⚠️ TİP `IikoKind`-dən GƏLİR, ƏL İLƏ SADALANMIR. Əvvəl burada `'hourly' |
  // 'product'` yazılmışdı; `detectReportKind`-ə `'deletion'` əlavə olunanda bu
  // sətir yenilənmədi və BUILD SINDI (TS2322). Növ mənbədən törədilsə, parser-ə
  // yeni hesabat növü əlavə edilməsi bu faylı avtomatik uyğunlaşdırır.
  //
  // 🔴 05.09.2026 — SİYAHIDIR, TƏK DƏYƏR DEYİL. Əvvəl `iikoHit` hər faylda
  // ÜZƏRİNƏ YAZILIRDI, ona görə iki iiko faylı birlikdə atılanda YALNIZ
  // SONUNCUSU işlənir, digəri HEÇ BİR XƏBƏRDARLIQ OLMADAN itirdi
  // («ekledim, əlavə olunmadı»). Bu, 10.08.2026-da PRODMIX tərəfində
  // düzəldilmiş səhvin GÜZGÜ ƏKSİDİR — iiko qolunda qalmışdı.
  const [iikoList, setIikoList] = useState<Array<{ file: File; kind: IikoKind }>>([])
  const [iikoPick, setIikoPick] = useState<number | null>(null)
  const [iikoDone, setIikoDone] = useState<string[]>([])
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
    setBusy(true); setErr(null); setResult(null)
    setIikoList([]); setIikoPick(null); setIikoDone([]); setPhase('Fayllar oxunur…')
    try {
      const XLSX = await import('xlsx')
      // Bütün fayl/vərəqlərin nəticəsi toplanır, sonra birləşdirilir (son qalib).
      // HAMISI yığılır — heç biri atılmır (bax `iikoList` şərhi).
      const iikoHits: Array<{ file: File; kind: IikoKind }> = []
      let firstHead: unknown[][] = []
      const prodmixParts: ProdmixResult[] = []
      const receiptsParts: ReceiptsResult[] = []

      for (const f of files) {
        const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' })
        // ⚡ ƏVVƏLCƏ UCUZ TANIMA: iiko hesabatıdırsa PRODMIX/ÇEK parser-lərini
        // heç işlətmirik. «DT Məhsul» 292 610 sətirdir — boş yerə iki keçid
        // brauzeri dondururdu.
        {
          let hit: IikoKind | null = null
          for (const sn of wb.SheetNames) {
            const ws = wb.Sheets[sn]
            // ⚠️ `range` RƏQƏM verilsə SheetJS onu «bu sətirdən BAŞLA» kimi
            // başa düşür və VƏRƏQİN HAMISINI oxuyur. Obyekt veririk ki
            // həqiqətən yalnız ilk 30 sətir oxunsun — 292 610 sətirlik faylda
            // fərq brauzerin donması ilə anlıq cavab arasındadır.
            const ref = ws['!ref']
            if (!ref) continue
            const full = XLSX.utils.decode_range(ref)
            const head = XLSX.utils.sheet_to_json<unknown[]>(ws, {
              header: 1, raw: true, defval: null,
              range: { s: { r: full.s.r, c: full.s.c }, e: { r: Math.min(full.s.r + 29, full.e.r), c: full.e.c } },
            }) as unknown[][]
            if (!firstHead.length) firstHead = head
            const k = detectReportKind(head)
            if (k) { hit = k; break }
          }
          if (hit) { iikoHits.push({ file: f, kind: hit }); continue }
        }
        for (const sn of wb.SheetNames) {
          // `raw: true` — MÜHÜM. `raw: false` tarix formatlı hücrəni FORMATLAYIR
          // ('01.08.2026'), halbuki parser-lər xam serial-a (46235) qarşı yazılıb.
          // Bu, 09.08.2026-da «nə PRODMIX nə ÇEK tapılmadı» xətasının səbəbi idi:
          // faylların tarix numFmt kodu `dd\.mm\.yyyy`-dir, hər sətir atılırdı.
          // `excelSerialToISO` artıq hər iki formatı qəbul edir (ikiqat qoruma),
          // amma xam dəyər həm daha sürətli, həm də dil/locale-dən asılı deyil.
          // Digər sütunlar təsirlənmir: adlar sətirdir, rəqəmlər `num()`-dən keçir.
          const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: true, defval: null }) as unknown[][]
          // Parser-lər başlıq tapmasa boş + warning qaytarır → «tapdı/tapmadı»
          // testi nəticənin özüdür, ad/heuristika ilə təxmin etmirik.
          //
          // 🔴 10.08.2026 — ƏVVƏL BURADA `if (!prodmix)` VARDI və İLK uyğun vərəq
          // tapıldıqdan sonra qalan fayllar SƏSSİZ ATLANIRDI. «Hər gün tək günlük
          // fayl» axınında 10 günü 10 fayl kimi atsan yalnız 1 gün yazılardı,
          // 9-u yoxa çıxardı. Artıq HAMISI toplanır və sonra birləşdirilir.
          const p = parseProdmix(rows); if (p.lines.length) prodmixParts.push(p)
          const r = parseReceipts(rows); if (r.days.length) receiptsParts.push(r)
        }
      }
      const prodmix = mergeProdmix(prodmixParts)
      const receipts = mergeReceipts(receiptsParts)

      // iiko hesabatı tanındı → XƏTA YOX, faylı doğru axına ötürürük.
      // Bir neçə fayl varsa HAMISI saxlanılır; istifadəçi birini seçir, digəri
      // ekranda qalır (siyahıdan silinmir) — səssiz itki YOXDUR.
      if (!prodmix && !receipts && iikoHits.length) {
        setIikoList(iikoHits)
        setIikoPick(iikoHits.length === 1 ? 0 : null)   // tək fayl → avtomatik açılır
        setPhase('')
        return
      }
      // QARIŞIQ SEÇİM: eyni anda həm PRODMIX/ÇEK, həm iiko hesabatı atılıb.
      // iiko faylı ayrı axına gedir — SƏSSİZ ATILMASIN, açıq deyilir.
      if (iikoHits.length) {
        throw new Error(
          `«${iikoHits.map(x => x.file.name).join('», «')}» iiko ${KIND_LABEL[iikoHits[0].kind]} hesabatıdır və ` +
          'PRODMIX/ÇEK faylları ilə BİRLİKDƏ oxuna bilmir (fərqli axınlar). ' +
          'Onu ayrıca atın — sistem özü tanıyacaq.',
        )
      }

      if (!prodmix && !receipts) {
        // SƏBƏBİ YAZ: hansı sütunun çatışmadığını göstəririk. «Tapılmadı» tək
        // başına istifadəçiyə heç nə demir — real hadisədə fayl PUL SÜTUNU
        // olmadığı üçün rədd edilmişdi, amma bu ekranda görünmürdü.
        throw new Error(
          `${explainUnrecognized(firstHead)}\n\n` +
          'Köhnə format da qəbul olunur: PRODMIX («Uçot günü / Ticarət müəssisəsi / Məhsulun kodu / ' +
          'Məhsul / Məhsulların sayı / Endirimli məbləğ») və ÇEK («Ticarət müəssisəsi / Tarix / ' +
          'Ödəniş növü / Qəbzin nömrəsi / Endirimli məbləğ»).',
        )
      }

      const recon = prodmix && receipts ? reconcileProdmixReceipts(prodmix, receipts) : null
      setParsed({ prodmix, receipts, recon, fileNames: files.map(f => f.name) })
      setPhase('')
    } catch (e) {
      // BUILD DAMĞASI XƏTAYA YAZILIR. Səbəb: «olmur» şəkli göndəriləndə mesajın
      // hansı koddan gəldiyi bilinmirdi — köhnə paketlə yeni paketi ayırd etmək
      // mümkün deyildi və eyni səhvi iki dəfə axtardıq.
      setErr(`${e instanceof Error ? e.message : String(e)}\n\n[build ${buildSha}]`)
    } finally { setBusy(false) }
  }

  // ── 2) Fact cədvəllərinə yaz (chunk-lı, idempotent upsert) ─────────────────
  /**
   * Bir chunk göndərir. Uğurlu olsa nəticəni, olmasa xətanı qaytarır.
   * Yazı İDEMPOTENT olduğu üçün (açar üzrə upsert) təkrar göndərmək zərərsizdir.
   */
  async function send(kind: 'daily' | 'item', slice: unknown[], source: string) {
    const res = await fetch('/api/dashboard/analytics/fact-save', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, rows: slice, source }),
    })
    const j = await res.json().catch(() => null)
    if (!res.ok) {
      // Xəta UDULMUR — serverin real `detail`-i və teşhis `meta`-sı göstərilir.
      const bits = [j?.error ?? `HTTP ${res.status}`]
      if (j?.detail) bits.push(j.detail)
      if (j?.meta) bits.push(`[${slice.length} sətir · pgCode=${j.meta.pgCode ?? '—'} · cause=${j.meta.cause ?? '—'}]`)
      throw new Error(`${kind}: ${bits.join(' — ')}`)
    }
    return j
  }

  async function post(kind: 'daily' | 'item', rows: unknown[], source: string, onChunk: (n: number) => void): Promise<SaveResult> {
    const acc: SaveResult = { ok: true, written: 0, merged: 0, rejected: 0, rejectedSample: [], days: [], unmatchedBranches: [] }
    const allDays = new Set<string>(), allUnmatched = new Set<string>()
    let size = CHUNK
    let i = 0
    while (i < rows.length) {
      const slice = rows.slice(i, i + size)
      let j: Record<string, unknown> & { written?: number; merged?: number; rejected?: number; rejectedSample?: string[]; days?: string[]; unmatchedBranches?: string[] }
      try {
        j = await send(kind, slice, source)
      } catch (e) {
        // UYĞUNLAŞAN CHUNK: ölçü səbəbli sınmalarda yarıya en və TƏKRAR CƏHD ET.
        // Yazı idempotentdir → təkrar göndərmək data pozmur. MIN_CHUNK-dan
        // aşağıda dayanırıq: səbəb ölçü deyil, xətanı istifadəçiyə göstəririk.
        if (size > MIN_CHUNK) {
          size = Math.max(MIN_CHUNK, Math.floor(size / 2))
          setPhase(`Böyük paket qəbul edilmədi — ${size} sətirlik paketlə təkrar cəhd…`)
          continue
        }
        throw e
      }
      acc.written += j.written ?? 0
      acc.merged += j.merged ?? 0
      acc.rejected += j.rejected ?? 0
      if (acc.rejectedSample.length < 5 && j.rejectedSample?.length) acc.rejectedSample.push(...j.rejectedSample.slice(0, 5 - acc.rejectedSample.length))
      for (const d of j.days ?? []) allDays.add(d)
      for (const b of j.unmatchedBranches ?? []) allUnmatched.add(b)
      i += slice.length
      onChunk(slice.length)
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

    // `cost`/`category` yalnız iiko export-unda həmin sütunlar olduqda gəlir —
    // yoxdursa göndərilmir və serverdə köhnə dəyər `coalesce` ilə qorunur.
    const itemRows = prodmix ? prodmix.lines.map(l => ({
      filial: l.filial, date: l.date, item_code: l.itemCode, item_name: l.itemName,
      qty: l.qty, amount: l.amount, line_kind: l.kind,
      ...(l.cost != null ? { cost: l.cost } : {}),
      ...(l.category ? { category: l.category } : {}),
    })) : []

    // Progress SƏTİR sayır, paket sayı deyil — paket ölçüsü sınmada dəyişir.
    const total = dailyRows.length + itemRows.length
    setBusy(true); setErr(null); setProgress({ done: 0, total })
    let done = 0
    const tick = (n: number) => { done += n; setProgress({ done, total }) }

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

  // iiko hesabatı tanındıqda bu qutu YERİNİ VERİR — istifadəçi ikinci dəfə
  // fayl seçmir, ikinci qutu axtarmır. TƏK GİRİŞ NÖQTƏSİ.
  if (iikoList.length) {
    const picked = iikoPick != null ? iikoList[iikoPick] : null
    const link: CSSProperties = {
      background: 'none', border: 'none', color: '#1f5130', textDecoration: 'underline',
      cursor: 'pointer', fontSize: 12.5, padding: 0,
    }
    const cancel = () => { setIikoList([]); setIikoPick(null); setIikoDone([]); reset() }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#f1f8f2', border: '1px solid #cfe6d3', color: '#1f5130', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
          {iikoList.length === 1 ? (
            <>
              <b>«{iikoList[0].file.name}»</b> — {KIND_LABEL[iikoList[0].kind]} hesabatı tanındı,
              aşağıda açıldı. <button onClick={cancel} style={link}>ləğv et</button>
            </>
          ) : (
            <>
              {/* BİR NEÇƏ FAYL: hamısı görünür, heç biri atılmır. Hər biri
                  AYRICA yüklənir — yüklənən fayl «✓ yükləndi» kimi işarələnir
                  ki, hansının qaldığı yadda saxlanmasın. */}
              <b>{iikoList.length} iiko hesabatı tanındı.</b> Hər biri ayrıca yüklənir —
              birini seçin, bitəndən sonra digərinə keçin.
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {iikoList.map((x, i) => {
                  const done = iikoDone.includes(x.file.name)
                  const active = i === iikoPick
                  return (
                    <button
                      key={x.file.name + i}
                      onClick={() => {
                        if (picked && !done) setIikoDone(d => [...d, picked.file.name])
                        setIikoPick(i)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                        background: active ? '#dff0e3' : '#fff',
                        border: `1px solid ${active ? '#8dc39b' : '#cfe6d3'}`,
                        borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                        fontSize: 12.5, color: '#1f5130', fontWeight: active ? 700 : 400,
                      }}
                    >
                      <span>{done ? '✓' : active ? '▶' : '•'}</span>
                      <span style={{ flex: 1 }}>{x.file.name}</span>
                      <span style={{ opacity: 0.75 }}>{KIND_LABEL[x.kind]}</span>
                      <span style={{ opacity: 0.6 }}>{(x.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 8 }}><button onClick={cancel} style={link}>hamısını ləğv et</button></div>
            </>
          )}
        </div>
        {/* `key` VACİBDİR: fayl dəyişəndə HourlyUpload state-i (oxunmuş data,
            nəticə, progress) TƏZƏDƏN qurulmalıdır — əks halda əvvəlki faylın
            nəticəsi yeni faylın adı altında görünərdi. */}
        {picked
          ? <HourlyUpload key={picked.file.name} presetFile={picked.file} />
          : <div style={{ ...card, padding: '13px 16px', fontSize: 12.5, color: '#6b6357' }}>
              Yuxarıdan bir fayl seçin.
            </div>}
      </div>
    )
  }

  if (!open) {
    return (
      <div style={{ ...card, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>📦</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>iiko faylını yüklə — saatlıq · məhsul · PRODMIX · ÇEK</div>
          <div style={{ color: '#8b8378', fontSize: 12, marginTop: 2 }}>
            Hansı hesabat olduğunu sistem ÖZÜ tanıyır. Hər gün atıla bilər — üzərinə yazılır, cəm şişmir.
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
              .xlsx · iiko hesabatları · «Satış ay və gün» · «DT Məhsul» · PRODMIX · ÇEK — fayl özü tanınır
            </div>
            {/* Canlıdakı build. Kiçik və solğun — iş axınını pozmur, lakin
                «düzəltdim, olmur» halında hansı kodun işlədiyini DƏRHAL deyir. */}
            <div style={{ color: '#b8b0a4', fontSize: 10.5, marginTop: 6, letterSpacing: 0.3 }}>
              build {buildSha}
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
              {/* Maya sütunu gələndə food cost DƏRHAL görünür — yoxdursa kart çıxmır. */}
              {p.totals.foodCostPct != null && (
                <Mini k="Food cost (çəkili)" v={(p.totals.foodCostPct * 100).toFixed(1) + '%'} sub={`maya ${money(p.totals.productCost)}`} />
              )}
            </>}
          </div>

          {/* Birləşdirmə SƏSSİZ OLMASIN: faylda eyni filial+gün+məhsul kodu
              təkrarlanır (bir kanonik filial altında iki fiziki nöqtə ola bilər).
              Toplanmasa chunk-lı yükləmə datanı itirir. */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {p && p.mergedKeys > 0 && (
              <div style={{ fontSize: 11.5, color: '#8b8378' }}>
                ℹ️ {int(p.mergedKeys)} təkrar açar (eyni filial + gün + məhsul kodu) toplandı —
                ciro qorunur: {money(p.totals.amount)}.
              </div>
            )}
            {/* İstəyə bağlı sütunların vəziyyəti — gələnə qədər nə əskikdir görünsün */}
            {p && (
              <div style={{ fontSize: 11.5, color: '#8b8378' }}>
                {p.optional.cost ? '✓ Maya dəyəri sütunu tapıldı' : '○ Maya dəyəri sütunu YOX → menyu matrisi ciro payı ilə qurulur, marja ilə deyil'}
                {' · '}
                {p.optional.category ? '✓ Kateqoriya sütunu tapıldı' : '○ Kateqoriya sütunu YOX → matris bütün çeşid üzərində'}
              </div>
            )}
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
              <div style={{ fontSize: 12, color: '#8b8378', marginBottom: 4 }}>{phase} {int(progress.done)}/{int(progress.total)} sətir</div>
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
                    Bu filial adları OCAQ-da tapılmadı: <b>{un.join(', ')}</b>. Data <b>itməyib</b> (yazıldı) və
                    Məhsul Analizində görünür, amma filial bağlantısı boşdur → <b>bölgə/filial müdiri onu görməz</b>
                    (yalnız super admin). <a href="/dashboard/branches" style={{ color: '#8a5a00', fontWeight: 700 }}>Filiallar</a> səhifəsində
                    ADI EYNİ yazılışla yaradın — növbəti yükləmə bağlantını özü dolduracaq.
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
