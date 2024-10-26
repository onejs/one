import FSExtra from 'fs-extra'
import { createServer, type ViteDevServer } from 'vite'
import colors from 'picocolors'
import type { VXRNOptions } from '../types'
import { startUserInterface } from '../user-interface/index'
import { bindKeypressInput } from '../utils/bindKeypressInput'
import { fillOptions } from '../utils/getOptionsFilled'
import { getViteServerConfig } from '../utils/getViteServerConfig'
import { applyBuiltInPatches } from '../utils/patches'
import { clean } from './clean'
import { printServerUrls } from '../utils/printServerUrls'

const { ensureDir } = FSExtra

export type DevOptions = VXRNOptions & { clean?: boolean }

export const dev = async (optionsIn: DevOptions) => {
  const options = await fillOptions(optionsIn)
  const { cacheDir } = options

  if (options.clean) {
    await clean(optionsIn)
  }

  bindKeypressInput()

  applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })

  await ensureDir(cacheDir)

  const serverConfig = await getViteServerConfig(options)

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

      if (viteServer.resolvedUrls) {
        printServerUrls(viteServer.resolvedUrls, {}, viteServer.config.logger.info)
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
