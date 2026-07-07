const WATCH_FILE_KEY = '__oneWatchFile'

/**
 * Notifies One's HMR system about a file dependency so the page hot-reloads
 * when the file changes. No-op when One is not present or in production.
 */
export function notifyFileRead(filePath: string): void {
  const watchFile = (globalThis as any)[WATCH_FILE_KEY] as
    | ((path: string) => void)
    | undefined
  if (watchFile) watchFile(filePath)
}
