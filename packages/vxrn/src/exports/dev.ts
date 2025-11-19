import FSExtra from 'fs-extra'
import colors from 'picocolors'
import type { ViteDevServer } from 'vite'
import type { VXRNOptions } from '../types'

const { ensureDir } = FSExtra

export type DevOptions = VXRNOptions & {
  clean?: boolean
}

export const dev = async (optionsIn: DevOptions) => {
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
  const { filterViteServerResolvedUrls } = await import('../utils/filterViteServerResolvedUrls')
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
      ...(oneServerConfig || {}),
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

  return {
    viteServer,

    start: async () => {
      viteServer = await createServer(serverConfig)

      // This fakes vite into thinking its loading files for HMR
      viteServer.watcher.addListener('change', async (path) => {
        const id = path.replace(process.cwd(), '')
        if (!id.endsWith('tsx') && !id.endsWith('jsx')) {
          return
        }
        try {
          void viteServer!.transformRequest(id)
        } catch (err) {
          console.info('err', err)
        }
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
      if (viteServer) {
        viteServer.watcher.removeAllListeners()
        return viteServer.close()
      }
    },
  }
}
