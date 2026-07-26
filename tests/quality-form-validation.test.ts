import assert from 'node:assert/strict'
import test from 'node:test'
import { QUALITY_FORM_CATALOG } from '../src/data/quality-form-catalog'
import { QUALITY_FORM_TEMPLATES } from '../src/data/quality-form-templates'
import {
  isQualityFormIdempotencyKey,
  validateQualityFormPayload,
  validateQualityFormPeriod,
} from '../src/lib/quality-form-validation'

test('every official form has one input template and no extra template exists', () => {
  assert.equal(QUALITY_FORM_TEMPLATES.length, 18)
  assert.deepEqual(
    QUALITY_FORM_TEMPLATES.map((template) => template.formKey).sort(),
    QUALITY_FORM_CATALOG.map((form) => form.key).sort(),
  )
  assert.equal(new Set(QUALITY_FORM_TEMPLATES.map((template) => template.formKey)).size, 18)
})

test('template field keys are unique inside every section', () => {
  for (const template of QUALITY_FORM_TEMPLATES) {
    for (const fields of [template.headerFields, template.rowFields, template.signoffFields]) {
      assert.equal(new Set(fields.map((field) => field.key)).size, fields.length, template.formKey)
    }
  }
})

test('period validation follows the official form period', () => {
  assert.equal(validateQualityFormPeriod(
    'sh-kn-f-015-nonconforming-product',
    '2026-07-26',
    '2026-07-26',
  ), null)
  assert.match(validateQualityFormPeriod(
    'sh-kn-f-015-nonconforming-product',
    '2026-07-26',
    '2026-07-27',
  ) ?? '', /bir gün/)
  assert.equal(validateQualityFormPeriod(
    'sh-kn-f-017-role-hygiene',
    '2026-07-01',
    '2026-07-05',
  ), null)
  assert.match(validateQualityFormPeriod(
    'sh-kn-f-017-role-hygiene',
    '2026-07-01',
    '2026-07-06',
  ) ?? '', /tam 5/)
  assert.match(validateQualityFormPeriod(
    'sh-kn-f-017-role-hygiene',
    '2026-07-01',
    '2026-07-04',
  ) ?? '', /tam 5/)
  assert.equal(validateQualityFormPeriod(
    'sh-kn-f-008-temperature-humidity',
    '2026-02-01',
    '2026-02-28',
  ), null)
  assert.match(validateQualityFormPeriod(
    'sh-kn-f-008-temperature-humidity',
    '2026-02-02',
    '2026-02-28',
  ) ?? '', /ilk günündən/)
})

test('draft accepts partial official fields but rejects unknown fields', () => {
  const partial = validateQualityFormPayload('sh-kn-f-006-fryer-oil-change', {
    header: {},
    rows: [{ checker_name: 'Aysel' }],
    signoff: {},
  }, { final: false })
  assert.equal(partial.ok, true)

  const unknown = validateQualityFormPayload('sh-kn-f-006-fryer-oil-change', {
    header: {},
    rows: [{ checker_name: 'Aysel', shortened_magic_score: 99 }],
    signoff: {},
  }, { final: false })
  assert.equal(unknown.ok, false)
})

test('final submission requires official required cells and at least one row', () => {
  const empty = validateQualityFormPayload('sh-kn-f-006-fryer-oil-change', {
    header: {},
    rows: [],
    signoff: {},
  }, { final: true })
  assert.equal(empty.ok, false)

  const complete = validateQualityFormPayload('sh-kn-f-006-fryer-oil-change', {
    header: {},
    rows: [{
      change_needed_date: '2026-07-26',
      special_container_date: '2026-07-26',
      checker_name: 'Aysel Məmmədova',
      checker_signature: 'Aysel Məmmədova',
    }],
    signoff: {},
  }, { final: true })
  assert.equal(complete.ok, true)
})

test('idempotency accepts only UUID v4', () => {
  assert.equal(isQualityFormIdempotencyKey('86c207a9-977a-4d33-8253-182fef54b0d0'), true)
  assert.equal(isQualityFormIdempotencyKey('86c207a9-977a-1d33-8253-182fef54b0d0'), false)
  assert.equal(isQualityFormIdempotencyKey('not-a-uuid'), false)
})
