import assert from 'node:assert/strict'
import test from 'node:test'
import {
  managementRoster,
  normalizeImportKey,
  roleCounts,
  validateRosterStructure,
  type ImportRosterRow,
} from '../src/lib/staff-import'

test('Azerbaijani branch names normalize deterministically', () => {
  assert.equal(normalizeImportKey('  İnşaatçılar '), 'insaatcilar')
  assert.equal(normalizeImportKey('Bakıxanov 1'), 'bakixanov1')
  assert.equal(normalizeImportKey('İsmayıl bölgəsi'), 'ismayilbolgesi')
})

test('roster validation fails duplicate emails and manager scopes', () => {
  const rows: ImportRosterRow[] = [
    { email: 'manager@shaurma.az', name: 'A', role: 'branch_manager', branch: 'Bayıl' },
    { email: 'manager@shaurma.az', name: 'B', role: 'branch_manager', branch: 'Bayıl' },
    { email: 'staff@shaurma.az', name: 'C', role: 'staff', region: 'Bakı' },
  ]
  const issues = validateRosterStructure(rows)
  assert.equal(issues.some((issue) => issue.includes('Təkrar e-poçt')), true)
  assert.equal(issues.some((issue) => issue.includes('Eyni filial')), true)
  assert.equal(issues.some((issue) => issue.includes('Bölgə müdiri olmayan')), true)
})

test('role counts are field-by-field', () => {
  const rows: ImportRosterRow[] = [
    { email: 'admin@shaurma.az', name: 'A', role: 'super_admin' },
    { email: 'region@shaurma.az', name: 'B', role: 'region_manager', region: 'Bakı' },
    { email: 'branch@shaurma.az', name: 'C', role: 'branch_manager', branch: 'Bayıl' },
    { email: 'staff@shaurma.az', name: 'D', role: 'staff' },
  ]
  assert.deepEqual(roleCounts(rows), {
    super_admin: 1,
    region_manager: 1,
    branch_manager: 1,
    staff: 1,
  })
})

test('login roster keeps management accounts and preserves staff only as reference', () => {
  const rows: ImportRosterRow[] = [
    { email: 'admin@shaurma.az', name: 'A', role: 'super_admin' },
    { email: 'branch@shaurma.az', name: 'B', role: 'branch_manager', branch: 'Bayıl' },
    { email: 'staff@shaurma.az', name: 'C', role: 'staff' },
  ]
  assert.deepEqual(
    managementRoster(rows).map((row) => row.email),
    ['admin@shaurma.az', 'branch@shaurma.az'],
  )
  assert.equal(rows.length, 3)
})
