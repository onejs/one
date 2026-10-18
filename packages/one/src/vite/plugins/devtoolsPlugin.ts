import type { Plugin, ViteDevServer } from 'vite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { resolvePath } from '@vxrn/resolve'
import { normalizePath } from 'vite'
import { startRozeniteHost, type RozeniteHostOptions } from '../../devtools/rozeniteHost'

const DEVTOOLS_VIRTUAL_ID = '/@one/dev.js'

export type DevtoolsPluginOptions = {
  /** include devtools UI (overlay, inspector) - default true */
  includeUI?: boolean
  /** browser plugin modules loaded into the overlay */
  plugins?: string[]
  /** Rozenite host options for React Native DevTools */
  rozenite?: RozeniteHostOptions | boolean
  /** the Vite native bundler is serving iOS/Android from this server */
  native?: boolean
}

async function resolveBrowserPlugin(
  server: ViteDevServer,
  root: string,
  specifier: string
): Promise<string | null> {
  const source =
    specifier.startsWith('.') || specifier.startsWith('/')
      ? path.isAbsolute(specifier)
        ? specifier
        : path.resolve(root, specifier)
      : specifier

  const resolved = await server.pluginContainer.resolveId(source, path.join(root, 'index.html'))
  if (!resolved) {
    console.warn(`[one] Could not resolve devtools plugin "${specifier}"`)
    return null
  }

  if (resolved.id.startsWith('\0')) {
    console.warn(`[one] Devtools plugin "${specifier}" resolved to a virtual module`)
    return null
  }

  return `/@fs/${normalizePath(resolved.id)}`
}

function getPluginRegistrationScript(imports: { id: string; url: string }[]): string {
  if (imports.length === 0) return ''

  // Dynamic imports so a broken plugin can never take down the devtools entry
  // module (and with it the Refresh runtime, HMR and the error overlay).
  return (
    '\n;' +
    imports
      .map(
        ({ id, url }) => `
import(${JSON.stringify(url)})
  .then((module) => {
    const plugin = module.default ?? module
    globalThis.__oneDevtools?.registerPlugin(plugin)
  })
  .catch((error) => {
    console.error('[One DevTools] Failed to load plugin ' + ${JSON.stringify(id)}, error)
  })`
      )
      .join('\n') +
    '\n'
  )
}

export function createDevtoolsPlugin(options: DevtoolsPluginOptions = {}): Plugin {
  const { includeUI = true } = options

  return {
    name: 'one-devtools',
    apply: 'serve', // only in dev

    async configureServer(server) {
      // vite 8.1 bundledDev: /@vite/client and /@react-refresh aren't standalone
      // modules (the HMR client + refresh runtime are bundled into the entry), so
      // dev.mjs's top-level imports of them 404 / fail MIME checks and take the whole
      // devtools script down. stub them: HMR (route/loader/css/cursor) becomes a
      // no-op here and the refresh preamble is installed by the bundled entry instead.
      const isBundledDev = !!(server.config as any).experimental?.bundledDev
      const root = server.config.root || process.cwd()

      const rozeniteOptions =
        typeof options.rozenite === 'object' ? options.rozenite : undefined

      if (options.native && includeUI && options.rozenite !== false) {
        const started = await startRozeniteHost(server, root, rozeniteOptions)
        if (started) {
          server.httpServer?.once('close', () => {
            void started.dispose()
          })
        }
      }

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

              if (options.plugins?.length) {
                const imports: { id: string; url: string }[] = []
                for (const specifier of options.plugins) {
                  const url = await resolveBrowserPlugin(server, root, specifier)
                  if (url) imports.push({ id: specifier, url })
                }
                code += getPluginRegistrationScript(imports)
              }
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
