import { formatUuidV4, installCryptoPolyfill, type RandomSource } from './random'

// web entry. same shape as the native entry, but the random source is the
// platform crypto itself: installCrypto only fills genuinely missing
// pieces, so a browser's crypto is never replaced.
function fill(bytes: Uint8Array<ArrayBuffer>): void {
  const getRandomValues = globalThis.crypto?.getRandomValues
  if (typeof getRandomValues !== 'function') {
    throw new Error('secure random: web crypto is unavailable in this browser.')
  }
  getRandomValues.call(globalThis.crypto, bytes)
}

const source: RandomSource = {
  fill,
  randomUUID() {
    const bytes = new Uint8Array(16)
    fill(bytes)
    return formatUuidV4(bytes)
  },
}

export function installCrypto(): void {
  installCryptoPolyfill(source)
}
