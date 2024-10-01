import type { VXRNOptions } from '../types'
import { fillOptions } from '../utils/getOptionsFilled'
import { createProdServer } from './createServer'

export const serve = async (optionsIn: VXRNOptions) => {
  const options = await fillOptions(optionsIn, { mode: 'prod' })

  // see this for more hono setup
  const app = await createProdServer(options)

  if (options.server.beforeStart) {
    await options.server.beforeStart(options, app)
  }

  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))

  const platform = options.server?.platform || 'node'

  function afterServerStart() {
    if (options.server.afterStart) {
      setTimeout(() => {
        options.server.afterStart?.(options, app)
      })
    }
  }

  switch (platform) {
    case 'node': {
      const { honoServeNode } = await import('../serve/node')
      afterServerStart()
      return honoServeNode(app, options)
    }

    case 'vercel': {
      const { honoServeVercel } = await import('../serve/vercel')
      afterServerStart()
      return honoServeVercel(app, options)
    }
  }
}
