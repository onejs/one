import { Hono } from 'hono'
import type { VXRNServeOptions } from '../types'
import { createProdServer } from './createServer'

export { loadEnv } from '../exports/loadEnv'
export * from '../utils/getServerEntry'
export { createProdServer } from './createServer'

export const serve = async (optionsIn: VXRNServeOptions) => {
  const { getServerOptionsFilled } = await import('../utils/getServerOptionsFilled')
  const options = await getServerOptionsFilled(optionsIn, 'prod')

  const app = new Hono()

  if (optionsIn.beforeRegisterRoutes) {
    await optionsIn.beforeRegisterRoutes(options, app)
  }

  // see this for more hono setup
  await createProdServer(app, options)

  if (optionsIn.afterRegisterRoutes) {
    await optionsIn.afterRegisterRoutes(options, app)
  }

  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))

  switch (options.platform) {
    case 'node': {
      const { honoServeNode } = await import('../serve/node')
      return honoServeNode(app, options)
    }

    case 'vercel': {
      const { honoServeVercel } = await import('../serve/vercel')
      return honoServeVercel(app, options)
    }

    case 'cloudflare': {
      return app
    }
  }
}
