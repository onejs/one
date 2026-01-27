import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolvePath } from '@vxrn/resolve'

const DEVTOOLS_VIRTUAL_ID = '/@one/dev.js'

export function createDevtoolsPlugin(): Plugin {
  return {
    name: 'one-devtools',
    apply: 'serve', // only in dev

    configureServer(server) {
      // serve the devtools script by reading and combining the source files
      server.middlewares.use(async (req, res, next) => {
        if (req.url === DEVTOOLS_VIRTUAL_ID) {
          try {
            // resolve and read the devtools files directly
            const devEntryPath = resolvePath('one/devtools/dev.mjs')
            const devtoolsPath = resolvePath('one/devtools/devtools.mjs')
            const sourceInspectorPath = resolvePath('one/devtools/source-inspector.mjs')

            const devEntry = readFileSync(devEntryPath, 'utf-8')
            const devtools = readFileSync(devtoolsPath, 'utf-8')
            const sourceInspector = readFileSync(sourceInspectorPath, 'utf-8')

            // remove the relative imports from dev.mjs and inline the code
            const devEntryCode = devEntry
              .replace("import './devtools.mjs'", '')
              .replace("import './source-inspector.mjs'", '')

            // combine all code - devtools and source-inspector are IIFEs that run directly
            const code = `${devEntryCode}\n${devtools}\n${sourceInspector}`

            res.setHeader('Content-Type', 'application/javascript')
            res.end(code)
            return
          } catch (e) {
            console.error('[one] Failed to load devtools script:', e)
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
