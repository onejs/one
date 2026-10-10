import { getSyncStateInstaller } from './syncInstaller'

// one bound native registry entry, reachable from any runtime holding it. the
// JSI host object behind this interface is installed on both the RN runtime
// and the worklets UI runtime by OneNativeSyncState.install().
export type NativeSyncHost<T> = {
  readonly id: number
  get(): T
  set(value: T): void
  setOnChange(listener: ((value: T) => void) | null): void
  // destroys the native entry. the handle must not be used afterwards.
  // releasing is manual on purpose: an unmount cleanup cannot tell a real
  // unmount from a StrictMode remount, and auto-release would destroy live
  // state in development. borrowed handles must never outlive their owner.
  release(): void
}

export type NativeSyncFactory = {
  create<T>(initial: T): NativeSyncHost<T>
}

const GLOBAL_KEY = '__OneNativeSyncState'

type SyncGlobals = Record<string, NativeSyncFactory | undefined>

// lazy access to the installed native sync factory. the global is installed by
// the blocking JSI install; tests pre-install the mock (setupNativeState).
// never falls back on native: without the native module there is no handle.
// web/node resolve the base installer, which provides the in-memory platform
// host instead (see syncMemoryHost).
export function getNativeSyncFactory(): NativeSyncFactory {
  const globals = globalThis as unknown as SyncGlobals
  const existing = globals[GLOBAL_KEY]
  if (existing) return existing
  const installed = getSyncStateInstaller()?.install() ?? false
  const factory = installed ? globals[GLOBAL_KEY] : undefined
  if (!factory) {
    throw new Error(
      'useNativeState requires the OneNative native module (iOS or Android): the sync handle is native-owned.'
    )
  }
  return factory
}
