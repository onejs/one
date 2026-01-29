import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolvePath } from '@vxrn/resolve'

const DEVTOOLS_VIRTUAL_ID = '/@one/dev.js'

export type DevtoolsPluginOptions = {
  /** include devtools UI (overlay, inspector) - default true */
  includeUI?: boolean
}

export function createDevtoolsPlugin(options: DevtoolsPluginOptions = {}): Plugin {
  const { includeUI = true } = options

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
            const devEntry = readFileSync(devEntryPath, 'utf-8')

            // remove the relative imports from dev.mjs - we'll conditionally add them
            let code = devEntry
              .replace("import './devtools.mjs'", '')
              .replace("import './source-inspector.mjs'", '')

            // only include devtools UI if enabled
            if (includeUI) {
              const devtoolsPath = resolvePath('one/devtools/devtools.mjs')
              const sourceInspectorPath = resolvePath('one/devtools/source-inspector.mjs')
              const devtools = readFileSync(devtoolsPath, 'utf-8')
              const sourceInspector = readFileSync(sourceInspectorPath, 'utf-8')
              code = `${code}\n${devtools}\n${sourceInspector}`
            }

            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Cache-Control', 'no-store')
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
