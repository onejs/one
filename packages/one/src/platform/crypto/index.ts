import { createAesApi } from './aes'
import { createDigestApi } from './digest-api'
import { formatUuidV4, installCryptoPolyfill, type RandomSource } from './random'
import type { Crypto as CryptoApi } from './types'
import { webAesEngine, webDigestSource } from './web'

export type {
  AESDecryptOptions,
  AESEncryptOptions,
  AESKeySize,
  AESSealedDataConfig,
  BinaryInput,
  CryptoApi,
  DigestAlgorithm,
  DigestEncoding,
  DigestStringOptions,
  GCMNonceParam,
} from './types'
export type { AESEncryptionKey as AESEncryptionKeyType, AESSealedData as AESSealedDataType } from './aes'

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

const aes = createAesApi(webAesEngine)
const digestApi = createDigestApi(webDigestSource)

export const AESEncryptionKey = aes.AESEncryptionKey
export const AESSealedData = aes.AESSealedData

export const Crypto: CryptoApi = Object.freeze({
  digest: digestApi.digest,
  digestString: digestApi.digestString,
  aesEncrypt: aes.aesEncrypt,
  aesDecrypt: aes.aesDecrypt,
})
