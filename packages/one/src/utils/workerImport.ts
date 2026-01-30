/**
 * Helper for importing modules in worker threads.
 * Workers need .mjs extensions for proper ESM resolution.
 *
 * Usage: Pass the caller's import.meta.url to resolve relative paths correctly.
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

type ModuleCache = Map<string, any>
const cache: ModuleCache = new Map()

/**
 * Import a module in a worker-safe way with caching.
 * Automatically appends .mjs extension for proper ESM resolution in workers.
 *
 * @param relativePath - Path relative to the caller's file
 * @param callerUrl - Pass import.meta.url from the calling file
 */
export async function workerImport<T = any>(
  relativePath: string,
  callerUrl: string
): Promise<T> {
  const callerDir = dirname(fileURLToPath(callerUrl))
  const absolutePath = resolve(callerDir, relativePath)
  const cacheKey = absolutePath

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  // ensure .mjs extension for worker thread ESM resolution
  const mjsPath = absolutePath.endsWith('.mjs') ? absolutePath : `${absolutePath}.mjs`

  // @ts-ignore - runtime needs .mjs extension for proper ESM resolution
  const mod = await import(mjsPath)
  cache.set(cacheKey, mod)
  return mod
}
