import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { configuration } from './configure'

/**
 * Fast file-based cache for babel transforms
 * Uses file mtime + content hash + config fingerprint for invalidation
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

// the cache persists in node_modules/.vxrn/compiler-cache and entries are
// validated only against input file mtime/content + the config fingerprint.
// transform output also depends on the compiler implementation itself, so the
// fingerprint must include the compiler version - otherwise entries written by
// an older @vxrn/compiler survive an upgrade and serve stale transforms.
function getOwnVersion(): string {
  try {
    const dir =
      typeof __dirname !== 'undefined'
        ? // CommonJS
          __dirname
        : // ESM
          dirname(fileURLToPath(import.meta.url))
    // compiled output runs from dist/{esm,cjs}, two levels below the package
    // root; straight from src (tests) it's one level below
    for (const relativeRoot of ['..', join('..', '..')]) {
      const candidate = join(dir, relativeRoot, 'package.json')
      if (existsSync(candidate)) {
        const packageJson = JSON.parse(readFileSync(candidate, 'utf-8'))
        if (packageJson.name === '@vxrn/compiler' && packageJson.version) {
          return packageJson.version
        }
      }
    }
  } catch {
    // fall through to the static fallback marker
  }
  return 'unknown'
}

const compilerVersion = getOwnVersion()

// hash compiler version + config state so cache invalidates when the compiler
// is upgraded or the compiler/reanimated/nativewind toggles change
function getConfigFingerprint(): string {
  return createHash('sha1')
    .update(
      JSON.stringify({
        version: compilerVersion,
        compiler: configuration.enableCompiler,
        reanimated: configuration.enableReanimated,
        nativewind: configuration.enableNativewind,
        nativeCSS: configuration.enableNativeCSS,
      })
    )
    .digest('hex')
    .slice(0, 8)
}

function getCacheKey(filePath: string, environment: string): string {
  const hash = createHash('sha1')
    .update(`${environment}:${filePath}:${getConfigFingerprint()}`)
    .digest('hex')
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
    console.warn(`[cache] Failed to write cache for ${filePath}:`, err)
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
