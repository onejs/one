import type { Connect, Plugin, ViteDevServer } from 'vite'
import { WebSocketServer, type WebSocket } from 'ws'
import { createMessageSocket } from '@vxrn/utils'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../config/getOptionsFilled'
import { URL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createDevMiddleware } from '@react-native/dev-middleware'
import { createNativeDevEngine } from '../utils/createNativeDevEngine'
import { getBoundPort } from '../utils/getBoundPort'

type ClientMessage = {
  type: 'client-log'
  level: 'log' | 'error' | 'info' | 'debug' | 'warn'
  data: string[]
}

type NativeHmrSocket = WebSocket & {
  vxrnClientId: string
  vxrnPlatform: 'ios' | 'android'
}

export function getNativeAssetContentType(type: string): string {
  switch (type.toLowerCase()) {
    case 'bmp':
      return 'image/bmp'
    case 'gif':
      return 'image/gif'
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'json':
      return 'application/json'
    case 'otf':
      return 'font/otf'
    case 'png':
      return 'image/png'
    case 'svg':
      return 'image/svg+xml'
    case 'ttf':
      return 'font/ttf'
    case 'webp':
      return 'image/webp'
    case 'woff':
      return 'font/woff'
    case 'woff2':
      return 'font/woff2'
    default:
      return 'application/octet-stream'
  }
}

