import { Hono } from 'hono'
export { serveStatic } from '@hono/node-server/serve-static'
import type { VXRNServeOptions } from '../types'
import { applyCompression, createProdServer } from './createServer'

export { loadEnv } from '../exports/loadEnv'
export * from '../utils/getServerEntry'
export { createProdServer, applyCompression } from './createServer'

export const serve = async ({
  afterRegisterRoutes,
  beforeRegisterRoutes,
  app = new Hono(),
  ...optionsIn
}: VXRNServeOptions) => {
  const { getServerOptionsFilled } = await import('../config/getServerOptionsFilled')
  const options = await getServerOptionsFilled(optionsIn, 'prod')

  // apply compression before any routes so it applies to all handlers
  applyCompression(app, options)

  if (beforeRegisterRoutes) {
    await beforeRegisterRoutes(options, app)
  }

  // createProdServer will skip compression since we already applied it
  await createProdServer(app, options, { skipCompression: true })

  if (afterRegisterRoutes) {
    await afterRegisterRoutes(options, app)
  }

  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))

  const { honoServeNode } = await import('../serve/node')
  return honoServeNode(app, options)
}
