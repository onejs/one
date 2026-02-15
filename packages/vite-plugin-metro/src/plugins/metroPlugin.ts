import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { PluginOption } from 'vite'
import launchEditor from 'launch-editor'
import { createDebugger } from '@vxrn/debug'
import { checkAndClearMetroCacheFromVite } from '../utils/metroCacheManager'

const { debug } = createDebugger('vite-plugin-metro')

// For Metro and Expo, we only import types here.
// We use `projectImport` to dynamically import the actual modules
// at runtime to ensure they are loaded from the user's project root.
import type MetroT from 'metro'
import type { loadConfig as loadConfigT } from 'metro'
import type MetroHmrServerT from 'metro/private/HmrServer'
import type createWebsocketServerT from 'metro/private/lib/createWebsocketServer'
import type { createDevMiddleware as createDevMiddlewareT } from '@react-native/dev-middleware'

import { projectImport } from '../utils/projectImport'
import type { TransformOptions } from '../transformer/babel-core'
import { getMetroConfigFromViteConfig } from '../metro-config/getMetroConfigFromViteConfig'
import { patchMetroServerWithViteConfigAndMetroPluginOptions } from '../metro-config/patchMetroServerWithViteConfigAndMetroPluginOptions'

type MetroYargArguments = Parameters<typeof loadConfigT>[0]
type MetroInputConfig = Parameters<typeof loadConfigT>[1]

export type MetroPluginOptions = {
  argv?: MetroYargArguments
  defaultConfigOverrides?:
    | MetroInputConfig
    | ((defaultConfig: MetroInputConfig) => MetroInputConfig)
  /**
   * Shorthand for setting `useWatchman` in Metro's resolver config.
   * When true, enables Watchman for file watching. When false, disables it.
   */
  watchman?: boolean
  /**
   * Array of module names or glob patterns that should be resolved to an empty module.
   * This is useful for excluding modules that break the React Native build.
   *
   * Supports glob patterns via micromatch:
   * - Exact match: `'jsonwebtoken'`
   * - Wildcard: `'@aws-sdk/*'`
   * - Multiple wildcards: `'@aws-sdk/**'`
   *
   * Example: `['node:http2', 'jsonwebtoken', '@aws-sdk/*']`
   */
  excludeModules?: string[]
  /** Consider using babelConfigOverrides instead */
  babelConfig?: TransformOptions
  babelConfigOverrides?: (defaultConfig: TransformOptions) => TransformOptions
  /**
   * Overrides the main module name which is normally defined as the `main` field in `package.json`.
   *
   * This will affect how `/.expo/.virtual-metro-entry.bundle` behaves.
   *
   * It can be used to change the entry point of the React Native app without the need of using
   * the `main` field in `package.json`.
   */
  mainModuleName?: string
  /**
   * Controls when Metro bundler starts:
   * - 'eager' (default): Start Metro as soon as Vite server is listening
   * - 'lazy': Defer Metro startup until a bundle request or simulator connection is detected
   *
   * Use 'lazy' to speed up dev server startup when you don't always need Metro.
   */
  startup?: 'eager' | 'lazy'
}

