import FSExtra from 'fs-extra'
import colors from 'picocolors'
import { debounce } from 'perfect-debounce'
import { normalizePath, type ViteDevServer } from 'vite'
import type { VXRNOptions } from '../types'

const { ensureDir } = FSExtra

// Exit if we become orphaned (parent dies). This prevents zombie dev servers.
function setupOrphanDetection() {
  if (process.platform === 'win32') return

  const initialPpid = process.ppid
  const interval = setInterval(() => {
    // If parent changed (usually to PID 1), we're orphaned
    if (process.ppid !== initialPpid) {
      process.exit(0)
    }
  }, 500)
  interval.unref()
}

export type DevOptions = VXRNOptions & {
  clean?: boolean
  /**
   * Path to an extra vite config file to merge on top of the project config (dev only)
   */
  extraConfig?: string
}

export const dev = async (optionsIn: DevOptions) => {
  setupOrphanDetection()

  const devStartTime = Date.now()
  process.env.IS_VXRN_CLI = 'true'

  if (typeof optionsIn.debug === 'string') {
    process.env.DEBUG ||= !optionsIn.debug ? `vite` : `vite:${optionsIn.debug}`
  }

  // import vite only after setting process.env.DEBUG
  const { startUserInterface } = await import('../user-interface/index')
  const { bindKeypressInput } = await import('../utils/bindKeypressInput')
  const { fillOptions } = await import('../config/getOptionsFilled')
  const { getViteServerConfig } = await import('../config/getViteServerConfig')
  const { printServerUrls } = await import('../utils/printServerUrls')
  const { clean } = await import('./clean')
  const { filterViteServerResolvedUrls } =
    await import('../utils/filterViteServerResolvedUrls')
  const { removeUndefined } = await import('../utils/removeUndefined')
  const { createServer, loadConfigFromFile } = await import('vite')

  let { config } =
    (await loadConfigFromFile({
      mode: 'dev',
      command: 'serve',
    })) ?? {}

  if (!config) {
    console.error(`
⛔️ No vite.config.ts, please create a minimal config:

import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one()
  ]
})

`)
    process.exit(0)
  }

  if (optionsIn.extraConfig) {
    const { resolve } = await import('node:path')
    const extraConfigPath = resolve(optionsIn.extraConfig)
    const extraResult = await loadConfigFromFile(
      { mode: 'dev', command: 'serve' },
      extraConfigPath
    )
    if (extraResult?.config) {
      const { mergeConfig } = await import('vite')
      config = mergeConfig(config, extraResult.config)
      console.info(colors.cyan(`Merged extra config from ${extraConfigPath}`))
    } else {
      console.warn(colors.yellow(`Could not load extra config from ${extraConfigPath}`))
    }
  }

  // use one server config as defaults
  // this is a bit hacky for now passing it in like this
  const oneServerConfig = config?.plugins?.find(
    (x) => Array.isArray(x) && x[0]?.['name'] === 'one:config'
  )?.[0]?.['__get']?.server

  const options = await fillOptions({
    ...optionsIn,
    server: {
      ...oneServerConfig,
      ...removeUndefined(optionsIn.server || {}),
    },
  })

  const { cacheDir } = options

  bindKeypressInput()

  if (options.clean) {
    await clean(optionsIn, options.clean)
    // signal metro to reset its cache as well
    process.env.METRO_RESET_CACHE = '1'
  }

  await ensureDir(cacheDir)
  // ensure compiler-cache exists before Metro starts, as its FallbackWatcher
  // will try to watch this directory before the compiler lazily creates it
  await ensureDir(`${cacheDir}/compiler-cache`)

  const serverConfig = await getViteServerConfig(options, config)

  let viteServer: ViteDevServer | null = null
  // Track if server is closing to prevent work during shutdown
  let isClosing = false

  return {
    viteServer,

    start: async () => {
      viteServer = await createServer(serverConfig)

      // This fakes vite into thinking its loading files for React Native HMR.
      // Native clients don't request URLs like web clients, so we manually
      // trigger transforms to make HMR work.
      const { connectedNativeClients } = await import('../utils/connectedNativeClients')
      const pendingTransforms = new Map<string, ReturnType<typeof debounce>>()

      viteServer.watcher.addListener('change', async (path) => {
        // Don't do work if server is closing or no native clients connected
        if (isClosing || connectedNativeClients === 0) {
          return
        }

        // chokidar emits native paths; viteServer.transformRequest expects POSIX URLs
        const normalizedPath = normalizePath(path)
        if (normalizedPath.includes('/dist/')) {
          return
        }

        const normalizedCwd = normalizePath(process.cwd())
        const id = normalizedPath.replace(normalizedCwd, '')
        if (!id.endsWith('tsx') && !id.endsWith('jsx')) {
          return
        }

        // Get or create a debounced transform for this file
        if (!pendingTransforms.has(id)) {
          pendingTransforms.set(
            id,
            debounce(async () => {
              if (isClosing) return
              try {
                await viteServer!.transformRequest(id)
              } catch (err) {
                // Ignore errors during shutdown
                if (!isClosing) {
                  console.info('err', err)
                }
              }
            }, 100)
          )
        }

        pendingTransforms.get(id)!()
      })

      // Mark as closing when http server closes
      viteServer.httpServer?.on('close', () => {
        isClosing = true
      })

      if (process.env.VXRN_EARLY_BIND !== '0' && viteServer.httpServer) {
        // EARLY BIND (default; set VXRN_EARLY_BIND=0 to opt out): vite wraps
        // httpServer.listen() to `await initServer()` — which runs the dep
        // optimizer crawl + the rolldown dev-bundle setup (multiple seconds for
        // a large app) — BEFORE the port is bound. for fast `dev` startup we
        // bind the port via the prototype listen (bypassing that wrap) as soon
        // as the SSR side is ready, and defer only the heavy client (rolldown)
        // dev bundle to the background. that keeps server render correct (the
        // SSG/SSR path needs the SSR env) while the browser's first JS request
        // is the only thing that waits on the client bundle. on init failure we
        // exit so a broken config still fails fast (matching await-listen).
        const net = await import('node:net')
        const httpServer = viteServer.httpServer
        const cfgServer = viteServer.config.server || ({} as any)
        const ebPort = cfgServer.port
        const ebHost = cfgServer.host === true ? undefined : cfgServer.host || 'localhost'
        // ready the SSR env + plugin buildStart BEFORE binding so an eager SSG
        // prerender (or any SSR request) renders correctly the moment the port
        // is up — binding before the SSR optimizer is initialized makes those
        // renders fail. only the heavy client (rolldown) dev bundle is deferred
        // to the background: the browser's first JS request waits for it, the
        // server render does not.
        if (!viteServer.config.experimental?.bundledDev) {
          await viteServer.environments.client.pluginContainer.buildStart()
        }
        await Promise.all(
          Object.entries(viteServer.environments)
            .filter(([name]) => name !== 'client')
            .map(([, e]) => e.listen(viteServer!))
        )
        await new Promise<void>((resolve, reject) => {
          const onErr = (e: unknown) => {
            httpServer.removeListener('listening', onOk)
            reject(e)
          }
          const onOk = () => {
            httpServer.removeListener('error', onErr)
            resolve()
          }
          httpServer.once('error', onErr)
          httpServer.once('listening', onOk)
          ;(net.Server.prototype.listen as any).call(httpServer, ebPort, ebHost)
        })
        // vite normally sets resolvedUrls inside its own listen(); replicate the
        // minimal shape the dev-server log + consumers read.
        viteServer.resolvedUrls = { local: [`http://localhost:${ebPort}/`], network: [] }
        void (async () => {
          try {
            await viteServer.environments.client.listen(viteServer!)
          } catch (e) {
            console.error(
              '\n⛔️ [vxrn] dev server client init failed after early port bind — exiting:\n',
              e
            )
            process.exit(1)
          }
        })()
      } else {
        await viteServer.listen()
      }

      const totalStartupTime = Date.now() - devStartTime

      console.info()
      console.info(colors.bold('Server running on') + ' ⪢')
      console.info()

      const viteServerResolvedUrls = filterViteServerResolvedUrls(viteServer.resolvedUrls)
      if (viteServerResolvedUrls) {
        printServerUrls(viteServerResolvedUrls, {}, viteServer.config.logger.info)
      }

      startUserInterface({ server: viteServer })

      return {
        closePromise: new Promise((res) => {
          viteServer?.httpServer?.on('close', res)
        }),
      }
    },

    stop: () => {
      isClosing = true
      if (viteServer) {
        viteServer.watcher.removeAllListeners()
        return viteServer.close()
      }
    },
  }
}
