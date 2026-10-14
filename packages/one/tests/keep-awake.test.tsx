import { act, create } from 'react-test-renderer'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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
  return import('../src/platform/keep-awake/index.native')
}

async function loadWebEntry() {
  vi.resetModules()
  return import('../src/platform/keep-awake/index')
}

function stubHybrid() {
  const tags = new Set<string>()
  return {
    tags,
    hybrid: {
      isEnabled: async () => tags.size > 0,
      setEnabled: async (enabled: boolean) => {
        if (enabled) tags.add('ExpoKeepAwakeDefaultTag')
        else tags.delete('ExpoKeepAwakeDefaultTag')
      },
      activate: async (tag: string) => {
        tags.add(tag)
      },
      deactivate: async (tag: string) => {
        tags.delete(tag)
      },
    },
  }
}

function stubWakeLock() {
  const makeSentinel = () => {
    let released = false
    return {
      get released() {
        return released
      },
      release: async () => {
        released = true
      },
    }
  }
  let current = makeSentinel()
  vi.stubGlobal('window', {})
  vi.stubGlobal('navigator', {
    wakeLock: {
      request: async () => {
        current = makeSentinel()
        return current
      },
    },
  })
  return {
    get released() {
      return current.released
    },
  }
}

const ACTIVATE_MESSAGE = 'KeepAwake.activate: tag must be a string'
const DEACTIVATE_MESSAGE = 'KeepAwake.deactivate: tag must be a string'

