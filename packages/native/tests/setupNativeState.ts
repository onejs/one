// installs the mock native sync factory: an in-memory registry honoring the
// host contract (synchronous get/set, same-runtime onChange delivery). loaded
// as a vitest setup file so every suite starts with the global installed; the
// installer is re-exported so tests can restore it after removal.
type Listener = (value: unknown) => void

type MockState = {
  value: unknown
  onChange: Listener | null
}

const GLOBAL_KEY = '__OneNativeSyncState'

export function installMockNativeSync(): void {
  const states = new Map<number, MockState>()
  let nextId = 1
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = {
    create(initial: unknown) {
      const id = nextId++
      const state: MockState = { value: initial, onChange: null }
      states.set(id, state)
      return {
        id,
        get: () => state.value,
        set: (next: unknown) => {
          state.value = next
          state.onChange?.(next)
        },
        setOnChange: (listener: Listener | null) => {
          state.onChange = listener ?? null
        },
        release: () => {
          states.delete(id)
        },
      }
    },
  }
}

installMockNativeSync()
