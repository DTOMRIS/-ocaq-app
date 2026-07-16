import assert from 'node:assert/strict'
import test from 'node:test'
import { isOperationalRole, OPERATIONAL_ROLES } from '../src/lib/operational-roles'

test('only management roles participate in OCAQ operations', () => {
  assert.deepEqual([...OPERATIONAL_ROLES], ['super_admin', 'region_manager', 'branch_manager'])
  assert.equal(isOperationalRole('super_admin'), true)
  assert.equal(isOperationalRole('region_manager'), true)
  assert.equal(isOperationalRole('branch_manager'), true)
  assert.equal(isOperationalRole('staff'), false)
})
