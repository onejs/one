// installs the mock native sync factory: the in-memory host honoring the
// host contract (synchronous get/set, same-runtime onChange delivery,
// release invalidation). loaded as a vitest setup file so every suite
// starts with a fresh global; the installer is re-exported so tests can
// restore it after removal.
import { createMemorySyncFactory } from '../src/platform/syncMemoryHost'
import type { NativeSyncHost } from '../src/platform/syncNative'

const GLOBAL_KEY = '__OneNativeSyncState'

export function installMockNativeSync(): void {
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] =
    createMemorySyncFactory()
}

installMockNativeSync()

// creates a handle whose native entry the test can write the way a native edit
// does: the entry changes before the view's event reaches JS, and only the
// entry's onChange hears it.
export function withNativeWrite<S>(createState: () => S): {
  handle: S
  host: NativeSyncHost<unknown>
  nativeWrite: (value: unknown) => void
} {
  const factory = (globalThis as Record<string, any>)[GLOBAL_KEY]
  let host: NativeSyncHost<unknown> | undefined
  const create = factory.create
  factory.create = (initial: unknown) => (host = create.call(factory, initial))
  try {
    const handle = createState()
    const entry = host!
    return { handle, host: entry, nativeWrite: entry.set.bind(entry) }
  } finally {
    factory.create = create
  }
}
