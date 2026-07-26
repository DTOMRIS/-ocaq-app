import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardRedirectForRole, isLegacyMockRoute } from '../src/lib/dashboard-access'

test('staff cannot enter the OCAQ dashboard', () => {
  assert.equal(dashboardRedirectForRole('staff', '/dashboard'), '/login')
  for (const path of [
    '/dashboard/complaints',
    '/dashboard/bildirisler',
    '/dashboard/staff',
    '/dashboard/profile',
    '/dashboard/vardiya-liderliyi',
  ]) {
    assert.equal(dashboardRedirectForRole('staff', path), '/login')
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
    '/dashboard/promosyonlar',
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
    ['/admin/promosyonlar/yeni', '/dashboard'],
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