export function metroPlugin(options: MetroPluginOptions = {}): PluginOption {
  // let projectRoot = ''

  // This is used to:
  //   1. Make the react-native CLI bundle command use Metro.
  //   2. Let the react-native CLI bundle command access metro plugin options.
  // See: getBuildBundleFn
  globalThis['__viteMetroPluginOptions__'] = options

  return {
    name: 'metro',
    // configResolved(config) {
    //   projectRoot = config.root
    // },

    configureServer(server) {
      const { root: projectRoot } = server.config

      let metroReady = false

      // Metro state - initialized after Vite server is listening
      let middleware: Awaited<
        ReturnType<typeof MetroT.createConnectMiddleware>
      >['middleware']
      let metroServer: Awaited<
        ReturnType<typeof MetroT.createConnectMiddleware>
      >['metroServer']
      let hmrServer: MetroHmrServerT
      let websocketEndpoints: Record<string, ReturnType<typeof createWebsocketServerT>>
      let rnDevtoolsMiddleware: ReturnType<typeof createDevMiddlewareT>['middleware']

      let metroPromise: Promise<void>
      let metroPromiseResolvers: { resolve: () => void; reject: (err: Error) => void }

      // Create a promise that will be resolved when Metro is ready
      // This is used by the middleware to wait for Metro on bundle requests
      metroPromise = new Promise((resolve, reject) => {
        metroPromiseResolvers = { resolve, reject }
      })

      const startMetro = async () => {
        const metroStartTime = Date.now()
        try {
          // check if Metro cache needs clearing based on Vite's deps optimization hashes
          // must run before importing Metro so METRO_RESET_CACHE is set
          checkAndClearMetroCacheFromVite(server, server.config.logger)

          // Import Metro modules lazily - only after Vite server is listening
          const { default: Metro } = await projectImport<{
            default: typeof MetroT
          }>(projectRoot, 'metro')
          const { default: MetroHmrServer } = await projectImport<{
            default: typeof MetroHmrServerT
          }>(projectRoot, 'metro/private/HmrServer')
          const { default: createWebsocketServer } = await projectImport<{
            default: typeof createWebsocketServerT
          }>(projectRoot, 'metro/private/lib/createWebsocketServer')
          const { createDevMiddleware } = await projectImport<{
            createDevMiddleware: typeof createDevMiddlewareT
          }>(projectRoot, '@react-native/dev-middleware')

          const config = await getMetroConfigFromViteConfig(server.config, options)

          const metroResult = await Metro.createConnectMiddleware(config, {
            // Force enable file watching, even on CI.
            // This is needed for HMR tests to work on CI.
            watch: true,
          })

          middleware = metroResult.middleware
          metroServer = metroResult.metroServer

          patchMetroServerWithViteConfigAndMetroPluginOptions(
            metroServer,
            server.config,
            options
          )

          hmrServer = new MetroHmrServer(
            metroServer.getBundler(),
            metroServer.getCreateModuleId(),
            config
          )

          const reactNativeDevToolsUrl = `http://${typeof server.config.server.host === 'boolean' ? 'localhost' : server.config.server.host}:${server.config.server.port}`
          const devMiddleware = createDevMiddleware({
            serverBaseUrl: reactNativeDevToolsUrl,
            logger: console,
          })

          rnDevtoolsMiddleware = devMiddleware.middleware
          websocketEndpoints = {
            '/hot': createWebsocketServer({
              websocketServer: hmrServer,
            }),
            ...devMiddleware.websocketEndpoints,
          }

          // Setup websocket handling for Metro-specific endpoints only
          // Other paths (like Vite's /__vxrnhmr) are handled by Vite's internal HMR
          server.httpServer?.on('upgrade', (request, socket, head) => {
            const pathname = new URL(request.url!, `http://${request.headers.host}`)
              .pathname

            const endpoint = websocketEndpoints[pathname]
            if (endpoint) {
              endpoint.handleUpgrade(request, socket, head, (ws) => {
                endpoint.emit('connection', ws, request)
              })
            }
            // if no endpoint matches, let other handlers (like Vite's HMR) handle it
          })

          // Insert devtools middleware
          server.middlewares.use(rnDevtoolsMiddleware)

          metroReady = true
          const metroElapsed = Date.now() - metroStartTime
          debug?.(`Metro bundler ready (${metroElapsed}ms)`)
          metroPromiseResolvers.resolve()
        } catch (err) {
          debug?.(`Error during Metro initialization: ${err}`)
          metroPromiseResolvers.reject(err as Error)
          throw err
        }
      }

      const isLazyStartup = options.startup === 'lazy'

      // for lazy startup, we start Metro on-demand when a request triggers it
      let metroStarting = false
      const ensureMetroStarted = () => {
        if (metroStarting || metroReady) return
        metroStarting = true
        debug?.('Starting Metro on-demand (lazy startup)')
        startMetro().catch((err) => {
          debug?.(`Failed to start Metro: ${err}`)
        })
      }

      // Wait for Vite server to be listening before starting Metro (eager mode)
      // For lazy mode, we defer startup until a request triggers it
      if (!isLazyStartup) {
        if (server.httpServer) {
          if (server.httpServer.listening) {
            // Server is already listening (unlikely but handle it)
            startMetro().catch((err) => {
              debug?.(`Failed to start Metro: ${err}`)
            })
          } else {
            server.httpServer.on('listening', () => {
              startMetro().catch((err) => {
                debug?.(`Failed to start Metro: ${err}`)
              })
            })
          }
        } else {
          // No httpServer yet, wait for it via a small delay and retry
          // This shouldn't normally happen but is a safety fallback
          const waitForServer = () => {
            if (server.httpServer) {
              if (server.httpServer.listening) {
                startMetro().catch((err) => {
                  debug?.(`Failed to start Metro: ${err}`)
                })
              } else {
                server.httpServer.on('listening', () => {
                  startMetro().catch((err) => {
                    debug?.(`Failed to start Metro: ${err}`)
                  })
                })
              }
            } else {
              setTimeout(waitForServer, 10)
            }
          }
          waitForServer()
        }
      } else {
        debug?.('Metro lazy startup enabled - will start on first native request')
      }

      server.middlewares.use(async (req, res, next) => {
        const isNativeRequest =
          req.headers['user-agent']?.includes('CFNetwork/') ||
          req.headers['user-agent']?.includes('okhttp/')

        // trigger lazy startup on bundle requests or native client connections
        if (isLazyStartup && !metroReady) {
          if (
            req.url?.includes('.bundle') ||
            (req.url === '/status' && isNativeRequest)
          ) {
            ensureMetroStarted()
          }
        }

        // Handle `isPackagerRunning` request from native app.
        // This must be handled before waiting for Metro, so simulators get an immediate response
        // while Metro starts in the background (important for lazy startup mode)
        // See: https://github.com/facebook/react-native/blob/v0.80.0-rc.4/packages/react-native/React/Base/RCTBundleURLProvider.mm#L87-L113
        if (req.url === '/status' && isNativeRequest) {
          res.statusCode = 200
          res.end('packager-status:running')
          return
        }

        // Wait for Metro if it's a bundle request and Metro isn't ready yet
        if (req.url?.includes('.bundle') && !metroReady) {
          await metroPromise
        }

        // If Metro middleware is ready, use it
        if (middleware) {
          try {
            // Just for debugging purposes.
            if (req.url?.includes('.bundle')) {
              const VITE_METRO_DEBUG_BUNDLE = process.env.VITE_METRO_DEBUG_BUNDLE
              if (VITE_METRO_DEBUG_BUNDLE) {
                if (existsSync(VITE_METRO_DEBUG_BUNDLE)) {
                  debug?.(`serving debug bundle from ${VITE_METRO_DEBUG_BUNDLE}`)
                  const content = await readFile(VITE_METRO_DEBUG_BUNDLE, 'utf-8')
                  res.setHeader('Content-Type', 'application/javascript')
                  res.end(content)
                  return
                }
              }
            }

            if (req.url === '/open-stack-frame' && req.method === 'POST') {
              let body = ''

              req.on('data', (chunk) => {
                body += chunk.toString()
              })

              req.on('end', () => {
                try {
                  const frame = JSON.parse(body)

                  // https://github.com/yyx990803/launch-editor/blob/master/packages/launch-editor-middleware/index.js
                  launchEditor(frame.file)
                  res.statusCode = 200
                  res.end('Stack frame opened in editor')
                } catch (e) {
                  debug?.(`Failed to parse stack frame: ${e}`)
                  res.statusCode = 400
                  return res.end('Invalid stack frame JSON')
                }
              })

              return
            }

            // this is the actual Metro middleware that handles bundle requests
            await (middleware as any)(req, res, next)
          } catch (error) {
            debug?.(`Metro middleware error: ${error}`)
            next()
          }
        } else {
          // Metro not ready yet, pass through
          next()
        }
      })
    },
  }
}
