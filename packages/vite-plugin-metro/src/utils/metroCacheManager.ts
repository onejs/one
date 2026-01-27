import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { ViteDevServer } from 'vite'
import { createDebugger } from '@vxrn/debug'

const { debug } = createDebugger('vite-plugin-metro:cache')

const CACHE_METADATA_FILE = '_vite_metro_metadata.json'

type CacheMetadata = {
  lockfileHash: string
  configHash: string
  pluginVersion: string
}

/**
 * Get Metro cache directory path
 */
function getMetroCacheDir(root: string): string {
  // Metro uses /tmp/metro-* by default, but we'll store our metadata in node_modules/.cache
  return join(root, 'node_modules', '.cache', 'vite-plugin-metro')
}

/**
 * Get paths to Metro's actual cache directories that need clearing
 */
function getMetroCachePaths(root: string): string[] {
  const paths: string[] = []

  // node_modules/.cache locations
  paths.push(join(root, 'node_modules', '.cache', 'metro'))
  paths.push(join(root, 'node_modules', '.cache', 'babel-loader'))
  paths.push(join(root, 'node_modules', '.cache', 'haste-map'))

  return paths
}

/**
 * Read cached metadata
 */
function readCacheMetadata(cacheDir: string): CacheMetadata | null {
  const metadataPath = join(cacheDir, CACHE_METADATA_FILE)
  if (!existsSync(metadataPath)) return null

  try {
    return JSON.parse(readFileSync(metadataPath, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Write cache metadata
 */
function writeCacheMetadata(cacheDir: string, metadata: CacheMetadata): void {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }
  writeFileSync(join(cacheDir, CACHE_METADATA_FILE), JSON.stringify(metadata, null, 2))
}

/**
 * Clear Metro cache directories
 */
function clearMetroCache(root: string): void {
  const paths = getMetroCachePaths(root)

  for (const cachePath of paths) {
    if (existsSync(cachePath)) {
      try {
        rmSync(cachePath, { recursive: true, force: true })
        debug?.(`Cleared cache: ${cachePath}`)
      } catch (e) {
        debug?.(`Failed to clear cache ${cachePath}: ${e}`)
      }
    }
  }

  // also set env var so Metro knows to reset on its own cache
  process.env.METRO_RESET_CACHE = '1'
}

// current plugin version - bump when babel plugin changes
const PLUGIN_VERSION = '1'

/**
 * Check if Metro cache needs to be cleared based on Vite's dep optimization metadata.
 * This hooks into Vite's existing hash computation so we don't duplicate logic.
 * Call this after Vite's depsOptimizer is initialized.
 */
export function checkAndClearMetroCacheFromVite(
  server: ViteDevServer,
  logger: { info: (msg: string, opts?: { timestamp?: boolean }) => void }
): boolean {
  const { root } = server.config
  const cacheDir = getMetroCacheDir(root)

  // get Vite's computed hashes from the client environment's depsOptimizer
  const depsOptimizer = server.environments.client?.depsOptimizer
  if (!depsOptimizer) {
    debug?.('No depsOptimizer available, skipping Metro cache check')
    return false
  }

  const { lockfileHash, configHash } = depsOptimizer.metadata

  const currentMetadata: CacheMetadata = {
    lockfileHash,
    configHash,
    pluginVersion: PLUGIN_VERSION,
  }

  const cachedMetadata = readCacheMetadata(cacheDir)

  let shouldClear = false
  let reason = ''

  if (!cachedMetadata) {
    // first run, just write metadata
    writeCacheMetadata(cacheDir, currentMetadata)
    return false
  }

  if (cachedMetadata.pluginVersion !== PLUGIN_VERSION) {
    shouldClear = true
    reason = 'vite-plugin-metro was updated'
  } else if (cachedMetadata.lockfileHash !== lockfileHash) {
    shouldClear = true
    reason = 'lockfile has changed'
  } else if (cachedMetadata.configHash !== configHash) {
    shouldClear = true
    reason = 'vite config has changed'
  }

  if (shouldClear) {
    logger.info(`Clearing Metro cache because ${reason}`, { timestamp: true })
    clearMetroCache(root)
    writeCacheMetadata(cacheDir, currentMetadata)
    return true
  }

  return false
}
