const LOCK_PASSWORD_MIN_LENGTH = 6
const LOCK_PASSWORD_MAX_LENGTH = 64
const LOCK_PASSWORD_ITERATIONS = 210_000

const encoder = new TextEncoder()

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const base64ToBytes = (value: string) => {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const requireCrypto = () => {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error('Secure browser cryptography is unavailable')
  }
  return globalThis.crypto
}

export const validateLockPassword = (password: string) =>
  password.length >= LOCK_PASSWORD_MIN_LENGTH &&
  password.length <= LOCK_PASSWORD_MAX_LENGTH

export const createLockSalt = () => {
  const salt = new Uint8Array(16)
  requireCrypto().getRandomValues(salt)
  return bytesToBase64(salt)
}

export const deriveLockVerifier = async(
  password: string,
  salt: string,
  iterations = LOCK_PASSWORD_ITERATIONS
) => {
  const crypto = requireCrypto()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: base64ToBytes(salt),
      iterations
    },
    key,
    256
  )
  return bytesToBase64(new Uint8Array(bits))
}

export const lockVerifierMatches = async(
  password: string,
  salt: string,
  verifier: string,
  iterations: number
) => {
  const candidate = await deriveLockVerifier(password, salt, iterations)
  if (candidate.length !== verifier.length) return false

  let difference = 0
  for (let index = 0; index < candidate.length; index += 1) {
    difference |= candidate.charCodeAt(index) ^ verifier.charCodeAt(index)
  }
  return difference === 0
}

export { LOCK_PASSWORD_ITERATIONS }
