const WATCH_FILE_KEY = '__oneWatchFile'

/**
 * Register a file dependency for loader HMR.
 * No-op on client, registers file path for watching on server.
 */
export function watchFile(path: string): void {
  if (typeof window !== 'undefined') return

  const impl = globalThis[WATCH_FILE_KEY] as ((path: string) => void) | undefined
  if (impl) {
    impl(path)
  }
}

/** @internal */
export function _registerWatchFileImpl(impl: (path: string) => void): void {
  globalThis[WATCH_FILE_KEY] = impl
}
