import crypto from 'crypto'

const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '0'.repeat(64), 'hex')
// ENCRYPTION_KEY yaratmaq: node -e "console.log(crypto.randomBytes(32).toString('hex'))"

const ALGO = 'aes-256-gcm'
const IV_LEN = 16
const TAG_LEN = 16

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv  = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const enc = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

// Nullable versiyalar (DB-dən null gələ bilər)
export const encryptOrNull = (v: string | null | undefined) =>
  v ? encrypt(v) : null

export const decryptOrNull = (v: string | null | undefined) =>
  v ? decrypt(v) : null
