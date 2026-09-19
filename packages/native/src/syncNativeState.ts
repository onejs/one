import { useRef, useSyncExternalStore } from 'react'

import { createSyncState, type SyncState } from './syncStore'

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
