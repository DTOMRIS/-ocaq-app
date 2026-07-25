import { timingSafeEqual } from 'node:crypto'

export const DK_PROVISIONING_SOURCE = 'dk_provisioning'

export function isValidProvisioningSecret(authorization: string | null, expectedSecret: string | undefined) {
  if (!authorization?.startsWith('Bearer ') || !expectedSecret) return false
  const supplied = authorization.slice('Bearer '.length)
  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expectedSecret)
  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer)
}

export function normalizeTenantSlug(value: unknown) {
  if (typeof value !== 'string') return null
  const slug = value.trim().toLowerCase()
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 ? slug : null
}

export function normalizeProvisioningEmail(value: unknown) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return /^\S+@\S+\.\S+$/.test(email) && email.length <= 254 ? email : null
}
