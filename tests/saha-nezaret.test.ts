import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  assertCatalogIntegrity,
  nextVisitDate,
  scorePct,
  scoreVisit,
} from '../src/lib/saha-nezaret'
import {
  DECLARED_CONTROL_COUNT,
  SAHA_NEZARET_BLOCKS,
  isCatalogComplete,
  type MatrixBlock,
} from '../src/data/saha-nezaret-matrix'

/**
 * Fixture kataloq — real kataloq mətnləri mənbə xlsx-dən köçürülənə qədər
 * boşdur, ona görə motor məntiqi bu kiçik kataloqla yoxlanılır.
 * 2 blok: biri 3 kontrol (2-si P0), digəri 2 kontrol.
 */
function fixture(): MatrixBlock[] {
  return [
    {
      id: 'tehlukesizlik',
      title: 'Təhlükəsizlik',
      icon: '🧯',
      focus: 'qaz balonu, yanğın',
      expectedCount: 3,
      items: [
        { id: 't1', label: 'CO₂ balonu zəncirlənib', priority: 'P0' },
        { id: 't2', label: 'Yanğınsöndürən yerindədir', priority: 'P0' },
        { id: 't3', label: 'İlk yardım çantası tam', priority: 'P1' },
      ],
    },
    {
      id: 'temizlik',
      title: 'Təmizlik',
      icon: '🧼',
      focus: 'zal, tualet',
      expectedCount: 2,
      items: [
        { id: 'c1', label: 'Zal təmizdir', priority: 'P2' },
        { id: 'c2', label: 'Tualet təmizdir', priority: 'P2' },
      ],
    },
  ]
}

// ── Bal formulu: «Baxılmadı» məxrəcə girmir ────────────────────────────────

test('scorePct «Baxılmadı»-nı saymır — yalnız Bəli/Xeyr məxrəcdədir', () => {
  assert.equal(scorePct(3, 1), 75)
  assert.equal(scorePct(1, 1), 50)
  assert.equal(scorePct(5, 0), 100)
})

test('scorePct heç nə baxılmayanda 0 DEYİL null qaytarır', () => {
  // Kritik: 0 qaytarmaq «yoxlanılmadı»-nı «pis» kimi göstərər və
  // yalançı-qırmızı yaradar. null = «hələ məlum deyil».
  assert.equal(scorePct(0, 0), null)
})

test('tamamilə baxılmamış blokun balı null-dır, ümumi bala təsir etmir', () => {
  const blocks = fixture()
  const result = scoreVisit(
    {
      managerPresent: true,
      responses: {
        t1: { answer: 'beli' },
        t2: { answer: 'beli' },
        t3: { answer: 'beli' },
        // Təmizlik bloku heç cavablanmayıb → «Baxılmadı»
      },
    },
    blocks,
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  const temizlik = result.score.blocks.find((b) => b.blockId === 'temizlik')!
  assert.equal(temizlik.scorePct, null, 'baxılmamış blok null olmalı')
  assert.equal(temizlik.baxilmadi, 2)
  // Ümumi bal yalnız baxılan 3 maddədən hesablanır → 100, «5-dən 3» deyil 60 deyil.
  assert.equal(result.score.scorePct, 100)
  assert.equal(result.score.totals.assessed, 3)
})

test('cavablanmayan kontrol sükutla «Bəli» olmur — «Baxılmadı» sayılır', () => {
  const result = scoreVisit({ managerPresent: true, responses: {} }, fixture())
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.score.totals.beli, 0)
  assert.equal(result.score.totals.baxilmadi, 5)
  assert.equal(result.score.scorePct, null)
})

test('«Aid deyil» də məxrəcə girmir', () => {
  const result = scoreVisit(
    {
      managerPresent: true,
      responses: {
        t1: { answer: 'beli' },
        t2: { answer: 'xeyr' },
        t3: { answer: 'aid_deyil' },
        c1: { answer: 'aid_deyil' },
        c2: { answer: 'aid_deyil' },
      },
    },
    fixture(),
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.score.totals.aidDeyil, 3)
  assert.equal(result.score.totals.assessed, 2)
  assert.equal(result.score.scorePct, 50)
})

