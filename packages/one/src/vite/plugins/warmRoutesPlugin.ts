import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const WARM_DEPS_FILE = 'one-warm-deps.json'

export function warmRoutesPlugin(routes: string[]): Plugin {
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

    configureServer(server) {
      if (!server.httpServer) return

      if (server.httpServer.listening) {
        startWarming(server, routes)
        return
      }

      server.httpServer.once('listening', () => {
        startWarming(server, routes)
      })
    },
  }
}

function startWarming(server: ViteDevServer, routes: string[]) {
  const addr = server.httpServer!.address()
  const port = typeof addr === 'object' && addr ? addr.port : null
  if (!port) return

  const baseUrl = `http://localhost:${port}`

  // delay to let server fully initialize
  setTimeout(() => {
    warmAndCacheDeps(server, routes, baseUrl).catch((err) => {
      console.warn('[one] warm routes failed:', err)
    })
  }, 1000)
}

async function warmAndCacheDeps(
  server: ViteDevServer,
  routes: string[],
  baseUrl: string
) {
  for (const route of routes) {
    try {
      console.info(`[one] warming ${route}`)
      await fetch(`${baseUrl}${route}`)
    } catch {
      // route may not exist, that's ok
    }
  }

  // wait for dep optimization to settle after warming
  await new Promise((r) => setTimeout(r, 2000))

  // read vite's metadata file directly to get all discovered deps
  const cacheDir = server.config.cacheDir
  const metadataFile = join(cacheDir, 'deps', '_metadata.json')

  try {
    const metadata = JSON.parse(readFileSync(metadataFile, 'utf-8'))
    const deps = Object.keys(metadata.optimized || {})

    if (deps.length === 0) return

    const sorted = deps.sort()
    writeFileSync(
      join(cacheDir, WARM_DEPS_FILE),
      JSON.stringify({ deps: sorted }, null, 2)
    )

    console.info(`[one] warmed ${routes.length} routes, cached ${sorted.length} deps`)
  } catch {
    // metadata not available yet, will cache on next run
  }
}
