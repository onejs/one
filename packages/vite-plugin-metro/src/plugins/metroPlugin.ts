import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { parse } from 'node:url'
import type { PluginOption } from 'vite'
import launchEditor from 'launch-editor'

// For Metro and Expo, we only import types here.
// We use `projectImport` to dynamically import the actual modules
// at runtime to ensure they are loaded from the user's project root.
import type MetroT from 'metro'
import type { loadConfig as loadConfigT } from 'metro'
import type MetroHmrServerT from 'metro/src/HmrServer'
import type createWebsocketServerT from 'metro/src/lib/createWebsocketServer'
import type { createDevMiddleware as createDevMiddlewareT } from '@react-native/dev-middleware'

import { projectImport } from '../utils/projectImport'
import type { TransformOptions } from '../transformer/babel-core'
import { getMetroConfigFromViteConfig } from '../metro-config/getMetroConfigFromViteConfig'
import { patchMetroServerWithMetroPluginOptions } from '../metro-config/patchMetroServerWithMetroPluginOptions'

type MetroYargArguments = Parameters<typeof loadConfigT>[0]
type MetroInputConfig = Parameters<typeof loadConfigT>[1]

export type MetroPluginOptions = {
  argv?: MetroYargArguments
  defaultConfigOverrides?:
    | MetroInputConfig
    | ((defaultConfig: MetroInputConfig) => MetroInputConfig)
  babelConfig?: TransformOptions
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

    async configureServer(server) {
      const { logger, root: projectRoot } = server.config

      const { default: Metro } = await projectImport<{
        default: typeof MetroT
      }>(projectRoot, 'metro')
      const { default: MetroHmrServer } = await projectImport<{
        default: typeof MetroHmrServerT
      }>(projectRoot, 'metro/src/HmrServer')
      const { default: createWebsocketServer } = await projectImport<{
        default: typeof createWebsocketServerT
      }>(projectRoot, 'metro/src/lib/createWebsocketServer')
      const { createDevMiddleware } = await projectImport<{
        createDevMiddleware: typeof createDevMiddlewareT
      }>(projectRoot, '@react-native/dev-middleware')

      const config = await getMetroConfigFromViteConfig(server.config, options)

      const { middleware, end, metroServer } = await Metro.createConnectMiddleware(config, {
        // Force enable file watching, even on CI.
        // This is needed for HMR tests to work on CI.
        watch: true,
      })

      patchMetroServerWithMetroPluginOptions(metroServer, options)

      const hmrServer = new MetroHmrServer(
        metroServer.getBundler(),
        metroServer.getCreateModuleId(),
        config
      )

      const reactNativeDevToolsUrl = `http://${typeof server.config.server.host === 'boolean' ? 'localhost' : server.config.server.host}:${server.config.server.port}`
      const { middleware: rnDevtoolsMiddleware, websocketEndpoints: rnDevtoolsWebsocketEndpoints } =
        createDevMiddleware({
          projectRoot,
          serverBaseUrl: reactNativeDevToolsUrl,
          logger: console,
        })

      server.middlewares.use(async (req, res, next) => {
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
            req.headers['user-agent']?.includes(
              'CFNetwork/'
            ) /* The path (`/status`) is too general and may conflict with the user's web app, so we also check the User-Agent header to ensure it's a request from a native app. */ /* TODO: Android */
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
      })

      server.middlewares.use(rnDevtoolsMiddleware)

      const websocketEndpoints = {
        '/hot': createWebsocketServer({
          websocketServer: hmrServer,
        }),
        ...rnDevtoolsWebsocketEndpoints,
      }

      server.httpServer?.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url!)

        if (pathname != null && websocketEndpoints[pathname]) {
          websocketEndpoints[pathname].handleUpgrade(request, socket, head, (ws) => {
            websocketEndpoints[pathname].emit('connection', ws, request)
          })
        } else {
          // TODO: Do we need this?
          // socket.destroy()
        }
      })
    },
  }
}
