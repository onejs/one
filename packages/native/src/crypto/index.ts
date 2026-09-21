import {
  assertByteCount,
  fillRandomValues,
  formatUuidV4,
  installCryptoPolyfill,
  MAX_RANDOM_BYTES,
  type RandomBytesSource,
} from './random'

export { fillRandomValues, formatUuidV4, installCryptoPolyfill, MAX_RANDOM_BYTES }
export type { RandomBytesSource }

// web entry. same shape as the native entry, but the byte source is the
// platform crypto itself: every browser One targets already implements
// getRandomValues, so installCrypto below is a no-op in practice and only
// fills genuinely missing pieces.
export function isSecureRandomAvailable(): boolean {
  return typeof globalThis.crypto?.getRandomValues === 'function'
}

function webSource(count: number): Uint8Array {
  assertByteCount(count)
  const getRandomValues = globalThis.crypto?.getRandomValues
  if (typeof getRandomValues !== 'function') {
    throw new Error('secure random: web crypto is unavailable in this browser.')
  }
  const out = new Uint8Array(count)
  getRandomValues.call(globalThis.crypto, out)
  return out
}

const source: RandomBytesSource = (count: number) => webSource(count)

export function getSecureRandomBytes(count: number): Uint8Array {
  return source(count)
}

export function installCrypto(): void {
  installCryptoPolyfill(source)
}
