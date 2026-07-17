import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isBranchManagerInvitation,
  managerScopeMatches,
} from '../src/app/api/invitations/_contract'

test('branch manager invitations cannot use the generic invitation flow', () => {
  assert.equal(isBranchManagerInvitation('branch_manager'), true)
  assert.equal(isBranchManagerInvitation('region_manager'), false)
  assert.equal(isBranchManagerInvitation('staff'), false)
})

test('replacement scope comparison treats null as an explicit empty-manager state', () => {
  assert.equal(managerScopeMatches(null, null), true)
  assert.equal(managerScopeMatches('manager-a', 'manager-a'), true)
  assert.equal(managerScopeMatches('manager-a', null), false)
  assert.equal(managerScopeMatches(null, 'manager-a'), false)
  assert.equal(managerScopeMatches('manager-a', 'manager-b'), false)
})

