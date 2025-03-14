import { Hono } from 'hono'
import type { VXRNServeOptions } from '../types'
import { createProdServer } from './createServer'

export { loadEnv } from '../exports/loadEnv'
export * from '../utils/getServerEntry'
export { createProdServer } from './createServer'

export const serve = async ({
  afterRegisterRoutes,
  beforeRegisterRoutes,
  app = new Hono(),
  ...optionsIn
}: VXRNServeOptions) => {
  const { getServerOptionsFilled } = await import('../utils/getServerOptionsFilled')
  const options = await getServerOptionsFilled(optionsIn, 'prod')

  if (beforeRegisterRoutes) {
    await beforeRegisterRoutes(options, app)
  }

  // see this for more hono setup
  await createProdServer(app, options)

  if (afterRegisterRoutes) {
    await afterRegisterRoutes(options, app)
  }

  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))

  const { honoServeNode } = await import('../serve/node')
  return honoServeNode(app, options)
}