// ── Badamdar qaydası ───────────────────────────────────────────────────────

test('Badamdar qaydası: müdir yoxdursa ziyarət tamamlanmır və bal VERİLMİR', () => {
  const responses = {
    t1: { answer: 'beli' as const },
    t2: { answer: 'beli' as const },
    t3: { answer: 'beli' as const },
    c1: { answer: 'beli' as const },
    c2: { answer: 'beli' as const },
  }
  const withManager = scoreVisit({ managerPresent: true, responses }, fixture())
  const withoutManager = scoreVisit({ managerPresent: false, responses }, fixture())

  assert.equal(withManager.ok, true)
  assert.equal(withoutManager.ok, true)
  if (!withManager.ok || !withoutManager.ok) return

  // Eyni cavablar: müdir varsa 100, yoxsa bal yoxdur.
  assert.equal(withManager.score.status, 'tamamlandi')
  assert.equal(withManager.score.scorePct, 100)
  assert.equal(withoutManager.score.status, 'tamamlanmadi')
  assert.equal(withoutManager.score.scorePct, null, 'müdirsiz ziyarətə bal verilməz')
})

test('müdir yoxdursa da P0 tapıntıları GİZLƏDİLMİR', () => {
  const result = scoreVisit(
    { managerPresent: false, responses: { t1: { answer: 'xeyr', note: 'zəncir yox' } } },
    fixture(),
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.score.status, 'tamamlanmadi')
  assert.equal(result.score.p0Findings.length, 1)
  assert.equal(result.score.p0Findings[0].controlId, 't1')
})

// ── P0 reyestri ────────────────────────────────────────────────────────────

test('P0 kontrolundaki hər «Xeyr» reyestrə düşür, P1/P2 düşmür', () => {
  const result = scoreVisit(
    {
      managerPresent: true,
      responses: {
        t1: { answer: 'xeyr', note: 'balon açıqda' },
        t2: { answer: 'beli' },
        t3: { answer: 'xeyr' },   // P1 — reyestrə düşməməli
        c1: { answer: 'xeyr' },   // P2 — reyestrə düşməməli
        c2: { answer: 'beli' },
      },
    },
    fixture(),
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.score.p0Findings.length, 1)
  assert.equal(result.score.p0Findings[0].controlId, 't1')
  assert.equal(result.score.p0Findings[0].note, 'balon açıqda')
  // «Xeyr»lər bala təsir edir: bəli = t2 + c2 = 2, xeyr = t1 + t3 + c1 = 3
  // → 2 / (2+3) = 40%. (P1/P2 reyestrə düşmür, amma bala TƏSİR EDİR.)
  assert.equal(result.score.scorePct, 40)
})

test('sahibi/son tarixi olmayan P0 sayılır (bağlana bilməz)', () => {
  const result = scoreVisit(
    {
      managerPresent: true,
      responses: { t1: { answer: 'xeyr' }, t2: { answer: 'xeyr' } },
      assignments: { t1: { owner: 'Elnur', dueDate: '2026-08-05' } },
    },
    fixture(),
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.score.p0Findings.length, 2)
  assert.equal(result.score.unassignedP0Count, 1)
  const assigned = result.score.p0Findings.find((f) => f.controlId === 't1')!
  assert.equal(assigned.owner, 'Elnur')
  assert.equal(assigned.dueDate, '2026-08-05')
})

test('etibarsız son tarix qəbul edilmir (null qalır)', () => {
  const result = scoreVisit(
    {
      managerPresent: true,
      responses: { t1: { answer: 'xeyr' } },
      assignments: { t1: { owner: 'Elnur', dueDate: '05.08.2026' } },
    },
    fixture(),
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.score.p0Findings[0].dueDate, null)
  assert.equal(result.score.unassignedP0Count, 1)
})

