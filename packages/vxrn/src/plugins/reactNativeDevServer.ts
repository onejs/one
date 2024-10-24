import type { Plugin, ViteDevServer } from 'vite'
import { WebSocket } from 'ws'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../utils/getOptionsFilled'
import { getReactNativeBundle } from '../utils/getReactNativeBundle'

// Cache for hot updates and RN bundle
const hotUpdateCache = new Map<string, string>()
let cachedReactNativeBundle: string | null = null

export function createReactNativeDevServerPlugin(options: VXRNOptionsFilled): Plugin {
  let hmrSocket: WebSocket | null = null

  return {
    name: 'vite-plugin-react-native-server',

    configureServer(server: ViteDevServer) {
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
      const handleRNBundle = async (_req: any, res: any) => {
        try {
          const bundle = await (async () => {
            if (cachedReactNativeBundle && !process.env.VXRN_DISABLE_CACHE) {
              return cachedReactNativeBundle
            }

            const builtBundle = await getReactNativeBundle(options)
            cachedReactNativeBundle = builtBundle
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
        if (req.url === '/__hmr') {
          const ws = new WebSocket.Server({ noServer: true })

          ws.on('connection', (socket) => {
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

          ws.handleUpgrade(req, socket, head, (ws) => {
            ws.emit('connection', ws, req)
          })
        }

        if (req.url === '/__client') {
          const ws = new WebSocket.Server({ noServer: true })

          ws.on('connection', (socket) => {
            // Client logging handler code...
          })

          ws.handleUpgrade(req, socket, head, (ws) => {
            ws.emit('connection', ws, req)
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
        cachedReactNativeBundle = null
      })
    },
  }
}
