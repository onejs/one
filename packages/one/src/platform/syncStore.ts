import { getNativeSyncFactory, type NativeSyncHost } from './syncNative'

// observable state shared between JavaScript and native views: one handle feeds
// any number of controlled props, so every bound view converges on the same value.
//
// the value lives in the native registry, owned outside every JS runtime. the
// JSI host object reads and writes it synchronously from the JS runtime and
// the UI worklet runtime alike; SwiftUI and Compose models observe the same
// entry directly, so bound views converge without a React render. React is
// never the source of truth: components only subscribe (see useNativeState).
export const SYNC_STATE_ID_KEY = '__one_sync_state_id__' as const
export const SYNC_STATE_BRAND = '__one_sync_state__' as const

export type SyncStateListener<T> = (value: T) => void

export type SyncState<T> = {
  // the current value, read synchronously from the native entry.
  value: T
  // React Compiler compliant read/write alternatives to `.value`.
  get(): T
  set(value: T): void
  // single listener invoked through the native entry on every write, before
  // subscribers. assign null to clear. the initial value does not fire
  // onChange, and setting the value it already holds is a no-op.
  onChange: SyncStateListener<T> | null
  // subscribe a JS listener; returns an unsubscribe function.
  subscribe(listener: SyncStateListener<T>): () => void
  // destroys the native entry. manual: see NativeSyncHost.release.
  release(): void
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

export function createSyncState<T>(initial: T): SyncState<T> {
  const host: NativeSyncHost<T> = getNativeSyncFactory().create<T>(initial)
  let onChange: SyncStateListener<T> | null = null
  const listeners = new Set<SyncStateListener<T>>()

  const state = {
    get value(): T {
      return host.get()
    },
    set value(next: T) {
      state.set(next)
    },
    get(): T {
      return host.get()
    },
    set(next: T): void {
      // React-style bailout: an identical write notifies nothing. this also
      // absorbs the native-event echo, where the entry already holds the
      // value the event carries.
      if (Object.is(host.get(), next)) return
      // the native entry invokes onChange synchronously inside set; the JS
      // subscribers follow, so onChange always lands first.
      host.set(next)
      // copy: listeners may subscribe/unsubscribe (or set) reentrantly.
      for (const listener of [...listeners]) listener(next)
    },
    get onChange(): SyncStateListener<T> | null {
      return onChange
    },
    set onChange(next: SyncStateListener<T> | null | undefined) {
      onChange = next ?? null
      host.setOnChange(onChange)
    },
    subscribe(listener: SyncStateListener<T>): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    release(): void {
      listeners.clear()
      onChange = null
      host.release()
    },
    getSnapshot(): T {
      return host.get()
    },
    [SYNC_STATE_BRAND]: true as const,
    [SYNC_STATE_ID_KEY]: host.id as number,
  } satisfies SyncState<T>
  return state
}
