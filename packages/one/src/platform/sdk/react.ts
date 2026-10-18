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
  return useSDKState<Awaited<T[K]>>(object, kind, property)
}

export function useSDKPublisher<T>(object: SDKHandle | null | undefined): SDKState<T> {
  return useSDKState<T>(object, 'publisher')
}

export function useSDKAsyncSequence<T>(object: SDKHandle | null | undefined): SDKState<T> {
  return useSDKState<T>(object, 'sequence')
}

function useSDKState<T>(
  object: SDKHandle | null | undefined,
  kind: SDKObservationKind | 'publisher' | 'sequence',
  property?: string
): SDKState<T> {
  // native identity survives fresh hybrid handles for singleton and child getters.
  const identity = object?.$identity
  const store = useMemo(() => createSDKStore<T>((value, error) => {
    if (!object) return () => {}
    return kind === 'publisher' || kind === 'sequence'
      ? subscribeSDK(object, kind, value, error)
      : observeSDKProperty(object, property!, kind, value, error)
  }), [identity, property, kind])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
