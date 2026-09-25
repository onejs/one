import { afterEach, describe, expect, it, vi } from 'vitest'
import { Network } from '../src/platform/network/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
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

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/network/index.native')
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
  it('delegates the one-shot read', async () => {
    const hybrid = {
      getState: vi.fn(async () => ({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
      })),
    }
    const { Network: native } = await loadNativeEntry(hybrid)
    expect(await native.getState()).toEqual({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
    })
    expect(hybrid.getState).toHaveBeenCalledTimes(1)
  })

  it('subscribes through the hybrid object and removes with its remover', async () => {
    const remover = vi.fn()
    const hybrid = { addStateListener: vi.fn(() => remover) }
    const { Network: native } = await loadNativeEntry(hybrid)
    const seen: unknown[] = []
    const subscription = native.addStateListener((state) => {
      seen.push(state)
    })
    const emit = hybrid.addStateListener.mock.calls[0]?.[0] as unknown as (
      state: unknown
    ) => void
    emit({ type: 'cellular', isConnected: true, isInternetReachable: true })
    expect(seen).toEqual([
      { type: 'cellular', isConnected: true, isInternetReachable: true },
    ])
    subscription.remove()
    expect(remover).toHaveBeenCalledTimes(1)
  })

  it('throws the same listener check as the web entry', async () => {
    const { Network: native } = await loadNativeEntry({})
    expect(() => native.addStateListener('nope' as never)).toThrow(
      'Network.addStateListener: listener must be a function'
    )
  })
})
