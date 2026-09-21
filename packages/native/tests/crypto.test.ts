import { describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: getMock },
}))

import {
  getSecureRandomBytes,
  installCrypto,
  isSecureRandomAvailable,
} from '../src/crypto/index.native'
import {
  getSecureRandomBytes as webGetSecureRandomBytes,
  installCrypto as webInstallCrypto,
  isSecureRandomAvailable as isWebSecureRandomAvailable,
} from '../src/crypto/index'
import {
  decodeHexBytes,
  fillRandomValues,
  formatUuidV4,
  installCryptoPolyfill,
  MAX_RANDOM_BYTES,
  type RandomBytesSource,
} from '../src/crypto/random'

const sequentialSource: RandomBytesSource = (count: number) =>
  Uint8Array.from({ length: count }, (_, index) => index & 255)

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('formatUuidV4', () => {
  it('formats a known vector with version and variant bits set', () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, index) => index)
    expect(formatUuidV4(bytes)).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
  })

  it('forces version 4 and the rfc 4122 variant whatever the input holds', () => {
    expect(formatUuidV4(new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000')
    expect(formatUuidV4(new Uint8Array(16).fill(255))).toBe(
      'ffffffff-ffff-4fff-bfff-ffffffffffff'
    )
    for (let round = 0; round < 50; round++) {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      expect(formatUuidV4(bytes)).toMatch(UUID_V4)
    }
  })

  it('leaves the input buffer untouched', () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, index) => index)
    formatUuidV4(bytes)
    expect(bytes[6]).toBe(6)
    expect(bytes[8]).toBe(8)
  })

  it('throws on anything but 16 bytes', () => {
    expect(() => formatUuidV4(new Uint8Array(15))).toThrow(RangeError)
    expect(() => formatUuidV4(new Uint8Array(17))).toThrow(RangeError)
    expect(() => formatUuidV4(new Uint8Array(0))).toThrow(RangeError)
  })
})

describe('decodeHexBytes', () => {
  it('round-trips lowercase and uppercase hex', () => {
    expect(decodeHexBytes('00ff10a5', 4)).toEqual(new Uint8Array([0, 255, 16, 165]))
    expect(decodeHexBytes('00FF10A5', 4)).toEqual(new Uint8Array([0, 255, 16, 165]))
    expect(decodeHexBytes('', 0)).toEqual(new Uint8Array(0))
  })

  it('rejects truncated, long, and non-hex payloads', () => {
    expect(() => decodeHexBytes('00ff', 3)).toThrow()
    expect(() => decodeHexBytes('00ff10a5', 3)).toThrow()
    expect(() => decodeHexBytes('00zz10a5', 4)).toThrow()
  })
})

