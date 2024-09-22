import type { VXRNOptions } from '../types'
import { getOptionsFilled } from '../utils/getOptionsFilled'
import { createProdServer } from './createServer'

export const serve = async (optionsIn: VXRNOptions) => {
  const options = await getOptionsFilled(optionsIn, { mode: 'prod' })

  // see this for more hono setup
  const app = await createProdServer(options)

  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))

  const platform = options.server?.platform || 'node'

  switch (platform) {
    case 'node': {
      const { honoServeNode } = await import('../serve/node')
      return honoServeNode(app, options)
    }

    case 'vercel': {
      const { honoServeVercel } = await import('../serve/vercel')
      return honoServeVercel(app, options)
    }
  }
}
