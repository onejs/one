import type { Peer } from 'crossws'
import wsAdapter from 'crossws/adapters/node'
import FSExtra from 'fs-extra'
import { type Handler, Hono } from 'hono'
import { rm } from 'node:fs/promises'
import { createServer as nodeCreateServer } from 'node:http'
import { join } from 'node:path'
import { createServer, resolveConfig } from 'vite'
import { WebSocket, WebSocketServer } from 'ws'
import { clientInjectionsPlugin } from '../plugins/clientInjectPlugin'
import type { VXRNConfig } from '../types'
import { bindKeypressInput } from '../utils/bindKeypressInput'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import { getOptionsFilled } from '../utils/getOptionsFilled'
import { getReactNativeBundle } from '../utils/getReactNativeBundle'
import { getViteServerConfig } from '../utils/getViteServerConfig'
import { checkPatches } from '../utils/patches'
import { serve } from '@hono/node-server'

const { ensureDir } = FSExtra

export const dev = async ({ clean, ...rest }: VXRNConfig & { clean?: boolean }) => {
  const options = await getOptionsFilled(rest)
  const { port, root, cacheDir } = options

  if (clean) {
    try {
      console.info(` [vxrn] cleaning node_modules/.vite`)
      await rm(join(root, 'node_modules', '.vite'), {
        recursive: true,
        force: true,
      })
    } catch (err) {
      if (err instanceof Error) {
        // @ts-expect-error wtf
        if (err.code !== 'ENOENT') {
          throw Error
        }
      }
    }
  }

  // TODO move somewhere
  bindKeypressInput()

  checkPatches(options).catch((err) => {
    console.error(`\n 🥺 couldn't patch`, err)
  })

  await ensureDir(cacheDir)

  const serverConfig = await getViteServerConfig(options)
  const viteServer = await createServer(serverConfig)

  // first resolve config so we can pass into client plugin, then add client plugin:
  const resolvedConfig = await resolveConfig(serverConfig, 'serve')
  const viteRNClientPlugin = clientInjectionsPlugin(resolvedConfig)

  // this fakes vite into thinking its loading files, so it hmrs in native mode despite not requesting
  viteServer.watcher.addListener('change', async (path) => {
    const id = path.replace(process.cwd(), '')
    if (!id.endsWith('tsx') && !id.endsWith('jsx')) {
      return
    }
    // just so it thinks its loaded
    try {
      void viteServer.transformRequest(id)
    } catch (err) {
      // ok
      console.info('err', err)
    }
  })

  await viteServer.listen()
  const vitePort = viteServer.config.server.port

  const app = new Hono()

  // app.get(
  //   '/file',
  //   ((c) => {
  //     const query = getQuery(e)
  //     if (typeof query.file === 'string') {
  //       const source = hotUpdateCache.get(query.file)
  //       return new Response(source, {
  //         headers: {
  //           'content-type': 'text/javascript',
  //         },
  //       })
  //     }
  //   })
  // )

  app.get('/index.bundle', async () => {
    return new Response(await getReactNativeBundle(options, viteRNClientPlugin), {
      headers: {
        'content-type': 'text/javascript',
      },
    })
  })

  app.get('/status', () => new Response(`packager-status:running`))

  // TODO move these to router.get():
  app.use(async ({ req }) => {
    if (!req.header('expo-platform')) {
      if (!req.header('user-agent')?.match(/Expo|React/)) {
        return
      }
    }

    if (req.url === '/' || req.url?.startsWith('/?platform=')) {
      // return getIndexJsonResponse({ port, root })
    }
  })

  const clients = new Set<Peer>()
  let socket: WebSocket | null = null

  // const { handleUpgrade } = wsAdapter(app.websocket)

  // vite hmr two way bridge:
  // app.use(
  //   '/__vxrnhmr',
  //   defineEventHandler({
  //     handler() {
  //       // avoid errors
  //     },

  //     websocket: {
  //       open(peer) {
  //         if (process.env.DEBUG) console.debug('[hmr:web] open', peer)
  //         clients.add(peer)
  //       },

  //       message(peer, message) {
  //         socket?.send(message.rawData)
  //       },

  //       close(peer, event) {
  //         if (process.env.DEBUG) console.info('[hmr:web] close', peer, event)
  //         clients.delete(peer)
  //       },

  //       error(peer, error) {
  //         console.error('[hmr:web] error', peer, error)
  //       },
  //     },
  //   })
  // )

  // react native hmr:
  // app.use(
  //   '/__hmr',
  //   defineEventHandler({
  //     handler() {
  //       // avoid errors
  //     },

  //     websocket: {
  //       open(peer) {
  //         console.debug('[hmr] open', peer)
  //         addConnectedNativeClient()
  //       },

  //       message(peer, message) {
  //         console.info('[hmr] message', peer, message)
  //         if (message.text().includes('ping')) {
  //           peer.send('pong')
  //         }
  //       },

  //       close(peer, event) {
  //         console.info('[hmr] close', peer, event)
  //         removeConnectedNativeClient()
  //       },

  //       error(peer, error) {
  //         console.error('[hmr] error', peer, error)
  //       },
  //     },
  //   })
  // )

  type ClientMessage = {
    type: 'client-log'
    level: 'log' | 'error' | 'info' | 'debug' | 'warn'
    data: string[]
  }

  // symbolicate
  app.get('/symbolicate', () => {
    return new Response('TODO')
  })

  // Define proxy event handler
  app.use(basicProxy(`${options.protocol}//127.0.0.1:${vitePort}`))

  const server = serve(app)

  const wss = new WebSocketServer({ server: server as any })

  wss.on('connection', (ws) => {
    console.log('connection', ws)
    ws.on('error', console.error)
    ws.on('message', (data) => {
      // todo port this from h3 into here:
      // app.use(
      //   '/__client',
      //   ({
      //     handler() {
      //       // no
      //     },
      //     websocket: {
      //       open(peer) {
      //         console.info('[client] open', peer)
      //       },
      //       message(peer, messageRaw) {
      //         const message = JSON.parse(messageRaw.text()) as any as ClientMessage
      //         switch (message.type) {
      //           case 'client-log': {
      //             console.info(`🪵 [${message.level}]`, ...message.data)
      //             return
      //           }
      //           default: {
      //             console.warn(`[client] Unknown message type`, message)
      //           }
      //         }
      //       },
      //       close(peer, event) {
      //         console.info('[client] close', peer, event)
      //       },
      //       error(peer, error) {
      //         console.error('[client] error', peer, error)
      //       },
      //     },
      //   })
      // )
    })
  })

  // server.on('upgrade', handleUpgrade)

  return {
    server,
    viteServer,

    async start() {
      server.listen(port, options.host)

      console.info(`Server running on ${options.protocol}//localhost:${port}`)

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
      await Promise.all([server.close(), viteServer.close()])
    },
  }
}

function basicProxy(proxy_url = ''): Handler {
  return async (c) => {
    let path = c.req.path
    let url = proxy_url ? proxy_url + path : c.req.url
    // add params to URL
    if (c.req.query()) url = url + '?' + new URLSearchParams(c.req.query())
    // request
    const rep = await fetch(url, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
      // duplex: "half",
    })
    if (rep.status === 101) return rep

    return new Response(rep.body, rep)
  }
}
