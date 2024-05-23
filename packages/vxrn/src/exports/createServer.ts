import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { serveStatic } from '@hono/node-server/serve-static'

import type { VXRNConfig } from '../types'

export const createProdServer = async (options: VXRNConfig) => {
  const app = new Hono()

  app.use(compress())

  app.use(
    '*',
    serveStatic({
      root: './dist/client',
    })
  )

  if (options.serve) {
    options.serve(options, app)
  }

  return app
}