describe('fillRandomValues', () => {
  it('fills the view from the source and returns it', () => {
    const view = new Uint8Array(4)
    expect(fillRandomValues(view, sequentialSource)).toBe(view)
    expect(view).toEqual(new Uint8Array([0, 1, 2, 3]))
  })

  it('respects byte offsets and lengths of sub-array views', () => {
    const buffer = new ArrayBuffer(8)
    const view = new Uint8Array(buffer, 2, 4)
    fillRandomValues(view, sequentialSource)
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([0, 0, 0, 1, 2, 3, 0, 0]))
  })

  it('fills every integer TypedArray kind including big-int arrays', () => {
    const u16 = new Uint16Array(2)
    fillRandomValues(u16, sequentialSource)
    expect(new Uint8Array(u16.buffer)).toEqual(new Uint8Array([0, 1, 2, 3]))
    const i32 = new Int32Array(1)
    fillRandomValues(i32, sequentialSource)
    expect(new Uint8Array(i32.buffer)).toEqual(new Uint8Array([0, 1, 2, 3]))
    const big = new BigUint64Array(1)
    fillRandomValues(big, sequentialSource)
    expect(new Uint8Array(big.buffer)).toEqual(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]))
    const clamped = new Uint8ClampedArray(2)
    fillRandomValues(clamped, sequentialSource)
    expect(clamped).toEqual(new Uint8ClampedArray([0, 1]))
  })

  it('rejects float arrays, DataView, and non-views', () => {
    expect(() => fillRandomValues(new Float32Array(2), sequentialSource)).toThrow(
      TypeError
    )
    expect(() => fillRandomValues(new Float64Array(2), sequentialSource)).toThrow(
      TypeError
    )
    expect(() =>
      fillRandomValues(new DataView(new ArrayBuffer(8)), sequentialSource)
    ).toThrow(TypeError)
    expect(() => fillRandomValues({} as never, sequentialSource)).toThrow(TypeError)
  })

  it('throws a QuotaExceededError-named error past 64k', () => {
    const view = new Uint8Array(MAX_RANDOM_BYTES + 1)
    let caught: unknown
    try {
      fillRandomValues(view, sequentialSource)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).name).toBe('QuotaExceededError')
    // the boundary itself still fills
    const edge = new Uint8Array(MAX_RANDOM_BYTES)
    expect(() => fillRandomValues(edge, sequentialSource)).not.toThrow()
  })

  it('returns empty views without touching the source', () => {
    const source = vi.fn(sequentialSource)
    const view = new Uint8Array(0)
    expect(fillRandomValues(view, source)).toBe(view)
    expect(source).not.toHaveBeenCalled()
  })
})

