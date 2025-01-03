import { serve as honoServe } from '@hono/node-server'
import type { Hono } from 'hono'
import type { VXRNServeOptions } from '../types'

export async function honoServeNode(app: Hono, options: VXRNServeOptions) {
  const server = honoServe({
    fetch: app.fetch,
    port: options.port,
    hostname: options.host,
  })

  console.info(`Server running on http://${options.host}:${options.port}`)

  await new Promise<void>((res) => {
    server.on('close', () => {
      res()
    })
  })
}
