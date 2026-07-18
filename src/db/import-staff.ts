/**
 * OCAQ — Shaurma heyəti toplu idxal skripti
 *
 * Dry-run:
 *   TENANT_SLUG="ocaq" DATABASE_URL="<preview-url>" npx tsx src/db/import-staff.ts
 *
 * Tətbiq:
 *   TENANT_SLUG="ocaq" CONFIRM_TENANT="ocaq" CONFIRM_COUNT="63" \
 *   ALLOW_SUPER_ADMIN_IMPORT="1" APPLY="1" DATABASE_URL="<preview-url>" \
 *   npx tsx src/db/import-staff.ts
 *
 * Şifrə və connection string-i fayla, Git-ə və söhbətə yazmayın.
 */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq, inArray } from 'drizzle-orm'
import { db, sqlClient } from './index'
import { users, tenants } from './schema/auth'
import { branches } from './schema/branches'
import { regions } from './schema/regions'
import {
  normalizeImportKey,
  roleCounts,
  validateRosterStructure,
  type ImportRosterRow,
} from '../lib/staff-import'

const APPLY = process.env.APPLY === '1'
const TENANT_SLUG = process.env.TENANT_SLUG?.trim() ?? ''
const CONFIRM_TENANT = process.env.CONFIRM_TENANT?.trim() ?? ''
const CONFIRM_COUNT = Number(process.env.CONFIRM_COUNT)
const ALLOW_SUPER_ADMIN_IMPORT = process.env.ALLOW_SUPER_ADMIN_IMPORT === '1'

