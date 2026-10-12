import type { HybridObject } from 'react-native-nitro-modules'

// private native source for global crypto: secure random from the platform
// csprng, digest from CommonCrypto or java.security.MessageDigest. random
// methods are synchronous because getRandomValues and randomUUID are sync web
// apis. fillRandomBytes writes `length` bytes into `buffer` from `offset` in
// place and throws on a range outside it; it never returns weak bytes.
export interface OneCrypto extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  fillRandomBytes(buffer: ArrayBuffer, offset: number, length: number): void
  randomUUID(): string
  // snapshots the range synchronously, then hashes on the nitro thread pool.
  digest(
    algorithm: string,
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): Promise<ArrayBuffer>
}
