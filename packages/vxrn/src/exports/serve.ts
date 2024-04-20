import sirv from 'sirv'
import type { VXRNConfig } from '../types'
import { getOptionsFilled } from '../utils/getOptionsFilled'
import { createApp, defineEventHandler } from 'h3'

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
}

// app.use(
//   defineEventHandler(async ({ node: { req, res } }) => {
//     const url = req.originalUrl
//     const template = fs.readFileSync(path.resolve('dist/client/index.html'), 'utf-8')
//     // @ts-ignore
//     const render = (await import('./dist/server/entry-server.js')).render
//     const appHtml = await render({ path: url })
//     const html = template.replace(`<!--ssr-outlet-->`, appHtml)
//     res.setHeader('Content-Type', 'text/html')
//     return html
//   })
// )
