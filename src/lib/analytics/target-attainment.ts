/**
 * HƏDƏF TUTTURMA hesablaması — saf funksiya (test edilə bilən).
 *
 * 🔴 NİYƏ AYRI FAYLA ÇIXARILDI (09.08.2026): bu məntiq `panel-client.tsx`-in
 * içində idi və İKİ SƏHV daşıyırdı. Komponent içində olduğu üçün heç bir test
 * onu tutmurdu.
 *
 * SƏHV 1 — SATIŞ SƏSSİZ İTİRDİ.
 * Hədəfi olmayan filial müqayisədən `.filter(planV > 0)` ilə TAMAMİLƏ çıxarılırdı.
 * Real datada (avqust 2026) bu, Əcəmi (33 261 ₼) və Abdülkerim Alizadə
 * (19 925 ₼) = **53 186 ₼** satışın «Gerçək» cəmindən yoxa çıxması demək idi:
 * şəbəkə satışı 920 586 ₼, panel isə 867 401 ₼ göstərirdi. Satış İTMƏMƏLİDİR —
 * hədəfsizlər ayrıca qaytarılır ki ekranda göstərilsin.
 *
 * SƏHV 2 — «HƏDƏFƏ GÖRƏ» FAİZİ ŞİŞİK İDİ.
 * Pay BÜTÜN filialların ay proqnozu (4 076 881 ₼), məxrəc isə YALNIZ hədəfli
 * filialların hədəfi (4 008 000 ₼) idi → **%102** çıxırdı və «hədəfi aşdıq»
 * kimi oxunurdu. Eyni dəstdə düzgün rəqəm **%96**-dır, yəni hədəfin ALTINDA.
 * Pay və məxrəc HƏMİŞƏ eyni filial dəstində olmalıdır.
 */

/**
 * OCAQ `sales_targets` sətirlərini KANONİK açarlı xəritəyə çevirir.
 *
 * 🔴 NİYƏ (09.08.2026): hədəflər girilmişdi, lakin panel onları GÖRMÜRDÜ.
 * Xəritə OCAQ-daki XAM `branches.name` ilə qurulurdu, oxuma isə KANONİK filial
 * adı ilə olurdu. OCAQ-da filial «Əcəmi Shaurma» adlanırsa açar o olur, panel
 * isə «Əcəmi» axtarır → hədəf «yoxdur» görünür. Fakt tərəfi `canonBranchKey`
 * işlədirdi, hədəf tərəfi işlətmirdi — İKİ KOD YOLU FƏRQLİ AÇAR istifadə edirdi.
 *
 * TOPLAYIR, üzərinə yazmır: iki fiziki nöqtə bir kanonik filiala düşə bilər
 * (ALIASES «Torgoviy Yuxarı» + «Torgoviy Aşağı» → «Torgoviy»). Üzərinə
 * yazsaydıq həmin filialın hədəfi YARIYA ENƏRDİ.
 */
export function buildTargetIndex(
  rows: Array<{ name: string; amount: number | string }>,
  canon: (s: string) => string,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = canon(r.name)
    if (!k) continue
    const v = Number(r.amount)
    if (!Number.isFinite(v)) continue
    out[k] = (out[k] ?? 0) + v
  }
  return out
}

export type BranchSales = {
  filial: string
  bolge: string | null
  /** Dövr ərzində gerçək satış (fakt/blob-dan). */
  actual: number
  /** Aylıq hədəf. 0 və ya yoxdursa «hədəfsiz» sayılır. */
  target: number
}

export type AttainmentRow = BranchSales & {
  diff: number
  /** Bugünə qədər tutturma (actual / target). Hədəfsizdə `null`. */
  pct: number | null
}

export type Attainment = {
  /** Hədəfi olan filiallar — cədvəldə faizlə göstərilir. */
  rows: AttainmentRow[]
  /** Hədəfi OLMAYAN filiallar — satışları itməsin, ekranda göstərilir. */
  untargeted: Array<{ filial: string; bolge: string | null; actual: number }>
  /** Hədəfsiz filialların satış cəmi. */
  untargetedSales: number
  /** Hədəfli filiallar üzrə cəmlər. */
  net: { target: number; actual: number; pct: number | null }
  /** BÜTÜN filialların satış cəmi (heç nə düşmür). */
  networkSales: number
  /**
   * Ay sonu proqnozunun hədəfə nisbəti — YALNIZ hədəfli filiallar üzrə.
   * Pay və məxrəc eyni dəstdədir (bax SƏHV 2).
   */
  projectionPct: number | null
  /** Proqnozun özü (₼). */
  projection: number
}

export function computeAttainment(
  branches: BranchSales[],
  opts: { days: number; daysInMonth: number },
): Attainment {
  const rows: AttainmentRow[] = []
  const untargeted: Attainment['untargeted'] = []
  let netTarget = 0, netActual = 0, networkSales = 0, untargetedSales = 0

  for (const b of branches) {
    networkSales += b.actual
    if (b.target > 0) {
      rows.push({ ...b, diff: b.actual - b.target, pct: b.actual / b.target })
      netTarget += b.target
      netActual += b.actual
    } else {
      untargeted.push({ filial: b.filial, bolge: b.bolge, actual: b.actual })
      untargetedSales += b.actual
    }
  }

  const days = opts.days > 0 ? opts.days : 0
  // Proqnoz YALNIZ hədəfli filialların satışından qurulur — məxrəc də onlarındır.
  const projection = days > 0 ? netActual / days * opts.daysInMonth : 0

  return {
    rows: rows.sort((a, b) => (a.pct ?? 9) - (b.pct ?? 9)),
    untargeted: untargeted.sort((a, b) => b.actual - a.actual),
    untargetedSales,
    net: { target: netTarget, actual: netActual, pct: netTarget > 0 ? netActual / netTarget : null },
    networkSales,
    projectionPct: netTarget > 0 && days > 0 ? projection / netTarget : null,
    projection,
  }
}

/** Bölgə səviyyəsində tutturma (yalnız hədəfli filiallar). */
export function attainmentByRegion(a: Attainment) {
  const m: Record<string, { target: number; actual: number }> = {}
  for (const r of a.rows) {
    const k = r.bolge ?? '—'
    const e = (m[k] ??= { target: 0, actual: 0 })
    e.target += r.target
    e.actual += r.actual
  }
  return Object.entries(m)
    .map(([bolge, v]) => ({ bolge, ...v, pct: v.target > 0 ? v.actual / v.target : null }))
    .sort((x, y) => (x.pct ?? 9) - (y.pct ?? 9))
}
