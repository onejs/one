import { base64ToBytes, bytesToBase64, bytesToHex, concatBytes, exactBytes, hexToBytes } from './bytes'
import type {
  AESDecryptOptions,
  AESEncryptOptions,
  AESKeySize,
  AESSealedDataConfig,
  BinaryInput,
} from './types'

export type { AESDecryptOptions, AESEncryptOptions, AESKeySize, AESSealedDataConfig, BinaryInput }

// expo-crypto's AES-GCM api over an injected engine: native is the shared
// C++ hybrid object, web is SubtleCrypto. seal returns ciphertext with the
// tag appended; open takes that form. everything else (key and sealed-data
// handling, encodings, validation) is shared here so both entries behave
// identically and the logic unit-tests in node.
export interface AesEngine {
  seal(
    key: Uint8Array<ArrayBuffer>,
    iv: Uint8Array<ArrayBuffer>,
    plaintext: Uint8Array<ArrayBuffer>,
    additionalData: Uint8Array<ArrayBuffer> | undefined,
    tagLength: number
  ): Promise<Uint8Array<ArrayBuffer>>
  open(
    key: Uint8Array<ArrayBuffer>,
    iv: Uint8Array<ArrayBuffer>,
    ciphertextWithTag: Uint8Array<ArrayBuffer>,
    additionalData: Uint8Array<ArrayBuffer> | undefined,
    tagLength: number
  ): Promise<Uint8Array<ArrayBuffer>>
  random(bytes: Uint8Array<ArrayBuffer>): void
}

const KEY_SIZES: readonly AESKeySize[] = [128, 192, 256]
const TAG_LENGTHS: readonly number[] = [16, 15, 14, 13, 12, 8, 4]
const DEFAULT_IV_LENGTH = 12
const DEFAULT_TAG_LENGTH = 16

export function assertTagLength(tagLength: number, verb: string): void {
  if (!TAG_LENGTHS.includes(tagLength)) {
    throw new Error(`${verb}: tagLength must be one of: ${TAG_LENGTHS.join(', ')}`)
  }
}

export function toBytes(input: BinaryInput, verb: string): Uint8Array<ArrayBuffer> {
  if (typeof input === 'string') return base64ToBytes(input, verb)
  if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0))
  if (ArrayBuffer.isView(input) && input.buffer instanceof ArrayBuffer) {
    return exactBytes(new Uint8Array(input.buffer, input.byteOffset, input.byteLength))
  }
  throw new TypeError(`${verb}: expected a base64 string, Uint8Array, or ArrayBuffer`)
}

type SealedParts = {
  iv: Uint8Array<ArrayBuffer>
  ciphertext: Uint8Array<ArrayBuffer>
  tag: Uint8Array<ArrayBuffer>
}

const sealedParts = new WeakMap<object, SealedParts>()
const keyBytes = new WeakMap<object, Uint8Array<ArrayBuffer>>()

function encodeParts(bytes: Uint8Array, encoding: 'base64' | 'bytes' | undefined) {
  return encoding === 'base64' ? bytesToBase64(bytes) : exactBytes(bytes)
}

