export type ImportRole = 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'

export type ImportRosterRow = {
  email: string
  name: string
  role: ImportRole
  branch?: string
  region?: string
}

export function normalizeImportKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('az')
    .replace(/ə/g, 'e')
    .replace(/[ıi̇]/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]/g, '')
}

export function validateRosterStructure(rows: ImportRosterRow[]) {
  const issues: string[] = []
  const emails = new Set<string>()
  const branchKeys = new Set<string>()
  const regionKeys = new Set<string>()

  for (const row of rows) {
    const email = row.email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) issues.push(`Etibarsız e-poçt: ${row.email}`)
    if (emails.has(email)) issues.push(`Təkrar e-poçt: ${email}`)
    emails.add(email)

    if (row.role === 'branch_manager') {
      if (!row.branch) issues.push(`Filial müdiri üçün filial yoxdur: ${email}`)
      else {
        const key = normalizeImportKey(row.branch)
        if (branchKeys.has(key)) issues.push(`Eyni filial iki müdürə verilib: ${row.branch}`)
        branchKeys.add(key)
      }
    } else if (row.branch) {
      issues.push(`Filial müdiri olmayan hesabda filial göstərilib: ${email}`)
    }

    if (row.role === 'region_manager') {
      if (!row.region) issues.push(`Bölgə müdiri üçün bölgə yoxdur: ${email}`)
      else {
        const key = normalizeImportKey(row.region)
        if (regionKeys.has(key)) issues.push(`Eyni bölgə iki müdürə verilib: ${row.region}`)
        regionKeys.add(key)
      }
    } else if (row.region) {
      issues.push(`Bölgə müdiri olmayan hesabda bölgə göstərilib: ${email}`)
    }
  }

  return issues
}

export function roleCounts(rows: ImportRosterRow[]) {
  return rows.reduce<Record<ImportRole, number>>((counts, row) => {
    counts[row.role] += 1
    return counts
  }, { super_admin: 0, region_manager: 0, branch_manager: 0, staff: 0 })
}
