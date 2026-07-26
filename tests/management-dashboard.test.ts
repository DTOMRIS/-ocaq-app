import assert from 'node:assert/strict'
import test from 'node:test'
import { buildManagementDashboard } from '../src/lib/management-dashboard'

const branches = [
  { id: 'b1', code: 'F-01', name: 'Mərkəz', regionName: 'Bakı', managerName: 'Aysel' },
  { id: 'b2', code: 'F-02', name: 'Sahil', regionName: 'Bakı', managerName: null },
]

test('management dashboard calculates real 7/30 day trends and today gaps', () => {
  const result = buildManagementDashboard(branches, [
    { branchId: 'b1', businessDate: '2026-07-26', shift: 'sabah', score: 90 },
    { branchId: 'b1', businessDate: '2026-07-26', shift: 'axsam', score: 80 },
    { branchId: 'b1', businessDate: '2026-07-25', shift: 'sabah', score: 100 },
    { branchId: 'b1', businessDate: '2026-07-19', shift: 'sabah', score: 70 },
    { branchId: 'outside', businessDate: '2026-07-26', shift: 'sabah', score: 1 },
  ], [], '2026-07-26')

  assert.equal(result.todaySubmitted, 2)
  assert.equal(result.todayExpected, 4)
  assert.equal(result.todayMissing, 2)
  assert.equal(result.kxt7Avg, 90)
  assert.equal(result.kxtPrevious7Avg, 70)
  assert.equal(result.kxtTrend, 20)
  assert.equal(result.kxt30Avg, 85)
  assert.equal(result.branches[0].code, 'F-02')
  assert.equal(result.branches[0].exceptionCount, 3)
})

test('quality exceptions stay attributable and do not invent missing forms', () => {
  const result = buildManagementDashboard(branches, [], [
    { branchId: 'b1', periodEnd: '2026-07-26', status: 'submitted' },
    { branchId: 'b1', periodEnd: '2026-07-25', status: 'draft' },
    { branchId: 'b2', periodEnd: '2026-07-01', status: 'voided' },
  ], '2026-07-26')

  assert.equal(result.quality7Count, 2)
  assert.equal(result.quality30Count, 3)
  assert.equal(result.pendingApproval, 1)
  assert.equal(result.draftCount, 1)
  assert.equal(result.voidedCount, 1)
  assert.equal(result.branches.find((branch) => branch.id === 'b1')?.exceptionCount, 4)
})

test('trend is unknown when either comparison window has no data', () => {
  const result = buildManagementDashboard(branches, [
    { branchId: 'b1', businessDate: '2026-07-26', shift: 'sabah', score: 92 },
  ], [], '2026-07-26')

  assert.equal(result.kxt7Avg, 92)
  assert.equal(result.kxtPrevious7Avg, null)
  assert.equal(result.kxtTrend, null)
})
