import { createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, hasMock } = vi.hoisted(() => ({ getMock: vi.fn(), hasMock: vi.fn() }))

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: getMock, hasHybridObject: hasMock },
}))

import {
  AESEncryptionKey as WebKey,
  AESSealedData as WebSealed,
  Crypto as WebCrypto,
} from '../src/platform/crypto/index'

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex')
const unhex = (text: string) => new Uint8Array(Buffer.from(text, 'hex'))

async function loadNative() {
  vi.resetModules()
  return await import('../src/platform/crypto/index.native')
}

beforeEach(() => {
  getMock.mockReset()
  hasMock.mockReset()
  hasMock.mockReturnValue(true)
})

describe('AESEncryptionKey', () => {
  it('generates, encodes and imports every Expo key size', async () => {
    for (const size of [128, 192, 256] as const) {
      const key = await WebKey.generate(size)
      expect(key.size).toBe(size)
      const bytes = await key.bytes()
      expect(bytes.length).toBe(size / 8)
      const fromBytes = await WebKey.import(bytes)
      expect(await fromBytes.encoded('hex')).toBe(await key.encoded('hex'))
      const fromHex = await WebKey.import(await key.encoded('hex'), 'hex')
      expect(await fromHex.encoded('base64')).toBe(await key.encoded('base64'))
      const fromBase64 = await WebKey.import(await key.encoded('base64'), 'base64')
      expect(hex(await fromBase64.bytes())).toBe(hex(bytes))
    }
    expect((await WebKey.generate()).size).toBe(256)
  })

  it('returns copies, so mutating exported bytes cannot change the key', async () => {
    const key = await WebKey.import(new Uint8Array(16).fill(7))
    const bytes = await key.bytes()
    bytes.fill(0)
    expect((await key.bytes())[0]).toBe(7)
  })

  it('rejects bad sizes and encodings', async () => {
    await expect(WebKey.generate(64 as never)).rejects.toThrow('size must be one of')
    await expect(WebKey.import(new Uint8Array(10))).rejects.toThrow('128, 192, or 256 bits')
    await expect(WebKey.import('zz', 'hex')).rejects.toThrow('hex string')
    await expect(WebKey.import('not base64!', 'base64')).rejects.toThrow('base64 string')
    await expect(WebKey.import('abcd', 'utf8' as never)).rejects.toThrow("'hex' or 'base64'")
  })
})

