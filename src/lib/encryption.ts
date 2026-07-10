import crypto from 'crypto'

// ENCRYPTION_KEY yaratmaq: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
// Lazy + fail-fast: prod-da açar yoxdursa THROW (səssiz sıfır-açar YOX).
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY təyin olunmayıb və ya 64 hex simvol deyil — həssas sahələr (FIN/IBAN) şifrələnə bilməz. Vercel env-də təyin edin.')
    }
    console.warn('[encryption] ENCRYPTION_KEY yoxdur — dev fallback istifadə olunur (PROD-da TƏHLÜKƏSİZ DEYİL).')
    return Buffer.from('0'.repeat(64), 'hex')
  }
  return Buffer.from(hex, 'hex')
}

const ALGO = 'aes-256-gcm'
const IV_LEN = 16
const TAG_LEN = 16

export function encrypt(plaintext: string): string {
  const KEY = getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const KEY = getKey()
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

export const decryptOrNull = (v: string | null | undefined) => {
  if (!v) return null
  try { return decrypt(v) } catch { return null } // oxumada çökmə yox; yazmada (encrypt) hələ də fail-fast
}
