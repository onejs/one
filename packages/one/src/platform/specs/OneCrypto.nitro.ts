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
  // aes-gcm seal and open for One.Crypto's aes api. inputs are whole exact
  // buffers, snapshotted synchronously like digest, then processed on the
  // nitro thread pool. seal returns ciphertext with the tag appended (on
  // apple the tag is always 16 bytes, as in expo-crypto); open takes that
  // form and throws when the tag does not verify.
  aesEncrypt(
    key: ArrayBuffer,
    iv: ArrayBuffer,
    plaintext: ArrayBuffer,
    additionalData: ArrayBuffer | undefined,
    tagLength: number
  ): Promise<ArrayBuffer>
  aesDecrypt(
    key: ArrayBuffer,
    iv: ArrayBuffer,
    ciphertext: ArrayBuffer,
    additionalData: ArrayBuffer | undefined,
    tagLength: number
  ): Promise<ArrayBuffer>
}