describe('aesEncrypt / aesDecrypt (web engine, checked against node:crypto)', () => {
  it('matches the NIST GCM vector with AAD', async () => {
    const key = await WebKey.import(unhex('feffe9928665731c6d6a8f9467308308'))
    const sealed = await WebCrypto.aesEncrypt(
      unhex(
        'd9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39'
      ),
      key,
      {
        nonce: { bytes: unhex('cafebabefacedbaddecaf888') },
        additionalData: unhex('feedfacedeadbeeffeedfacedeadbeefabaddad2'),
      }
    )
    expect(hex(await sealed.combined())).toBe(
      'cafebabefacedbaddecaf888' +
        '42831ec2217774244b7221b784d0d49ce3aa212f2c02a4e035c17e2329aca12e21d514b25466931c7d8f6a5aac84aa051ba30b396a0aac973d58e0915bc94fbc3221a5db94fae95ae7121a47'
    )
    expect(sealed.ivSize).toBe(12)
    expect(sealed.tagSize).toBe(16)
    expect(sealed.combinedSize).toBe(12 + 60 + 16)
  })

  it('round-trips base64 strings, random nonces and output encodings', async () => {
    const key = await WebKey.generate()
    const plaintext = Buffer.from('Hello, world!', 'utf8').toString('base64')
    const sealed = await WebCrypto.aesEncrypt(plaintext, key)
    const second = await WebCrypto.aesEncrypt(plaintext, key)
    expect(hex(await sealed.iv())).not.toBe(hex(await second.iv()))
    expect(await WebCrypto.aesDecrypt(sealed, key, { output: 'base64' })).toBe(plaintext)
    const bytes = await WebCrypto.aesDecrypt(sealed, key)
    expect(Buffer.from(bytes).toString('utf8')).toBe('Hello, world!')
  })

  it('sealed data from One opens with node:crypto and the reverse', async () => {
    const rawKey = unhex('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f')
    const key = await WebKey.import(rawKey)
    const sealed = await WebCrypto.aesEncrypt(new Uint8Array([1, 2, 3, 4]), key)
    const combined = Buffer.from(await sealed.combined())
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(rawKey), combined.subarray(0, 12))
    decipher.setAuthTag(combined.subarray(combined.length - 16))
    const opened = Buffer.concat([
      decipher.update(combined.subarray(12, combined.length - 16)),
      decipher.final(),
    ])
    expect([...opened]).toEqual([1, 2, 3, 4])

    const cipher = createCipheriv('aes-256-gcm', Buffer.from(rawKey), Buffer.alloc(12, 9))
    const nodeSealed = Buffer.concat([cipher.update(Buffer.from([9, 8, 7])), cipher.final()])
    const fromNode = WebSealed.fromCombined(
      new Uint8Array(Buffer.concat([Buffer.alloc(12, 9), nodeSealed, cipher.getAuthTag()]))
    )
    expect([...(await WebCrypto.aesDecrypt(fromNode, key))]).toEqual([9, 8, 7])
  })

  it('fromParts accepts a separate tag or a combined ciphertext with tag length', async () => {
    const key = await WebKey.generate()
    const sealed = await WebCrypto.aesEncrypt(new Uint8Array([5, 6]), key, { tagLength: 12 })
    expect(sealed.tagSize).toBe(12)
    const separate = WebSealed.fromParts(
      await sealed.iv(),
      await sealed.ciphertext({ encoding: 'bytes', includeTag: false }),
      await sealed.tag()
    )
    const combinedTail = WebSealed.fromParts(
      await sealed.iv('base64'),
      await sealed.ciphertext({ encoding: 'base64', includeTag: true }),
      12
    )
    for (const candidate of [separate, combinedTail]) {
      expect([...(await WebCrypto.aesDecrypt(candidate, key))]).toEqual([5, 6])
      expect(candidate.combinedSize).toBe(sealed.combinedSize)
    }
  })

  it('rejects tampered data, wrong keys, bad tag lengths and short inputs', async () => {
    const key = await WebKey.generate()
    const other = await WebKey.generate()
    const sealed = await WebCrypto.aesEncrypt(new Uint8Array([1]), key)
    const combined = await sealed.combined()
    combined[12] ^= 1
    await expect(WebCrypto.aesDecrypt(WebSealed.fromCombined(combined), key)).rejects.toThrow(
      'authentication failed'
    )
    await expect(WebCrypto.aesDecrypt(sealed, other)).rejects.toThrow('authentication failed')
    await expect(WebCrypto.aesEncrypt(new Uint8Array([1]), key, { tagLength: 7 })).rejects.toThrow(
      'tagLength must be one of'
    )
    expect(() => WebSealed.fromCombined(new Uint8Array(10))).toThrow('shorter than its iv and tag')
    expect(() => WebSealed.fromParts(new Uint8Array(12), new Uint8Array(3), 16)).toThrow(
      'shorter than its tag'
    )
  })
})

