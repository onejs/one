import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

const WARM_DEPS_FILE = 'one-warm-deps.json'

/**
 * Reads cached warm deps from a previous session and injects them into
 * optimizeDeps.include so they're pre-optimized on startup.
 *
 * The actual warming + cache writing happens in fileSystemRouterPlugin
 * where the route manifest is available.
 */
export function warmRoutesPlugin(): Plugin {
  return {
    name: 'one:warm-routes',
    apply: 'serve',

    config() {
      const cacheFile = join(process.cwd(), 'node_modules', '.vite', WARM_DEPS_FILE)
      try {
        if (existsSync(cacheFile)) {
          const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'))
          if (Array.isArray(cached.deps) && cached.deps.length > 0) {
            console.info(`[one] loading ${cached.deps.length} cached warm deps`)
            return {
              optimizeDeps: {
                include: cached.deps,
              },
            }
          }
        }
      } catch {
        // cache corrupted, ignore
      }
    },
  }
}