const ROSTER: ImportRosterRow[] = [
  { email: 'sanan.n@shaurma.az', name: 'Nəzərov Sənan', role: 'super_admin' },
  { email: 'ogtay.a@shaurma.az', name: 'Axundov Oqtay', role: 'super_admin' },
  { email: 'tural.a@shaurma.az', name: 'Əliyev Tural', role: 'super_admin' },

  { email: 'ceyhun.x@shaurma.az', name: 'Xudiyev Ceyhun', role: 'region_manager', region: 'Ceyhun' },
  { email: 'elnur.q@shaurma.az', name: 'Qarayev Elnur', role: 'region_manager', region: 'Elnur' },
  { email: 'taleh.a@shaurma.az', name: 'Ələkbərov Taleh', role: 'region_manager', region: 'Taleh' },
  { email: 'ramil.y@shaurma.az', name: 'Yusifov Ramil', role: 'region_manager', region: 'Ramil' },
  { email: 'ismayil.i@shaurma.az', name: 'İbrəhimov İsmayıl', role: 'region_manager', region: 'İsmayıl' },

  { email: 'bayil@shaurma.az', name: 'Bayıl', role: 'branch_manager', branch: 'Bayıl' },
  { email: 'h.cavid@shaurma.az', name: 'Hüseyn Cavid', role: 'branch_manager', branch: 'Hüseyn Cavid' },
  { email: 'neftchilar@shaurma.az', name: 'Neftçilər', role: 'branch_manager', branch: 'Neftçilər' },
  { email: 'narimanov@shaurma.az', name: 'Nərimanov', role: 'branch_manager', branch: 'Nərimanov' },
  { email: 'duet@shaurma.az', name: 'Duet', role: 'branch_manager', branch: 'Duet' },
  { email: '5martaba@shaurma.az', name: '5 Mərtəbə', role: 'branch_manager', branch: '5 Mərtəbə' },
  { email: 'bakixanov@shaurma.az', name: 'Bakıxanov 1', role: 'branch_manager', branch: 'Bakıxanov 1' },
  { email: 'bakixanov2@shaurma.az', name: 'Bakıxanov 2', role: 'branch_manager', branch: 'Bakıxanov 2' },
  { email: 'ahmadli@shaurma.az', name: 'Əhmədli', role: 'branch_manager', branch: 'Əhmədli' },
  { email: 'amay@shaurma.az', name: 'Amay', role: 'branch_manager', branch: 'Amay' },
  { email: 'badamdar@shaurma.az', name: 'Badamdar', role: 'branch_manager', branch: 'Badamdar' },
  { email: 'binaqadi@shaurma.az', name: 'Binəqədi', role: 'branch_manager', branch: 'Binəqədi' },
  { email: 'bulvar@shaurma.az', name: 'Bulvar', role: 'branch_manager', branch: 'Bulvar' },
  { email: 'corner@shaurma.az', name: 'Corner', role: 'branch_manager', branch: 'Corner' },
  { email: 'ganca@shaurma.az', name: 'Gəncə', role: 'branch_manager', branch: 'Gəncə' },
  { email: 'inqilab@shaurma.az', name: 'İnqilab', role: 'branch_manager', branch: 'İnqilab' },
  { email: 'inshaatchilar@shaurma.az', name: 'İnşaatçılar', role: 'branch_manager', branch: 'İnşaatçılar' },
  { email: 'masazir@shaurma.az', name: 'Masazır', role: 'branch_manager', branch: 'Masazır' },
  { email: 'm.acami@shaurma.az', name: 'Memar Əcəmi', role: 'branch_manager', branch: 'Memar Əcəmi' },
  { email: 'seabreeze@shaurma.az', name: 'Seabreeze', role: 'branch_manager', branch: 'Seabreeze' },
  { email: 'space@shaurma.az', name: 'Space', role: 'branch_manager', branch: 'Space' },
  { email: 'ayna.s@shaurma.az', name: 'Ayna Sultanova', role: 'branch_manager', branch: 'Ayna Sultanova' },
  { email: 'zig@shaurma.az', name: 'Zığ', role: 'branch_manager', branch: 'Zığ' },
  { email: 'sumqayit@shaurma.az', name: 'Sumqayıt', role: 'branch_manager', branch: 'Sumqayıt' },
  { email: 'tarqovaya@shaurma.az', name: 'Tarqovi', role: 'branch_manager', branch: 'Tarqovi' },
  { email: 'azadliq@shaurma.az', name: 'Azadlıq', role: 'branch_manager', branch: 'Azadlıq' },
  { email: 'mardakan@shaurma.az', name: 'Mərdəkan', role: 'branch_manager', branch: 'Mərdəkan' },
  { email: 'bilgah@shaurma.az', name: 'Bilgəh', role: 'branch_manager', branch: 'Bilgəh' },
  { email: 'h.aslanov@shaurma.az', name: 'Həzi Aslanov', role: 'branch_manager', branch: 'Həzi Aslanov' },

  { email: 'camera@shaurma.az', name: 'Camera', role: 'staff' },
  { email: 'khayal.a@shaurma.az', name: 'Abasov Xəyal', role: 'staff' },
  { email: 'hikmat.m@shaurma.az', name: 'Mehdiyev Hikmət', role: 'staff' },
  { email: 'rashad.a@shaurma.az', name: 'Abdullayev Rəşad', role: 'staff' },
  { email: 'fariz.a@shaurma.az', name: 'Ağayev Fariz', role: 'staff' },
  { email: 'n.babayeva@shaurma.az', name: 'Babayeva Nəzrin', role: 'staff' },
  { email: 'hazi.b@shaurma.az', name: 'Bayraməliyev Həzi', role: 'staff' },
  { email: 'chinara.j@shaurma.az', name: 'Cavadova Çinarə', role: 'staff' },
  { email: 'ceyhun.t@shaurma.az', name: 'Ceyhun Tarverdiyev', role: 'staff' },
  { email: 'mehdi.e@shaurma.az', name: 'Elyasov Mehdi', role: 'staff' },
  { email: 'shamshir.g@shaurma.az', name: 'Quluzadə Şəmşir', role: 'staff' },
  { email: 'ilkin.m@shaurma.az', name: 'Mirzəyev İlkin', role: 'staff' },
  { email: 'samil.j@shaurma.az', name: 'Cəfərov Samil', role: 'staff' },
  { email: 'kamal.a@shaurma.az', name: 'Əlizadə Kamal', role: 'staff' },
  { email: 'office@shaurma.az', name: 'Məmmədli Nuridə', role: 'staff' },
  { email: 'i.karimli@shaurma.az', name: 'Kərimli İsmayıl', role: 'staff' },
  { email: 'tamerlan.m@shaurma.az', name: 'Mehdiyev Tamerlan', role: 'staff' },
  { email: 'mirali.m@shaurma.az', name: 'Mirəhmədov Mirəli', role: 'staff' },
  { email: 'xatira.n@shaurma.az', name: 'Novruzova Xatirə', role: 'staff' },
  { email: 'gunel.k@shaurma.az', name: 'Kərimli Günel', role: 'staff' },
  { email: 'kanan.q@shaurma.az', name: 'Quliyev Kənan', role: 'staff' },
  { email: 'ramik.o@shaurma.az', name: 'Osmanov Ramik', role: 'staff' },
  { email: 'cv@shaurma.az', name: 'Recources Human', role: 'staff' },
  { email: 'azer.s@shaurma.az', name: 'Səmədov Azər', role: 'staff' },
  { email: 'elchin.v@shaurma.az', name: 'Vəlizadə Elçin', role: 'staff' },
  { email: 'info@shaurma.az', name: 'Info Shaurma', role: 'staff' },
]

