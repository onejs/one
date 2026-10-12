import { createMemorySyncFactory } from './syncMemoryHost'

// base installer: runtimes without the OneNative TurboModule (web, node)
// install the in-memory host. Metro resolves syncInstaller.native for iOS
// and Android, where a missing module still throws (see getNativeSyncFactory).
export type SyncStateInstaller = {
  install(): boolean
}

const GLOBAL_KEY = '__OneNativeSyncState'

export function getSyncStateInstaller(): SyncStateInstaller | null {
  return {
    install: () => {
      ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] ??=
        createMemorySyncFactory()
      return true
    },
  }
}
