import { afterEach, describe, expect, it, vi } from 'vitest'
import { Clipboard } from '../src/platform/clipboard/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/clipboard/index.native')
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
      'addListener',
      'getImage',
      'getString',
      'getUrl',
      'hasImage',
      'hasString',
      'hasUrl',
      'setImage',
      'setString',
      'setUrl',
    ])
    expect(Object.isFrozen(Clipboard)).toBe(true)
  })

  it('reads html through the item api when preferred', async () => {
    const html = '<b>hello</b>'
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: async () => 'hello',
        read: async () => [
          {
            types: ['text/html'],
            getType: async () => new Blob([html], { type: 'text/html' }),
          },
        ],
      },
    })
    expect(await Clipboard.getString({ preferredFormat: 'html' })).toBe(html)
    expect(await Clipboard.getString()).toBe('hello')
  })

  it('resolves empty image and url values without item support', async () => {
    stubClipboard()
    expect(await Clipboard.getImage({ format: 'png' })).toBeNull()
    expect(await Clipboard.hasImage()).toBe(false)
    expect(await Clipboard.getUrl()).toBeNull()
    expect(await Clipboard.hasUrl()).toBe(false)
    await expect(Clipboard.setImage('aGVsbG8=')).resolves.toBeUndefined()
    await expect(Clipboard.setUrl('https://onestack.dev')).resolves.toBeUndefined()
    expect(() => Clipboard.setImage('')).toThrow(
      'Clipboard.setImage: base64Image must be a non-empty string'
    )
  })

  it('keeps the listener inert on web', () => {
    stubClipboard()
    const events: unknown[] = []
    const sub = Clipboard.addListener((event) => events.push(event))
    expect(sub.remove).toBeTypeOf('function')
    expect(() => sub.remove()).not.toThrow()
    expect(events).toEqual([])
  })
})

describe('clipboard native entry', () => {
  it('delegates every call to the hybrid object', async () => {
    const nativeModule = {
      getString: vi.fn(async () => 'hi'),
      setString: vi.fn(async () => true),
      hasString: vi.fn(async () => true),
      getImage: vi.fn(async () => undefined),
      setImage: vi.fn(async () => {}),
      hasImage: vi.fn(async () => false),
      getUrl: vi.fn(async () => undefined),
      setUrl: vi.fn(async () => {}),
      hasUrl: vi.fn(async () => false),
      setClipboardListener: vi.fn(() => {}),
      clearClipboardListener: vi.fn(() => {}),
    }
    const { Clipboard: native } = await loadNativeEntry(nativeModule)
    expect(await native.getString()).toBe('hi')
    expect(await native.setString('hi')).toBe(true)
    expect(nativeModule.setString).toHaveBeenCalledWith('hi', {})
    expect(await native.hasString()).toBe(true)
    expect(await native.getImage({ format: 'png' })).toBeNull()
    expect(nativeModule.getImage).toHaveBeenCalledWith({ format: 'png' })
    await native.setImage('aGVsbG8=')
    expect(nativeModule.setImage).toHaveBeenCalledWith('aGVsbG8=')
    expect(await native.hasImage()).toBe(false)
    expect(await native.getUrl()).toBeNull()
    await native.setUrl('https://onestack.dev')
    expect(nativeModule.setUrl).toHaveBeenCalledWith('https://onestack.dev')
    expect(await native.hasUrl()).toBe(false)
    // the listener fans out through one native slot; unknown content
    // types never reach js listeners.
    const first = vi.fn()
    const second = vi.fn()
    const firstSub = native.addListener(first)
    const secondSub = native.addListener(second)
    expect(nativeModule.setClipboardListener).toHaveBeenCalledTimes(1)
    nativeModule.setClipboardListener.mock.calls[0][0](['image', 'bogus'])
    expect(first).toHaveBeenCalledWith({ contentTypes: ['image'] })
    expect(second).toHaveBeenCalledWith({ contentTypes: ['image'] })
    firstSub.remove()
    expect(nativeModule.clearClipboardListener).not.toHaveBeenCalled()
    secondSub.remove()
    expect(nativeModule.clearClipboardListener).toHaveBeenCalledTimes(1)
  })

  it('counts same-callback subscriptions independently', async () => {
    const nativeModule = {
      setClipboardListener: vi.fn(() => {}),
      clearClipboardListener: vi.fn(() => {}),
    }
    const { Clipboard: native } = await loadNativeEntry(nativeModule)
    const deliveries: unknown[] = []
    const callback = (event: unknown) => deliveries.push(event)
    const first = native.addListener(callback)
    native.addListener(callback)
    first.remove()
    nativeModule.setClipboardListener.mock.calls[0][0](['image'])
    expect(deliveries).toEqual([{ contentTypes: ['image'] }])
    expect(nativeModule.clearClipboardListener).not.toHaveBeenCalled()
  })

  it('throws the same write check as the web entry', async () => {
    const { Clipboard: native } = await loadNativeEntry(null)
    expect(() => native.setString(7 as unknown as string)).toThrow(
      'Clipboard.setString: text must be a string'
    )
  })
})
