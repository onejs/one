import {
  createSynchronizable,
  type Synchronizable,
} from 'react-native-worklets'

// observable state shared between JavaScript and native views: one handle feeds
// any number of controlled props, so every bound view converges on the same value.
//
// the value lives in a worklets Synchronizable, shared memory readable and
// writable synchronously from both the JS runtime and the UI worklet runtime.
// React is never the source of truth: components only subscribe (see
// useNativeState), and the write path never waits for a render. direct
// UI-runtime access to the handle arrives with the native state module, which
// observes this same storage from SwiftUI and Compose.
export const SYNC_STATE_ID_KEY = '__one_sync_state_id__' as const
export const SYNC_STATE_BRAND = '__one_sync_state__' as const

export type SyncStateListener<T> = (value: T) => void

export type SyncState<T> = {
  // the current value, read synchronously from shared memory.
  value: T
  // React Compiler compliant read/write alternatives to `.value`.
  get(): T
  set(value: T): void
  // single listener invoked synchronously inside set(), before subscribers.
  // assign null to clear. the initial value does not fire onChange, and
  // setting the value it already holds is a no-op.
  onChange: SyncStateListener<T> | null
  // subscribe a JS listener; returns an unsubscribe function.
  subscribe(listener: SyncStateListener<T>): () => void
  // stable snapshot for useSyncExternalStore: same reference until set().
  getSnapshot(): T
  readonly [SYNC_STATE_BRAND]: true
  readonly [SYNC_STATE_ID_KEY]: number
}

export function isSyncState(value: unknown): value is SyncState<unknown> {
  if (value == null || typeof value !== 'object') return false
  const obj = value as Partial<SyncState<unknown>>
  return (
    obj[SYNC_STATE_BRAND] === true &&
    typeof obj[SYNC_STATE_ID_KEY] === 'number' &&
    obj[SYNC_STATE_ID_KEY] !== 0
  )
}

// extracts the numeric id for generated props that bind by handle.
export function getSyncStateId(state: object | null | undefined): number | undefined {
  if (!state) return undefined
  return (state as { [SYNC_STATE_ID_KEY]?: number })[SYNC_STATE_ID_KEY]
}

let nextId = 1

export function createSyncState<T>(initial: T): SyncState<T> {
  const id = nextId++
  const shared: Synchronizable<T> = createSynchronizable(initial)
  let onChange: SyncStateListener<T> | null = null
  const listeners = new Set<SyncStateListener<T>>()

  const state = {
    get value(): T {
      return shared.getBlocking()
    },
    set value(next: T) {
      state.set(next)
    },
    get(): T {
      return shared.getBlocking()
    },
    set(next: T): void {
      // React-style bailout: an identical write notifies nothing. this also
      // absorbs the native-event echo, where the handle already holds the
      // value the event carries.
      if (Object.is(shared.getBlocking(), next)) return
      shared.setBlocking(next)
      // onChange first: it is the UI-runtime listener, closest to native.
      onChange?.(next)
      // copy: listeners may subscribe/unsubscribe (or set) reentrantly.
      for (const listener of [...listeners]) listener(next)
    },
    get onChange(): SyncStateListener<T> | null {
      return onChange
    },
    set onChange(next: SyncStateListener<T> | null | undefined) {
      onChange = next ?? null
    },
    subscribe(listener: SyncStateListener<T>): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot(): T {
      return shared.getBlocking()
    },
    [SYNC_STATE_BRAND]: true as const,
    [SYNC_STATE_ID_KEY]: id as number,
  } satisfies SyncState<T>
  return state
}
