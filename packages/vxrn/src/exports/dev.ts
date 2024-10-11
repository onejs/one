import type { Peer } from 'crossws'
import wsAdapter from 'crossws/adapters/node'
import FSExtra from 'fs-extra'
import { createServer as nodeCreateServer } from 'node:http'
import { join } from 'node:path'
import { createServer } from 'vite'
import { WebSocket } from 'ws'
import type { VXRNOptions } from '../types'
import { startUserInterface } from '../user-interface/index'
import { bindKeypressInput } from '../utils/bindKeypressInput'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import { fillOptions } from '../utils/getOptionsFilled'
import { getReactNativeBundle } from '../utils/getReactNativeBundle'
import { getViteServerConfig } from '../utils/getViteServerConfig'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { applyBuiltInPatches } from '../utils/patches'
import { clean } from './clean'

const { ensureDir } = FSExtra

/**
 * The main entry point for dev mode
 *
 * Note that much of the logic is being run by plugins:
 *
 *  - createFileSystemRouter does most of the fs-routes/request handling
 *  - clientTreeShakePlugin handles loaders/transforms
 *
 */

export type DevOptions = VXRNOptions & { clean?: boolean }

export const dev = async (optionsIn: DevOptions) => {
  const options = await fillOptions(optionsIn)
  const { cacheDir, server } = options

  if (options.clean) {
    await clean(optionsIn)
  }

  // TODO move somewhere
  bindKeypressInput()

  applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })

  await ensureDir(cacheDir)

  const serverConfig = await getViteServerConfig(options)

  const viteServer = await createServer(serverConfig)

  // this fakes vite into thinking its loading files, so it hmrs in native mode despite not us never requesting the url
  // TODO we can check if any native clients are connected to avoid some work here
  viteServer.watcher.addListener('change', async (path) => {
    const id = path.replace(process.cwd(), '')
    if (!id.endsWith('tsx') && !id.endsWith('jsx')) {
      return
    }
    // so it thinks its loaded
    try {
      void viteServer.transformRequest(id)
    } catch (err) {
      // ok
      console.info('err', err)
    }
  })

  await viteServer.listen()
  const vitePort = viteServer.config.server.port

  // Dynamic import h3 after `applyBuiltInPatches()` so we can always get the patch applied version
  const { createApp, createRouter, defineEventHandler, eventHandler, getQuery, toNodeListener } =
    await import('h3')
  const { createProxyEventHandler } = await import('h3-proxy')

  const router = createRouter()
  const app = createApp({
    onError: (error) => {
      console.error(error)
    },
    onRequest: (event) => {
      if (process.env.DEBUG) {
        console.info(' →', event.path)
      }
    },
  })

  // react native endppints:

  router.get(
    '/file',
    defineEventHandler((e) => {
      const query = getQuery(e)
      if (typeof query.file === 'string') {
        const source = hotUpdateCache.get(query.file)
        return new Response(source, {
          headers: {
            'content-type': 'text/javascript',
          },
        })
      }
    })
  )

  let cachedReactNativeBundle: string | null = null
  const reactNativeBundleCacheFile = join(
    options.cacheDir,
    `rn-cached-bundle-${'ios' /* TODO */}.js`
  )

  // builds the dev initial bundle for react native
  const rnBundleHandler = defineEventHandler(async (e) => {
    try {
      const bundle = await (async () => {
        if (!cachedReactNativeBundle && process.env.UNSTABLE_BUNDLE_CACHE) {
          try {
            if (await FSExtra.pathExists(reactNativeBundleCacheFile)) {
              cachedReactNativeBundle = await FSExtra.readFile(reactNativeBundleCacheFile, 'utf-8')
            }
          } catch (e) {
            console.error(`Error loading cache from ${reactNativeBundleCacheFile}: ${e}`)
          }
        }

        if (cachedReactNativeBundle && !process.env.VXRN_DISABLE_CACHE) {
          return cachedReactNativeBundle
        }

        const builtBundle = await getReactNativeBundle(options)
        cachedReactNativeBundle = builtBundle
        if (process.env.UNSTABLE_BUNDLE_CACHE && !!process.env.VXRN_DISABLE_CACHE) {
          // do not await cache write
          ;(async () => {
            try {
              await FSExtra.writeFile(reactNativeBundleCacheFile, builtBundle)
            } catch (e) {
              console.error(`Error saving cache to ${reactNativeBundleCacheFile}: ${e}`)
            }
          })()
        }

        return builtBundle
      })()

      return new Response(bundle, {
        headers: {
          'content-type': 'text/javascript',
        },
      })
    } catch (err) {
      console.error(` Error building React Native bundle: ${err}`)
      console.error(
        `\n\n  Note, some errors may happen due to a stale Vite cache, you may want to try re-running with the "--clean" flag`
      )
    }
  })

  viteServer.watcher.addListener('change', () => {
    cachedReactNativeBundle = null // invalidate cache when something changes
  })

  router.get('/index.bundle', rnBundleHandler)
  router.get(
    '/.expo/.virtual-metro-entry.bundle', // for Expo development builds
    rnBundleHandler
  )

  router.get(
    '/status',
    defineEventHandler(() => `packager-status:running`)
  )

  app.use(router)

  const clients = new Set<Peer>()
  let socket: WebSocket | null = null

  const { handleUpgrade } = wsAdapter(app.websocket)

  // vite hmr two way bridge:
  app.use(
    '/__vxrnhmr',
    defineEventHandler({
      handler() {
        // avoid errors
      },

      websocket: {
        open(peer) {
          if (process.env.DEBUG) console.debug('[hmr:web] open', peer)
          clients.add(peer)
        },

        message(peer, message) {
          socket?.send(message.rawData)
        },

        close(peer, event) {
          if (process.env.DEBUG) console.info('[hmr:web] close', peer, event)
          clients.delete(peer)
        },

        error(peer, error) {
          console.error('[hmr:web] error', peer, error)
        },
      },
    })
  )

  // react native hmr:
  app.use(
    '/__hmr',
    defineEventHandler({
      handler() {
        // avoid errors
      },

      websocket: {
        open(peer) {
          if (process.env.DEBUG) console.debug('[hmr] open', peer)
          addConnectedNativeClient()
        },

        message(peer, message) {
          console.info('[hmr] message', peer, message)
          if (message.text().includes('ping')) {
            peer.send('pong')
          }
        },

        close(peer, event) {
          if (process.env.DEBUG) console.info('[hmr] close', peer, event)
          removeConnectedNativeClient()
        },

        error(peer, error) {
          console.error('[hmr] error', peer, error)
        },
      },
    })
  )

  type ClientMessage = {
    type: 'client-log'
    level: 'log' | 'error' | 'info' | 'debug' | 'warn'
    data: string[]
  }

  // symbolicate
  app.use(
    '/symbolicate',
    defineEventHandler(() => {
      return 'TODO'
    })
  )

  // react native log bridge
  app.use(
    '/__client',
    defineEventHandler({
      handler() {
        // no
      },

      websocket: {
        open(peer) {
          console.info(' ①  open', peer)
        },

        message(peer, messageRaw) {
          const message = JSON.parse(messageRaw.text()) as any as ClientMessage

          switch (message.type) {
            case 'client-log': {
              // TODO temp
              if (
                message.level === 'warn' &&
                message.data[0]?.startsWith(
                  'Sending `appearanceChanged` with no listeners registered.'
                )
              ) {
                return
              }

              console.info(
                ` ①  ${message.level === 'info' ? '' : ` [${message.level}]`}`,
                ...message.data
              )
              return
            }

            default: {
              console.warn(` ①  Unknown message type`, message)
            }
          }
        },

        close(peer, event) {
          console.info(' ①  close', peer, event)
        },

        error(peer, error) {
          console.error(' ①  error', peer, error)
        },
      },
    })
  )

  // Define proxy event handler
  app.use(
    eventHandler(
      createProxyEventHandler({
        target: `${server.protocol}//${server.host}:${vitePort}`,
        enableLogger: process.env.DEBUG?.startsWith('vxrn'),
      })
    )
  )

  const nodeServer = nodeCreateServer(toNodeListener(app))

  nodeServer.on('upgrade', handleUpgrade)

  return {
    server: nodeServer,
    viteServer,

    async start() {
      nodeServer.listen(server.port, server.host)

      const url = `${server.protocol}//${server.host}:${server.port}`

      if (process.env.NODE_ENV === 'test') {
        console.info(`\nServer running on ${url}`)
      } else {
        console.info(`\nServer running on \x1b[1m${url}\x1b[0m`)
      }

      startUserInterface({ server })

      nodeServer.once('listening', () => {
        // bridge socket between vite
        if (vitePort) {
          socket = new WebSocket(`ws://${server.host}:${vitePort}/__vxrnhmr`, 'vite-hmr')

          socket.on('message', (msg) => {
            const message = msg.toString()
            for (const listener of [...clients]) {
              listener.send(message)
            }
          })

          socket.on('error', (err) => {
            console.info('error bridging socket to vite', err)
          })
        }
      })

      return {
        closePromise: new Promise((res) => viteServer.httpServer?.on('close', res)),
      }
    },

    stop: async () => {
      viteServer.watcher.removeAllListeners()
      await Promise.all([nodeServer.close(), viteServer.close()])
    },
  }
}
