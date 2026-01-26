import type { Plugin, ViteDevServer } from 'vite'
import { resolvePath } from '@vxrn/resolve'

const DEVTOOLS_VIRTUAL_ID = '/@one/dev.js'

export function createDevtoolsPlugin(): Plugin {
  let server: ViteDevServer

  return {
    name: 'one-devtools',
    apply: 'serve', // only in dev

    configureServer(_server) {
      server = _server

      // serve the devtools script by transforming the source file
      server.middlewares.use(async (req, res, next) => {
        if (req.url === DEVTOOLS_VIRTUAL_ID) {
          try {
            // get the path to the source file - packages/one/devtools/dev.mjs
            const devEntryPath = resolvePath('one/devtools/dev.mjs')

            // let vite transform the file
            const result = await server.transformRequest(devEntryPath)

            if (result?.code) {
              res.setHeader('Content-Type', 'application/javascript')
              res.end(result.code)
              return
            }
          } catch (e) {
            console.error('[one] Failed to transform devtools script:', e)
          }

          res.setHeader('Content-Type', 'application/javascript')
          res.end('// devtools failed to load')
          return
        }
        next()
      })
    },
  }
}

export { DEVTOOLS_VIRTUAL_ID }
