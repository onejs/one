// expo-crypto's digest and AES shapes: algorithm and encoding values are
// Expo's strings verbatim so data hashed or sealed there verifies here.

export type DigestAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
export type DigestEncoding = 'hex' | 'base64'

export interface DigestStringOptions {
  encoding?: DigestEncoding
}

/** string input to the AES api is base64, as in expo-crypto */
export type BinaryInput = string | Uint8Array | ArrayBuffer

export type AESKeySize = 128 | 192 | 256

export type GCMNonceParam = { length?: number } | { bytes: BinaryInput }

export interface AESEncryptOptions {
  additionalData?: BinaryInput
  nonce?: GCMNonceParam
  /**
   * authentication tag length in bytes: 16, 15, 14, 13, 12, 8 or 4. on apple
   * platforms the tag is always 16 bytes, as in expo-crypto.
   */
  tagLength?: number
}

export interface AESDecryptOptions {
  additionalData?: BinaryInput
  output?: 'base64' | 'bytes'
}

export interface AESSealedDataConfig {
  ivLength?: number
  tagLength?: number
}

export interface Crypto {
  /** digest of bytes, as an ArrayBuffer */
  digest(algorithm: DigestAlgorithm, data: BufferSource): Promise<ArrayBuffer>
  /** digest of a utf-8 string, hex by default */
  digestString(
    algorithm: DigestAlgorithm,
    data: string,
    options?: DigestStringOptions
  ): Promise<string>
  aesEncrypt(
    plaintext: BinaryInput,
    key: import('./aes').AESEncryptionKey,
    options?: AESEncryptOptions
  ): Promise<import('./aes').AESSealedData>
  aesDecrypt(
    sealedData: import('./aes').AESSealedData,
    key: import('./aes').AESEncryptionKey,
    options: AESDecryptOptions & { output: 'base64' }
  ): Promise<string>
  aesDecrypt(
    sealedData: import('./aes').AESSealedData,
    key: import('./aes').AESEncryptionKey,
    options?: AESDecryptOptions
  ): Promise<Uint8Array<ArrayBuffer>>
}

export type CryptoApi = Crypto
