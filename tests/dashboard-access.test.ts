import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardRedirectForRole, isLegacyMockRoute } from '../src/lib/dashboard-access'

test('staff can only remain on the dashboard training landing and own profile', () => {
  assert.equal(dashboardRedirectForRole('staff', '/dashboard'), null)
  assert.equal(dashboardRedirectForRole('staff', '/dashboard/profile'), null)
  for (const path of [
    '/dashboard/complaints',
    '/dashboard/bildirisler',
    '/dashboard/staff',
    '/dashboard/vardiya-liderliyi',
  ]) {
    assert.equal(dashboardRedirectForRole('staff', path), '/dashboard')
  }
})

test('legacy mock routes never render as active modules', () => {
  for (const path of [
    '/dashboard/haccp',
    '/dashboard/kasa/history',
    '/dashboard/fire',
    '/dashboard/ekipman',
    '/dashboard/tahmin',
    '/dashboard/menu',
  ]) {
    assert.equal(isLegacyMockRoute(path), true)
    assert.equal(dashboardRedirectForRole('super_admin', path), '/dashboard')
  }
})

test('legacy admin mock pages redirect to canonical dashboard pages', () => {
  const redirects = new Map([
    ['/admin/filiallar', '/dashboard/branches'],
    ['/admin/filiallar/yeni', '/dashboard/branches'],
    ['/admin/personel/yeni', '/dashboard/staff'],
    ['/admin/ayarlar', '/dashboard/settings'],
    ['/admin/ekipman', '/dashboard'],
    ['/admin/menu/yeni', '/dashboard'],
    ['/admin/promosyonlar', '/dashboard/promosyonlar'],
  ])
  for (const [path, destination] of redirects) {
    assert.equal(dashboardRedirectForRole('super_admin', path), destination)
  }
})

test('only branch managers may open the checklist fill page', () => {
  assert.equal(dashboardRedirectForRole('branch_manager', '/dashboard/vardiya-checklist'), null)
  assert.equal(dashboardRedirectForRole('region_manager', '/dashboard/vardiya-checklist'), '/dashboard/checklists')
  assert.equal(dashboardRedirectForRole('super_admin', '/dashboard/vardiya-checklist'), '/dashboard/checklists')
})

test('management configuration routes cannot be opened by typing the URL', () => {
  assert.equal(dashboardRedirectForRole('region_manager', '/dashboard/settings'), '/dashboard')
  assert.equal(dashboardRedirectForRole('branch_manager', '/dashboard/branches'), '/dashboard')
  assert.equal(dashboardRedirectForRole('branch_manager', '/dashboard/regions'), '/dashboard')
  assert.equal(dashboardRedirectForRole('branch_manager', '/dashboard/team'), '/dashboard')
  assert.equal(dashboardRedirectForRole('region_manager', '/dashboard/team'), null)
  assert.equal(dashboardRedirectForRole('super_admin', '/dashboard/settings'), null)
})

// ── 12.09.2026 — canlı xəta: promosyonlar menyu sətri ölü idi ───────────────

test('PROMOSYONLAR açılır — nümunə siyahısında DEYİL', () => {
  // `page.tsx` bazadan oxuyur (migration 0024) və sidebar-da hər üç rola
  // görünür. Siyahıda qaldığı müddətdə menyu sətri tıklananda istifadəçi
  // sakitcə `/dashboard`-a atılırdı — modul var idi, heç kim aça bilmirdi.
  assert.equal(isLegacyMockRoute('/dashboard/promosyonlar'), false)
  for (const rol of ['super_admin', 'region_manager', 'branch_manager']) {
    assert.equal(dashboardRedirectForRole(rol, '/dashboard/promosyonlar'), null, rol)
  }
})

test('«Yeni promosiya» formu bağlanmır (prefiks tələsi)', () => {
  // `/admin/promosyonlar` re-export-dur → siyahıya yönləndirilir.
  // `/admin/promosyonlar/yeni` isə ƏSL formdur — prefiks uyğunluğu onu da
  // tuturdu və düymə ölü idi.
  assert.equal(dashboardRedirectForRole('super_admin', '/admin/promosyonlar'), '/dashboard/promosyonlar')
  assert.equal(dashboardRedirectForRole('super_admin', '/admin/promosyonlar/yeni'), null)
})

test('menyuda görünən HƏR sətir o rol üçün açılır — ölü sətir olmasın', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync('src/components/sidebar.tsx', 'utf8')
  const re = /\{ href: '([^']+)', icon: '[^']*', label: '([^']+)', roles: \[([^\]]*)\] \}/g
  let m: RegExpExecArray | null
  let yoxlanan = 0
  while ((m = re.exec(src)) !== null) {
    const [, href, label, rolMetn] = m
    for (const rol of rolMetn.split(',').map(x => x.trim().replace(/'/g, '')).filter(Boolean)) {
      assert.equal(dashboardRedirectForRole(rol, href), null,
        `«${label}» (${href}) ${rol} üçün menyuda görünür, amma yönləndirilir`)
      yoxlanan++
    }
  }
  assert.ok(yoxlanan > 40, `yalnız ${yoxlanan} yoxlandı — sidebar oxunmadı?`)
})
