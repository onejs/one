import type { Connect, Plugin, ViteDevServer } from 'vite'
import { WebSocketServer } from 'ws'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../config/getOptionsFilled'
import { clearCachedBundle, getReactNativeBundle } from '../utils/getReactNativeBundle'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { URL } from 'node:url'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createDevMiddleware } from '@react-native/dev-middleware'
import { runOnWorker } from '../worker'
import { getCacheDir } from '../utils/getCacheDir'
import { debounce } from 'perfect-debounce'
import { createNativeDevEngine } from '../utils/createNativeDevEngine'

type ClientMessage = {
  type: 'client-log'
  level: 'log' | 'error' | 'info' | 'debug' | 'warn'
  data: string[]
}

export function createReactNativeDevServerPlugin(
  options?: Partial<
    Pick<VXRNOptionsFilled, 'cacheDir' | 'debugBundle' | 'debugBundlePaths' | 'entries'>
  >
): Plugin {
  let hmrSocket: WebSocket | null = null

  return {
    name: 'vite-plugin-react-native-server',

    configureServer(server: ViteDevServer) {
      const { host, port } = server.config.server
      const { root } = server.config
      const cacheDir = options?.cacheDir || getCacheDir(root)
      const hmrWSS = new WebSocketServer({ noServer: true })
      const clientWSS = new WebSocketServer({ noServer: true })

      const devToolsSocketEndpoints = ['/inspector/device', '/inspector/debug']
      const reactNativeDevToolsUrl = `http://${host}:${port}`
      const { middleware, websocketEndpoints } = createDevMiddleware({
        serverBaseUrl: reactNativeDevToolsUrl,
        logger: console,
      })

      server.middlewares.use(middleware)

      // link up sockets
      server.httpServer?.on('upgrade', (req, socket, head) => {
        // devtools sockets
        for (const endpoint of devToolsSocketEndpoints) {
          if (req.url.startsWith(endpoint)) {
            const wss = websocketEndpoints[endpoint]
            wss.handleUpgrade(req, socket, head, (ws) => {
              wss.emit('connection', ws, req)
            })
          }
        }

        // hmr socket
        if (
          req.url.startsWith(
            '/__hmr'
          ) /* TODO: handle '/__hmr?platform=ios' and android differently */
        ) {
          hmrWSS.handleUpgrade(req, socket, head, (ws) => {
            hmrSocket = ws as any
            console.info('[vxrn] HMR client connected')
            hmrWSS.emit('connection', ws, req)
          })
        }

        // rolldown HMR socket (used by rolldown dev() HMR client)
        if (req.url?.startsWith('/hot')) {
          hmrWSS.handleUpgrade(req, socket, head, (ws) => {
            hmrSocket = ws as any
            // listen for module registration messages from client
            ws.on('message', async (data: any) => {
              try {
                const msg = JSON.parse(data.toString())
                if (msg.type === 'hmr:module-registered' && msg.modules) {
                  // register modules with the dev engine for HMR tracking
                  const currentEngine = devEngines['ios'] || devEngines['android']
                  if (currentEngine?.engine) {
                    await currentEngine.engine.registerModules('vxrn-dev', msg.modules)
                  }
                }
              } catch {}
            })
            hmrWSS.emit('connection', ws, req)
          })
        }

        // client socket
        if (req.url === '/__client') {
          clientWSS.handleUpgrade(req, socket, head, (ws) => {
            clientWSS.emit('connection', ws, req)
          })
        }
      })

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

      // rolldown DevEngine instances (per platform)
      const devEngines: Record<
        string,
        Awaited<ReturnType<typeof createNativeDevEngine>> | null
      > = {}
      const useRolldownDev = !process.env.VXRN_USE_LEGACY_BUILDER

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
            // new rolldown dev() path
            if (useRolldownDev) {
              if (!devEngines[platform]) {
                console.info(`[vxrn] creating rolldown DevEngine for ${platform}...`)
                devEngines[platform] = await createNativeDevEngine({
                  root,
                  port,
                  host: typeof host === 'string' ? host : 'localhost',
                  platform,
                  entry: './app/_layout.tsx',
                  serverUrl: `http://${typeof host === 'string' && host !== '0.0.0.0' ? host : 'localhost'}:${port}`,
                  onHmrUpdate: (update) => {
                    // broadcast to ALL connected /hot and /__hmr clients
                    const msg = JSON.stringify(update)
                    hmrWSS.clients.forEach((client: any) => {
                      if (client.readyState === 1) {
                        client.send(msg)
                      }
                    })
                  },
                })
                console.info(`[vxrn] rolldown DevEngine ready for ${platform}`)
              }

              const result = await devEngines[platform]!.getBundle()
              return result.code
            }

            // existing vite builder path
            if (typeof options?.debugBundle === 'string' && options.debugBundlePaths) {
              const path = options.debugBundlePaths[platform]
              if (existsSync(path)) {
                console.info(`  !!! - serving debug bundle from`, path)
                return await readFile(path, 'utf-8')
              }
            }

            const getRnBundleOptions = {
              root,
              cacheDir,
              server: {
                port: port,
                url: `http://${host}:${port}`,
              },
              entries: { native: options?.entries?.native || './src/entry-native.tsx' },
              ...options,
            }

            let outBundle = process.env.VXRN_WORKER_BUNDLE
              ? await runOnWorker('bundle-react-native', {
                  options: getRnBundleOptions,
                  platform,
                })
              : await getReactNativeBundle(getRnBundleOptions, platform, {
                  mode: process.env.RN_SERVE_PROD_BUNDLE ? 'prod' : 'dev',
                })

            if (server.config.webSocketToken) {
              outBundle = `globalThis.__VITE_WS_TOKEN__ = "${server.config.webSocketToken}";\n${outBundle}`
            }

            if (options?.debugBundle && options.debugBundlePaths) {
              const path = options.debugBundlePaths[platform]
              if (!existsSync(path)) {
                console.info(`  !!! - writing debug bundle to`, path)
                await writeFile(path, outBundle)
              }
            }

            return outBundle
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

      // Status endpoint
      server.middlewares.use('/status', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('packager-status:running')
      })

      // Symbolicate endpoint
      server.middlewares.use('/symbolicate', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('TODO')
      })

      // Clear bundle cache on file changes (debounced to avoid CPU spikes during builds)
      const debouncedClearCache = debounce(clearCachedBundle, 100)
      server.watcher.on('change', (path: string) => {
        // Skip clearing cache for dist files to avoid loops during builds
        if (path.includes('/dist/') || path.includes('\\dist\\')) {
          return
        }
        debouncedClearCache()
      })
    },
  }
}
