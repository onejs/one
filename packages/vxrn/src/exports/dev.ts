import FSExtra from 'fs-extra'
import colors from 'picocolors'
import { debounce } from 'perfect-debounce'
import type { ViteDevServer } from 'vite'
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

  const { config } =
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
  }

  await ensureDir(cacheDir)

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

        // Skip dist files to avoid loops during builds
        if (path.includes('/dist/') || path.includes('\\dist\\')) {
          return
        }

        const id = path.replace(process.cwd(), '')
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

      await viteServer.listen()

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
