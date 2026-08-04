/**
 * Saha Nəzarət Matrisi — bal və P0 motoru (təmiz funksiyalar, DB-siz)
 *
 * Mənbədəki iki mexanizm burada birbaşa icra olunur:
 *
 *  1. «Baxılmadı» bala GİRMİR:
 *         Bal = «Bəli» ÷ («Bəli» + «Xeyr»)
 *     Mənbənin öz ifadəsi: *"səthi baxılan ziyarət yalançı yaşıl vermir —
 *     sadəcə boş qalır və təkrarlanır."* Ona görə məxrəc sıfır olanda bal
 *     **0 deyil, `null`**-dır. 0 qaytarmaq «yoxlanılmadı»-nı «pis»
 *     kimi göstərərdi; `null` «hələ məlum deyil» deməkdir.
 *
 *  2. «Badamdar qaydası»: müdir yerində deyilsə ziyarət `tamamlanmadi`
 *     işarələnir, **bal verilmir** və təkrarlanır. Əks halda matris səthi
 *     baxılan filialı «problemsiz» göstərər.
 *
 * Bu iki qayda `docs/CTO-ADMIN-OPERATIONS-AUDIT.md`-də «sistem yoxlanmadı ilə
 * problemsiz-i ayırd edə bilmir» deyilən boşluğun cavabıdır.
 */

import {
  SAHA_NEZARET_BLOCKS,
  MATRIX_ANSWERS,
  VISIT_CYCLE_DAYS,
  type MatrixAnswer,
  type MatrixBlock,
  type MatrixControl,
} from '@/data/saha-nezaret-matrix'

export { getBakuBusinessDate } from './checklist-validation'

export const VISIT_STATUSES = ['tamamlandi', 'tamamlanmadi'] as const
export type VisitStatus = (typeof VISIT_STATUSES)[number]

export type MatrixResponse = {
  answer: MatrixAnswer
  note?: string
  photoKey?: string
  measurement?: number
}

/** Bir blokun nəticəsi. `scorePct === null` → bu blokda heç nə baxılmayıb. */
export type BlockResult = {
  blockId: string
  title: string
  beli: number
  xeyr: number
  baxilmadi: number
  aidDeyil: number
  /** Baxılan maddə sayı = beli + xeyr (məxrəc). */
  assessed: number
  scorePct: number | null
}

/** «Xeyr» cavabı verilmiş P0 kontrolu — P0 Reyestrinə düşür. */
export type P0Finding = {
  controlId: string
  blockId: string
  label: string
  note: string
  photoKey: string | null
  /** Sahib və son tarix auditor tərəfindən təyin olunur — sistem uydurmur. */
  owner: string | null
  dueDate: string | null
}

export type VisitScore = {
  status: VisitStatus
  /** Şəbəkə/filial ümumi balı. `tamamlanmadi` və ya heç nə baxılmayıbsa `null`. */
  scorePct: number | null
  blocks: BlockResult[]
  p0Findings: P0Finding[]
  /** Sahibi və ya son tarixi təyin edilməmiş P0 sayı — bunlar bağlana bilməz. */
  unassignedP0Count: number
  totals: { beli: number; xeyr: number; baxilmadi: number; aidDeyil: number; assessed: number }
}

export type ScoreInput = {
  responses: Record<string, MatrixResponse>
  /** Müdir ziyarət anında filialda idimi? (Badamdar qaydası) */
  managerPresent: boolean
  /** P0 tapıntıları üçün auditorun təyin etdiyi sahib/son tarix. */
  assignments?: Record<string, { owner?: string | null; dueDate?: string | null }>
}

export type ScoreResult = { ok: true; score: VisitScore } | { ok: false; error: string }

