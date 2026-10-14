import { bytesToBase64, bytesToHex, utf8Encode } from './bytes'
import { bufferSourceRange, type DigestSource } from './digest'
import type { DigestAlgorithm, DigestStringOptions } from './types'

// expo-crypto's digest contract over the shared digest source: algorithm
// names are Expo's strings, unknown ones throw at the js boundary on web and
// native alike, and digestString hashes the string's utf-8 bytes.
export const DIGEST_ALGORITHMS: readonly DigestAlgorithm[] = [
  'MD5',
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512',
]

export function assertDigestAlgorithm(algorithm: DigestAlgorithm, verb: string): void {
  if (!DIGEST_ALGORITHMS.includes(algorithm)) {
    throw new Error(
      `${verb}: unknown algorithm ${JSON.stringify(algorithm)}. Expected one of: ${DIGEST_ALGORITHMS.join(', ')}`
    )
  }
}

export function createDigestApi(source: DigestSource) {
  async function digest(algorithm: DigestAlgorithm, data: BufferSource): Promise<ArrayBuffer> {
    assertDigestAlgorithm(algorithm, 'Crypto.digest')
    const { buffer, offset, length } = bufferSourceRange(data, 'Crypto.digest')
    return source(algorithm, buffer, offset, length)
  }

  async function digestString(
    algorithm: DigestAlgorithm,
    data: string,
    options: DigestStringOptions = {}
  ): Promise<string> {
    assertDigestAlgorithm(algorithm, 'Crypto.digestString')
    if (typeof data !== 'string') {
      throw new TypeError('Crypto.digestString: data must be a string')
    }
    const encoding = options?.encoding ?? 'hex'
    if (encoding !== 'hex' && encoding !== 'base64') {
      throw new Error(`Crypto.digestString: encoding must be 'hex' or 'base64'`)
    }
    const bytes = utf8Encode(data)
    const hashed = new Uint8Array(await source(algorithm, bytes.buffer, 0, bytes.length))
    return encoding === 'base64' ? bytesToBase64(hashed) : bytesToHex(hashed)
  }

  return { digest, digestString }
}
