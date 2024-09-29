import { serve as honoServe } from '@hono/node-server'
import type { Hono } from 'hono'
import type { VXRNOptionsFilled } from '../utils/getOptionsFilled'

export async function honoServeNode(app: Hono, options: VXRNOptionsFilled) {
  const server = honoServe({
    fetch: app.fetch,
    port: options.server.port,
    hostname: options.server.host,
  })

  console.info(`Server running on http://${options.server.host}:${options.server.port}`)

  await new Promise<void>((res) => {
    server.on('close', () => {
      res()
    })
  })
}
