import test from 'node:test'
import assert from 'node:assert/strict'
import {
  OFFICIAL_CHECKLIST_ITEM_COUNT,
  checklistEvidencePrefix,
  getBakuBusinessDate,
  isIdempotencyKey,
  validateChecklistAnswers,
} from '../src/lib/checklist-validation'

const context = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  userId: 'user-1',
}

test('score is calculated from the official item count, not accepted from the client', () => {
  const result = validateChecklistAnswers({
    p1: { checked: true, note: '' },
  }, context)

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.checkedCount, 1)
    assert.equal(result.scorePct, Math.round(100 / OFFICIAL_CHECKLIST_ITEM_COUNT))
  }
})

test('empty and unknown checklist submissions are rejected', () => {
  assert.equal(validateChecklistAnswers({}, context).ok, false)
  assert.equal(validateChecklistAnswers({ made_up: { checked: true } }, context).ok, false)
})

test('temperatures are accepted only for official temperature fields and safe numeric bounds', () => {
  assert.equal(validateChecklistAnswers({ p1: { checked: true, temperature: 5 } }, context).ok, false)
  assert.equal(validateChecklistAnswers({ g2: { checked: true, temperature: 'not-a-number' } }, context).ok, false)
  assert.equal(validateChecklistAnswers({ g2: { checked: true, temperature: 900 } }, context).ok, false)

  const valid = validateChecklistAnswers({ g2: { checked: true, temperature: '24.5' } }, context)
  assert.equal(valid.ok, true)
  if (valid.ok) assert.equal(valid.answers.g2.temperature, 24.5)
})

test('required measurements and photos cannot be skipped', () => {
  assert.equal(validateChecklistAnswers({ g2: { checked: true } }, context).ok, false)
  assert.equal(validateChecklistAnswers({ p3: { checked: true } }, context).ok, false)
})

test('evidence keys must belong to the session tenant, branch, user and official item', () => {
  const validKey = `${checklistEvidencePrefix(context, 'p3')}evidence.webp`
  assert.equal(validateChecklistAnswers({ p3: { checked: true, photoKey: validKey } }, context).ok, true)

  const wrongBranchKey = validKey.replace('/branch-1/', '/branch-2/')
  assert.equal(validateChecklistAnswers({ p3: { checked: true, photoKey: wrongBranchKey } }, context).ok, false)
  assert.equal(validateChecklistAnswers({ p1: { checked: true, photoKey: validKey } }, context).ok, false)
})

test('Baku business date does not depend on the server timezone', () => {
  assert.equal(getBakuBusinessDate(new Date('2026-07-15T20:30:00.000Z')), '2026-07-16')
  assert.equal(getBakuBusinessDate(new Date('2026-07-15T19:59:59.000Z')), '2026-07-15')
})

test('submission idempotency keys must be UUID v4 values', () => {
  assert.equal(isIdempotencyKey('2f67fe20-5551-4f0a-9d47-b34d87591e0b'), true)
  assert.equal(isIdempotencyKey('same-request'), false)
})

test('unexpected answer fields are rejected rather than silently stored', () => {
  assert.equal(validateChecklistAnswers({ p1: { checked: true, score: 100 } }, context).ok, false)
})
