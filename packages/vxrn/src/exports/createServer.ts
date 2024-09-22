import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { compress } from 'hono/compress'

import type { VXRNOptions } from '../types'

export const createProdServer = async (options: VXRNOptions) => {
  const app = new Hono()
  const serverOptions = options.server || {}

  if (serverOptions.compression) {
    app.use(compress())
  }

  app.use('*', async (c, next) => {
    let didCallNext = false

    const response = await serveStatic({
      root: './dist/client',
    })(c, async () => {
      didCallNext = true
      await next()
    })

    if (!response || didCallNext) {
      return
    }

    // no cache let cdn do that shit
    if (serverOptions.cacheHeaders !== 'off') {
      if (!c.req.header('Cache-Control')) {
        c.header('Cache-Control', 'no-store')
        // safari was aggressively caching js for some reason despite no-store
        // https://stackoverflow.com/questions/48693693/macos-safari-caching-response-while-headers-specify-no-caching
        c.header('Vary', '*')
      }
    }

    return response
  })

  return app
}
