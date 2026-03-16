import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

const WARM_DEPS_FILE = 'one-warm-deps.json'

// how long after server start to track new deps (ms)
const TRACKING_WINDOW = 5 * 60 * 1000

/**
 * Passively tracks deps that Vite discovers during normal dev use.
 * On next startup, pre-includes them in optimizeDeps to avoid reload cascades.
 *
 * Use as a top-level plugin in vite.config.ts:
 *
 *   import { autoWarmPlugin } from 'one/vite'
 *   plugins: [autoWarmPlugin(), ...]
 *
 * Pass a path string to persist permanently instead of in .vite cache:
 *
 *   autoWarmPlugin('./src/dev/warmDeps.json')
 */
export function autoWarmPlugin(persistPath?: string): Plugin {
  let cacheFile: string
  let cachedDeps: string[] = []
  let excludeSet: Set<string>

  return {
    name: 'one:auto-warm',
    apply: 'serve',

    config() {
      const volatileCache = join(process.cwd(), 'node_modules', '.vite', WARM_DEPS_FILE)
      cacheFile =
        typeof persistPath === 'string' ? join(process.cwd(), persistPath) : volatileCache

      try {
        if (existsSync(cacheFile)) {
          const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'))
          if (Array.isArray(cached.deps) && cached.deps.length > 0) {
            cachedDeps = cached.deps
            // inject as include, will be filtered in configResolved
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

    configResolved(config: ResolvedConfig) {
      // build the exclude set from the resolved config
      excludeSet = new Set(config.optimizeDeps.exclude || [])

      if (cachedDeps.length > 0 && excludeSet.size > 0) {
        // remove any cached deps that are in the exclude list
        const conflicts = cachedDeps.filter((d) => excludeSet.has(d))
        if (conflicts.length > 0) {
          console.info(`[one] filtered ${conflicts.length} excluded deps from warm cache`)

          // mutate the resolved include to remove conflicts
          if (config.optimizeDeps.include) {
            ;(config.optimizeDeps as any).include = config.optimizeDeps.include.filter(
              (d: string) => !excludeSet.has(d)
            )
          }
        }
      }
    },

    configureServer(server) {
      let lastDepsCount = 0
      let timer: ReturnType<typeof setInterval>

      // deps that were already in the user's config before we added ours
      const userInclude = new Set(
        (server.config.optimizeDeps.include || []).filter(
          (d) => !cachedDeps.includes(d)
        )
      )

      function snapshotDeps() {
        try {
          const optimizer =
            (server as any).environments?.client?.depsOptimizer ??
            (server as any)._depsOptimizer

          if (!optimizer?.metadata) return

          const optimized = optimizer.metadata.optimized as Record<string, unknown>
          const discovered = optimizer.metadata.discovered as Record<string, unknown>

          const currentDeps = [
            ...Object.keys(optimized || {}),
            ...Object.keys(discovered || {}),
          ]

          if (currentDeps.length === 0 || currentDeps.length === lastDepsCount) return
          lastDepsCount = currentDeps.length

          // only cache deps that:
          // 1. aren't in the user's original config (no point caching what they already have)
          // 2. aren't in the exclude list
          const depsToCache = currentDeps.filter(
            (d) => !userInclude.has(d) && !excludeSet.has(d)
          )

          // merge with existing cache
          const allDeps = new Set(depsToCache)
          try {
            if (existsSync(cacheFile)) {
              const existing = JSON.parse(readFileSync(cacheFile, 'utf-8'))
              if (Array.isArray(existing.deps)) {
                for (const d of existing.deps) {
                  if (!excludeSet.has(d)) allDeps.add(d)
                }
              }
            }
          } catch {}

          const sorted = [...allDeps].sort()
          const dir = dirname(cacheFile)
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

          writeFileSync(cacheFile, JSON.stringify({ deps: sorted }, null, 2))
          console.info(`[one] cached ${sorted.length} deps for next startup`)
        } catch {
          // not ready yet, will retry
        }
      }

      server.httpServer?.once('listening', () => {
        timer = setInterval(snapshotDeps, 5000)

        setTimeout(() => {
          clearInterval(timer)
          snapshotDeps()
        }, TRACKING_WINDOW)
      })

      // snapshot on server close
      const origClose = server.close.bind(server)
      server.close = async () => {
        clearInterval(timer)
        snapshotDeps()
        return origClose()
      }
    },
  }
}

// keep old name as alias
export const warmRoutesPlugin = autoWarmPlugin
