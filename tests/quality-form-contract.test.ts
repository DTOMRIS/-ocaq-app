import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  getQualityFormDefinition,
  QUALITY_FORM_CATALOG,
} from '../src/data/quality-form-catalog'
import {
  canUseQualityForms,
  qualityFormScope,
} from '../src/lib/quality-form-access'

test('official quality form catalog keeps exactly 18 source forms', () => {
  assert.equal(QUALITY_FORM_CATALOG.length, 18)
  assert.equal(new Set(QUALITY_FORM_CATALOG.map((form) => form.key)).size, 18)
  assert.ok(QUALITY_FORM_CATALOG.every((form) => /^[a-f0-9]{64}$/.test(form.sourceSha256)))
  assert.ok(QUALITY_FORM_CATALOG.every((form) => form.preservedFields.length > 0))
})

test('five F-034 variants remain separate forms', () => {
  const variants = QUALITY_FORM_CATALOG
    .filter((form) => form.documentNumber === 'SH-KN-F-034')
    .map((form) => form.variant)
    .sort()

  assert.deepEqual(variants, ['Bükmə', 'Lahmacun', 'Pide', 'Pizza', 'Shaurma'])
  assert.equal(new Set(
    QUALITY_FORM_CATALOG
      .filter((form) => form.documentNumber === 'SH-KN-F-034')
      .map((form) => form.sourceSha256),
  ).size, 5)
})

test('source revision and contradictory F-041 note are preserved', () => {
  const form = getQualityFormDefinition('sh-kn-f-041-cooked-spit-temperature')
  assert.equal(form?.revision, '01')
  assert.ok(form?.sourceNotes.some((note) => note.includes('65 °C')))
  assert.ok(form?.sourceNotes.some((note) => note.includes('75 °C')))
})

test('general staff cannot enter OCAQ forms', () => {
  assert.equal(canUseQualityForms('staff', 'catalog.view'), false)
  assert.equal(canUseQualityForms('staff', 'submission.create'), false)
  assert.equal(qualityFormScope('staff'), 'none')
})

test('branch, region and super admin boundaries are explicit', () => {
  assert.equal(canUseQualityForms('branch_manager', 'submission.create'), true)
  assert.equal(canUseQualityForms('branch_manager', 'submission.approve'), false)
  assert.equal(qualityFormScope('branch_manager'), 'branch')

  assert.equal(canUseQualityForms('region_manager', 'submission.create'), false)
  assert.equal(canUseQualityForms('region_manager', 'submission.approve'), true)
  assert.equal(qualityFormScope('region_manager'), 'region')

  assert.equal(canUseQualityForms('super_admin', 'template.revise'), true)
  assert.equal(canUseQualityForms('super_admin', 'submission.void'), true)
  assert.equal(qualityFormScope('super_admin'), 'tenant')
})

test('quality form migration is add-only and preserves revision history', () => {
  const migration = readFileSync(
    new URL('../drizzle/migrations/0008_quality_form_foundation.sql', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i)
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i)
  assert.doesNotMatch(migration, /\bDROP\s+COLUMN\b/i)
  assert.match(migration, /replaces_submission_id/)
  assert.match(migration, /record_revision/)
  assert.match(migration, /draft_updated/)
  assert.match(migration, /superseded/)
  assert.match(migration, /printed/)
  assert.match(migration, /version/)
  assert.match(migration, /is_current/)
})
