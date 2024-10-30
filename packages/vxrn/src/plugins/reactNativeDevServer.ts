import type { Connect, Plugin, ViteDevServer } from 'vite'
import { WebSocketServer } from 'ws'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../utils/getOptionsFilled'
import { getReactNativeBundle } from '../utils/getReactNativeBundle'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { URL } from 'node:url'

let cachedReactNativeBundles: Record<string, string | undefined> = {}

type ClientMessage = {
  type: 'client-log'
  level: 'log' | 'error' | 'info' | 'debug' | 'warn'
  data: string[]
}

export function createReactNativeDevServerPlugin(options: VXRNOptionsFilled): Plugin {
  let hmrSocket: WebSocket | null = null

  return {
    name: 'vite-plugin-react-native-server',

    configureServer(server: ViteDevServer) {
      const hmrWSS = new WebSocketServer({ noServer: true })
      const clientWSS = new WebSocketServer({ noServer: true })

      hmrWSS.on('connection', (socket) => {
        addConnectedNativeClient()

        socket.on('message', (message) => {
          if (message.toString().includes('ping')) {
            socket.send('pong')
          }
        })

        socket.on('close', () => {
          removeConnectedNativeClient()
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

      const validPlatforms: Record<string, 'ios' | 'android' | undefined> = {
        ios: 'ios',
        android: 'android',
      }

      // Handle React Native endpoints
      server.middlewares.use('/file', async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`)
        const file = url.searchParams.get('file')

        if (file) {
          const source = hotUpdateCache.get(file)
          if (!source) {
            console.warn(`No hot source found for`, file)
            res.writeHead(200, { 'Content-Type': 'text/javascript' })
            res.end('')
            return
          }

          res.writeHead(200, { 'Content-Type': 'text/javascript' })
          res.end(source)
        }
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
            const cached = cachedReactNativeBundles[platform]
            if (cached && !process.env.VXRN_DISABLE_CACHE) {
              return cached
            }

            const builtBundle = await getReactNativeBundle(options, platform)
            cachedReactNativeBundles[platform] = builtBundle
            return builtBundle
          })()

          res.writeHead(200, { 'Content-Type': 'text/javascript' })
          res.end(bundle)
        } catch (err) {
          console.error(` Error building React Native bundle: ${err}`)
          console.error(
            `\n\n  Note, some errors may happen due to a stale Vite cache, you may want to try re-running with the "--clean" flag`
          )
          res.writeHead(500)
          res.end()
        }
      }

      server.middlewares.use('/index.bundle', handleRNBundle)
      server.middlewares.use('/.expo/.virtual-metro-entry.bundle', handleRNBundle)

      // Status endpoint
      server.middlewares.use('/status', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('packager-status:running')
      })

      // React Native HMR WebSocket
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (
          req.url.startsWith(
            '/__hmr'
          ) /* TODO: handle '/__hmr?platform=ios' and android differently */
        ) {
          hmrWSS.handleUpgrade(req, socket, head, (ws) => {
            hmrWSS.emit('connection', ws, req)
          })
        }

        if (req.url === '/__client') {
          clientWSS.handleUpgrade(req, socket, head, (ws) => {
            clientWSS.emit('connection', ws, req)
          })
        }
      })

      // Symbolicate endpoint
      server.middlewares.use('/symbolicate', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('TODO')
      })

      // Clear bundle cache on file changes
      server.watcher.on('change', () => {
        cachedReactNativeBundles = {}
      })
    },
  }
}
