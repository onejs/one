import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
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
      // vite 8.1 bundledDev: /@vite/client and /@react-refresh aren't standalone
      // modules (the HMR client + refresh runtime are bundled into the entry), so
      // dev.mjs's top-level imports of them 404 / fail MIME checks and take the whole
      // devtools script down. stub them: HMR (route/loader/css/cursor) becomes a
      // no-op here and the refresh preamble is installed by the bundled entry instead.
      const isBundledDev = !!(server.config as any).experimental?.bundledDev

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

            if (isBundledDev) {
              code = code
                .replace(
                  "import { createHotContext } from '/@vite/client'",
                  'const createHotContext = () => ({ on() {}, off() {}, accept() {}, dispose() {}, prune() {}, send() {}, invalidate() {} })'
                )
                .replace(
                  "import { injectIntoGlobalHook } from '/@react-refresh'",
                  'const injectIntoGlobalHook = () => {}'
                )
            }

            // only include devtools UI if enabled
            if (includeUI) {
              const devtoolsPath = resolvePath('one/devtools/devtools.mjs')
              const sourceInspectorPath = resolvePath('one/devtools/source-inspector.mjs')
              const devtools = readFileSync(devtoolsPath, 'utf-8')
              const sourceInspector = readFileSync(sourceInspectorPath, 'utf-8')
              const projectName = path.basename(process.cwd())
              code = `window.__oneProjectRoot="${projectName}";\n${code}\n${devtools}\n${sourceInspector}`
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