describe('installCryptoPolyfill', () => {
  it('installs both methods when crypto is missing', () => {
    const target: Record<string, any> = {}
    installCryptoPolyfill(sequentialSource, target)
    expect(typeof target.crypto.getRandomValues).toBe('function')
    expect(typeof target.crypto.randomUUID).toBe('function')
    const view = new Uint8Array(4)
    expect(target.crypto.getRandomValues(view)).toBe(view)
    expect(view).toEqual(new Uint8Array([0, 1, 2, 3]))
    expect(target.crypto.randomUUID()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
  })

  it('leaves a complete crypto implementation untouched', () => {
    const getRandomValues = vi.fn()
    const randomUUID = vi.fn()
    const target: Record<string, any> = { crypto: { getRandomValues, randomUUID } }
    installCryptoPolyfill(sequentialSource, target)
    expect(target.crypto.getRandomValues).toBe(getRandomValues)
    expect(target.crypto.randomUUID).toBe(randomUUID)
  })

  it('fills only the missing method, each checked independently', () => {
    const getRandomValues = vi.fn()
    const onlyValues: Record<string, any> = { crypto: { getRandomValues } }
    installCryptoPolyfill(sequentialSource, onlyValues)
    expect(onlyValues.crypto.getRandomValues).toBe(getRandomValues)
    expect(typeof onlyValues.crypto.randomUUID).toBe('function')

    const randomUUID = vi.fn()
    const onlyUuid: Record<string, any> = { crypto: { randomUUID } }
    installCryptoPolyfill(sequentialSource, onlyUuid)
    expect(onlyUuid.crypto.randomUUID).toBe(randomUUID)
    expect(typeof onlyUuid.crypto.getRandomValues).toBe('function')
  })

  it('treats null crypto and non-function members as missing', () => {
    const nullCrypto: Record<string, any> = { crypto: null }
    installCryptoPolyfill(sequentialSource, nullCrypto)
    expect(typeof nullCrypto.crypto.getRandomValues).toBe('function')
    expect(typeof nullCrypto.crypto.randomUUID).toBe('function')

    const broken: Record<string, any> = {
      crypto: { getRandomValues: 'native', randomUUID: 42 },
    }
    installCryptoPolyfill(sequentialSource, broken)
    expect(typeof broken.crypto.getRandomValues).toBe('function')
    expect(typeof broken.crypto.randomUUID).toBe('function')
  })
})

describe('native secure random dispatch', () => {
  it('decodes the hex the native module returns', () => {
    getMock.mockReturnValue({
      getRandomBytesHex: (count: number) => '00ff10a5'.slice(0, count * 2),
    })
    expect(isSecureRandomAvailable()).toBe(true)
    expect(getSecureRandomBytes(4)).toEqual(new Uint8Array([0, 255, 16, 165]))
    expect(getSecureRandomBytes(0)).toEqual(new Uint8Array(0))
  })

  it('validates counts before touching the bridge', () => {
    const hex = vi.fn(() => '00')
    getMock.mockReturnValue({ getRandomBytesHex: hex })
    expect(() => getSecureRandomBytes(-1)).toThrow(RangeError)
    expect(() => getSecureRandomBytes(1.5)).toThrow(RangeError)
    expect(() => getSecureRandomBytes(MAX_RANDOM_BYTES + 1)).toThrow(RangeError)
    expect(() => getSecureRandomBytes(Number.NaN)).toThrow(RangeError)
    expect(hex).not.toHaveBeenCalled()
  })

  it('throws when the module, method, or native call fails', () => {
    getMock.mockReturnValue(null)
    expect(isSecureRandomAvailable()).toBe(false)
    expect(() => getSecureRandomBytes(4)).toThrow(
      'the OneNativeCrypto native module is missing or failed'
    )

    getMock.mockReturnValue({})
    expect(isSecureRandomAvailable()).toBe(false)
    expect(() => getSecureRandomBytes(4)).toThrow(
      'the OneNativeCrypto native module is missing or failed'
    )

    getMock.mockReturnValue({ getRandomBytesHex: () => null })
    expect(isSecureRandomAvailable()).toBe(true)
    expect(() => getSecureRandomBytes(4)).toThrow(
      'the OneNativeCrypto native module is missing or failed'
    )

    getMock.mockImplementation(() => {
      throw new Error('no bridge')
    })
    expect(isSecureRandomAvailable()).toBe(false)
    expect(() => getSecureRandomBytes(4)).toThrow(
      'the OneNativeCrypto native module is missing or failed'
    )
  })

  it('installCrypto fills a missing global crypto from the native module', () => {
    getMock.mockReturnValue({
      getRandomBytesHex: (count: number) =>
        Array.from({ length: count }, (_, index) =>
          (index & 255).toString(16).padStart(2, '0')
        ).join(''),
    })
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Reflect.deleteProperty(globalThis, 'crypto')
    try {
      installCrypto()
      const installed = globalThis.crypto as unknown as {
        getRandomValues: <T extends ArrayBufferView>(view: T) => T
        randomUUID: () => string
      }
      expect(typeof installed.getRandomValues).toBe('function')
      expect(installed.randomUUID()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
      const view = new Uint8Array(4)
      installed.getRandomValues(view)
      expect(view).toEqual(new Uint8Array([0, 1, 2, 3]))
    } finally {
      Reflect.deleteProperty(globalThis, 'crypto')
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor)
      }
    }
  })

  it('installCrypto no-ops without the native module', () => {
    getMock.mockReturnValue(null)
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Reflect.deleteProperty(globalThis, 'crypto')
    try {
      expect(() => installCrypto()).not.toThrow()
      expect('crypto' in globalThis).toBe(false)
    } finally {
      Reflect.deleteProperty(globalThis, 'crypto')
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor)
      }
    }
  })
})

describe('web secure random entry', () => {
  it('reports and reads the platform crypto', () => {
    expect(isWebSecureRandomAvailable()).toBe(true)
    const bytes = webGetSecureRandomBytes(16)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(16)
    expect(() => webGetSecureRandomBytes(-1)).toThrow(RangeError)
  })

  it('installCrypto never clobbers the platform implementation', () => {
    const before = globalThis.crypto
    webInstallCrypto()
    expect(globalThis.crypto).toBe(before)
  })
})