describe('digest and digestString', () => {
  it('hashes bytes and utf-8 strings in hex and base64', async () => {
    const hashed = new Uint8Array(
      await WebCrypto.digest('SHA-256', new Uint8Array([97, 98, 99]).buffer)
    )
    expect(hex(hashed)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await WebCrypto.digestString('SHA-1', 'abc')).toBe(
      'a9993e364706816aba3e25717850c26c9cd0d89d'
    )
    expect(await WebCrypto.digestString('SHA-256', 'GitHub stars are neat 🌟')).toBe(
      createHash('sha256').update('GitHub stars are neat 🌟', 'utf8').digest('hex')
    )
    expect(await WebCrypto.digestString('SHA-512', 'abc', { encoding: 'base64' })).toBe(
      createHash('sha512').update('abc').digest('base64')
    )
    // a lone surrogate hashes as the replacement character, like TextEncoder
    expect(await WebCrypto.digestString('SHA-256', '\ud800')).toBe(
      createHash('sha256').update(new TextEncoder().encode('\ud800')).digest('hex')
    )
  })

  it('honors BufferSource ranges', async () => {
    const bytes = new Uint8Array([255, 97, 98, 99, 254])
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    expect(hex(new Uint8Array(await WebCrypto.digest('SHA-256', bytes.subarray(1, 4))))).toBe(
      expected
    )
    expect(
      hex(new Uint8Array(await WebCrypto.digest('SHA-256', new DataView(bytes.buffer, 1, 3))))
    ).toBe(expected)
  })

  it('MD5 on web asks for a native build; unknown algorithms throw', async () => {
    await expect(WebCrypto.digest('MD5', new ArrayBuffer(0))).rejects.toThrow(
      'MD5 needs an iOS or Android build'
    )
    await expect(WebCrypto.digest('SHA-224' as never, new ArrayBuffer(0))).rejects.toThrow(
      'unknown algorithm'
    )
    await expect(WebCrypto.digestString('SHA-256', 'abc', { encoding: 'utf8' as never })).rejects.toThrow(
      "'hex' or 'base64'"
    )
  })

  it('the native entry dispatches digest and AES with exact buffers', async () => {
    const nativeModule = {
      fillRandomBytes: vi.fn((buffer: ArrayBuffer, offset: number, length: number) => {
        new Uint8Array(buffer, offset, length).fill(3)
      }),
      randomUUID: vi.fn(() => 'uuid'),
      digest: vi.fn(
        async (algorithm: string, buffer: ArrayBuffer, offset: number, length: number) => {
          const name = algorithm === 'MD5' ? 'md5' : algorithm.toLowerCase().replace('-', '')
          const out = createHash(name)
            .update(new Uint8Array(buffer, offset, length))
            .digest()
          return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
        }
      ),
      aesEncrypt: vi.fn(
        async (
          key: ArrayBuffer,
          iv: ArrayBuffer,
          plaintext: ArrayBuffer,
          _aad: ArrayBuffer | undefined,
          tagLength: number
        ) => {
          const cipher = createCipheriv(
            `aes-${key.byteLength * 8}-gcm`,
            new Uint8Array(key),
            new Uint8Array(iv),
            { authTagLength: tagLength }
          )
          const sealed = Buffer.concat([
            cipher.update(new Uint8Array(plaintext)),
            cipher.final(),
            cipher.getAuthTag(),
          ])
          return sealed.buffer.slice(sealed.byteOffset, sealed.byteOffset + sealed.byteLength)
        }
      ),
      aesDecrypt: vi.fn(
        async (
          key: ArrayBuffer,
          iv: ArrayBuffer,
          ciphertext: ArrayBuffer,
          _aad: ArrayBuffer | undefined,
          tagLength: number
        ) => {
          const all = Buffer.from(new Uint8Array(ciphertext))
          const decipher = createDecipheriv(
            `aes-${key.byteLength * 8}-gcm`,
            new Uint8Array(key),
            new Uint8Array(iv),
            { authTagLength: tagLength }
          )
          decipher.setAuthTag(all.subarray(all.length - tagLength))
          const opened = Buffer.concat([
            decipher.update(all.subarray(0, all.length - tagLength)),
            decipher.final(),
          ])
          return opened.buffer.slice(opened.byteOffset, opened.byteOffset + opened.byteLength)
        }
      ),
    }
    getMock.mockReturnValue(nativeModule)
    const { AESEncryptionKey, Crypto } = await loadNative()
    expect(await Crypto.digestString('MD5', 'abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    const key = await AESEncryptionKey.generate(128)
    expect((await key.bytes())[0]).toBe(3)
    const sealed = await Crypto.aesEncrypt(new Uint8Array([4, 2]), key)
    expect(nativeModule.aesEncrypt).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      undefined,
      16
    )
    expect([...(await Crypto.aesDecrypt(sealed, key))]).toEqual([4, 2])
    expect(nativeModule.aesDecrypt).toHaveBeenLastCalledWith(
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      undefined,
      16
    )
  })

  it('the native entry refuses a binary without OneCrypto instead of faking it', async () => {
    hasMock.mockReturnValue(false)
    getMock.mockReturnValue({})
    const { Crypto } = await loadNative()
    await expect(Crypto.digestString('SHA-256', 'abc')).rejects.toThrow(
      'needs a native build that includes one'
    )
  })
})
