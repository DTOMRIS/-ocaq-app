import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TANINAN_ROLLAR, tanınanRol, filialEhateUsulu, bolgeEhateUsulu,
  ehateyeDaxil, auditoriyaSeceBiler, auditoriyaGenisleneBiler,
} from '../src/lib/access-policy'
import { can } from '../src/lib/rbac'
import { encrypt, decrypt, encryptOrNull, decryptOrNull } from '../src/lib/encryption'

// ── ƏHATƏ SİYASƏTİ ──────────────────────────────────────────────────────────

test('hər tanınan rolun filial əhatə üsulu açıq yazılıb', () => {
  const gozlenen: Record<string, string> = {
    super_admin: 'hamisi', region_manager: 'bolge',
    branch_manager: 'mudiri', staff: 'kadr',
  }
  for (const r of TANINAN_ROLLAR) assert.equal(filialEhateUsulu(r), gozlenen[r], r)
})

test('TANINMAYAN ROL HEÇ NƏ GÖRMÜR — səssiz genişlənmə olmur', () => {
  // Yeni rol əlavə ediləndə (trainer, auditor…) siyasətə yazılmasa boş qalmalıdır
  for (const r of ['trainer', 'auditor', 'admin', 'superadmin', 'SUPER_ADMIN',
                   'region_manager ', '', 'null', 'undefined', '*']) {
    assert.equal(filialEhateUsulu(r), 'yox', `filial: ${r}`)
    assert.equal(bolgeEhateUsulu(r), 'yox', `bölgə: ${r}`)
    assert.equal(tanınanRol(r), false, r)
  }
})

test('rol adı BÖYÜK/kiçik həssasdır — «Super_Admin» admin deyil', () => {
  assert.equal(filialEhateUsulu('Super_Admin'), 'yox')
  assert.equal(filialEhateUsulu('SUPER_ADMIN'), 'yox')
  assert.equal(filialEhateUsulu('super_admin'), 'hamisi')
})

test('bölgə əhatəsi: filial müdiri və işçi AŞAĞIDAN YUXARI gedir', () => {
  assert.equal(bolgeEhateUsulu('super_admin'), 'hamisi')
  assert.equal(bolgeEhateUsulu('region_manager'), 'ozu')
  assert.equal(bolgeEhateUsulu('branch_manager'), 'filial')
  assert.equal(bolgeEhateUsulu('staff'), 'filial')
})

test('boş əhatə + boş id heç vaxt icazə vermir', () => {
  assert.equal(ehateyeDaxil([], 'b1'), false)
  assert.equal(ehateyeDaxil([], null), false)
  assert.equal(ehateyeDaxil([], undefined), false)
  assert.equal(ehateyeDaxil([], ''), false)
  // ƏN VACİB: dolu əhatə + boş id → yenə də FALSE.
  // `!branchId` yoxlanışı olmasaydı `includes(undefined)` da false verərdi,
  // amma niyyət açıq olmalıdır: id yoxdursa icazə yoxdur.
  assert.equal(ehateyeDaxil(['b1', 'b2'], null), false)
  assert.equal(ehateyeDaxil(['b1', 'b2'], undefined), false)
  assert.equal(ehateyeDaxil(['b1', 'b2'], ''), false)
})

test('əhatə tam uyğunluq tələb edir — prefiks kifayət etmir', () => {
  assert.equal(ehateyeDaxil(['b1'], 'b1'), true)
  assert.equal(ehateyeDaxil(['b1'], 'b11'), false)
  assert.equal(ehateyeDaxil(['b11'], 'b1'), false)
})

// ── AUDİTORİYA ──────────────────────────────────────────────────────────────

test('işçi mesaj auditoriyası seçə bilmir', () => {
  assert.equal(auditoriyaSeceBiler('staff'), false)
  assert.equal(auditoriyaSeceBiler('trainer'), false)     // tanınmayan da yox
  for (const r of ['super_admin', 'region_manager', 'branch_manager']) {
    assert.equal(auditoriyaSeceBiler(r), true, r)
  }
})

