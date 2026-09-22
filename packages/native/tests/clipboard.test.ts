import { afterEach, describe, expect, it, vi } from 'vitest'
import { Clipboard } from '../src/clipboard/index'

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadNativeEntry(nativeModule: unknown) {
  vi.resetModules()
  const { TurboModuleRegistry } = await import('react-native')
  vi.mocked(TurboModuleRegistry.get).mockReturnValue(nativeModule as never)
  return import('../src/clipboard/index.native')
}

function stubClipboard(overrides: Record<string, unknown> = {}) {
  let stored = ''
  const clipboard = {
    readText: async () => stored,
    writeText: async (text: string) => {
      stored = text
    },
    ...overrides,
  }
  vi.stubGlobal('navigator', { clipboard })
  return {
    get stored() {
      return stored
    },
  }
}

describe('clipboard web', () => {
  it('round-trips a string through navigator.clipboard', async () => {
    stubClipboard()
    expect(await Clipboard.setString('hello')).toBe(true)
    expect(await Clipboard.getString()).toBe('hello')
    expect(await Clipboard.hasString()).toBe(true)
  })

  it('reports no string for an empty clipboard', async () => {
    stubClipboard()
    expect(await Clipboard.getString()).toBe('')
    expect(await Clipboard.hasString()).toBe(false)
  })

  it('degrades to empty and false without a clipboard api', async () => {
    vi.stubGlobal('navigator', {})
    expect(await Clipboard.getString()).toBe('')
    expect(await Clipboard.setString('hello')).toBe(false)
    expect(await Clipboard.hasString()).toBe(false)
  })

  it('resolves empty and false when the browser denies access', async () => {
    stubClipboard({
      readText: async () => {
        throw new Error('denied')
      },
      writeText: async () => {
        throw new Error('denied')
      },
    })
    expect(await Clipboard.getString()).toBe('')
    expect(await Clipboard.setString('hello')).toBe(false)
    expect(await Clipboard.hasString()).toBe(false)
  })

  it('throws synchronously for a non-string write', () => {
    expect(() => Clipboard.setString(7 as unknown as string)).toThrow(
      'Clipboard.setString: text must be a string'
    )
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(Clipboard).sort()).toEqual([
      'getString',
      'hasString',
      'setString',
    ])
    expect(Object.isFrozen(Clipboard)).toBe(true)
  })
})

describe('clipboard native entry', () => {
  it('delegates every call to the native module', async () => {
    const nativeModule = {
      getString: vi.fn(async () => 'hi'),
      setString: vi.fn(async () => true),
      hasString: vi.fn(async () => true),
    }
    const { Clipboard: native } = await loadNativeEntry(nativeModule)
    expect(await native.getString()).toBe('hi')
    expect(await native.setString('hi')).toBe(true)
    expect(nativeModule.setString).toHaveBeenCalledWith('hi')
    expect(await native.hasString()).toBe(true)
  })

  it('rejects without a native module', async () => {
    const { Clipboard: native } = await loadNativeEntry(null)
    await expect(native.getString()).rejects.toThrow(
      'Clipboard needs a native build that includes @vxrn/native'
    )
    await expect(native.setString('hi')).rejects.toThrow(
      'Clipboard needs a native build that includes @vxrn/native'
    )
    await expect(native.hasString()).rejects.toThrow(
      'Clipboard needs a native build that includes @vxrn/native'
    )
  })

  it('throws the same write check as the web entry', async () => {
    const { Clipboard: native } = await loadNativeEntry(null)
    expect(() => native.setString(7 as unknown as string)).toThrow(
      'Clipboard.setString: text must be a string'
    )
  })
})