// ── Doğrulama ──────────────────────────────────────────────────────────────

test('tanınmayan kontrol id rədd edilir', () => {
  const result = scoreVisit(
    { managerPresent: true, responses: { uydurma: { answer: 'beli' } } },
    fixture(),
  )
  assert.equal(result.ok, false)
})

test('etibarsız cavab dəyəri rədd edilir', () => {
  const result = scoreVisit(
    { managerPresent: true, responses: { t1: { answer: 'bəlkə' as never } } },
    fixture(),
  )
  assert.equal(result.ok, false)
})

test('müdirin iştirakı qeyd edilməyibsə rədd edilir', () => {
  const result = scoreVisit(
    { managerPresent: undefined as never, responses: { t1: { answer: 'beli' } } },
    fixture(),
  )
  assert.equal(result.ok, false)
})

test('foto tələb edən kontrolda «Xeyr» sübutsuz qəbul edilmir', () => {
  const blocks = fixture()
  blocks[0].items[0].requiresPhoto = true
  const withoutPhoto = scoreVisit(
    { managerPresent: true, responses: { t1: { answer: 'xeyr' } } },
    blocks,
  )
  assert.equal(withoutPhoto.ok, false)

  const withPhoto = scoreVisit(
    { managerPresent: true, responses: { t1: { answer: 'xeyr', photoKey: 'a/b/c.webp' } } },
    blocks,
  )
  assert.equal(withPhoto.ok, true)
})

// ── Kataloq bütövlüyü ──────────────────────────────────────────────────────

test('kataloq sayı uyğun gəlmirsə bal hesablanmır', () => {
  const blocks = fixture()
  blocks[0].expectedCount = 99   // mənbə 99 deyir, kataloqda 3 var
  const integrity = assertCatalogIntegrity(blocks)
  assert.equal(integrity.ok, false)

  const result = scoreVisit({ managerPresent: true, responses: {} }, blocks)
  assert.equal(result.ok, false, 'yarımçıq kataloqla bal hesablanmamalı')
})

test('təkrarlanan kontrol id rədd edilir', () => {
  const blocks = fixture()
  blocks[1].items[0].id = 't1'
  assert.equal(assertCatalogIntegrity(blocks).ok, false)
})

test('real kataloq mənbədəki 77 kontrolu bəyan edir', () => {
  assert.equal(DECLARED_CONTROL_COUNT, 77)
  assert.equal(SAHA_NEZARET_BLOCKS.length, 10)
})

test('real kataloq hələ tam deyil — motor onunla bal hesablamağı rədd edir', () => {
  // Bu test QƏSDƏN belədir: mətnlər xlsx-dən köçürülənə qədər sistem
  // saxta bal verməkdənsə işləməkdən imtina edir. Kataloq tamamlananda
  // bu test dəyişdirilməli (assert-lər tərsinə çevrilməli).
  assert.equal(isCatalogComplete(), false)
  assert.equal(assertCatalogIntegrity().ok, false)
  assert.equal(scoreVisit({ managerPresent: true, responses: {} }).ok, false)
})

// ── 15 günlük dövr ─────────────────────────────────────────────────────────

test('nextVisitDate 15 gün əlavə edir', () => {
  assert.equal(nextVisitDate('2026-08-03'), '2026-08-18')
})

test('nextVisitDate ay və il sərhədini keçir', () => {
  assert.equal(nextVisitDate('2026-08-20'), '2026-09-04')
  assert.equal(nextVisitDate('2026-12-25'), '2027-01-09')
  assert.equal(nextVisitDate('2028-02-20'), '2028-03-06') // 2028 uzun il
})

test('nextVisitDate etibarsız tarixi rədd edir', () => {
  assert.throws(() => nextVisitDate('03.08.2026'))
})
