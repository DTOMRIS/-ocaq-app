import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isValidProvisioningSecret,
  normalizeProvisioningEmail,
  normalizeTenantSlug,
} from '../src/lib/dk-provisioning'

test('DK provisioning bearer secret is compared exactly', () => {
  assert.equal(isValidProvisioningSecret('Bearer strong-secret', 'strong-secret'), true)
  assert.equal(isValidProvisioningSecret('Bearer wrong-secret', 'strong-secret'), false)
  assert.equal(isValidProvisioningSecret(null, 'strong-secret'), false)
  assert.equal(isValidProvisioningSecret('Bearer strong-secret', undefined), false)
})

test('DK provisioning normalizes email and accepts safe tenant slugs', () => {
  assert.equal(normalizeProvisioningEmail(' OWNER@Example.com '), 'owner@example.com')
  assert.equal(normalizeProvisioningEmail('not-an-email'), null)
  assert.equal(normalizeTenantSlug(' My-Restaurant '), 'my-restaurant')
  assert.equal(normalizeTenantSlug('../restaurant'), null)
  assert.equal(normalizeTenantSlug('two--hyphens'), null)
})
