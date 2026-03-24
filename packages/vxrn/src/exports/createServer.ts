import { serveStatic } from '@hono/node-server/serve-static'
import { compress } from 'hono/compress'
import { dirname, join } from 'node:path'
import type { VXRNServeOptions } from '../types'
import type { Hono } from 'hono'
import { compileCacheRules, serveStaticAssets } from './serveStaticAssets'

// paths that look like static assets (have a file extension or known prefix)
const staticExtRe = /\.\w{2,5}$/

export const applyCompression = (app: Hono, options: VXRNServeOptions) => {
  if (options.compress !== false) {
    app.use(compress())
  }
}

export const createProdServer = async (
  app: Hono,
  options: VXRNServeOptions,
  {
    skipCompression,
    outDir = 'dist',
  }: { skipCompression?: boolean; outDir?: string } = {}
) => {
  if (!skipCompression) {
    applyCompression(app, options)
  }

  // compile cache rules once at startup
  const cacheRules = options.cacheControl
    ? compileCacheRules(options.cacheControl)
    : undefined

  // skip static file lookup for SSR routes (paths without file extensions)
  app.use('*', async (context, next) => {
    const path = context.req.path
    if (!staticExtRe.test(path) && !path.startsWith('/assets/')) {
      return await next()
    }
    return await serveStaticAssets({ context, next, outDir, cacheRules })
  })

  app.notFound(async (c) => {
    const path = c.req.path
    let currentDir = dirname(path)

    while (true) {
      const response = await serveStatic({
        root: `./${outDir}/client`,
        path: join(currentDir, '+not-found.html'),
      })(c, async () => {})

      if (response && response.body) {
        c.status(404)
        return c.body(response.body)
      }

      const nextDir = dirname(currentDir)
      if (nextDir === currentDir) {
        break
      }
      currentDir = nextDir
    }

    return c.text('404 Not Found', { status: 404 })
  })

  return app
}