const MAX_NOTE_LENGTH = 500
const RESPONSE_FIELDS = new Set(['answer', 'note', 'photoKey', 'measurement'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Kontrol id → kontrol indeksi.
 * Kataloq parametr olaraq ötürülür ki, motor fixture ilə test oluna bilsin
 * (real kataloq mətnlər köçürülənə qədər boşdur — bax `saha-nezaret-matrix.ts`).
 */
function buildIndex(blocks: MatrixBlock[]) {
  return new Map<string, { control: MatrixControl; blockId: string }>(
    blocks.flatMap((block) =>
      block.items.map((control) => [control.id, { control, blockId: block.id }] as const),
    ),
  )
}

export function isMatrixAnswer(value: unknown): value is MatrixAnswer {
  return typeof value === 'string' && MATRIX_ANSWERS.includes(value as MatrixAnswer)
}

/**
 * Kataloqun bütövlüyünü yoxlayır. Hər blokun `items.length` mənbədə bəyan
 * edilmiş `expectedCount` ilə üst-üstə düşməlidir — əks halda bal SƏHV olar
 * (məxrəc əksik maddələrlə hesablanar). Bu yoxlama yarımçıq kataloqla
 * işləməyi bloklayır.
 */
export function assertCatalogIntegrity(
  blocks: MatrixBlock[] = SAHA_NEZARET_BLOCKS,
): { ok: true } | { ok: false; error: string } {
  const incomplete = blocks.filter((b) => b.items.length !== b.expectedCount)
  if (incomplete.length > 0) {
    const detail = incomplete
      .map((b) => `${b.title} (${b.items.length}/${b.expectedCount})`)
      .join(', ')
    return {
      ok: false,
      error: `Saha Nəzarət kataloqu tam deyil — mətnlər mənbə xlsx-dən köçürülməlidir: ${detail}`,
    }
  }
  const ids = blocks.flatMap((b) => b.items.map((i) => i.id))
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: 'Saha Nəzarət kataloqunda təkrarlanan kontrol id var' }
  }
  return { ok: true }
}

/** Bal faizi. Məxrəc sıfırdırsa `null` — «0%» DEYİL (bax fayl başlığı). */
export function scorePct(beli: number, xeyr: number): number | null {
  const assessed = beli + xeyr
  if (assessed === 0) return null
  return Math.round((beli / assessed) * 100)
}

/** Növbəti ziyarət tarixi — hər 15 gündə bir. Giriş/çıxış `YYYY-MM-DD`. */
export function nextVisitDate(lastVisitDate: string, cycleDays = VISIT_CYCLE_DAYS): string {
  if (!ISO_DATE.test(lastVisitDate)) throw new Error('Tarix YYYY-MM-DD formatında olmalıdır')
  const [y, m, d] = lastVisitDate.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCDate(base.getUTCDate() + cycleDays)
  return base.toISOString().slice(0, 10)
}

/**
 * Ziyarəti qiymətləndirir. Bütün doğrulama server tərəfində olmalıdır —
 * bu funksiya API route-dan çağırılır, brauzerin göndərdiyinə etibar edilmir.
 */
