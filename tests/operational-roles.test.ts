import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isManagerInvitableRole,
  isOperationalRole,
  MANAGER_INVITABLE_ROLES,
  OPERATIONAL_ROLES,
} from '../src/lib/operational-roles'

test('only management roles participate in OCAQ operations', () => {
  assert.deepEqual([...OPERATIONAL_ROLES], ['super_admin', 'region_manager', 'branch_manager'])
  assert.equal(isOperationalRole('super_admin'), true)
  assert.equal(isOperationalRole('region_manager'), true)
  assert.equal(isOperationalRole('branch_manager'), true)
  assert.equal(isOperationalRole('staff'), false)
})

test('staff cannot be invited to an OCAQ login account', () => {
  assert.deepEqual([...MANAGER_INVITABLE_ROLES], ['branch_manager', 'region_manager'])
  assert.equal(isManagerInvitableRole('branch_manager'), true)
  assert.equal(isManagerInvitableRole('region_manager'), true)
  assert.equal(isManagerInvitableRole('super_admin'), false)
  assert.equal(isManagerInvitableRole('staff'), false)
})
