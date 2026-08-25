import { BRANCH_TO_REGION, canonBranchKey, normalizeFilial } from './filial-map'

/**
 * FACT CƏDVƏLİ → GÜNLÜK PANEL forması.
 *
 * NİYƏ BU ADAPTER (09.08.2026):
 * PRODMIX + ÇEK yükləməsi `analytics_daily_fact`-a yazır, lakin Günlük Panel və
 * Dashboard-daki satış kartı BAŞQA mənbələrdən oxuyurdu:
 *   • Günlük Panel  → `analytics_ingest` (aylıq satış faylının JSON blob-u)
 *   • Dashboard     → `daily_sales` (ƏL İLƏ giriş cədvəli, `/api/sales/daily`)
 * `daily_sales`-i heç kim doldurmurdu → dashboard boş görünürdü, halbuki real
 * satış datası fakt cədvəlində HAZIR dururdu.
 *
 * NİYƏ FAKTI `daily_sales`-ə KÖÇÜRMÜRÜK:
 * Eyni rəqəmi iki cədvəldə saxlamaq İKİ HƏQİQƏT yaradır. İyulda datanın
 * «yoxa çıxması» məhz bundan oldu (docs/DENETIM-2026-08-04.md §1): dörd fərqli
 * yazıcı, fərqli sxemlər, bir oxucu. Ona görə TƏK MƏNBƏ saxlanılır (fakt
 * cədvəli) və bütün ekranlar onu oxuyur — bu adapter həmin tərcüməni edir.
 *
 * Adapter SAF funksiyadır (DB-yə toxunmur) ki testlə yoxlanabilsin.
 */

/** `analytics_daily_fact`-dən oxunan sətir (SQL-dən gəldiyi kimi). */
export type FactRow = {
  filial: string
  business_date: string          // 'YYYY-MM-DD'
  payment_type: string           // '__day__' | nagd | kart | wolt | bolt | own_delivery | yango_legacy
  amount: number
  receipts?: number | null
}

/** Günlük Panel-in gözlədiyi forma (`panel-client.tsx` → `Daily`). */
export type PanelDaily = {
  period: string | null
  gun: number
  days: string[]
  daily: Record<string, { total: number; wolt: number; bolt: number }>
  branches: Array<{ filial: string; bolge: string | null; total: number; wolt: number; bolt: number }>
  regions: Array<[string, number]>
  pay: { nagd: number; kart: number; wolt: number; bolt: number; own_delivery: number }
  toplam: number
  gedisat: number
  /** Fakt cədvəlində olan, blob-da olmayan əlavələr — dürüst KPI üçün. */
  receipts: number
  avgCheck: number | null
}

const DAY = '__day__'
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Fakt sətirlərini panel formasına çevirir.
 *
 * `period` verilmirsə datanın ən son ayından götürülür. Ay proqnozu (`gedisat`)
 * mövcud günlərin ortalamasını ayın gün sayına vurur.
 */
/**
 * 🔴 BÖLGƏ MƏNBƏYİ (25.08.2026-da düzəldildi):
 *
 * Əvvəl filial→bölgə bağlantısı YALNIZ `BRANCH_TO_REGION` sabit xəritəsindən
 * oxunurdu. Nəticə: istifadəçi `/admin/filiallar`-da filialı bölgə müdirinə
 * təyin edirdi, `branches.region_id` bazada yazılırdı, LAKİN panel onu heç
 * oxumurdu — «Aeroportu Ramin bəyə əlavə etdim, panel almadı».
 *
 * İndi: **BAZA ƏSAS MƏNBƏDİR**. `dbRegionOf` verilibsə ondan oxunur; həmin
 * filial üçün baza təyinatı yoxdursa sabit xəritə EHTİYAT kimi qalır (kod
 * dəyişmədən işləyən köhnə davranış pozulmasın).
 *
 * @param dbRegionOf kanonik filial açarı → bölgə adı (server tərəfdə
 *                   `branches` × `regions` birləşməsindən qurulur)
 */
/** Baza təyinatı üstündür; yoxdursa sabit xəritə. Heç biri yoxdursa null. */
export function regionOf(filial: string, dbRegionOf?: Map<string, string> | null): string | null {
  const fromDb = dbRegionOf?.get(canonBranchKey(filial))
  if (fromDb) return fromDb
  return BRANCH_TO_REGION[normalizeFilial(filial) ?? filial] ?? null
}

