/**
 * OCAQ — Shaurma heyəti toplu idxal (import) skripti
 * ---------------------------------------------------------------
 * İSTİFADƏ:
 *   Dry-run (heç nə yazmır, yalnız hesabat):
 *     DATABASE_URL="<preview-db-url>" npx tsx src/db/import-staff.ts
 *   Tətbiq (real yazır):
 *     DATABASE_URL="<preview-db-url>" APPLY=1 npx tsx src/db/import-staff.ts
 *
 * QAYDALAR:
 *   - Əvvəlcə PREVIEW DB-də çalışdır, hesabatı yoxla, sonra Production.
 *   - Mövcud e-poçt varsa ATLANIR (idempotent, təkrar çalışmaq təhlükəsizdir).
 *   - Hər istifadəçiyə GÜVƏNLİ təsadüfi müvəqqəti şifrə → konsola yazılır (fayla YOX).
 *   - branch_manager → filial adına görə tapılıb təyin edilir; tapılmazsa UNMATCHED.
 *   - region_manager → bölgə adına görə; super_admin → sadəcə hesab.
 */
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import { db } from './index'
import { users, tenants } from './schema/auth'
import { branches } from './schema/branches'
import { regions } from './schema/regions'
import { staff_profiles } from './schema/staff'

const APPLY = process.env.APPLY === '1'

type Role = 'super_admin' | 'region_manager' | 'branch_manager' | 'staff'
type Row = { email: string; name: string; role: Role; branch?: string; region?: string }