export function scoreVisit(
  input: ScoreInput,
  blocks: MatrixBlock[] = SAHA_NEZARET_BLOCKS,
): ScoreResult {
  const integrity = assertCatalogIntegrity(blocks)
  if (!integrity.ok) return { ok: false, error: integrity.error }

  const controlIndex = buildIndex(blocks)

  if (!input || typeof input !== 'object') return { ok: false, error: 'Giriş formatı düzgün deyil' }
  if (typeof input.managerPresent !== 'boolean') {
    return { ok: false, error: 'Müdirin iştirakı qeyd edilməlidir (Badamdar qaydası)' }
  }
  const raw = input.responses
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Kontrol cavabları düzgün formatda deyil' }
  }

  const unknown = Object.keys(raw).filter((id) => !controlIndex.has(id))
  if (unknown.length > 0) return { ok: false, error: 'Matrisdə tanınmayan kontrol var' }

  // ── Cavabları doğrula ────────────────────────────────────────────────────
  const clean = new Map<string, MatrixResponse>()
  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, error: `${id} kontrolunun cavabı düzgün deyil` }
    }
    const candidate = value as Record<string, unknown>
    if (Object.keys(candidate).some((f) => !RESPONSE_FIELDS.has(f))) {
      return { ok: false, error: `${id} kontrolunda tanınmayan sahə var` }
    }
    if (!isMatrixAnswer(candidate.answer)) {
      return { ok: false, error: `${id} kontrolunun cavabı Bəli/Xeyr/Baxılmadı/Aid deyil olmalıdır` }
    }
    const note = candidate.note === undefined ? '' : candidate.note
    if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) {
      return { ok: false, error: `${id} kontrolunun qeydi çox uzundur` }
    }

    const { control } = controlIndex.get(id)!
    const response: MatrixResponse = { answer: candidate.answer, note: note.trim() }

    // «Xeyr» tapıntıdır — foto tələb olunan kontrolda sübut məcburidir.
    if (candidate.answer === 'xeyr' && control.requiresPhoto && !candidate.photoKey) {
      return { ok: false, error: `${id} üçün «Xeyr» cavabında foto sübutu tələb olunur` }
    }
    if (candidate.photoKey !== undefined) {
      if (typeof candidate.photoKey !== 'string' || !candidate.photoKey.endsWith('.webp')) {
        return { ok: false, error: `${id} kontrolunun fotosu düzgün deyil` }
      }
      response.photoKey = candidate.photoKey
    }
    if (candidate.measurement !== undefined && candidate.measurement !== '') {
      if (!control.measurementField) {
        return { ok: false, error: `${id} kontrolu ölçü qəbul etmir` }
      }
      const measurement = Number(candidate.measurement)
      if (!Number.isFinite(measurement)) {
        return { ok: false, error: `${id} kontrolunun ölçüsü düzgün deyil` }
      }
      response.measurement = measurement
    }
    clean.set(id, response)
  }

  // ── Blok-blok say ────────────────────────────────────────────────────────
  const blockResults: BlockResult[] = []
  const p0Findings: P0Finding[] = []
  const totals = { beli: 0, xeyr: 0, baxilmadi: 0, aidDeyil: 0, assessed: 0 }

  for (const block of blocks) {
    let beli = 0, xeyr = 0, baxilmadi = 0, aidDeyil = 0
    for (const control of block.items) {
      // Cavablanmamış kontrol «Baxılmadı» sayılır — sükutla «Bəli» olmur.
      const answer = clean.get(control.id)?.answer ?? 'baxilmadi'
      if (answer === 'beli') beli += 1
      else if (answer === 'xeyr') xeyr += 1
      else if (answer === 'aid_deyil') aidDeyil += 1
      else baxilmadi += 1

      // P0 kontrolunda hər «Xeyr» avtomatik P0 Reyestrinə düşür —
      // kritik tapıntı ümumi ortalamanın arxasında gizlənə bilməz.
      if (answer === 'xeyr' && control.priority === 'P0') {
        const response = clean.get(control.id)
        const assignment = input.assignments?.[control.id]
        p0Findings.push({
          controlId: control.id,
          blockId: block.id,
          label: control.label,
          note: response?.note ?? '',
          photoKey: response?.photoKey ?? null,
          owner: assignment?.owner?.trim() || null,
          dueDate: ISO_DATE.test(assignment?.dueDate ?? '') ? assignment!.dueDate! : null,
        })
      }
    }

    blockResults.push({
      blockId: block.id,
      title: block.title,
      beli, xeyr, baxilmadi, aidDeyil,
      assessed: beli + xeyr,
      scorePct: scorePct(beli, xeyr),
    })
    totals.beli += beli
    totals.xeyr += xeyr
    totals.baxilmadi += baxilmadi
    totals.aidDeyil += aidDeyil
  }
  totals.assessed = totals.beli + totals.xeyr

  // ── Badamdar qaydası ─────────────────────────────────────────────────────
  // Müdir yerində deyilsə ziyarət tamamlanmır və BAL VERİLMİR. Tapıntılar
  // yenə qeyd olunur (P0 gizlədilməz), amma bal `null` qalır və ziyarət
  // təkrarlanmalıdır.
  if (!input.managerPresent) {
    return {
      ok: true,
      score: {
        status: 'tamamlanmadi',
        scorePct: null,
        blocks: blockResults,
        p0Findings,
        unassignedP0Count: p0Findings.filter((f) => !f.owner || !f.dueDate).length,
        totals,
      },
    }
  }

  return {
    ok: true,
    score: {
      status: 'tamamlandi',
      scorePct: scorePct(totals.beli, totals.xeyr),
      blocks: blockResults,
      p0Findings,
      unassignedP0Count: p0Findings.filter((f) => !f.owner || !f.dueDate).length,
      totals,
    },
  }
}