export function factsToPanel(
  rows: FactRow[],
  period?: string | null,
  dbRegionOf?: Map<string, string> | null,
): PanelDaily | null {
  if (!rows.length) return null

  const per = period ?? rows.map(r => r.business_date.slice(0, 7)).sort().at(-1) ?? null
  const scoped = per ? rows.filter(r => r.business_date.startsWith(per)) : rows
  if (!scoped.length) return null

  // Gün cəmi sətri (`__day__`) ciro və qəbz sayının YEGANƏ mənbəyidir.
  // Ödəniş növü sətirləri ilə TOPLANMIR — ikiqat sayım olardı.
  const dayRows = scoped.filter(r => r.payment_type === DAY)
  const payRows = scoped.filter(r => r.payment_type !== DAY)

  const daily: Record<string, { total: number; wolt: number; bolt: number }> = {}
  const bmap = new Map<string, { filial: string; total: number; wolt: number; bolt: number }>()
  const pay = { nagd: 0, kart: 0, wolt: 0, bolt: 0, own_delivery: 0 }
  let toplam = 0, receipts = 0

  for (const r of dayRows) {
    const d = (daily[r.business_date] ??= { total: 0, wolt: 0, bolt: 0 })
    d.total += r.amount
    toplam += r.amount
    receipts += r.receipts ?? 0
    const b = bmap.get(r.filial) ?? { filial: r.filial, total: 0, wolt: 0, bolt: 0 }
    b.total += r.amount
    bmap.set(r.filial, b)
  }

  for (const r of payRows) {
    // `yango_legacy` 2026-da yoxdur (istifadəçi təsdiqi) — cəmə qatılır ki
    // ödəniş qarışığı gün cəminə bərabər olsun, amma delivery-yə SAYILMIR.
    if (r.payment_type === 'nagd') pay.nagd += r.amount
    else if (r.payment_type === 'kart') pay.kart += r.amount
    else if (r.payment_type === 'wolt') pay.wolt += r.amount
    else if (r.payment_type === 'bolt') pay.bolt += r.amount
    else if (r.payment_type === 'own_delivery') pay.own_delivery += r.amount

    if (r.payment_type === 'wolt' || r.payment_type === 'bolt') {
      const d = daily[r.business_date]
      if (d) d[r.payment_type] += r.amount
      const b = bmap.get(r.filial)
      if (b) b[r.payment_type] += r.amount
    }
  }

  const days = Object.keys(daily).sort()
  const gun = days.length
  for (const day of days) {
    daily[day].total = round2(daily[day].total)
    daily[day].wolt = round2(daily[day].wolt)
    daily[day].bolt = round2(daily[day].bolt)
  }

  const branches = [...bmap.values()]
    .map(b => ({
      filial: b.filial,
      bolge: regionOf(b.filial, dbRegionOf),
      total: round2(b.total), wolt: round2(b.wolt), bolt: round2(b.bolt),
    }))
    .sort((a, b) => b.total - a.total)

  const reg: Record<string, number> = {}
  for (const b of branches) reg[b.bolge ?? '?'] = (reg[b.bolge ?? '?'] ?? 0) + b.total
  const regions = Object.entries(reg).sort((a, b) => b[1] - a[1]) as Array<[string, number]>

  // Ay proqnozu: mövcud günlərin ortalaması × ayın gün sayı.
  // Gün yoxsa proqnoz da yoxdur (0) — uydurma rəqəm verilmir.
  const daysInMonth = per ? new Date(+per.slice(0, 4), +per.slice(5, 7), 0).getDate() : 30
  const gedisat = gun > 0 ? Math.round(toplam / gun * daysInMonth) : 0

  return {
    period: per, gun, days, daily, branches, regions,
    pay: {
      nagd: round2(pay.nagd), kart: round2(pay.kart),
      wolt: round2(pay.wolt), bolt: round2(pay.bolt),
      own_delivery: round2(pay.own_delivery),
    },
    toplam: round2(toplam),
    gedisat,
    receipts,
    avgCheck: receipts > 0 ? round2(toplam / receipts) : null,
  }
}
