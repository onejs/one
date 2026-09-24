import type { Connect, Plugin, ViteDevServer } from 'vite'
import { WebSocketServer, type WebSocket } from 'ws'
import { createMessageSocket } from '@vxrn/utils'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../config/getOptionsFilled'
import { URL } from 'node:url'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createDevMiddleware } from '@react-native/dev-middleware'
import { createNativeDevEngine } from '../utils/createNativeDevEngine'
import { getBoundPort } from '../utils/getBoundPort'
import {
  getNativeFramePlatform,
  isNativeBundleFrame,
  symbolicateNativeStack,
  type NativeStackFrame,
} from '../utils/symbolicateNativeStack'

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
      const warnedProdBundleRequest = new Set<string>()
      const pendingReloadPlatforms = new Set<'ios' | 'android'>()

      const devToolsSocketEndpoints = ['/inspector/device', '/inspector/debug']
      const reactNativeDevToolsUrl = `http://${host}:${getBoundPort(server)}`
      const { middleware, websocketEndpoints } = createDevMiddleware({
        serverBaseUrl: reactNativeDevToolsUrl,
        logger: console,
        unstable_experiments: {
          enableStandaloneFuseboxShell: false,
        },
      })

      // an expo project's clients (dev launcher, expo-updates, peach) ask `/`,
      // `/manifest` or `/index.exp` for the evaluated app config with an
      // `expo-platform` header or `?platform=`. answer with the expo updates
      // manifest expo cli's ExpoGoManifestHandlerMiddleware serves. a project
      // without @expo/config gets none, like a bare react native metro.
      const projectRequire = createRequire(join(root, 'package.json'))
      const anonymousScopeId = randomUUID()
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
        if (url.pathname !== '/' && url.pathname !== '/manifest' && url.pathname !== '/index.exp') {
          return next()
        }
        const header = req.headers['expo-platform'] || req.headers['exponent-platform']
        const platform =
          validPlatforms[url.searchParams.get('platform') || String(header || '')]
        if (!platform) return next()

        let expoConfigPath: string
        try {
          expoConfigPath = projectRequire.resolve('@expo/config')
        } catch {
          return next()
        }
        const expoRequire = createRequire(expoConfigPath)
        const { getConfig } = expoRequire('@expo/config')
        const { resolveRelativeEntryPoint } = expoRequire('@expo/config/paths')
        const { Updates } = expoRequire('@expo/config-plugins')

        try {
          const { exp, pkg } = getConfig(root)
          const hostUri = req.headers.host || `localhost:${getBoundPort(server)}`
          const mainModuleName: string = resolveRelativeEntryPoint(root, { platform, pkg })
          const runtimeVersion = await Updates.getRuntimeVersionAsync(
            root,
            { ...exp, runtimeVersion: exp.runtimeVersion ?? { policy: 'sdkVersion' } },
            platform
          )
          const manifest = JSON.stringify({
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            runtimeVersion,
            launchAsset: {
              key: 'bundle',
              contentType: 'application/javascript',
              url: `http://${hostUri}/${encodeURI(mainModuleName.replace(/^\/+/, ''))}.bundle?platform=${platform}&dev=true&hot=false`,
            },
            assets: [],
            metadata: {},
            extra: {
              eas: { projectId: exp.extra?.eas?.projectId ?? undefined },
              expoClient: { ...exp, hostUri },
              expoGo: {
                debuggerHost: hostUri,
                developer: { tool: 'expo-cli', projectRoot: root },
                packagerOpts: { dev: true },
                mainModuleName,
              },
              scopeKey: `@anonymous/${exp.slug}-${anonymousScopeId}`,
            },
          })

          const headers: Record<string, string> = {
            'expo-protocol-version': '0',
            'expo-sfv-version': '0',
            'cache-control': 'private, max-age=0',
          }
          const accept = String(req.headers.accept || '')
          if (accept.includes('multipart/mixed')) {
            const boundary = `vxrn-${randomUUID()}`
            res.writeHead(200, {
              ...headers,
              'content-type': `multipart/mixed; boundary=${boundary}`,
            })
            res.end(
              `--${boundary}\r\ncontent-disposition: form-data; name="manifest"\r\ncontent-type: application/json\r\n\r\n${manifest}\r\n--${boundary}--\r\n`
            )
            return
          }
          const contentType = accept.includes('application/expo+json')
            ? 'application/expo+json'
            : accept.includes('application/json')
              ? 'application/json'
              : 'text/plain'
          res.writeHead(200, { ...headers, 'content-type': contentType })
          res.end(req.method === 'HEAD' ? undefined : manifest)
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end(error instanceof Error ? error.stack || error.message : String(error))
        }
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
        if (pendingReloadPlatforms.has(socket.vxrnPlatform)) {
          socket.send(JSON.stringify({ type: 'hmr:reload' }))
        }

        socket.on('message', (message) => {
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
            // the runtime could not accept an update, so restart it. the bundle
            // it fetches on the way back settles the engine's pending work
            // first, so it lands on the current output.
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

      const getDevEngine = async (platform: 'ios' | 'android') => {
        while (!devEngines[platform]) {
          // prevent duplicate creation from concurrent requests
          if (!devEngineCreating[platform]) {
            const creating = (async () => {
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
                    // an update with no clientId is for every client on the
                    // platform: an error, or a reload after a full rebuild
                    const target = 'clientId' in update ? update.clientId : undefined
                    if (update.type === 'hmr:reload' && !target) {
                      // keep this pending until the rebuilt bundle is served.
                      // a previous app instance can leave a live socket while
                      // its replacement is still mounting and connecting.
                      pendingReloadPlatforms.add(platform)
                    }
                    hmrWSS.clients.forEach((client) => {
                      const nativeClient = client as NativeHmrSocket
                      if (
                        nativeClient.readyState === 1 &&
                        nativeClient.vxrnPlatform === platform &&
                        (!target || nativeClient.vxrnClientId === target)
                      ) {
                        client.send(msg)
                      }
                    })
                  },
                })
                console.info(`[vxrn] rolldown DevEngine ready for ${platform}`)
              } finally {
                // clear so a failed creation can be retried.
                devEngineCreating[platform] = null
              }
            })()
            devEngineCreating[platform] = creating
          }
          await devEngineCreating[platform]
        }
        return devEngines[platform]!
      }

      // React Native bundle handler
      const handleRNBundle: Connect.NextHandleFunction = async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`)
        const platformString = url.searchParams.get('platform') || ''
        const platform = validPlatforms[platformString]

        if (!platform) {
          return
        }

        // the dev engine only ever builds a dev bundle, so honoring `dev=false`
        // here would mean a second engine per platform. production native bundles
        // come from the build command instead. say so rather than quietly serving
        // dev bytes to something that asked for production ones.
        if (
          url.searchParams.get('dev') === 'false' &&
          !warnedProdBundleRequest.has(platform)
        ) {
          warnedProdBundleRequest.add(platform)
          console.warn(
            `[vxrn] ${platform} bundle requested with dev=false, but the dev server only builds dev bundles. Serving a dev bundle. Use the build command for a production one.`
          )
        }

        try {
          const bundle = await (await getDevEngine(platform)).getBundle()
          // a client that connects after this response starts from the current
          // route map and does not need the pending reload intended for the
          // previous runtime.
          res.once('finish', () => pendingReloadPlatforms.delete(platform))

          // a DevSettings reload requests this exact URL again. native URL
          // loading may otherwise reuse the first response and restart the app
          // on a route map from before a file was added or removed.
          res.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/javascript',
          })
          res.end(bundle.code)
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

      // handle any metro bundle request
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].endsWith('.bundle')) {
          handleRNBundle(req, res, next)
        } else {
          next()
        }
      })

      // resolve a device stack back to authored files through the dev bundle's
      // source map. react native posts here from LogBox and from console traces.
      server.middlewares.use('/symbolicate', async (req, res) => {
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const body: { stack?: NativeStackFrame[] } = JSON.parse(
            Buffer.concat(chunks).toString('utf8')
          )
          const stack = body.stack
          if (!Array.isArray(stack)) {
            throw new Error('expected a `stack` array in the request body')
          }

          const bundleFrame = stack.find((frame) => isNativeBundleFrame(frame.file))
          if (!bundleFrame) {
            // nothing in this stack came from the bundle, so there is nothing to
            // resolve. hand it straight back rather than inventing frames.
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ stack, codeFrame: null }))
            return
          }

          const framePlatform = getNativeFramePlatform(bundleFrame.file)
          const platform = validPlatforms[framePlatform ?? '']
          if (!platform) {
            throw new Error(
              `could not tell which platform "${bundleFrame.file}" was bundled for`
            )
          }

          const bundle = await (await getDevEngine(platform)).getBundle()
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(symbolicateNativeStack(stack, bundle.map)))
        } catch (err) {
          console.error(`[vxrn] symbolicate failed`, err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            })
          )
        }
      })
    },
  }
}