export function createAesApi(engine: AesEngine) {
  class AESEncryptionKey {
    readonly size: AESKeySize

    // construct through generate or import; direct construction still
    // validates, so a key object can never hold a non-AES length.
    constructor(bytes: Uint8Array<ArrayBuffer>) {
      if (!KEY_SIZES.includes((bytes.length * 8) as AESKeySize)) {
        throw new Error(
          `Crypto.AESEncryptionKey: key must be 128, 192, or 256 bits, got ${bytes.length * 8}`
        )
      }
      this.size = (bytes.length * 8) as AESKeySize
      keyBytes.set(this, exactBytes(bytes))
    }

    static async generate(size: AESKeySize = 256): Promise<AESEncryptionKey> {
      if (!KEY_SIZES.includes(size)) {
        throw new Error(`Crypto.AESEncryptionKey.generate: size must be one of: ${KEY_SIZES.join(', ')}`)
      }
      const bytes = new Uint8Array(size / 8)
      engine.random(bytes)
      return new AESEncryptionKey(bytes)
    }

    static async import(bytes: Uint8Array): Promise<AESEncryptionKey>
    static async import(encoded: string, encoding: 'hex' | 'base64'): Promise<AESEncryptionKey>
    static async import(
      input: Uint8Array | string,
      encoding?: 'hex' | 'base64'
    ): Promise<AESEncryptionKey> {
      const verb = 'Crypto.AESEncryptionKey.import'
      let bytes: Uint8Array<ArrayBuffer>
      if (typeof input === 'string') {
        if (encoding === 'hex') bytes = hexToBytes(input, verb)
        else if (encoding === 'base64') bytes = base64ToBytes(input, verb)
        else throw new Error(`${verb}: encoding must be 'hex' or 'base64'`)
      } else if (input instanceof Uint8Array) {
        bytes = exactBytes(input)
      } else {
        throw new TypeError(`${verb}: expected bytes or an encoded string`)
      }
      if (!KEY_SIZES.includes((bytes.length * 8) as AESKeySize)) {
        throw new Error(`${verb}: key must be 128, 192, or 256 bits, got ${bytes.length * 8}`)
      }
      return new AESEncryptionKey(bytes)
    }

    async bytes(): Promise<Uint8Array<ArrayBuffer>> {
      return exactBytes(keyBytes.get(this)!)
    }

    async encoded(encoding: 'hex' | 'base64'): Promise<string> {
      const bytes = keyBytes.get(this)!
      if (encoding === 'hex') return bytesToHex(bytes)
      if (encoding === 'base64') return bytesToBase64(bytes)
      throw new Error(`Crypto.AESEncryptionKey.encoded: encoding must be 'hex' or 'base64'`)
    }
  }

  class AESSealedData {
    // construct through fromCombined or fromParts. direct construction still
    // validates, so sealed data can never carry an empty iv or a tag gcm
    // does not allow.
    constructor(parts: SealedParts) {
      if (parts.iv.length === 0) throw new Error('Crypto.AESSealedData: iv must not be empty')
      assertTagLength(parts.tag.length, 'Crypto.AESSealedData')
      sealedParts.set(this, parts)
    }

    static fromCombined(combined: BinaryInput, config: AESSealedDataConfig = {}): AESSealedData {
      const verb = 'Crypto.AESSealedData.fromCombined'
      const ivLength = config.ivLength ?? DEFAULT_IV_LENGTH
      const tagLength = config.tagLength ?? DEFAULT_TAG_LENGTH
      assertTagLength(tagLength, verb)
      if (!Number.isInteger(ivLength) || ivLength <= 0) {
        throw new Error(`${verb}: ivLength must be a positive integer`)
      }
      const bytes = toBytes(combined, verb)
      if (bytes.length < ivLength + tagLength) {
        throw new Error(`${verb}: combined data is shorter than its iv and tag`)
      }
      return new AESSealedData({
        iv: exactBytes(bytes.subarray(0, ivLength)),
        ciphertext: exactBytes(bytes.subarray(ivLength, bytes.length - tagLength)),
        tag: exactBytes(bytes.subarray(bytes.length - tagLength)),
      })
    }

    static fromParts(iv: BinaryInput, ciphertext: BinaryInput, tag: BinaryInput): AESSealedData
    static fromParts(
      iv: BinaryInput,
      ciphertextWithTag: BinaryInput,
      tagLength?: number
    ): AESSealedData
    static fromParts(
      ivInput: BinaryInput,
      ciphertextInput: BinaryInput,
      tagOrLength?: BinaryInput | number
    ): AESSealedData {
      const verb = 'Crypto.AESSealedData.fromParts'
      const iv = toBytes(ivInput, verb)
      const ciphertext = toBytes(ciphertextInput, verb)
      if (tagOrLength === undefined || typeof tagOrLength === 'number') {
        const tagLength = tagOrLength ?? DEFAULT_TAG_LENGTH
        assertTagLength(tagLength, verb)
        if (ciphertext.length < tagLength) {
          throw new Error(`${verb}: ciphertext is shorter than its tag`)
        }
        return new AESSealedData({
          iv,
          ciphertext: exactBytes(ciphertext.subarray(0, ciphertext.length - tagLength)),
          tag: exactBytes(ciphertext.subarray(ciphertext.length - tagLength)),
        })
      }
      const tag = toBytes(tagOrLength, verb)
      assertTagLength(tag.length, verb)
      return new AESSealedData({ iv, ciphertext, tag })
    }

    // internal: aesEncrypt builds sealed data from engine output without
    // going through the public parsers (which would just re-split it).
    static fromSeal(iv: Uint8Array<ArrayBuffer>, ciphertextWithTag: Uint8Array, tagLength: number) {
      return new AESSealedData({
        iv,
        ciphertext: exactBytes(ciphertextWithTag.subarray(0, ciphertextWithTag.length - tagLength)),
        tag: exactBytes(ciphertextWithTag.subarray(ciphertextWithTag.length - tagLength)),
      })
    }

    get ivSize(): number {
      return sealedParts.get(this)!.iv.length
    }

    get tagSize(): number {
      return sealedParts.get(this)!.tag.length
    }

    get combinedSize(): number {
      const parts = sealedParts.get(this)!
      return parts.iv.length + parts.ciphertext.length + parts.tag.length
    }

    async iv(encoding: 'base64'): Promise<string>
    async iv(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>
    async iv(encoding?: 'base64' | 'bytes') {
      return encodeParts(sealedParts.get(this)!.iv, encoding)
    }

    async tag(encoding: 'base64'): Promise<string>
    async tag(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>
    async tag(encoding?: 'base64' | 'bytes') {
      return encodeParts(sealedParts.get(this)!.tag, encoding)
    }

    async ciphertext(options: {
      encoding: 'base64'
      includeTag: boolean
    }): Promise<string>
    async ciphertext(options: {
      encoding: 'bytes'
      includeTag: boolean
    }): Promise<Uint8Array<ArrayBuffer>>
    async ciphertext(options: { encoding: 'base64' | 'bytes'; includeTag: boolean }) {
      const parts = sealedParts.get(this)!
      const bytes = options?.includeTag
        ? concatBytes([parts.ciphertext, parts.tag])
        : parts.ciphertext
      return encodeParts(bytes, options?.encoding)
    }

    async combined(encoding: 'base64'): Promise<string>
    async combined(encoding?: 'bytes'): Promise<Uint8Array<ArrayBuffer>>
    async combined(encoding?: 'base64' | 'bytes') {
      const parts = sealedParts.get(this)!
      return encodeParts(concatBytes([parts.iv, parts.ciphertext, parts.tag]), encoding)
    }
  }

  async function keyMaterial(key: AESEncryptionKey, verb: string): Promise<Uint8Array<ArrayBuffer>> {
    const own = keyBytes.get(key)
    if (own) return exactBytes(own)
    // a key minted by the other entry in the same bundle: read it back
    // through its public shape instead of rejecting a foreign instance.
    if (key && typeof key.bytes === 'function') return exactBytes(await key.bytes())
    throw new TypeError(`${verb}: expected an AESEncryptionKey`)
  }

  async function partsOf(sealed: AESSealedData, verb: string): Promise<SealedParts> {
    const own = sealedParts.get(sealed)
    if (own) {
      return {
        iv: exactBytes(own.iv),
        ciphertext: exactBytes(own.ciphertext),
        tag: exactBytes(own.tag),
      }
    }
    if (sealed && typeof sealed.iv === 'function' && typeof sealed.combined === 'function') {
      const iv = exactBytes(await sealed.iv())
      const tag = exactBytes(await sealed.tag())
      const ciphertext = exactBytes(await sealed.ciphertext({ encoding: 'bytes', includeTag: false }))
      return { iv, ciphertext, tag }
    }
    throw new TypeError(`${verb}: expected an AESSealedData`)
  }

  async function aesEncrypt(
    plaintext: BinaryInput,
    key: AESEncryptionKey,
    options: AESEncryptOptions = {}
  ): Promise<AESSealedData> {
    const verb = 'Crypto.aesEncrypt'
    const tagLength = options.tagLength ?? DEFAULT_TAG_LENGTH
    assertTagLength(tagLength, verb)
    let iv: Uint8Array<ArrayBuffer>
    const nonce = options.nonce
    if (nonce && 'bytes' in nonce && nonce.bytes !== undefined) {
      iv = toBytes(nonce.bytes, verb)
      if (iv.length === 0) throw new Error(`${verb}: nonce bytes must not be empty`)
    } else {
      const length = nonce && 'length' in nonce && nonce.length !== undefined ? nonce.length : DEFAULT_IV_LENGTH
      if (!Number.isInteger(length) || length <= 0) {
        throw new Error(`${verb}: nonce length must be a positive integer`)
      }
      iv = new Uint8Array(length)
      engine.random(iv)
    }
    const additionalData =
      options.additionalData === undefined ? undefined : toBytes(options.additionalData, verb)
    const plainBytes = toBytes(plaintext, verb)
    const sealed = await engine.seal(
      await keyMaterial(key, verb),
      iv,
      plainBytes,
      additionalData,
      tagLength
    )
    // the apple engine always seals with a 16-byte tag, as expo-crypto does
    // there: gcm ciphertext is plaintext-sized, so the sealed length says
    // which tag the platform actually produced.
    const actualTag = sealed.length - plainBytes.length
    return AESSealedData.fromSeal(iv, sealed, actualTag > 0 ? actualTag : tagLength)
  }

  async function aesDecrypt(
    sealedData: AESSealedData,
    key: AESEncryptionKey,
    options: AESDecryptOptions & { output: 'base64' }
  ): Promise<string>
  async function aesDecrypt(
    sealedData: AESSealedData,
    key: AESEncryptionKey,
    options?: AESDecryptOptions
  ): Promise<Uint8Array<ArrayBuffer>>
  async function aesDecrypt(
    sealedData: AESSealedData,
    key: AESEncryptionKey,
    options: AESDecryptOptions = {}
  ): Promise<string | Uint8Array<ArrayBuffer>> {
    const verb = 'Crypto.aesDecrypt'
    const parts = await partsOf(sealedData, verb)
    const additionalData =
      options.additionalData === undefined ? undefined : toBytes(options.additionalData, verb)
    const plaintext = await engine.open(
      await keyMaterial(key, verb),
      parts.iv,
      concatBytes([parts.ciphertext, parts.tag]),
      additionalData,
      parts.tag.length
    )
    return options.output === 'base64' ? bytesToBase64(plaintext) : plaintext
  }

  return { AESEncryptionKey, AESSealedData, aesEncrypt, aesDecrypt }
}

export type AESEncryptionKey = InstanceType<ReturnType<typeof createAesApi>['AESEncryptionKey']>
export type AESSealedData = InstanceType<ReturnType<typeof createAesApi>['AESSealedData']>