// ── Heyət siyahısı ────────────────────────────────────────────────────────────
const ROSTER: Row[] = [
  // Direktorlar + IT → super_admin (hər şeyi görür)
  { email: 'sanan.n@shaurma.az', name: 'Nəzərov Sənan',   role: 'super_admin' }, // Baş direktor
  { email: 'ogtay.a@shaurma.az', name: 'Axundov Oqtay',   role: 'super_admin' }, // Kommersiya Dir. müavini (Oktay)
  { email: 'tural.a@shaurma.az', name: 'Əliyev Tural',    role: 'super_admin' }, // IT Administrator

  // Bölgə müdirləri → region_manager
  { email: 'ceyhun.x@shaurma.az', name: 'Xudiyev Ceyhun',   role: 'region_manager', region: 'Ceyhun' },
  { email: 'elnur.q@shaurma.az',  name: 'Qarayev Elnur',    role: 'region_manager', region: 'Elnur' },
  { email: 'taleh.a@shaurma.az',  name: 'Ələkbərov Taleh',  role: 'region_manager', region: 'Taleh' },
  { email: 'ramil.y@shaurma.az',  name: 'Yusifov Ramil',    role: 'region_manager', region: 'Ramil' },
  { email: 'ismayil.i@shaurma.az',name: 'İbrəhimov İsmayıl',role: 'region_manager', region: 'İsmayıl' },

  // Filial menecerləri → branch_manager (filial adına görə)
  { email: 'bayil@shaurma.az',        name: 'Bayıl',          role: 'branch_manager', branch: 'Bayıl' },
  { email: 'h.cavid@shaurma.az',      name: 'Hüseyn Cavid',   role: 'branch_manager', branch: 'Hüseyn Cavid' },
  { email: 'neftchilar@shaurma.az',   name: 'Neftçilər',      role: 'branch_manager', branch: 'Neftçilər' },
  { email: 'narimanov@shaurma.az',    name: 'Nərimanov',      role: 'branch_manager', branch: 'Nərimanov' },
  { email: 'duet@shaurma.az',         name: 'Duet',           role: 'branch_manager', branch: 'Duet' },
  { email: '5martaba@shaurma.az',     name: '5 Mərtəbə',      role: 'branch_manager', branch: '5 Mərtəbə' },
  { email: 'bakixanov@shaurma.az',    name: 'Bakıxanov 1',    role: 'branch_manager', branch: 'Bakıxanov 1' },
  { email: 'bakixanov2@shaurma.az',   name: 'Bakıxanov 2',    role: 'branch_manager', branch: 'Bakıxanov 2' },
  { email: 'ahmadli@shaurma.az',      name: 'Əhmədli',        role: 'branch_manager', branch: 'Əhmədli' },
  { email: 'amay@shaurma.az',         name: 'Amay',           role: 'branch_manager', branch: 'Amay' },
  { email: 'badamdar@shaurma.az',     name: 'Badamdar',       role: 'branch_manager', branch: 'Badamdar' },
  { email: 'binaqadi@shaurma.az',     name: 'Binəqədi',       role: 'branch_manager', branch: 'Binəqədi' },
  { email: 'bulvar@shaurma.az',       name: 'Bulvar',         role: 'branch_manager', branch: 'Bulvar' },
  { email: 'corner@shaurma.az',       name: 'Corner',         role: 'branch_manager', branch: 'Corner' },
  { email: 'ganca@shaurma.az',        name: 'Gəncə',          role: 'branch_manager', branch: 'Gəncə' },
  { email: 'inqilab@shaurma.az',      name: 'İnqilab',        role: 'branch_manager', branch: 'İnqilab' },
  { email: 'inshaatchilar@shaurma.az',name: 'İnşaatçılar',    role: 'branch_manager', branch: 'İnşaatçılar' },
  { email: 'masazir@shaurma.az',      name: 'Masazır',        role: 'branch_manager', branch: 'Masazır' },
  { email: 'm.acami@shaurma.az',      name: 'Memar Əcəmi',    role: 'branch_manager', branch: 'Memar Əcəmi' },
  { email: 'seabreeze@shaurma.az',    name: 'Seabreeze',      role: 'branch_manager', branch: 'Seabreeze' },
  { email: 'space@shaurma.az',        name: 'Space',          role: 'branch_manager', branch: 'Space' },
  { email: 'ayna.s@shaurma.az',       name: 'Ayna Sultanova', role: 'branch_manager', branch: 'Ayna Sultanova' },
  { email: 'zig@shaurma.az',          name: 'Zığ',            role: 'branch_manager', branch: 'Zığ' },
  { email: 'sumqayit@shaurma.az',     name: 'Sumqayıt',       role: 'branch_manager', branch: 'Sumqayıt' },
  { email: 'tarqovaya@shaurma.az',    name: 'Tarqovi',        role: 'branch_manager', branch: 'Tarqovi' },
  { email: 'azadliq@shaurma.az',      name: 'Azadlıq',        role: 'branch_manager', branch: 'Azadlıq' },
  { email: 'mardakan@shaurma.az',     name: 'Mərdəkan',       role: 'branch_manager', branch: 'Mərdəkan' },
  { email: 'bilgah@shaurma.az',       name: 'Bilgəh',         role: 'branch_manager', branch: 'Bilgəh' },
  { email: 'h.aslanov@shaurma.az',    name: 'Həzi Aslanov',   role: 'branch_manager', branch: 'Həzi Aslanov' },

  // Ofis / mərkəz heyəti → staff (filial idarə etmir)
  { email: 'camera@shaurma.az',    name: 'Camera',              role: 'staff' },
  { email: 'khayal.a@shaurma.az',  name: 'Abasov Xəyal',        role: 'staff' },
  { email: 'hikmat.m@shaurma.az',  name: 'Mehdiyev Hikmət',     role: 'staff' },
  { email: 'rashad.a@shaurma.az',  name: 'Abdullayev Rəşad',    role: 'staff' },
  { email: 'fariz.a@shaurma.az',   name: 'Ağayev Fariz',        role: 'staff' },
  { email: 'n.babayeva@shaurma.az',name: 'Babayeva Nəzrin',     role: 'staff' },
  { email: 'hazi.b@shaurma.az',    name: 'Bayraməliyev Həzi',   role: 'staff' },
  { email: 'chinara.j@shaurma.az', name: 'Cavadova Çinarə',     role: 'staff' },
  { email: 'ceyhun.t@shaurma.az',  name: 'Ceyhun Tarverdiyev',  role: 'staff' },
  { email: 'mehdi.e@shaurma.az',   name: 'Elyasov Mehdi',       role: 'staff' },
  { email: 'shamshir.g@shaurma.az',name: 'Quluzadə Şəmşir',     role: 'staff' },
  { email: 'ilkin.m@shaurma.az',   name: 'Mirzəyev İlkin',      role: 'staff' },
  { email: 'samil.j@shaurma.az',   name: 'Cəfərov Samil',       role: 'staff' },
  { email: 'kamal.a@shaurma.az',   name: 'Əlizadə Kamal',       role: 'staff' },
  { email: 'office@shaurma.az',    name: 'Məmmədli Nuridə',     role: 'staff' },
  { email: 'i.karimli@shaurma.az', name: 'Kərimli İsmayıl',     role: 'staff' },
  { email: 'tamerlan.m@shaurma.az',name: 'Mehdiyev Tamerlan',   role: 'staff' },
  { email: 'mirali.m@shaurma.az',  name: 'Mirəhmədov Mirəli',   role: 'staff' },
  { email: 'xatira.n@shaurma.az',  name: 'Novruzova Xatirə',    role: 'staff' },
  { email: 'gunel.k@shaurma.az',   name: 'Kərimli Günel',       role: 'staff' },
  { email: 'kanan.q@shaurma.az',   name: 'Quliyev Kənan',       role: 'staff' },
  { email: 'ramik.o@shaurma.az',   name: 'Osmanov Ramik',       role: 'staff' },
  { email: 'cv@shaurma.az',        name: 'Recources Human',     role: 'staff' },
  { email: 'azer.s@shaurma.az',    name: 'Səmədov Azər',        role: 'staff' },
  { email: 'elchin.v@shaurma.az',  name: 'Vəlizadə Elçin',      role: 'staff' },
  { email: 'info@shaurma.az',      name: 'Info Shaurma',        role: 'staff' },
  // QEYD: all@shaurma.az bilərəkdən ATLANDI (paylama qrupudur, şəxs deyil).
]

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/ş/g, 's')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]/g, '')

