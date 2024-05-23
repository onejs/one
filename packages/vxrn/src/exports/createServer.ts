import { createApp, defineEventHandler } from 'h3'
import sirv from 'sirv'
import { useCompressionStream } from 'h3-compression'
import type { VXRNConfig } from '../types'

export const createProdServer = async (options: VXRNConfig) => {
  const app = createApp({
    onBeforeResponse: useCompressionStream,
  })

  const sirvStaticMiddleware = sirv('dist/static', {
    gzip: true,
  })

  if (options.serve) {
    options.serve(options, app)
  }

  app.use(
    defineEventHandler(async ({ node: { req, res } }) => {
      await new Promise<void>((response) => {
        sirvStaticMiddleware(req, res, () => {
          response()
        })
      })
    })
  )

  const sirvMiddleware = sirv('dist/client', {
    gzip: true,
  })

  app.use(
    defineEventHandler(async ({ node: { req, res } }) => {
      await new Promise<void>((response) => {
        sirvMiddleware(req, res, () => {
          response()
        })
      })
    })
  )

  return app
}
