import { afterEach, describe, expect, it, vi } from 'vitest'
import { Network } from '../src/network/index'
import { normalizeState } from '../src/network/state'

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: vi.fn() },
  NativeEventEmitter: vi.fn(function () {
    return { addListener: vi.fn(() => ({ remove: vi.fn() })) }
  }),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubWindow() {
  const listeners = new Map<string, Set<() => void>>()
  vi.stubGlobal('window', {
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
  })
  return {
    fire(type: string) {
      listeners.get(type)?.forEach((listener) => listener())
    },
    count(type: string) {
      return listeners.get(type)?.size ?? 0
    },
  }
}

async function loadNativeEntry(nativeModule: unknown) {
  vi.resetModules()
  const { TurboModuleRegistry } = await import('react-native')
  vi.mocked(TurboModuleRegistry.get).mockReturnValue(nativeModule as never)
  return import('../src/network/index.native')
}

describe('network web', () => {
  it('reports unknown while online and none while offline', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    expect(await Network.getState()).toEqual({
      type: 'unknown',
      isConnected: true,
      isInternetReachable: true,
    })
    vi.stubGlobal('navigator', { onLine: false })
    expect(await Network.getState()).toEqual({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
    })
  })

  it('reports offline without a navigator', async () => {
    vi.stubGlobal('navigator', undefined)
    expect(await Network.getState()).toEqual({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
    })
  })

  it('notifies listeners on online and offline events', async () => {
    const online = { onLine: true }
    vi.stubGlobal('navigator', online)
    const window = stubWindow()
    const seen: string[] = []
    const subscription = Network.addStateListener((state) => {
      seen.push(`${state.type}:${state.isConnected}`)
    })
    online.onLine = false
    window.fire('offline')
    online.onLine = true
    window.fire('online')
    expect(seen).toEqual(['none:false', 'unknown:true'])
    subscription.remove()
    expect(window.count('online')).toBe(0)
    expect(window.count('offline')).toBe(0)
  })

  it('returns a removable no-op subscription without a window', () => {
    Network.addStateListener(() => {
      throw new Error('must not fire')
    }).remove()
  })

  it('throws synchronously for a non-function listener', () => {
    expect(() => Network.addStateListener('nope' as never)).toThrow(
      'Network.addStateListener: listener must be a function'
    )
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(Network).sort()).toEqual(['addStateListener', 'getState'])
    expect(Object.isFrozen(Network)).toBe(true)
  })
})

describe('network native entry', () => {
  it('delegates the one-shot read and normalizes it', async () => {
    const nativeModule = {
      getState: vi.fn(async () => ({ type: 'wifi', isConnected: 1 })),
    }
    const { Network: native } = await loadNativeEntry(nativeModule)
    expect(await native.getState()).toEqual({
      type: 'wifi',
      isConnected: false,
      isInternetReachable: false,
    })
    expect(nativeModule.getState).toHaveBeenCalledTimes(1)
  })

  it('rejects the read without a native module', async () => {
    const { Network: native } = await loadNativeEntry(null)
    await expect(native.getState()).rejects.toThrow(
      'Network needs a native build that includes @vxrn/native'
    )
  })

  it('subscribes through one event emitter and stops on remove', async () => {
    const nativeModule = {
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
    }
    const { Network: native } = await loadNativeEntry(nativeModule)
    const { NativeEventEmitter } = await import('react-native')
    const seen: unknown[] = []
    const subscription = native.addStateListener((state) => {
      seen.push(state)
    })
    expect(nativeModule.startMonitoring).toHaveBeenCalledTimes(1)
    const emitter = vi.mocked(NativeEventEmitter).mock.results[0]?.value as {
      addListener: ReturnType<typeof vi.fn>
    }
    expect(emitter.addListener).toHaveBeenCalledWith(
      'oneNativeNetworkStateChanged',
      expect.any(Function)
    )
    const emit = emitter.addListener.mock.calls[0]?.[1] as (
      state: unknown
    ) => void
    emit({ type: 'cellular', isConnected: true, isInternetReachable: true })
    expect(seen).toEqual([
      { type: 'cellular', isConnected: true, isInternetReachable: true },
    ])
    subscription.remove()
    expect(nativeModule.stopMonitoring).toHaveBeenCalledTimes(1)
  })

  it('returns a no-op subscription without a native module', async () => {
    const { Network: native } = await loadNativeEntry(null)
    native
      .addStateListener(() => {
        throw new Error('must not fire')
      })
      .remove()
  })

  it('throws the same listener check as the web entry', async () => {
    const { Network: native } = await loadNativeEntry(null)
    expect(() => native.addStateListener('nope' as never)).toThrow(
      'Network.addStateListener: listener must be a function'
    )
  })
})

describe('normalizeState', () => {
  it('passes a valid native payload through', () => {
    expect(
      normalizeState({ type: 'wifi', isConnected: true, isInternetReachable: true })
    ).toEqual({ type: 'wifi', isConnected: true, isInternetReachable: true })
  })

  it('falls back to unknown for garbage', () => {
    expect(normalizeState(null)).toEqual({
      type: 'unknown',
      isConnected: false,
      isInternetReachable: false,
    })
    expect(normalizeState({ type: 'wifi', isConnected: 1 })).toEqual({
      type: 'wifi',
      isConnected: false,
      isInternetReachable: false,
    })
    expect(
      normalizeState({ type: 'WIFI', isConnected: true, isInternetReachable: true })
    ).toEqual({ type: 'unknown', isConnected: true, isInternetReachable: true })
  })
})
