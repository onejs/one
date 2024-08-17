import type { Peer } from 'crossws'
import wsAdapter from 'crossws/adapters/node'
import FSExtra from 'fs-extra'
import {
  createApp,
  createRouter,
  defineEventHandler,
  eventHandler,
  getQuery,
  toNodeListener,
} from 'h3'
import { createProxyEventHandler } from 'h3-proxy'
import { createServer as nodeCreateServer } from 'node:http'
import { createServer, resolveConfig } from 'vite'
import { WebSocket } from 'ws'
import { clientInjectionsPlugin } from '../plugins/clientInjectPlugin'
import type { VXRNOptions } from '../types'
import { bindKeypressInput } from '../utils/bindKeypressInput'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import { getOptionsFilled } from '../utils/getOptionsFilled'
import { getReactNativeBundle } from '../utils/getReactNativeBundle'
import { getViteServerConfig } from '../utils/getViteServerConfig'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { checkPatches } from '../utils/patches'
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

export const dev = async (optionsIn: VXRNOptions & { clean?: boolean }) => {
  const { clean: shouldClean, ...rest } = optionsIn
  const options = await getOptionsFilled(rest)
  const { port, root, cacheDir } = options

  if (shouldClean) {
    await clean(optionsIn)
  }

  // TODO move somewhere
  bindKeypressInput()

  checkPatches(options).catch((err) => {
    console.error(`\n 🥺 couldn't patch`, err)
  })

  await ensureDir(cacheDir)

  const serverConfig = await getViteServerConfig(options)
  const viteServer = await createServer(serverConfig)

  // we pass resolved config into client inject to get the final port etc to use
  // probably can be done better
  const resolvedConfig = await resolveConfig(serverConfig, 'serve')
  const viteRNClientPlugin = clientInjectionsPlugin(resolvedConfig)

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

  // builds the dev initial bundle for react native
  router.get(
    '/index.bundle',
    defineEventHandler(async (e) => {
      try {
        const bundle = await getReactNativeBundle(options, viteRNClientPlugin)
        return new Response(bundle, {
          headers: {
            'content-type': 'text/javascript',
          },
        })
      } catch (err) {
        const message = err instanceof Error ? `${err.message}\n${err.stack}` : `${err}`
        console.error(` Error building React Native bundle: ${message}`)
      }
    })
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
          console.debug('[hmr] open', peer)
          addConnectedNativeClient()
        },

        message(peer, message) {
          console.info('[hmr] message', peer, message)
          if (message.text().includes('ping')) {
            peer.send('pong')
          }
        },

        close(peer, event) {
          console.info('[hmr] close', peer, event)
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
          console.info('[client] open', peer)
        },

        message(peer, messageRaw) {
          const message = JSON.parse(messageRaw.text()) as any as ClientMessage

          switch (message.type) {
            case 'client-log': {
              console.info(`🪵 [${message.level}]`, ...message.data)
              return
            }

            default: {
              console.warn(`[client] Unknown message type`, message)
            }
          }
        },

        close(peer, event) {
          console.info('[client] close', peer, event)
        },

        error(peer, error) {
          console.error('[client] error', peer, error)
        },
      },
    })
  )

  // Define proxy event handler
  app.use(
    eventHandler(
      createProxyEventHandler({
        target: `${options.protocol}//127.0.0.1:${vitePort}`,
        enableLogger: process.env.DEBUG?.startsWith('vxrn'),
      })
    )
  )

  const server = nodeCreateServer(toNodeListener(app))

  server.on('upgrade', handleUpgrade)

  return {
    server,
    viteServer,

    async start() {
      server.listen(port, options.host)

      console.info(`Server running on ${options.protocol}//${options.host}:${port}`)

      server.once('listening', () => {
        // bridge socket between vite
        if (vitePort) {
          socket = new WebSocket(`ws://127.0.0.1:${vitePort}/__vxrnhmr`, 'vite-hmr')

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
      await Promise.all([server.close(), viteServer.close()])
    },
  }
}
