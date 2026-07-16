import crypto from 'crypto'

const TOKEN_BYTES = 32

export function createOneTimeToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

export function hashOneTimeToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

// Köhnə qeydlər tokeni açıq saxlayırdı. Keçid dövründə əvvəl hash-i,
// sonra köhnə formatı yoxlayırıq; yeni qeydlər yalnız hash kimi yazılır.
export function oneTimeTokenCandidates(token: string) {
  return [hashOneTimeToken(token), token]
}