export function createReactNativeDevServerPlugin(
  options?: Partial<
    Pick<VXRNOptionsFilled, 'cacheDir' | 'debugBundle' | 'debugBundlePaths' | 'entries'>
  >
): Plugin {
  return {
    name: 'vite-plugin-react-native-server',

    configureServer(server: ViteDevServer) {
      const { host } = server.config.server
      const { root } = server.config
      const hmrWSS = new WebSocketServer({ noServer: true })
      const clientWSS = new WebSocketServer({ noServer: true })
      const messageWSS = createMessageSocket()
      const validPlatforms: Record<string, 'ios' | 'android' | undefined> = {
        ios: 'ios',
        android: 'android',
      }
      const devEngines: Record<
        string,
        Awaited<ReturnType<typeof createNativeDevEngine>> | null
      > = {}
      const devEngineCreating: Record<string, Promise<unknown> | null> = {}

      const devToolsSocketEndpoints = ['/inspector/device', '/inspector/debug']
      const reactNativeDevToolsUrl = `http://${host}:${getBoundPort(server)}`
      const { middleware, websocketEndpoints } = createDevMiddleware({
        serverBaseUrl: reactNativeDevToolsUrl,
        logger: console,
        unstable_experiments: {
          enableStandaloneFuseboxShell: false,
        },
      })

      // Native AssetSourceResolver requests the URL registered in the Rolldown
      // bundle. Install this before React Native's generic middleware, which
      // otherwise terminates unknown /assets requests with an HTML 404.
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()

        const rawUrl = req.url || '/'
        const rawPathname = rawUrl.split('?', 1)[0]
        if (!rawPathname.startsWith('/assets/')) return next()

        const url = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`)

        const platform = validPlatforms[url.searchParams.get('platform') || '']
        const engine = platform ? devEngines[platform] : undefined
        if (!engine) return next()

        let pathname: string
        try {
          pathname = decodeURIComponent(rawPathname)
        } catch {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Invalid native asset path')
          return
        }

        const asset = engine.getAsset(pathname, url.searchParams.get('hash') || undefined)
        if (!asset) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Native asset not found')
          return
        }

        try {
          const contents = await readFile(asset.filePath)
          res.writeHead(200, {
            'Cache-Control': 'no-cache',
            'Content-Length': String(contents.byteLength),
            'Content-Type': getNativeAssetContentType(asset.type),
          })
          res.end(req.method === 'HEAD' ? undefined : contents)
        } catch (error) {
          console.error(
            `[vxrn] failed to serve native asset ${pathname}: ${error instanceof Error ? error.message : String(error)}`
          )
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Failed to read native asset')
        }
      })

      server.middlewares.use(middleware)

      // link up sockets
      server.httpServer?.on('upgrade', (req, socket, head) => {
        const url = req.url || ''

        // devtools sockets
        for (const endpoint of devToolsSocketEndpoints) {
          if (url.startsWith(endpoint)) {
            const wss = websocketEndpoints[endpoint]
            wss.handleUpgrade(req, socket, head, (ws) => {
              wss.emit('connection', ws, req)
            })
            return
          }
        }

        // rolldown HMR socket (used by rolldown dev() HMR client)
        if (url.startsWith('/hot')) {
          const hmrUrl = new URL(url, `http://${req.headers.host || 'localhost'}`)
          const platform = validPlatforms[hmrUrl.searchParams.get('platform') || '']
          const clientId = hmrUrl.searchParams.get('clientId')
          if (!platform || !clientId) {
            socket.destroy()
            return
          }
          hmrWSS.handleUpgrade(req, socket, head, (ws) => {
            Object.assign(ws, {
              vxrnClientId: clientId,
              vxrnPlatform: platform,
            })
            hmrWSS.emit('connection', ws, req)
          })
          return
        }

        // metro packager message socket
        if (url === '/message' || url.startsWith('/message?')) {
          messageWSS.handleUpgrade(req, socket, head, (ws) => {
            messageWSS.emit('connection', ws, req)
          })
          return
        }

        // client socket
        if (url === '/__client') {
          clientWSS.handleUpgrade(req, socket, head, (ws) => {
            clientWSS.emit('connection', ws, req)
          })
        }
      })

      hmrWSS.on('connection', async (socket: NativeHmrSocket) => {
        const currentEngine = devEngines[socket.vxrnPlatform]
        if (!currentEngine) {
          socket.close(1013, 'native dev engine unavailable')
          return
        }

        try {
          await currentEngine.engine.registerClient(socket.vxrnClientId)
        } catch (error) {
          console.error('[hmr] failed to register native client', error)
          socket.close(1011, 'native HMR registration failed')
          return
        }
        addConnectedNativeClient()

        socket.on('message', async (message) => {
          const value = message.toString()
          if (value === 'ping') {
            socket.send('pong')
            return
          }

          let update: { type?: string }
          try {
            update = JSON.parse(value)
          } catch {
            return
          }
          if (update.type === 'hmr:invalidate') {
            currentEngine.engine.triggerFullBuild()
            await currentEngine.engine.ensureLatestBuildOutput()
            socket.send(JSON.stringify({ type: 'hmr:reload' }))
          }
        })

        socket.on('close', () => {
          removeConnectedNativeClient()
          currentEngine.engine.removeClient(socket.vxrnClientId).catch((error) => {
            console.error('[hmr] failed to remove native client', error)
          })
        })

        socket.on('error', (error) => {
          console.error('[hmr] error', error)
        })
      })

      clientWSS.on('connection', (socket) => {
        socket.on('message', (messageRaw) => {
          const message = JSON.parse(messageRaw.toString()) as any as ClientMessage

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
        })
      })

      // React Native bundle handler
      const handleRNBundle: Connect.NextHandleFunction = async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`)
        const platformString = url.searchParams.get('platform') || ''
        const platform = validPlatforms[platformString]

        if (!platform) {
          return
        }

        try {
          const bundle = await (async () => {
            if (!devEngines[platform]) {
              // prevent duplicate creation from concurrent requests
              if (!devEngineCreating[platform]) {
                devEngineCreating[platform] = (async () => {
                  try {
                    console.info(`[vxrn] creating rolldown DevEngine for ${platform}...`)
                    devEngines[platform] = await createNativeDevEngine({
                      root,
                      port: getBoundPort(server),
                      host: typeof host === 'string' ? host : 'localhost',
                      platform,
                      serverUrl: `http://${typeof host === 'string' && host !== '0.0.0.0' ? host : 'localhost'}:${getBoundPort(server)}`,
                      onHmrUpdate: (update) => {
                        const msg = JSON.stringify(update)
                        hmrWSS.clients.forEach((client) => {
                          const nativeClient = client as NativeHmrSocket
                          if (
                            nativeClient.readyState === 1 &&
                            nativeClient.vxrnPlatform === platform &&
                            (update.type === 'hmr:error' ||
                              nativeClient.vxrnClientId === update.clientId)
                          ) {
                            client.send(msg)
                          }
                        })
                      },
                    })
                    console.info(`[vxrn] rolldown DevEngine ready for ${platform}`)
                  } catch (err) {
                    // clear so next request retries instead of permanently failing
                    devEngineCreating[platform] = null
                    throw err
                  }
                })()
              }
              await devEngineCreating[platform]
            }

            return await devEngines[platform]!.getBundle().then((r) => r.code)
          })()

          res.writeHead(200, { 'Content-Type': 'text/javascript' })
          res.end(bundle)
        } catch (err) {
          console.error(` Error building React Native bundle`)
          console.error(err)
          console.error(
            `\n\n  Note, some errors may happen due to a stale Vite cache, you may want to try re-running with the "--clean" flag`
          )
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end(err instanceof Error ? err.stack || err.message : String(err))
        }
      }

      // handle any .bundle request (expo sdk 55 may use /packages/one/metro-entry.bundle)
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].endsWith('.bundle')) {
          handleRNBundle(req, res, next)
        } else {
          next()
        }
      })

      // Symbolicate endpoint
      server.middlewares.use('/symbolicate', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('TODO')
      })
    },
  }
}
