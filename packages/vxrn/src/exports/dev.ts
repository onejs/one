import FSExtra from 'fs-extra'
import { createServer, type ViteDevServer } from 'vite'
import type { VXRNOptions } from '../types'
import { startUserInterface } from '../user-interface/index'
import { bindKeypressInput } from '../utils/bindKeypressInput'
import { fillOptions } from '../utils/getOptionsFilled'
import { getViteServerConfig } from '../utils/getViteServerConfig'
import { applyBuiltInPatches } from '../utils/patches'
import { clean } from './clean'

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

  const url = `${options.server.protocol}//${options.server.host}:${options.server.port}`

  if (process.env.NODE_ENV === 'test') {
    console.info(`\nServer running on ${url}`)
  } else {
    console.info(`\nServer running on \x1b[1m${url}\x1b[0m`)
  }

  startUserInterface({ server: options.server })

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
