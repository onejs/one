// base installer: runtimes without the OneNative TurboModule (web, node tests)
// report no module; getNativeSyncFactory throws there. Metro resolves
// syncInstaller.native for iOS and Android.
export type SyncStateInstaller = {
  install(): boolean
}

export function getSyncStateInstaller(): SyncStateInstaller | null {
  return null
}