type PlannedRow = ImportRosterRow & {
  branch_id: string | null
  region_id: string | null
  password?: string
  password_hash?: string
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%+='
function temporaryPassword() {
  return Array.from({ length: 16 }, () => PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)]).join('')
}

function fail(issues: string[]): never {
  console.error('\nİDXAL DAYANDIRILDI:')
  issues.forEach((issue) => console.error(`- ${issue}`))
  process.exit(1)
}

async function main() {
  if (!TENANT_SLUG) fail(['TENANT_SLUG mütləq verilməlidir.'])
  const structureIssues = validateRosterStructure(ROSTER)
  if (structureIssues.length) fail(structureIssues)

  const [tenant] = await db.select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1)
  if (!tenant) fail([`Tenant tapılmadı: ${TENANT_SLUG}`])

  const [allBranches, allRegions, existingUsers] = await Promise.all([
    db.select({
      id: branches.id,
      name: branches.name,
      code: branches.code,
      manager_id: branches.manager_id,
      is_archived: branches.is_archived,
    }).from(branches).where(eq(branches.tenant_id, tenant.id)),
    db.select({
      id: regions.id,
      name: regions.name,
      manager_id: regions.manager_id,
      is_active: regions.is_active,
    }).from(regions).where(eq(regions.tenant_id, tenant.id)),
    db.select({
      id: users.id,
      tenant_id: users.tenant_id,
      email: users.email,
      role: users.role,
    }).from(users).where(inArray(users.email, ROSTER.map((row) => row.email))),
  ])

  const issues: string[] = []
  const branchMap = new Map<string, typeof allBranches>()
  for (const branch of allBranches) {
    const key = normalizeImportKey(branch.name)
    branchMap.set(key, [...(branchMap.get(key) ?? []), branch])
  }
  const regionMap = new Map<string, typeof allRegions>()
  for (const region of allRegions) {
    const key = normalizeImportKey(region.name).replace(/bolgesi$/, '')
    regionMap.set(key, [...(regionMap.get(key) ?? []), region])
  }

  const existingByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user]))
  const plan: PlannedRow[] = []
  let skipped = 0

  for (const row of ROSTER) {
    let branch_id: string | null = null
    let region_id: string | null = null
    let branchMatch: (typeof allBranches)[number] | null = null
    let regionMatch: (typeof allRegions)[number] | null = null

    if (row.role === 'branch_manager') {
      const matches = branchMap.get(normalizeImportKey(row.branch ?? '')) ?? []
      if (matches.length !== 1) {
        issues.push(`${row.email}: filial dəqiq tapılmadı (${row.branch}); uyğunluq sayı ${matches.length}.`)
      } else if (matches[0].is_archived) {
        issues.push(`${row.email}: filial arxivdədir (${matches[0].code} ${matches[0].name}).`)
      } else {
        branchMatch = matches[0]
        branch_id = matches[0].id
      }
    }
    if (row.role === 'region_manager') {
      const requested = normalizeImportKey(row.region ?? '')
      const matches = [...regionMap.entries()]
        .filter(([key]) => key === requested || key.startsWith(requested))
        .flatMap(([, values]) => values)
      if (matches.length !== 1) {
        issues.push(`${row.email}: bölgə dəqiq tapılmadı (${row.region}); uyğunluq sayı ${matches.length}.`)
      } else if (!matches[0].is_active) {
        issues.push(`${row.email}: bölgə aktiv deyil (${matches[0].name}).`)
      } else {
        regionMatch = matches[0]
        region_id = matches[0].id
      }
    }

    const existing = existingByEmail.get(row.email)
    if (existing) {
      if (existing.tenant_id !== tenant.id) issues.push(`${row.email} başqa tenant-a aiddir.`)
      else if (existing.role !== row.role) issues.push(`${row.email} mövcud rolu ${existing.role}, gözlənilən ${row.role}.`)
      else if (branchMatch && branchMatch.manager_id !== existing.id) {
        issues.push(`${row.email}: mövcud hesab gözlənilən filiala müdür təyin edilməyib (${branchMatch.code} ${branchMatch.name}).`)
      } else if (regionMatch && regionMatch.manager_id !== existing.id) {
        issues.push(`${row.email}: mövcud hesab gözlənilən bölgəyə müdür təyin edilməyib (${regionMatch.name}).`)
      } else skipped += 1
      continue
    }

    if (branchMatch?.manager_id) {
      issues.push(`${row.email}: filialın artıq başqa müdiri var (${branchMatch.code} ${branchMatch.name}).`)
    }
    if (regionMatch?.manager_id) {
      issues.push(`${row.email}: bölgənin artıq başqa müdiri var (${regionMatch.name}).`)
    }
    plan.push({ ...row, branch_id, region_id })
  }

  if (issues.length) fail(issues)
  const counts = roleCounts(ROSTER)
  console.log(`\nTenant: ${tenant.name} (${tenant.slug})`)
  console.log(`Roster: ${ROSTER.length}; yeni: ${plan.length}; mövcud və uyğun: ${skipped}`)
  console.log(`Rollər: super_admin=${counts.super_admin}, region_manager=${counts.region_manager}, branch_manager=${counts.branch_manager}, staff=${counts.staff}`)
  plan.forEach((row) => console.log(
    `- ${row.role.padEnd(15)} ${row.email.padEnd(27)} ${row.branch ?? row.region ?? ''}`,
  ))

  if (!APPLY) {
    console.log('\nDRY-RUN tamamlandı. Heç bir məlumat yazılmadı.')
    return
  }
  const confirmations: string[] = []
  if (CONFIRM_TENANT !== tenant.slug) confirmations.push('CONFIRM_TENANT tenant slug ilə eyni deyil.')
  if (CONFIRM_COUNT !== ROSTER.length) confirmations.push(`CONFIRM_COUNT ${ROSTER.length} olmalıdır.`)
  if (counts.super_admin > 0 && !ALLOW_SUPER_ADMIN_IMPORT) {
    confirmations.push('Super admin idxalı üçün ALLOW_SUPER_ADMIN_IMPORT=1 tələb olunur.')
  }
  if (confirmations.length) fail(confirmations)
  if (!plan.length) {
    console.log('\nBütün hesablar artıq mövcuddur və rolları uyğundur. Yazılacaq məlumat yoxdur.')
    return
  }

  for (const row of plan) {
    row.password = temporaryPassword()
    row.password_hash = await bcrypt.hash(row.password, 12)
  }

  const payload = plan.map((row) => ({
    email: row.email,
    name: row.name,
    role: row.role,
    password_hash: row.password_hash,
    branch_id: row.branch_id,
    region_id: row.region_id,
  }))
  const expected = {
    users: plan.length,
    branches: plan.filter((row) => row.role === 'branch_manager').length,
    regions: plan.filter((row) => row.role === 'region_manager').length,
    profiles: plan.filter((row) => row.role === 'staff' || row.role === 'branch_manager').length,
  }

  const result = await sqlClient.query(`
    with tenant_lock as (
      select pg_advisory_xact_lock(hashtextextended($1::text, 7))
    ), payload as materialized (
      select p.* from tenant_lock, jsonb_to_recordset($2::jsonb) as p(
        email text, name text, role role, password_hash text, branch_id uuid, region_id uuid
      )
    ), inserted_users as (
      insert into users (
        tenant_id, email, name, password_hash, must_change_password, role, is_active,
        is_email_verified, email_verified_at, created_at, updated_at
      )
      select $1::uuid, lower(payload.email), payload.name, payload.password_hash,
        true, payload.role, true, true, now(), now(), now()
      from payload
      where not exists (select 1 from users existing where lower(existing.email) = lower(payload.email))
      returning id, email, role
    ), revoked_invitations as (
      update invitations invitation
      set revoked_at = now(), revoked_reason = 'Hesab təhlükəsiz toplu idxal ilə yaradıldı'
      from payload, inserted_users
      where lower(inserted_users.email) = lower(payload.email)
        and invitation.tenant_id = $1::uuid
        and lower(invitation.email) = lower(payload.email)
        and invitation.accepted_at is null
        and invitation.revoked_at is null
      returning invitation.id
    ), assigned_branches as (
      update branches branch
      set manager_id = inserted_users.id, version = branch.version + 1, updated_at = now()
      from payload, inserted_users
      where lower(inserted_users.email) = lower(payload.email)
        and payload.role = 'branch_manager'
        and branch.id = payload.branch_id
        and branch.tenant_id = $1::uuid
        and branch.manager_id is null
        and branch.is_archived = false
      returning branch.id, branch.code, inserted_users.id as user_id
    ), assigned_regions as (
      update regions region
      set manager_id = inserted_users.id, updated_at = now()
      from payload, inserted_users
      where lower(inserted_users.email) = lower(payload.email)
        and payload.role = 'region_manager'
        and region.id = payload.region_id
        and region.tenant_id = $1::uuid
        and region.manager_id is null
        and region.is_active = true
      returning region.id, inserted_users.id as user_id
    ), inserted_profiles as (
      insert into staff_profiles (user_id, tenant_id, branch_id, status)
      select inserted_users.id, $1::uuid,
        case when payload.role = 'branch_manager' then payload.branch_id else null end,
        'active'
      from payload, inserted_users
      where lower(inserted_users.email) = lower(payload.email)
        and payload.role in ('staff', 'branch_manager')
      returning id
    ), user_audits as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $1::uuid, null, 'user.import', 'user', inserted_users.id::text,
        jsonb_build_object(
          'email', inserted_users.email, 'role', inserted_users.role, 'source', 'bulk_import'
        )::text
      from inserted_users
      returning id
    ), branch_audits as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $1::uuid, null, 'branch.manager.import', 'branch',
        assigned_branches.id::text,
        jsonb_build_object(
          'code', assigned_branches.code, 'manager_id', assigned_branches.user_id, 'source', 'bulk_import'
        )::text
      from assigned_branches
      returning id
    ), region_audits as (
      insert into audit_logs (tenant_id, user_id, action, entity, entity_id, metadata)
      select $1::uuid, null, 'region.manager.import', 'region',
        assigned_regions.id::text,
        jsonb_build_object('manager_id', assigned_regions.user_id, 'source', 'bulk_import')::text
      from assigned_regions
      returning id
    ), counts as (
      select
        (select count(*)::int from inserted_users) users,
        (select count(*)::int from assigned_branches) branches,
        (select count(*)::int from assigned_regions) regions,
        (select count(*)::int from inserted_profiles) profiles,
        (select count(*)::int from user_audits) user_audits,
        (select count(*)::int from branch_audits) branch_audits,
        (select count(*)::int from region_audits) region_audits,
        (select count(*)::int from revoked_invitations) revoked_invitations
    ), asserted as (
      select 1 / case when
        counts.users = $3::int
        and counts.branches = $4::int
        and counts.regions = $5::int
        and counts.profiles = $6::int
        and counts.user_audits = $3::int
        and counts.branch_audits = $4::int
        and counts.region_audits = $5::int
      then 1 else 0 end as ok
      from counts
    )
    select counts.*, asserted.ok from counts, asserted
  `, [tenant.id, JSON.stringify(payload), expected.users, expected.branches, expected.regions, expected.profiles])

  if (!result[0]) fail(['DB atomik idxal nəticəsi qaytarılmadı.'])
  console.log('\nİDXAL UĞURLA TAMAMLANDI. Müvəqqəti şifrələri təhlükəsiz saxlayın:')
  for (const row of plan) console.log(`${row.email}\t${row.password}`)
  console.log('\nBu şifrələri söhbətə, Git-ə və ümumi WhatsApp qrupuna göndərməyin.')
}

main().catch((error) => {
  console.error('İdxal xətası:', error instanceof Error ? error.message : error)
  process.exit(1)
})
