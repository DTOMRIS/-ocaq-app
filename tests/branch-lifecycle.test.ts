import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatBranchCode,
  hasOnlyKeys,
  isBranchAction,
  isBranchCode,
  nextBranchCode,
  normalizeAzerbaijanPhone,
  normalizeBranchCode,
  normalizeWorkTime,
} from '../src/lib/branch-lifecycle'

test('branch code is normalized and validated', () => {
  assert.equal(normalizeBranchCode(' f-031 '), 'F-031')
  assert.equal(isBranchCode('F-01'), true)
  assert.equal(isBranchCode('F-999999'), true)
  assert.equal(isBranchCode('F-1000000'), false)
  assert.equal(isBranchCode('F-1'), false)
  assert.equal(isBranchCode('A-01'), false)
})

test('next branch code ignores noncanonical values and never reuses archived numbers', () => {
  assert.equal(nextBranchCode(['F-01', 'legacy', 'F-12', 'F-03']), 'F-13')
  assert.equal(nextBranchCode([]), 'F-01')
  assert.equal(formatBranchCode(101), 'F-101')
  assert.throws(() => formatBranchCode(1_000_000), /BRANCH_SEQUENCE_INVALID/)
  assert.throws(() => nextBranchCode(['F-999999']), /BRANCH_SEQUENCE_INVALID/)
})

test('Azerbaijan phone numbers are normalized', () => {
  assert.equal(normalizeAzerbaijanPhone('050 123 45 67'), '+994501234567')
  assert.equal(normalizeAzerbaijanPhone('+994 50 123 45 67'), '+994501234567')
  assert.equal(normalizeAzerbaijanPhone(''), null)
  assert.throws(() => normalizeAzerbaijanPhone('123'))
})

test('overnight work hours are valid but identical or malformed times can be rejected by the caller', () => {
  assert.equal(normalizeWorkTime('09:00', '08:00'), '09:00')
  assert.equal(normalizeWorkTime('', '23:00'), '23:00')
  assert.throws(() => normalizeWorkTime('24:00', '09:00'))
})

test('branch actions and field allowlists are explicit', () => {
  assert.equal(isBranchAction('archive'), false)
  assert.equal(isBranchAction('deactivate'), true)
  assert.equal(hasOnlyKeys({ action: 'activate', expected_updated_at: 'x' }, ['action', 'expected_updated_at']), true)
  assert.equal(hasOnlyKeys({ action: 'activate', manager_id: 'x' }, ['action', 'expected_updated_at']), false)
})
