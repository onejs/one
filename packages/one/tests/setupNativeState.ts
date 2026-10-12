// installs the mock native sync factory: the in-memory host honoring the
// host contract (synchronous get/set, same-runtime onChange delivery,
// release invalidation). loaded as a vitest setup file so every suite
// starts with a fresh global; the installer is re-exported so tests can
// restore it after removal.
import { createMemorySyncFactory } from '../src/platform/syncMemoryHost'

const GLOBAL_KEY = '__OneNativeSyncState'

export function installMockNativeSync(): void {
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] =
    createMemorySyncFactory()
}

installMockNativeSync()
