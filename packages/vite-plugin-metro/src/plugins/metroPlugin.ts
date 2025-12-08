import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { PluginOption } from 'vite'
import launchEditor from 'launch-editor'

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

      // Track Metro startup separately from Vite
      const metroStartTime = Date.now()
      let metroReady = false

      // Start Metro in background WITHOUT blocking Vite server startup
      // All imports and config are done inside metroPromise to avoid blocking
      let middleware: Awaited<ReturnType<typeof MetroT.createConnectMiddleware>>['middleware']
      let metroServer: Awaited<ReturnType<typeof MetroT.createConnectMiddleware>>['metroServer']
      let hmrServer: MetroHmrServerT
      let websocketEndpoints: Record<string, ReturnType<typeof createWebsocketServerT>>
      let rnDevtoolsMiddleware: ReturnType<typeof createDevMiddlewareT>['middleware']

      const metroPromise = (async () => {
        try {
          // Import Metro modules lazily to avoid blocking Vite startup
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

          // @ts-expect-error TODO
          const metroResult = await Metro.createConnectMiddleware(config, {
            // Force enable file watching, even on CI.
            // This is needed for HMR tests to work on CI.
            watch: true,
          })

        middleware = metroResult.middleware
        metroServer = metroResult.metroServer

        patchMetroServerWithViteConfigAndMetroPluginOptions(metroServer, server.config, options)

        hmrServer = new MetroHmrServer(
          metroServer.getBundler(),
          metroServer.getCreateModuleId(),
          config
        )

        const reactNativeDevToolsUrl = `http://${typeof server.config.server.host === 'boolean' ? 'localhost' : server.config.server.host}:${server.config.server.port}`
        const devMiddleware = createDevMiddleware({
          projectRoot,
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

          metroReady = true
          const metroElapsed = Date.now() - metroStartTime
          console.info(`[metro] Metro bundler ready (${metroElapsed}ms)`)
        } catch (err) {
          console.error('[metro] Error during Metro initialization:', err)
          throw err
        }
      })()

      // Don't await - let Metro initialize in parallel
      metroPromise.catch((err) => {
        console.error('[metro] Failed to start Metro:', err)
      })

      // Setup websocket handling after Metro is ready
      metroPromise.then(() => {
        server.httpServer?.on('upgrade', (request, socket, head) => {
          const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname

          if (websocketEndpoints[pathname]) {
            websocketEndpoints[pathname].handleUpgrade(request, socket, head, (ws) => {
              websocketEndpoints[pathname].emit('connection', ws, request)
            })
          }
        })

        // Insert devtools middleware after Metro is ready
        server.middlewares.use(rnDevtoolsMiddleware)
      })

      server.middlewares.use(async (req, res, next) => {
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
                  console.info(`  !!! - serving debug bundle from`, VITE_METRO_DEBUG_BUNDLE)
                  const content = await readFile(VITE_METRO_DEBUG_BUNDLE, 'utf-8')
                  res.setHeader('Content-Type', 'application/javascript')
                  res.end(content)
                  return
                }
              }
            }

            // Handle `isPackagerRunning` request from native app.
            // Without this, people may see a `No script URL provided. Make sure the packager is running or you have embedded a JS bundle in your application bundle.`, `unsanitizedScriptURLString = (null)` error in their native app running with the "Debug" configuration.
            // See: https://github.com/facebook/react-native/blob/v0.80.0-rc.4/packages/react-native/React/Base/RCTBundleURLProvider.mm#L87-L113
            if (
              req.url === '/status' &&
              // The path (`/status`) is too general and may conflict with the user's web app, so we also check the User-Agent header to ensure it's a request from a native app.
              // Failing to handle this correctly will cause the native app to show a "Packager is not running at ..." error.
              (req.headers['user-agent']?.includes('CFNetwork/' /* iOS */) ||
                req.headers['user-agent']?.includes('okhttp/' /* Android */))
            ) {
              res.statusCode = 200
              res.end('packager-status:running')
              return
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
                  console.error('Failed to parse stack frame:', e)
                  res.statusCode = 400
                  return res.end('Invalid stack frame JSON')
                }
              })

              return
            }

            // this is the actual Metro middleware that handles bundle requests
            await (middleware as any)(req, res, next)
          } catch (error) {
            // TODO: handle errors from Metro middleware?
            console.error('Metro middleware error:', error)
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
