import { describe, expect, it, vi } from 'vitest'
import { SecureStore } from '../src/platform/secure-store/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/secure-store/index.native')
}

describe('secure-store web', () => {
  it('rejects every verb without a native build', async () => {
    await expect(SecureStore.getItem('token')).rejects.toThrow(
      'SecureStore.getItem needs an iOS or Android build'
    )
    await expect(SecureStore.setItem('token', 'abc')).rejects.toThrow(
      'SecureStore.setItem needs an iOS or Android build'
    )
    await expect(SecureStore.deleteItem('token')).rejects.toThrow(
      'SecureStore.deleteItem needs an iOS or Android build'
    )
  })

  it('throws synchronously for a bad key or value', () => {
    expect(() => SecureStore.getItem(7 as unknown as string)).toThrow(
      'SecureStore.getItem: key must be a non-empty string'
    )
    expect(() => SecureStore.getItem('')).toThrow(
      'SecureStore.getItem: key must be a non-empty string'
    )
    expect(() => SecureStore.setItem('token', 7 as unknown as string)).toThrow(
      'SecureStore.setItem: value must be a string'
    )
    expect(() => SecureStore.deleteItem('')).toThrow(
      'SecureStore.deleteItem: key must be a non-empty string'
    )
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(SecureStore).sort()).toEqual([
      'deleteItem',
      'getItem',
      'setItem',
    ])
    expect(Object.isFrozen(SecureStore)).toBe(true)
  })
})

describe('secure-store native entry', () => {
  it('delegates every call to the hybrid object', async () => {
    const nativeModule = {
      getItem: vi.fn(async () => 'abc'),
      setItem: vi.fn(async () => {}),
      deleteItem: vi.fn(async () => {}),
    }
    const { SecureStore: native } = await loadNativeEntry(nativeModule)
    expect(await native.getItem('token')).toBe('abc')
    expect(nativeModule.getItem).toHaveBeenCalledWith('token')
    await native.setItem('token', 'abc')
    expect(nativeModule.setItem).toHaveBeenCalledWith('token', 'abc')
    await native.deleteItem('token')
    expect(nativeModule.deleteItem).toHaveBeenCalledWith('token')
  })

  it('reads a missing key as null', async () => {
    const { SecureStore: native } = await loadNativeEntry({
      getItem: vi.fn(async () => undefined),
      setItem: vi.fn(async () => {}),
      deleteItem: vi.fn(async () => {}),
    })
    expect(await native.getItem('missing')).toBeNull()
  })

  it('throws the same key and value checks as the web entry', async () => {
    const { SecureStore: native } = await loadNativeEntry(null)
    expect(() => native.getItem('')).toThrow(
      'SecureStore.getItem: key must be a non-empty string'
    )
    expect(() => native.setItem('token', 7 as unknown as string)).toThrow(
      'SecureStore.setItem: value must be a string'
    )
  })
})
