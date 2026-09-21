import { afterEach, describe, expect, it, vi } from 'vitest'
import { Browser } from '../src/browser/index'

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
  return import('../src/browser/index.native')
}

describe('browser web', () => {
  it('opens a blank-target popup and reports opened', async () => {
    const popup = { closed: false, opener: {} }
    const open = vi.fn(() => popup)
    vi.stubGlobal('window', { open })
    expect(await Browser.open('https://example.com')).toEqual({ type: 'opened' })
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank')
    expect(popup.opener).toBe(null)
  })

  it('rejects with a stable code when the browser blocks the popup', async () => {
    vi.stubGlobal('window', { open: () => null })
    const openError = await Browser.open('https://example.com').catch((error) => error)
    expect(openError).toBeInstanceOf(Error)
    expect(openError.message).toBe(
      'Browser.open: the browser blocked the popup. Open it from a user gesture.'
    )
    expect(openError.code).toBe('E_BROWSER_BLOCKED')
  })

  it('resolves dismiss without native work', async () => {
    expect(await Browser.dismiss()).toEqual({ type: 'dismiss' })
  })

  it('rejects the auth session on web without opening a popup', async () => {
    const open = vi.fn(() => ({ closed: false }))
    vi.stubGlobal('window', { open })
    await expect(Browser.openAuthSession('https://example.com')).rejects.toThrow(
      'Browser.openAuthSession needs an iOS or Android build'
    )
    expect(open).not.toHaveBeenCalled()
  })

  it('dismissAuthSession is a no-op on web', () => {
    Browser.dismissAuthSession()
  })

  it('throws synchronously for invalid arguments', () => {
    expect(() => Browser.open('')).toThrow('Browser.open: url must be a non-empty string')
    expect(() => Browser.open('https://example.com', 'nope' as never)).toThrow(
      'Browser.open: options must be an object'
    )
    expect(() =>
      Browser.open('https://example.com', { presentationStyle: 'huge' as never })
    ).toThrow('Browser.open: unknown presentationStyle "huge"')
    expect(() =>
      Browser.open('https://example.com', { presentationStyle: 'popover' as never })
    ).toThrow('Browser.open: unknown presentationStyle "popover"')
    expect(() =>
      Browser.open('https://example.com', { browserPackage: 7 as never })
    ).toThrow('Browser.open: browserPackage must be a string')
    expect(() =>
      Browser.openAuthSession('https://example.com', 7 as never)
    ).toThrow('Browser.openAuthSession: redirectUrl must be a string or null')
    expect(() =>
      Browser.openAuthSession('https://example.com', null, {
        preferEphemeralSession: 'yes' as never,
      })
    ).toThrow('Browser.openAuthSession: preferEphemeralSession must be a boolean')
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(Browser).sort()).toEqual([
      'dismiss',
      'dismissAuthSession',
      'open',
      'openAuthSession',
    ])
    expect(Object.isFrozen(Browser)).toBe(true)
  })
})

describe('browser native entry', () => {
  it('delegates every call', async () => {
    const nativeModule = {
      open: vi.fn(async () => ({ type: 'opened' })),
      dismiss: vi.fn(async () => ({ type: 'dismiss' })),
      openAuthSession: vi.fn(async () => ({ type: 'success', url: 'a://b' })),
      dismissAuthSession: vi.fn(),
    }
    const { Browser: native } = await loadNativeEntry(nativeModule)
    expect(await native.open('https://example.com')).toEqual({ type: 'opened' })
    expect(nativeModule.open).toHaveBeenCalledWith('https://example.com', {})
    expect(await native.dismiss()).toEqual({ type: 'dismiss' })
    expect(await native.openAuthSession('https://example.com', 'a://b')).toEqual({
      type: 'success',
      url: 'a://b',
    })
    expect(nativeModule.openAuthSession).toHaveBeenCalledWith(
      'https://example.com',
      'a://b',
      {}
    )
    native.dismissAuthSession()
    expect(nativeModule.dismissAuthSession).toHaveBeenCalledTimes(1)
  })

  it('rejects promised results without a native module', async () => {
    const { Browser: native } = await loadNativeEntry(null)
    await expect(native.open('https://example.com')).rejects.toThrow(
      'Browser needs a native build that includes @vxrn/native'
    )
    await expect(native.dismiss()).rejects.toThrow(
      'Browser needs a native build that includes @vxrn/native'
    )
    await expect(native.openAuthSession('https://example.com')).rejects.toThrow(
      'Browser needs a native build that includes @vxrn/native'
    )
  })

  it('dismissAuthSession does nothing without a native module', async () => {
    const { Browser: native } = await loadNativeEntry(null)
    native.dismissAuthSession()
  })

  it('throws the same argument checks as the web entry', async () => {
    const { Browser: native } = await loadNativeEntry(null)
    expect(() => native.open('')).toThrow('Browser.open: url must be a non-empty string')
    expect(() =>
      native.open('https://example.com', { presentationStyle: 'huge' as never })
    ).toThrow('Browser.open: unknown presentationStyle "huge"')
    expect(() =>
      native.open('https://example.com', { presentationStyle: 'popover' as never })
    ).toThrow('Browser.open: unknown presentationStyle "popover"')
    expect(() => native.openAuthSession('https://example.com', 7 as never)).toThrow(
      'Browser.openAuthSession: redirectUrl must be a string or null'
    )
  })
})

