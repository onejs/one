// observable state shared between JavaScript and native views, in the shape of
// Expo's useNativeState: one handle feeds any number of controlled props, so
// every bound view converges on the same value.
//
// the write path never traverses React: set() stores the value and notifies
// every subscriber synchronously, in the same frame. React only re-renders
// readers (via useSyncExternalStore in useNativeState); a second bound view,
// an onChange listener, or any subscriber observes the write before commit.
//
// when react-native-worklets is installed the value is backed by a SharedValue,
// so UI-runtime worklets holding the handle read the latest write synchronously
// through JSI shared memory. without it the same API runs on a plain JS cell.
// there is no hard dependency: the require is lazy and failure is silent.
export const SYNC_STATE_ID_KEY = '__one_sync_state_id__' as const
export const SYNC_STATE_BRAND = '__one_sync_state__' as const

export type SyncStateListener<T> = (value: T) => void

export type SyncState<T> = {
  // the current value. reads and writes are synchronous on the calling thread;
  // with a worklets backing, writes are immediately visible to UI worklets.
  value: T
  // React Compiler compliant read/write alternatives to `.value`.
  get(): T
  set(value: T): void
  // single listener invoked synchronously inside set(), before subscribers.
  // assign a worklet when the write originates on the UI runtime; assign null
  // to clear. the initial value does not fire onChange.
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

type SharedValue<T> = { value: T }
type MakeMutable = <T>(initial: T) => SharedValue<T>

let nextId = 1
let makeMutable: MakeMutable | null | undefined

function loadMakeMutable(): MakeMutable | null {
  if (makeMutable !== undefined) return makeMutable
  makeMutable = null
  try {
    const req = (globalThis as { require?: (id: string) => unknown }).require
    const worklets = req?.('react-native-worklets') as
      | { makeMutable?: unknown }
      | undefined
    if (worklets && typeof worklets.makeMutable === 'function') {
      makeMutable = worklets.makeMutable as MakeMutable
    }
  } catch {
    // worklets support is optional; fall through to the JS cell.
  }
  return makeMutable
}

export function createSyncState<T>(initial: T): SyncState<T> {
  const id = nextId++
  const backing = loadMakeMutable()?.<T>(initial)
  let current = initial
  let onChange: SyncStateListener<T> | null = null
  const listeners = new Set<SyncStateListener<T>>()

  const read = (): T => (backing ? backing.value : current)
  const state = {
    get value(): T {
      return read()
    },
    set value(next: T) {
      state.set(next)
    },
    get(): T {
      return read()
    },
    set(next: T): void {
      if (backing) backing.value = next
      current = next
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
      return read()
    },
    [SYNC_STATE_BRAND]: true as const,
    [SYNC_STATE_ID_KEY]: id as number,
  } satisfies SyncState<T>
  return state
}

// test seam: reset the cached worklets binding after mutating global require.
export function __resetSyncStoreForTests(): void {
  makeMutable = undefined
}
