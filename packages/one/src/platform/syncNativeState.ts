import { useCallback, useRef, useSyncExternalStore } from 'react'

import { createSyncState, isSyncState, type SyncState } from './syncStore'

// observable state shared between JavaScript and native views, matching Expo's
// useNativeState surface: one handle feeds any number of controlled props, so
// every bound view converges on the same value. the handle is created once per
// hook instance; writes go straight to the sync store and notify subscribers
// in the same frame, never waiting for a React render. the component itself
// subscribes so `.value` reads in render stay live.
export type NativeState<T> = SyncState<T>

export function useNativeState<T>(initial: T): NativeState<T> {
  const ref = useRef<SyncState<T> | null>(null)
  if (ref.current === null) {
    ref.current = createSyncState(initial)
  }
  const state = ref.current
  useSyncExternalStore(state.subscribe, state.getSnapshot, state.getSnapshot)
  return state
}

// the handle behind a sync value prop, or null for a plain scalar. generated
// adapters use this to write native events back into the caller's handle.
export function syncHandleOf<T>(value: T | SyncState<T>): SyncState<T> | null {
  return isSyncState(value) ? (value as SyncState<T>) : null
}

// resolves a sync value prop to the plain scalar the native view carries. a
// handle subscribes, so writes from any bound view re-render this one; a plain
// scalar passes through untouched.
export function useSyncValue<T>(value: T | SyncState<T>): T {
  const handle = syncHandleOf(value)
  const subscribe = useCallback(
    (notify: () => void) => (handle ? handle.subscribe(notify) : () => {}),
    [handle]
  )
  const getSnapshot = useCallback(
    () => (handle ? handle.getSnapshot() : (value as T)),
    [handle, value]
  )
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