test('«hamıya göndər» yalnız super_admin-dədir', () => {
  assert.equal(auditoriyaGenisleneBiler('super_admin', 'all'), true)
  assert.equal(auditoriyaGenisleneBiler('region_manager', 'all'), false)
  assert.equal(auditoriyaGenisleneBiler('branch_manager', 'all'), false)
  // qalan növlər onsuz da öz əhatəsi ilə məhdudlaşır
  for (const nov of ['role', 'region', 'branch', 'selected'] as const) {
    assert.equal(auditoriyaGenisleneBiler('region_manager', nov), true, nov)
  }
})

// ── RBAC ────────────────────────────────────────────────────────────────────

test('super_admin hər icazəyə malikdir, işçi heç birinə', () => {
  for (const p of ['user.invite', 'sales.target.set', 'region.edit', 'nə_isə']) {
    assert.equal(can('super_admin', p), true, p)
    assert.equal(can('staff', p), false, p)
  }
})

test('filial müdiri bölgə səviyyəli icazə ala bilmir', () => {
  assert.equal(can('branch_manager', 'sales.view.branch'), true)
  assert.equal(can('branch_manager', 'sales.view.region'), false)
  assert.equal(can('branch_manager', 'region.edit'), false)
  assert.equal(can('branch_manager', 'sales.target.set'), false)   // hədəfi bölgə qoyur
  assert.equal(can('branch_manager', 'user.invite'), false)        // dəvəti bölgə göndərir
})

test('bölgə müdiri filial müdirinin əməliyyat icazələrini ƏVƏZ ETMİR', () => {
  // `sales.entry.create` filialındır — bölgə müdiri satış girişi yazmır
  assert.equal(can('region_manager', 'sales.entry.create'), false)
  assert.equal(can('region_manager', 'sales.entry.view'), true)
})

test('icazə adı tam uyğun olmalıdır — prefiks açar vermir', () => {
  assert.equal(can('branch_manager', 'sales.view'), false)
  assert.equal(can('region_manager', 'sales'), false)
  assert.equal(can('region_manager', 'user'), false)
})

// ── ŞİFRƏLƏMƏ (FIN / IBAN) ──────────────────────────────────────────────────

test('şifrələ → aç dövrəsi mətni qoruyur (AZ hərfləri daxil)', () => {
  for (const m of ['AZ21NABZ00000000137010001944', '5AB2CD1', 'Şüşə ə ı ğ Ö Ç',
                   '', '  boşluqlu  ', '{"a":1}']) {
    assert.equal(decrypt(encrypt(m)), m, JSON.stringify(m))
  }
})

test('eyni mətn hər dəfə FƏRQLİ şifrə verir (IV təsadüfidir)', () => {
  // Eyni çıxsa, bazaya baxan adam «bu iki işçinin FİN-i eynidir» deyə bilərdi
  const a = encrypt('5AB2CD1'), b = encrypt('5AB2CD1')
  assert.notEqual(a, b)
  assert.equal(decrypt(a), decrypt(b))
})

test('pozulmuş şifrə mətni AÇILMIR — səssiz yanlış nəticə yoxdur', () => {
  const c = encrypt('5AB2CD1')
  const buf = Buffer.from(c, 'base64')
  buf[buf.length - 1] ^= 0xff                       // son baytı dəyiş
  assert.throws(() => decrypt(buf.toString('base64')))
  // oxuma yolu çökmür, null qaytarır
  assert.equal(decryptOrNull(buf.toString('base64')), null)
  assert.equal(decryptOrNull('zibil'), null)
})

test('null/boş dəyər şifrələnmir və açılmır', () => {
  assert.equal(encryptOrNull(null), null)
  assert.equal(encryptOrNull(undefined), null)
  assert.equal(encryptOrNull(''), null)
  assert.equal(decryptOrNull(null), null)
  assert.equal(decryptOrNull(''), null)
})

test('şifrələnmiş mətn açıq mətni SAXLAMIR', () => {
  const fin = '5AB2CD1'
  assert.ok(!encrypt(fin).includes(fin))
})