const SAFE = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const tempPassword = () =>
  Array.from({ length: 12 }, () => SAFE[crypto.randomInt(SAFE.length)]).join('')

async function main() {
  console.log(`\n=== OCAQ heyət idxalı — ${APPLY ? 'TƏTBİQ (yazır)' : 'DRY-RUN (yazmır)'} ===\n`)

  const [tenant] = await db.select({ id: tenants.id }).from(tenants).limit(1)
  if (!tenant) throw new Error('Tenant tapılmadı — əvvəlcə seed lazımdır.')
  const tenantId = tenant.id

  const allBranches = await db.select({ id: branches.id, name: branches.name, code: branches.code })
    .from(branches).where(eq(branches.tenant_id, tenantId))
  const allRegions = await db.select({ id: regions.id, name: regions.name })
    .from(regions).where(eq(regions.tenant_id, tenantId))

  const findBranch = (n: string) => allBranches.find(b => norm(b.name) === norm(n))
  const findRegion = (n: string) => allRegions.find(r => norm(r.name).includes(norm(n)))

  const created: string[] = []
  const skipped: string[] = []
  const unmatched: string[] = []

  for (const row of ROSTER) {
    const [existing] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, row.email), eq(users.tenant_id, tenantId))).limit(1)
    if (existing) { skipped.push(`${row.email} (artıq var)`); continue }

    let branchId: string | null = null
    let regionId: string | null = null
    let note = ''
    if (row.role === 'branch_manager' && row.branch) {
      const b = findBranch(row.branch)
      if (b) { branchId = b.id; note = `→ ${b.code} ${b.name}` }
      else { note = `⚠ FİLİAL TAPILMADI: "${row.branch}"`; unmatched.push(`${row.email} → filial "${row.branch}"`) }
    }
    if (row.role === 'region_manager' && row.region) {
      const r = findRegion(row.region)
      if (r) { regionId = r.id; note = `→ ${r.name}` }
      else { note = `⚠ BÖLGƏ TAPILMADI: "${row.region}"`; unmatched.push(`${row.email} → bölgə "${row.region}"`) }
    }

    const pw = tempPassword()
    console.log(`${APPLY ? '+' : '·'} ${row.role.padEnd(15)} ${row.email.padEnd(26)} ${pw}  ${note}`)

    if (APPLY) {
      const hash = await bcrypt.hash(pw, 12)
      const [u] = await db.insert(users).values({
        tenant_id: tenantId, email: row.email, name: row.name, password_hash: hash,
        role: row.role, is_active: true, is_email_verified: true, email_verified_at: new Date(),
      }).returning({ id: users.id })

      if (row.role === 'branch_manager') {
        if (branchId) await db.update(branches).set({ manager_id: u.id, updated_at: new Date() }).where(eq(branches.id, branchId))
        await db.insert(staff_profiles).values({ user_id: u.id, tenant_id: tenantId, branch_id: branchId, status: 'active' })
      } else if (row.role === 'region_manager') {
        if (regionId) await db.update(regions).set({ manager_id: u.id, updated_at: new Date() }).where(eq(regions.id, regionId))
      } else if (row.role === 'staff') {
        await db.insert(staff_profiles).values({ user_id: u.id, tenant_id: tenantId, branch_id: null, status: 'active' })
      }
    }
    created.push(row.email)
  }

  console.log(`\n=== NƏTİCƏ ===`)
  console.log(`${APPLY ? 'Yaradıldı' : 'Yaradılacaq'}: ${created.length}`)
  console.log(`Atlandı (mövcud): ${skipped.length}`)
  if (unmatched.length) {
    console.log(`\n⚠ EŞLEŞMƏYƏN (${unmatched.length}) — bunlar əl ilə təyin olunmalı:`)
    unmatched.forEach(u => console.log('   ' + u))
  }
  if (!APPLY) console.log(`\nTətbiq üçün: APPLY=1 əlavə edib yenidən çalışdır.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
