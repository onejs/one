import type { Hono } from 'hono'
import type { VXRNOptions, VXRNServePlatform } from '../types'
import { createProdServer } from './createServer'

export { loadEnv } from '../exports/loadEnv'
export * from '../utils/getServerEntry'
export { createProdServer } from './createServer'

export const serve = async (
  optionsIn: VXRNOptions & {
    platform?: VXRNServePlatform
    beforeStart?: (options: VXRNOptions, app: Hono) => void | Promise<void>
  }
) => {
  const { fillOptions } = await import('../utils/getOptionsFilled')
  const options = await fillOptions(optionsIn, { mode: 'prod' })

  // see this for more hono setup
  const app = await createProdServer(options)

  if (optionsIn.beforeStart) {
    await optionsIn.beforeStart(options, app)
  }

  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))

  const platform = optionsIn?.platform ?? options?.server?.platform ?? 'node'

  switch (platform) {
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
