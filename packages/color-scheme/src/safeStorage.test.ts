import { afterEach, describe, expect, it } from 'vitest'
import { getStorageItem, setStorageItem } from './safeStorage'

// localStorage isn't a real global in the node test env, so each test installs
// its own descriptor and we clear it afterwards.
afterEach(() => {
  delete (globalThis as any).localStorage
})

function defineLocalStorage(descriptor: PropertyDescriptor) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    ...descriptor,
  })
}

describe('safeStorage', () => {
  it('reads and writes through to a working localStorage', () => {
    const store = new Map<string, string>()
    defineLocalStorage({
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    })

    setStorageItem('vxrn-scheme', 'dark')
    expect(getStorageItem('vxrn-scheme')).toBe('dark')
  })

  // the actual prod bug: Chrome with storage blocked makes the localStorage
  // getter throw SecurityError, so even `typeof localStorage` throws. accessing
  // it must degrade to null, not crash hydration.
  it('returns null instead of throwing when the localStorage getter throws', () => {
    defineLocalStorage({
      get() {
        throw new Error('Failed to read the "localStorage" property: Access is denied.')
      },
    })

    expect(() => getStorageItem('vxrn-scheme')).not.toThrow()
    expect(getStorageItem('vxrn-scheme')).toBeNull()
    expect(() => setStorageItem('vxrn-scheme', 'dark')).not.toThrow()
  })

  it('swallows errors when setItem throws (quota / blocked)', () => {
    defineLocalStorage({
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
      },
    })

    expect(() => setStorageItem('vxrn-scheme', 'dark')).not.toThrow()
  })

  it('returns null when localStorage is undefined (native)', () => {
    expect(getStorageItem('vxrn-scheme')).toBeNull()
    expect(() => setStorageItem('vxrn-scheme', 'dark')).not.toThrow()
  })
})
