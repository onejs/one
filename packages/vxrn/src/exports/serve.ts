import { createServer } from 'node:http'
import sirv from 'sirv'
import type { VXRNConfig } from '../types'
import { getOptionsFilled } from '../utils/getOptionsFilled'
import { createApp, defineEventHandler, toNodeListener } from 'h3'

export const serve = async (optionsIn: VXRNConfig) => {
  const options = await getOptionsFilled(optionsIn)

  const app = createApp()

  const sirvStaticMiddleware = sirv('dist/static', {
    gzip: true,
  })

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

  const server = createServer(toNodeListener(app))
  server.listen(3333)
  console.info(`Listening on http://localhost:3333`)

  await new Promise<void>((res) => {
    server.on('close', () => {
      res()
    })
  })
}
