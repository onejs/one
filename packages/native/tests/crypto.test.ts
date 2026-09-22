import { describe, expect, it } from 'vitest'

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
  it('sets the version and variant bits whatever the input holds', () => {
    const sequential = Uint8Array.from({ length: 16 }, (_, index) => index)
    expect(formatUuidV4(sequential)).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
    expect(formatUuidV4(new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000')
    expect(formatUuidV4(new Uint8Array(16).fill(255))).toBe(
      'ffffffff-ffff-4fff-bfff-ffffffffffff'
    )
    for (let round = 0; round < 50; round++) {
      expect(formatUuidV4(crypto.getRandomValues(new Uint8Array(16)))).toMatch(UUID_V4)
    }
  })
})

describe('decodeHexBytes', () => {
  it('rejects truncated, long, and non-hex payloads', () => {
    expect(() => decodeHexBytes('00ff', 3)).toThrow()
    expect(() => decodeHexBytes('00ff10a5', 3)).toThrow()
    expect(() => decodeHexBytes('00zz10a5', 4)).toThrow()
  })
})

describe('fillRandomValues', () => {
  it('fills sub-array views through their own offset and length', () => {
    const buffer = new ArrayBuffer(8)
    const view = new Uint8Array(buffer, 2, 4)
    expect(fillRandomValues(view, sequentialSource)).toBe(view)
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([0, 0, 0, 1, 2, 3, 0, 0]))
  })

  it('accepts integer arrays only', () => {
    const u16 = new Uint16Array(2)
    fillRandomValues(u16, sequentialSource)
    expect(new Uint8Array(u16.buffer)).toEqual(new Uint8Array([0, 1, 2, 3]))
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

  it('enforces the 64k quota', () => {
    let caught: unknown
    try {
      fillRandomValues(new Uint8Array(MAX_RANDOM_BYTES + 1), sequentialSource)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).name).toBe('QuotaExceededError')
    expect(() =>
      fillRandomValues(new Uint8Array(MAX_RANDOM_BYTES), sequentialSource)
    ).not.toThrow()
  })
})

describe('installCryptoPolyfill', () => {
  it('installs both methods when crypto is missing', () => {
    const target: Record<string, any> = {}
    installCryptoPolyfill(sequentialSource, target)
    const view = new Uint8Array(4)
    expect(target.crypto.getRandomValues(view)).toBe(view)
    expect(view).toEqual(new Uint8Array([0, 1, 2, 3]))
    expect(target.crypto.randomUUID()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
  })

  it('leaves a complete crypto implementation untouched', () => {
    const getRandomValues = () => {}
    const randomUUID = () => ''
    const target: Record<string, any> = { crypto: { getRandomValues, randomUUID } }
    installCryptoPolyfill(sequentialSource, target)
    expect(target.crypto.getRandomValues).toBe(getRandomValues)
    expect(target.crypto.randomUUID).toBe(randomUUID)
  })

  it('fills only the missing method, each checked independently', () => {
    const getRandomValues = () => {}
    const onlyValues: Record<string, any> = { crypto: { getRandomValues } }
    installCryptoPolyfill(sequentialSource, onlyValues)
    expect(onlyValues.crypto.getRandomValues).toBe(getRandomValues)
    expect(typeof onlyValues.crypto.randomUUID).toBe('function')

    const randomUUID = () => ''
    const onlyUuid: Record<string, any> = { crypto: { randomUUID } }
    installCryptoPolyfill(sequentialSource, onlyUuid)
    expect(onlyUuid.crypto.randomUUID).toBe(randomUUID)
    expect(typeof onlyUuid.crypto.getRandomValues).toBe('function')
  })
})
