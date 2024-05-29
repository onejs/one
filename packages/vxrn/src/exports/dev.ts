import type { Peer } from 'crossws'
import wsAdapter from 'crossws/adapters/node'
import FSExtra from 'fs-extra'
import path from 'node:path'
import fs from 'node:fs'
import {
  createApp,
  createError,
  createRouter,
  defineEventHandler,
  eventHandler,
  getQuery,
  readBody,
  toNodeListener,
} from 'h3'
import { createProxyEventHandler } from 'h3-proxy'
import { rm } from 'node:fs/promises'
import { createServer as nodeCreateServer } from 'node:http'
import { join } from 'node:path'
import { createServer, resolveConfig } from 'vite'
import { WebSocket } from 'ws'
import { clientInjectionsPlugin } from '../plugins/clientInjectPlugin'
import type { VXRNConfig } from '../types'
import { bindKeypressInput } from '../utils/bindKeypressInput'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import { getIndexJsonResponse } from '../utils/getIndexJsonResponse'
import { getOptionsFilled } from '../utils/getOptionsFilled'
import { getReactNativeBundle } from '../utils/getReactNativeBundle'
import { getViteServerConfig } from '../utils/getViteServerConfig'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { checkPatches } from '../utils/patches'
import { Symbolicator } from '../utils/symbolicate/Symbolicator'
import type { ReactNativeStackFrame } from '../utils/symbolicate'

const { ensureDir } = FSExtra

export const dev = async ({ clean, ...rest }: VXRNConfig & { clean?: boolean }) => {
  const options = await getOptionsFilled(rest)
  const { host, port, root, cacheDir } = options

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

  router.get(
    '/index.bundle',
    defineEventHandler(async (e) => {
      return new Response(await getReactNativeBundle(options, viteRNClientPlugin), {
        headers: {
          'content-type': 'text/javascript',
        },
      })
    })
  )

  router.get(
    '/status',
    defineEventHandler(() => `packager-status:running`)
  )

  app.use(router)

  // TODO move these to router.get():
  app.use(
    defineEventHandler(async ({ node: { req } }) => {
      if (!req.headers['user-agent']?.match(/Expo|React/)) {
        return
      }

      if (req.url === '/' || req.url?.startsWith('/?platform=')) {
        return getIndexJsonResponse({ port, root })
      }
    })
  )

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
  const symbolicatorConfig = {
    getSource: (fileUrl) => {
      const { filename, platform } = parseFileUrl(fileUrl)
      return getSource(filename, platform)
    },
    getSourceMap: (fileUrl) => {
      const { filename, platform } = parseFileUrl(fileUrl)
      if (!platform) {
        throw new Error('Cannot infer platform for file URL')
      }

      return getSourceMap(filename, platform)
    },
    shouldIncludeFrame: (frame) => {
      // If the frame points to internal bootstrap/module system logic, skip the code frame.
      // return !/vite[/\\]runtime[/\\].+\s/.test(frame.file)
      return true
    },
  }

  // TODO: fillin the blank
  const symbolicator = new Symbolicator(symbolicatorConfig as any)
  // symbolicate
  app.use(
    '/symbolicate',
    defineEventHandler(async (event) => {
      console.info('symbolicate called')
      try {
        const body = await readBody(event)

        const { stack } = JSON.parse(body) as {
          stack: ReactNativeStackFrame[]
        }
        const platform = Symbolicator.inferPlatformFromStack(stack)
        if (!platform) {
          console.info({ msg: 'Received stack', stack })
          throw createError({
            status: 400,
            message: 'Bad request',
            statusMessage: 'Bad request message',
          })
        }
        console.info({ msg: 'Starting symbolication', platform, stack })
        const results = await symbolicator.process(stack)
        return results
      } catch (error) {
        console.error({
          msg: 'Failed to symbolicate',
          error: (error as Error).message,
        })
        throw createError({
          status: 500,
          message: 'Fatal error',
          fatal: true,
        })
      }
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
        target: `http://127.0.0.1:${vitePort}`,
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

      console.info(`Server running on http://localhost:${port}`)

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

// TODO: move it somewhere else
function parseFileUrl(fileUrl: string) {
  const { pathname: filename, searchParams } = new URL(fileUrl)
  let platform = searchParams.get('platform')
  if (!platform) {
    const [, platformOrName, name] = filename.split('.').reverse()
    if (name !== undefined) {
      platform = platformOrName
    }
  }

  return {
    filename: filename.replace(/^\//, ''),
    platform: platform || undefined,
  }
}

const getSource = async (filename: string, platform?: string): Promise<string | Buffer> => {
  return fs.promises.readFile(import.meta.resolve(import.meta.dirname, filename), 'utf8')
}

const getSourceMap = async (filename: string, platform: string): Promise<string | Buffer> => {
  const file = await fs.promises.readFile(
    import.meta.resolve(import.meta.dirname, filename),
    'utf8'
  )

  if (file) {
    return file
  }

  return Promise.reject(new Error(`Source map for ${filename} for ${platform} is missing`))
}
