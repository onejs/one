import type { NativeSyncFactory, NativeSyncHost } from './syncNative'

// in-memory sync host for runtimes without the OneNative TurboModule (web,
// node). this is the platform implementation there, the way Expo's web
// useNativeState is useState-backed: there is no native entry to fall back
// from. native platforms never resolve this module.
type Listener<T> = (value: T) => void

type MemoryState<T> = {
  value: T
  onChange: Listener<T> | null
}

export function createMemorySyncFactory(): NativeSyncFactory {
  const states = new Map<number, MemoryState<unknown>>()
  let nextId = 1
  return {
    create<T>(initial: T): NativeSyncHost<T> {
      const id = nextId++
      const state: MemoryState<T> = { value: initial, onChange: null }
      states.set(id, state as MemoryState<unknown>)
      const released = () => {
        if (!states.has(id)) throw new Error('OneNativeSyncState was released')
      }
      return {
        id,
        get: () => {
          released()
          return state.value
        },
        set: (next: T) => {
          released()
          state.value = next
          state.onChange?.(next)
        },
        setOnChange: (listener: Listener<T> | null) => {
          state.onChange = listener ?? null
        },
        release: () => {
          states.delete(id)
        },
      }
    },
  }
}
