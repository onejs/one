import { describe, expect, it, vi } from 'vitest'

import {
  createSyncState,
  getSyncStateId,
  isSyncState,
} from '../src/platform/syncStore'
import { installMockNativeSync } from './setupNativeState'

// the native handle resolves to the mock registry (tests/setupNativeState.ts,
// loaded as a setup file): the real host object needs the device runtime. the
// mock honors the host contract, so these tests pin the facade against it.
describe('sync store write path', () => {
  it('writes synchronously with no React involvement', () => {
    const state = createSyncState('')
    const seen: string[] = []
    state.subscribe((value) => {
      seen.push(value)
    })
    // the subscriber must observe the write before set() returns: same frame.
    let observedDuringSet: string | undefined
    state.subscribe((value) => {
      observedDuringSet = state.get()
      expect(value).toBe('hello')
    })
    state.set('hello')
    expect(observedDuringSet).toBe('hello')
    expect(state.get()).toBe('hello')
    expect(state.value).toBe('hello')
    expect(seen).toEqual(['hello'])
  })

  it('converges every bound view on one handle', () => {
    const state = createSyncState('a')
    const viewA: string[] = []
    const viewB: string[] = []
    state.subscribe((value) => {
      viewA.push(value)
    })
    state.subscribe((value) => {
      viewB.push(value)
    })
    state.set('b')
    expect(viewA).toEqual(['b'])
    expect(viewB).toEqual(['b'])
  })

  it('supports .value assignment like set()', () => {
    const state = createSyncState(0)
    const seen: number[] = []
    state.subscribe((value) => {
      seen.push(value)
    })
    state.value = 42
    expect(state.get()).toBe(42)
    expect(seen).toEqual([42])
  })

  it('bails out on identical writes', () => {
    const state = createSyncState('same')
    const listener = vi.fn()
    state.subscribe(listener)
    state.onChange = vi.fn()
    state.set('same')
    state.value = 'same'
    expect(listener).not.toHaveBeenCalled()
    expect(state.onChange).not.toHaveBeenCalled()
  })

  it('fires onChange synchronously before subscribers, never for the initial value', () => {
    const state = createSyncState('x')
    const order: string[] = []
    state.onChange = (value) => {
      order.push(`onChange:${value}`)
    }
    state.subscribe((value) => {
      order.push(`subscriber:${value}`)
    })
    expect(order).toEqual([])
    state.set('y')
    expect(order).toEqual(['onChange:y', 'subscriber:y'])
    state.onChange = null
    state.set('z')
    expect(order).toEqual(['onChange:y', 'subscriber:y', 'subscriber:z'])
  })

  it('unsubscribes cleanly', () => {
    const state = createSyncState(0)
    const listener = vi.fn()
    const unsubscribe = state.subscribe(listener)
    state.set(1)
    unsubscribe()
    state.set(2)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(1)
  })

  it('tolerates reentrant subscribe, unsubscribe, and set during notify', () => {
    const state = createSyncState(0)
    const seen: number[] = []
    const late = (value: number) => {
      seen.push(value * 100)
    }
    const first = (value: number) => {
      seen.push(value)
      if (value === 1) {
        state.subscribe(late)
        state.set(2)
      }
    }
    const selfRemoving = (value: number) => {
      seen.push(value * 10)
      unsubscribeSelf()
    }
    const unsubscribeSelf = state.subscribe(selfRemoving)
    state.subscribe(first)
    state.set(1)
    // first saw 1 then reentrant 2; selfRemoving saw 1, removed itself, missed 2;
    // late subscribed during the 1-notify, so it only sees 2.
    expect(seen).toContain(1)
    expect(seen).toContain(2)
    expect(seen).toContain(10)
    expect(seen).toContain(200)
    expect(seen).not.toContain(20)
    state.set(3)
    expect(seen).toContain(3)
    expect(seen).toContain(300)
    expect(seen).not.toContain(30)
  })

  it('returns a stable snapshot until the next set', () => {
    const state = createSyncState({ text: 'a' })
    expect(state.getSnapshot()).toBe(state.getSnapshot())
    const before = state.getSnapshot()
    state.set({ text: 'b' })
    expect(state.getSnapshot()).not.toBe(before)
    expect(state.getSnapshot()).toBe(state.get())
  })
})

describe('sync state identity', () => {
  it('brands handles with unique nonzero ids', () => {
    const a = createSyncState(0)
    const b = createSyncState(0)
    expect(isSyncState(a)).toBe(true)
    expect(getSyncStateId(a)).not.toBe(0)
    expect(getSyncStateId(a)).not.toBe(getSyncStateId(b))
    expect(getSyncStateId(null)).toBeUndefined()
    expect(getSyncStateId(undefined)).toBeUndefined()
  })

  it('rejects plain values and lookalikes', () => {
    expect(isSyncState('text')).toBe(false)
    expect(isSyncState(null)).toBe(false)
    expect(isSyncState(undefined)).toBe(false)
    expect(isSyncState({ value: 1 })).toBe(false)
    expect(isSyncState({ __one_sync_state__: true })).toBe(false)
    expect(
      isSyncState({ __one_sync_state__: true, __one_sync_state_id__: 0 })
    ).toBe(false)
  })
})

describe('native-owned storage', () => {
  it('binds each handle to its own native entry', () => {
    const a = createSyncState('a')
    const b = createSyncState('b')
    expect(getSyncStateId(a)).not.toBe(getSyncStateId(b))
    a.set('a2')
    expect(a.get()).toBe('a2')
    expect(b.get()).toBe('b')
    expect(a.getSnapshot()).toBe('a2')
  })

  it('releases the native entry on demand', () => {
    const state = createSyncState('doomed')
    const listener = vi.fn()
    state.subscribe(listener)
    state.onChange = listener
    state.release()
    expect(() => state.get()).toThrow('OneNativeSyncState was released')
    expect(() => state.set('x')).toThrow('OneNativeSyncState was released')
    expect(listener).not.toHaveBeenCalled()
  })

  it('installs the platform host where there is no native module', () => {
    // web/node resolve the base installer, which provides the in-memory
    // platform host: there is no native entry to fall back from there. the
    // native-throw path (installer null) is pinned in syncFactory.test.ts.
    const key = '__OneNativeSyncState'
    const globals = globalThis as Record<string, unknown>
    const saved = globals[key]
    delete globals[key]
    try {
      expect(createSyncState('x').get()).toBe('x')
    } finally {
      if (saved !== undefined) globals[key] = saved
      else installMockNativeSync()
    }
    // the mock restores cleanly for whatever runs next in this file.
    expect(createSyncState('y').get()).toBe('y')
  })
})
