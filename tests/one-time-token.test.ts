import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createOneTimeToken,
  hashOneTimeToken,
  oneTimeTokenCandidates,
} from '../src/lib/one-time-token'

test('new one-time tokens are random 32-byte hex values', () => {
  const first = createOneTimeToken()
  const second = createOneTimeToken()

  assert.match(first, /^[a-f0-9]{64}$/)
  assert.match(second, /^[a-f0-9]{64}$/)
  assert.notEqual(first, second)
})

test('token hash is deterministic and does not expose the raw token', () => {
  const raw = 'legacy-or-emailed-token'
  const hash = hashOneTimeToken(raw)

  assert.match(hash, /^[a-f0-9]{64}$/)
  assert.notEqual(hash, raw)
  assert.equal(hash, hashOneTimeToken(raw))
})

test('lookup candidates prefer the hash and retain legacy raw-token compatibility', () => {
  const raw = 'old-raw-token'

  assert.deepEqual(oneTimeTokenCandidates(raw), [hashOneTimeToken(raw), raw])
})
