import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  listeners: new Map<string, (args: unknown[]) => void>(),
  removed: [] as string[],
  nativeCalls: [] as { module: string; method: string; argsJson: string; hash: string }[],
}))

vi.mock('react-native', () => ({
  NativeModules: { OneNativeSourceEvents: {} },
  NativeEventEmitter: class {
    addListener(channel: string, listener: (args: unknown[]) => void) {
      mockState.listeners.set(channel, listener)
      return {
        remove: () => {
          mockState.listeners.delete(channel)
          mockState.removed.push(channel)
        },
      }
    }
  },
}))

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({
      call: (module: string, method: string, argsJson: string, hash: string) => {
        mockState.nativeCalls.push({ module, method, argsJson, hash })
        return Promise.resolve('null')
      },
    }),
  },
}))

import { subscribeNativeSourceEvent } from './events.native'

beforeEach(() => {
  mockState.listeners.clear()
  mockState.removed.length = 0
  mockState.nativeCalls.length = 0
})

describe('native source events', () => {
  it('listens on the module channel, registers natively, and revives payloads', () => {
    const received: unknown[][] = []
    const off = subscribeNativeSourceEvent(
      'clock_pkg.Clock',
      'onTick',
      (...args) => {
        received.push(args)
      },
      'hash',
      [{ kind: 'date' }],
      {}
    )
    // the native closure registers through the module's subscribe method
    expect(mockState.nativeCalls).toEqual([
      { module: 'clock_pkg.Clock', method: 'onTick', argsJson: '[]', hash: 'hash' },
    ])
    // payloads arrive revived
    mockState.listeners.get('OneNativeSource.clock_pkg.Clock.onTick')?.(['2026-01-01T00:00:00.000Z'])
    expect(received[0][0]).toBeInstanceOf(Date)
    // unsubscribing removes the javascript listener
    off()
    expect(mockState.removed).toEqual(['OneNativeSource.clock_pkg.Clock.onTick'])
    mockState.listeners.get('OneNativeSource.clock_pkg.Clock.onTick')?.(['2026-01-02T00:00:00.000Z'])
    expect(received).toHaveLength(1)
  })

  it('rejects a non-function listener before touching native', () => {
    expect(() =>
      subscribeNativeSourceEvent('clock_pkg.Clock', 'onTick', 'nope' as never, 'hash', [], {})
    ).toThrow('needs a listener function')
    expect(mockState.nativeCalls).toEqual([])
  })
})
