export type DashboardBranch = {
  id: string
  code: string
  name: string
  regionName: string | null
  managerName: string | null
}

export type DashboardChecklist = {
  branchId: string | null
  businessDate: string
  shift: string
  score: number
}

export type DashboardQualityForm = {
  branchId: string
  periodEnd: string
  status: string
}

export type BranchPerformance = DashboardBranch & {
  todaySubmitted: number
  todayMissing: number
  kxt7Avg: number | null
  kxt30Avg: number | null
  quality7Count: number
  pendingApproval: number
  draftCount: number
  voidedCount: number
  exceptionCount: number
}

export type ManagementDashboard = {
  branchCount: number
  todaySubmitted: number
  todayExpected: number
  todayMissing: number
  kxt7Avg: number | null
  kxtPrevious7Avg: number | null
  kxt30Avg: number | null
  kxtTrend: number | null
  quality7Count: number
  quality30Count: number
  pendingApproval: number
  draftCount: number
  voidedCount: number
  branches: BranchPerformance[]
}

function shiftIsoDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function buildManagementDashboard(
  branches: DashboardBranch[],
  checklistRows: DashboardChecklist[],
  qualityRows: DashboardQualityForm[],
  today: string,
): ManagementDashboard {
  const sevenStart = shiftIsoDate(today, -6)
  const previousSevenStart = shiftIsoDate(today, -13)
  const previousSevenEnd = shiftIsoDate(today, -7)
  const thirtyStart = shiftIsoDate(today, -29)
  const branchIds = new Set(branches.map((branch) => branch.id))
  const scopedChecklists = checklistRows.filter((row) => row.branchId && branchIds.has(row.branchId))
  const scopedForms = qualityRows.filter((row) => branchIds.has(row.branchId))

  const todayRows = scopedChecklists.filter((row) => row.businessDate === today)
  const sevenRows = scopedChecklists.filter((row) => row.businessDate >= sevenStart && row.businessDate <= today)
  const previousSevenRows = scopedChecklists.filter(
    (row) => row.businessDate >= previousSevenStart && row.businessDate <= previousSevenEnd,
  )
  const thirtyRows = scopedChecklists.filter((row) => row.businessDate >= thirtyStart && row.businessDate <= today)

  const kxt7Avg = average(sevenRows.map((row) => row.score))
  const kxtPrevious7Avg = average(previousSevenRows.map((row) => row.score))
  const quality7 = scopedForms.filter((row) => row.periodEnd >= sevenStart && row.periodEnd <= today)
  const quality30 = scopedForms.filter((row) => row.periodEnd >= thirtyStart && row.periodEnd <= today)

  const branchPerformance = branches.map((branch) => {
    const branchToday = todayRows.filter((row) => row.branchId === branch.id)
    const branchSeven = sevenRows.filter((row) => row.branchId === branch.id)
    const branchThirty = thirtyRows.filter((row) => row.branchId === branch.id)
    const branchForms = scopedForms.filter((row) => row.branchId === branch.id)
    const pendingApproval = branchForms.filter((row) => row.status === 'submitted').length
    const draftCount = branchForms.filter((row) => row.status === 'draft').length
    const voidedCount = branchForms.filter((row) => row.status === 'voided').length
    const submittedShifts = new Set(branchToday.map((row) => row.shift)).size
    const todayMissing = Math.max(0, 2 - submittedShifts)
    const missingManager = branch.managerName ? 0 : 1

    return {
      ...branch,
      todaySubmitted: submittedShifts,
      todayMissing,
      kxt7Avg: average(branchSeven.map((row) => row.score)),
      kxt30Avg: average(branchThirty.map((row) => row.score)),
      quality7Count: branchForms.filter((row) => row.periodEnd >= sevenStart && row.periodEnd <= today).length,
      pendingApproval,
      draftCount,
      voidedCount,
      exceptionCount: todayMissing + pendingApproval + draftCount + voidedCount + missingManager,
    }
  }).sort((a, b) => b.exceptionCount - a.exceptionCount || a.code.localeCompare(b.code))

  return {
    branchCount: branches.length,
    todaySubmitted: new Set(todayRows.map((row) => `${row.branchId}:${row.shift}`)).size,
    todayExpected: branches.length * 2,
    todayMissing: branchPerformance.reduce((sum, branch) => sum + branch.todayMissing, 0),
    kxt7Avg,
    kxtPrevious7Avg,
    kxt30Avg: average(thirtyRows.map((row) => row.score)),
    kxtTrend: kxt7Avg === null || kxtPrevious7Avg === null ? null : kxt7Avg - kxtPrevious7Avg,
    quality7Count: quality7.length,
    quality30Count: quality30.length,
    pendingApproval: scopedForms.filter((row) => row.status === 'submitted').length,
    draftCount: scopedForms.filter((row) => row.status === 'draft').length,
    voidedCount: scopedForms.filter((row) => row.status === 'voided').length,
    branches: branchPerformance,
  }
}
