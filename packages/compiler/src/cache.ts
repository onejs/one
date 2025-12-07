import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Fast file-based cache for babel transforms
 * Uses file mtime + content hash for invalidation
 */

interface CacheEntry {
  /** File modification time when cached */
  mtime: number
  /** Hash of file content for additional validation */
  hash: string
  /** Cached transform result */
  code: string
  /** Optional source map */
  map?: any
}

interface CacheStats {
  hits: 0
  misses: 0
  writes: 0
}

const stats: CacheStats = { hits: 0, misses: 0, writes: 0 }

function getCacheDir(): string {
  // Use .vxrn cache directory
  const cacheDir = join(process.cwd(), 'node_modules', '.vxrn', 'compiler-cache')
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }
  return cacheDir
}

function getCacheKey(filePath: string, environment: string): string {
  // Create a hash of the file path + environment for the cache key
  const hash = createHash('sha1').update(`${environment}:${filePath}`).digest('hex')
  return hash
}

function getContentHash(code: string): string {
  // Fast hash of file content
  return createHash('sha1').update(code).digest('hex').slice(0, 16)
}

export function getCachedTransform(
  filePath: string,
  code: string,
  environment: string
): { code: string; map?: any } | null {
  try {
    // Strip leading null byte (Vite virtual module prefix) if present
    const cleanPath = filePath.startsWith('\0') ? filePath.slice(1) : filePath
    const cacheDir = getCacheDir()
    const cacheKey = getCacheKey(cleanPath, environment)
    const cachePath = join(cacheDir, `${cacheKey}.json`)

    if (!existsSync(cachePath)) {
      stats.misses++
      return null
    }

    const cached: CacheEntry = JSON.parse(readFileSync(cachePath, 'utf-8'))

    // Check file mtime
    const currentMtime = statSync(cleanPath).mtimeMs
    if (cached.mtime !== currentMtime) {
      stats.misses++
      return null
    }

    // Double-check with content hash for safety
    const currentHash = getContentHash(code)
    if (cached.hash !== currentHash) {
      stats.misses++
      return null
    }

    stats.hits++
    return { code: cached.code, map: cached.map }
  } catch (err) {
    // If cache read fails, just treat as miss
    stats.misses++
    return null
  }
}

export function setCachedTransform(
  filePath: string,
  code: string,
  result: { code: string; map?: any },
  environment: string
): void {
  try {
    // Strip leading null byte (Vite virtual module prefix) if present
    const cleanPath = filePath.startsWith('\0') ? filePath.slice(1) : filePath
    const cacheDir = getCacheDir()
    const cacheKey = getCacheKey(cleanPath, environment)
    const cachePath = join(cacheDir, `${cacheKey}.json`)

    const mtime = statSync(cleanPath).mtimeMs
    const hash = getContentHash(code)

    const entry: CacheEntry = {
      mtime,
      hash,
      code: result.code,
      map: result.map,
    }

    writeFileSync(cachePath, JSON.stringify(entry), 'utf-8')
    stats.writes++
  } catch (err) {
    // Silently fail cache writes
    console.warn(`[cache] Failed to write cache for ${cleanPath}:`, err)
  }
}

export function getCacheStats(): CacheStats {
  return { ...stats }
}

export function logCacheStats(): void {
  // Only log cache stats when debugging
  if (!process.env.DEBUG_COMPILER_PERF) {
    return
  }

  const total = stats.hits + stats.misses
  if (total === 0) return

  const hitRate = ((stats.hits / total) * 100).toFixed(1)
  console.info(
    `\n💾 [Cache Stats] ${stats.hits} hits / ${stats.misses} misses (${hitRate}% hit rate), ${stats.writes} writes`
  )
}
