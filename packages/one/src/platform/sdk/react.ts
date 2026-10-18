import { useMemo, useSyncExternalStore } from 'react'
import {
  observeSDKProperty,
  subscribeSDK,
  type SDKHandle,
  type SDKObservationKind,
} from './wire'

export type SDKState<T> =
  | { status: 'pending'; value: undefined; error: undefined }
  | { status: 'value'; value: T; error: undefined }
  | { status: 'error'; value: T | undefined; error: Error }

type Start<T> = (value: (value: T) => void, error: (error: Error) => void) => () => void

// snapshots are cached for React; subscriptions begin only at commit, never
// during rendering. the generation gate rejects callbacks queued before teardown.
export function createSDKStore<T>(start: Start<T>) {
  let state: SDKState<T> = { status: 'pending', value: undefined, error: undefined }
  const listeners = new Set<() => void>()
  let stop: (() => void) | undefined
  let generation = 0
  const publish = (next: SDKState<T>) => {
    state = next
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) {
        const current = ++generation
        try {
          stop = start(
            (value) => {
              if (current === generation) publish({ status: 'value', value, error: undefined })
            },
            (error) => {
              if (current === generation) publish({ status: 'error', value: state.value, error })
            }
          )
        } catch (error) {
          publish({ status: 'error', value: state.value,
            error: error instanceof Error ? error : new Error(String(error)) })
        }
      }
      return () => {
        listeners.delete(listener)
        if (!listeners.size) {
          generation++
          const cleanup = stop
          stop = undefined
          cleanup?.()
        }
      }
    },
  }
}

export function useSDKProperty<T extends SDKHandle, K extends keyof T & string>(
  object: T | null | undefined,
  property: K,
  kind: SDKObservationKind = 'kvo'
): SDKState<Awaited<T[K]>> {
  const store = useMemo(() => createSDKStore<Awaited<T[K]>>((value, error) =>
    object ? observeSDKProperty(object, property, kind, value, error) : () => {}
  ), [object, property, kind])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useSDKPublisher<T>(object: SDKHandle | null | undefined): SDKState<T> {
  return useSDKStream<T>(object, 'publisher')
}

export function useSDKAsyncSequence<T>(object: SDKHandle | null | undefined): SDKState<T> {
  return useSDKStream<T>(object, 'sequence')
}

function useSDKStream<T>(object: SDKHandle | null | undefined, kind: 'publisher' | 'sequence') {
  const store = useMemo(() => createSDKStore<T>((value, error) =>
    object ? subscribeSDK(object, kind, value, error) : () => {}
  ), [object, kind])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