describe('keep-awake tags', () => {
  it('forwards explicit and default tags to the hybrid object', async () => {
    const { hybrid, tags } = stubHybrid()
    const activate = vi.spyOn(hybrid, 'activate')
    const deactivate = vi.spyOn(hybrid, 'deactivate')
    const { KeepAwake } = await loadNativeEntry(hybrid)
    await KeepAwake.activate('alpha')
    await KeepAwake.activate()
    expect(tags).toEqual(new Set(['alpha', 'ExpoKeepAwakeDefaultTag']))
    expect(activate).toHaveBeenNthCalledWith(1, 'alpha')
    expect(activate).toHaveBeenNthCalledWith(2, 'ExpoKeepAwakeDefaultTag')
    await KeepAwake.deactivate('alpha')
    expect(await KeepAwake.isEnabled()).toBe(true)
    await KeepAwake.deactivate()
    expect(deactivate).toHaveBeenNthCalledWith(2, 'ExpoKeepAwakeDefaultTag')
    expect(await KeepAwake.isEnabled()).toBe(false)
  })

  it('throws synchronously for non-string tags on native and web', async () => {
    const { KeepAwake } = await loadNativeEntry(stubHybrid().hybrid)
    expect(() => KeepAwake.activate(7 as never)).toThrow(ACTIVATE_MESSAGE)
    expect(() => KeepAwake.deactivate(7 as never)).toThrow(DEACTIVATE_MESSAGE)
    stubWakeLock()
    const { KeepAwake: web } = await loadWebEntry()
    expect(() => web.activate(7 as never)).toThrow(ACTIVATE_MESSAGE)
    expect(() => web.deactivate(7 as never)).toThrow(DEACTIVATE_MESSAGE)
  })

  it('keeps setEnabled validation and default-tag behavior', async () => {
    const { hybrid } = stubHybrid()
    const { KeepAwake } = await loadNativeEntry(hybrid)
    expect(() => KeepAwake.setEnabled(1 as never)).toThrow(
      'KeepAwake.setEnabled: enabled must be a boolean'
    )
    await KeepAwake.setEnabled(true)
    expect(await KeepAwake.isEnabled()).toBe(true)
    await KeepAwake.setEnabled(false)
    expect(await KeepAwake.isEnabled()).toBe(false)
  })

  it('holds the web lock while any tag is active', async () => {
    stubWakeLock()
    const { KeepAwake } = await loadWebEntry()
    await KeepAwake.activate('alpha')
    await KeepAwake.activate('beta')
    expect(await KeepAwake.isEnabled()).toBe(true)
    await KeepAwake.deactivate('alpha')
    expect(await KeepAwake.isEnabled()).toBe(true)
    await KeepAwake.deactivate('ghost')
    expect(await KeepAwake.isEnabled()).toBe(true)
    await KeepAwake.deactivate('beta')
    expect(await KeepAwake.isEnabled()).toBe(false)
  })

  it('shares the default tag between setEnabled and activate on web', async () => {
    stubWakeLock()
    const { KeepAwake } = await loadWebEntry()
    await KeepAwake.setEnabled(true)
    await KeepAwake.deactivate()
    expect(await KeepAwake.isEnabled()).toBe(false)
    await KeepAwake.activate()
    await KeepAwake.setEnabled(false)
    expect(await KeepAwake.isEnabled()).toBe(false)
  })

  it('rejects with the owner when the browser has no wake lock', async () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', {})
    const { KeepAwake, useKeepAwake } = await loadWebEntry()
    await expect(KeepAwake.activate('alpha')).rejects.toThrow(
      'KeepAwake.activate: Screen Wake Lock is unavailable'
    )
    // the hook has no caller to reject to: it reports the failure instead of
    // leaving an unhandled rejection.
    const unhandled: unknown[] = []
    const observe = (reason: unknown) => unhandled.push(reason)
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    process.on('unhandledRejection', observe)
    function Reader() {
      useKeepAwake()
      return null
    }
    let tree: ReturnType<typeof create> | undefined
    await act(async () => {
      tree = create(React.createElement(Reader))
    })
    await new Promise((resolve) => setImmediate(resolve))
    await act(async () => tree?.unmount())
    await new Promise((resolve) => setImmediate(resolve))
    process.off('unhandledRejection', observe)
    expect(unhandled).toEqual([])
    expect(reported).toHaveBeenCalledWith(
      expect.stringContaining('Screen Wake Lock is unavailable')
    )
    reported.mockRestore()
  })

  it('activates a unique tag per hook instance and releases on unmount', async () => {
    const { hybrid } = stubHybrid()
    const activate = vi.spyOn(hybrid, 'activate')
    const deactivate = vi.spyOn(hybrid, 'deactivate')
    const { useKeepAwake } = await loadNativeEntry(hybrid)
    function Reader({ tag }: { tag?: string }) {
      useKeepAwake(tag)
      return null
    }
    let first: ReturnType<typeof create> | undefined
    let second: ReturnType<typeof create> | undefined
    await act(async () => {
      first = create(React.createElement(Reader, { tag: 'shared' }))
      second = create(React.createElement(Reader, {}))
    })
    expect(activate).toHaveBeenCalledWith('shared')
    const unique = activate.mock.calls.find(([tag]) => tag !== 'shared')?.[0]
    expect(typeof unique).toBe('string')
    expect(unique).not.toBe('ExpoKeepAwakeDefaultTag')
    await act(async () => {
      first?.unmount()
    })
    expect(deactivate).toHaveBeenCalledWith('shared')
    expect(deactivate).not.toHaveBeenCalledWith(unique)
    await act(async () => {
      second?.unmount()
    })
    expect(deactivate).toHaveBeenCalledWith(unique)
  })

  it('throws during render for a non-string hook tag', async () => {
    const { useKeepAwake } = await loadNativeEntry(stubHybrid().hybrid)
    function Bad() {
      useKeepAwake(7 as never)
      return null
    }
    expect(() => {
      act(() => {
        create(React.createElement(Bad))
      })
    }).toThrow('KeepAwake.useKeepAwake: tag must be a string')
  })

  it('resolves the no-native-build entries without touching tags', async () => {
    vi.resetModules()
    const { KeepAwake } = await import('../src/platform/keep-awake/unavailable')
    await expect(KeepAwake.activate('alpha')).resolves.toBeUndefined()
    await expect(KeepAwake.deactivate()).resolves.toBeUndefined()
    await expect(KeepAwake.isEnabled()).resolves.toBe(false)
    expect(() => KeepAwake.activate(7 as never)).toThrow(ACTIVATE_MESSAGE)
  })
})
