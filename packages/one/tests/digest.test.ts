import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { installDigestPolyfill, type DigestSource } from '../src/platform/crypto/digest'

const source: DigestSource = (algorithm, buffer, offset, length) =>
  webcrypto.subtle.digest(algorithm, new Uint8Array(buffer, offset, length))

function installed() {
  const target = { crypto: {} as { subtle?: { digest?: unknown } } }
  installDigestPolyfill(source, target)
  return target.crypto.subtle!.digest as SubtleCrypto['digest']
}

describe('native global digest adapter', () => {
  it('accepts buffer and exact typed-array/DataView slices with case-insensitive names', async () => {
    const digest = installed()
    const bytes = new Uint8Array([0, 97, 98, 99, 255])
    const expected = await webcrypto.subtle.digest('SHA-256', bytes.subarray(1, 4))
    expect(await digest({ name: 'sHa-256' }, new DataView(bytes.buffer, 1, 3))).toEqual(
      expected
    )
    expect(await digest('SHA-256', bytes.subarray(1, 4))).toEqual(expected)
    expect(await digest('SHA-256', bytes.slice(1, 4).buffer)).toEqual(expected)
  })

  it('rejects unsupported names, malformed algorithms, and non-buffer inputs asynchronously', async () => {
    const digest = installed()
    for (const algorithm of ['MD5', 'SHA256', ' SHA-256', { name: null }]) {
      await expect(digest(algorithm as never, new ArrayBuffer(0))).rejects.toMatchObject({
        name: 'NotSupportedError',
      })
    }
    for (const algorithm of [{}, { name: undefined }, { name: Symbol() }]) {
      await expect(digest(algorithm as never, new ArrayBuffer(0))).rejects.toBeInstanceOf(
        TypeError
      )
    }
    for (const input of [
      null,
      undefined,
      'abc',
      [97, 98, 99],
      {},
      new SharedArrayBuffer(1),
      new Uint8Array(new SharedArrayBuffer(1)),
    ]) {
      const promise = digest('SHA-256', input as never)
      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).rejects.toBeInstanceOf(TypeError)
    }
    const detached = new ArrayBuffer(0)
    structuredClone(detached, { transfer: [detached] })
    await expect(digest('SHA-256', detached)).rejects.toBeInstanceOf(TypeError)
  })

  it('preserves browser crypto, existing subtle methods, and repeated installs', async () => {
    const browser = { crypto: webcrypto }
    const original = browser.crypto.subtle.digest
    installDigestPolyfill(() => {
      throw new Error('must not run')
    }, browser)
    expect(browser.crypto).toBe(webcrypto)
    expect(browser.crypto.subtle.digest).toBe(original)
    const encrypt = () => 'untouched'
    const target = { crypto: { subtle: { encrypt, digest: undefined as unknown } } }
    installDigestPolyfill(source, target)
    const first = target.crypto.subtle.digest
    installDigestPolyfill(source, target)
    expect(target.crypto.subtle.digest).toBe(first)
    expect(target.crypto.subtle.encrypt).toBe(encrypt)
  })

  it('rejects native hashing errors as OperationError', async () => {
    const target = { crypto: {} as { subtle?: { digest?: unknown } } }
    installDigestPolyfill(() => {
      throw new Error('platform failure')
    }, target)
    await expect(
      (target.crypto.subtle!.digest as SubtleCrypto['digest'])(
        'SHA-256',
        new ArrayBuffer(0)
      )
    ).rejects.toMatchObject({ name: 'OperationError', message: 'platform failure' })
  })
})
