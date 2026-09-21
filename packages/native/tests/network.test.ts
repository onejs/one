import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  NetworkStateType,
  addNetworkStateListener,
  getNetworkStateAsync,
} from '../src/network/index'
import { normalizeState } from '../src/network/state'

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

describe('network web', () => {
  it('reports unknown while online and none while offline', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    expect(await getNetworkStateAsync()).toEqual({
      type: 'UNKNOWN',
      isConnected: true,
      isInternetReachable: true,
    })
    vi.stubGlobal('navigator', { onLine: false })
    expect(await getNetworkStateAsync()).toEqual({
      type: 'NONE',
      isConnected: false,
      isInternetReachable: false,
    })
  })

  it('reports offline without a navigator', async () => {
    vi.stubGlobal('navigator', undefined)
    expect(await getNetworkStateAsync()).toEqual({
      type: 'NONE',
      isConnected: false,
      isInternetReachable: false,
    })
  })

  it('notifies listeners on online and offline events', async () => {
    const online = { onLine: true }
    vi.stubGlobal('navigator', online)
    const window = stubWindow()
    const seen: string[] = []
    const subscription = addNetworkStateListener((state) => {
      seen.push(`${state.type}:${state.isConnected}`)
    })
    online.onLine = false
    window.fire('offline')
    online.onLine = true
    window.fire('online')
    expect(seen).toEqual(['NONE:false', 'UNKNOWN:true'])
    subscription.remove()
    expect(window.count('online')).toBe(0)
    expect(window.count('offline')).toBe(0)
  })

  it('returns a removable no-op subscription without a window', () => {
    addNetworkStateListener(() => {
      throw new Error('must not fire')
    }).remove()
  })
})

describe('normalizeState', () => {
  it('passes a valid native payload through', () => {
    expect(
      normalizeState({ type: 'WIFI', isConnected: true, isInternetReachable: true })
    ).toEqual({ type: 'WIFI', isConnected: true, isInternetReachable: true })
  })

  it('falls back to unknown for garbage', () => {
    expect(normalizeState(null)).toEqual({
      type: 'UNKNOWN',
      isConnected: false,
      isInternetReachable: false,
    })
    expect(normalizeState({ type: 'WIFI', isConnected: 1 })).toEqual({
      type: 'WIFI',
      isConnected: false,
      isInternetReachable: false,
    })
    expect(
      normalizeState({ type: 'SATELLITE', isConnected: true, isInternetReachable: true })
    ).toEqual({ type: 'UNKNOWN', isConnected: true, isInternetReachable: true })
  })

  it('keeps the expo network state type values', () => {
    expect(NetworkStateType).toEqual({
      NONE: 'NONE',
      UNKNOWN: 'UNKNOWN',
      CELLULAR: 'CELLULAR',
      WIFI: 'WIFI',
      BLUETOOTH: 'BLUETOOTH',
      ETHERNET: 'ETHERNET',
      WIMAX: 'WIMAX',
      VPN: 'VPN',
      OTHER: 'OTHER',
    })
  })
})
