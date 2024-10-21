import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { compress } from 'hono/compress'

import type { VXRNOptions } from '../types'

export const createProdServer = async (options: VXRNOptions) => {
  const app = new Hono()
  const serverOptions = options.server || {}

  if (serverOptions.compress !== false) {
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

    return response
  })

  return app
}
