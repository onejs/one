import FSExtra from 'fs-extra'
import colors from 'picocolors'
import type { VXRNOptions } from '../types'
import type { ViteDevServer } from 'vite'

const { ensureDir } = FSExtra

export type DevOptions = VXRNOptions & {
  clean?: boolean
}

export const dev = async (optionsIn: DevOptions) => {
  if (typeof optionsIn.debug === 'string') {
    process.env.DEBUG ||= !optionsIn.debug ? `vite` : `vite:${optionsIn.debug}`
  }

  // import vite only after setting process.env.DEBUG
  const { startUserInterface } = await import('../user-interface/index')
  const { bindKeypressInput } = await import('../utils/bindKeypressInput')
  const { fillOptions } = await import('../utils/getOptionsFilled')
  const { getViteServerConfig } = await import('../utils/getViteServerConfig')
  const { applyBuiltInPatches } = await import('../utils/patches')
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
    await clean(optionsIn)
  }

  await applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })

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

    stop: async () => {
      if (viteServer) {
        viteServer.watcher.removeAllListeners()
        await viteServer.close()
      }
    },
  }
}
