import { serve as honoServe } from '@hono/node-server'

import type { VXRNConfig } from '../types'
import { createProdServer } from './createServer'
import { getOptionsFilled } from '../utils/getOptionsFilled'

export const serve = async (optionsIn: VXRNConfig) => {
  const options = await getOptionsFilled(optionsIn, { mode: 'prod' })
  const app = await createProdServer(options)
  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))
  const server = honoServe({
    fetch: app.fetch,
    port: options.port,
    hostname: options.host,
  })
  // server.listen(options.port, options.host)
  console.info(`Listening on http://${options.host}:${options.port}`)
  await new Promise<void>((res) => {
    server.on('close', () => {
      res()
    })
  })
}
