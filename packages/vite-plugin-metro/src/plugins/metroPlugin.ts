import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { parse } from 'node:url'
import type { PluginOption } from 'vite'

// For Metro and Expo, we only import types here.
// We use `projectImport` to dynamically import the actual modules
// at runtime to ensure they are loaded from the user's project root.
import type MetroT from 'metro'
import type { loadConfig as loadConfigT } from 'metro'
import type MetroHmrServerT from 'metro/src/HmrServer'
import type createWebsocketServerT from 'metro/src/lib/createWebsocketServer'
import type { getDefaultConfig as getDefaultConfigT } from '@expo/metro-config'
import type { createDevMiddleware as createDevMiddlewareT } from '@react-native/dev-middleware'

import { projectImport } from '../utils/projectImport'
import { getTerminalReporter } from '../utils/getTerminalReporter'

type MetroYargArguments = Parameters<typeof loadConfigT>[0]
type MetroInputConfig = Parameters<typeof loadConfigT>[1]

export function metroPlugin({
  argv,
  defaultConfigOverrides,
}: {
  argv?: MetroYargArguments
  defaultConfigOverrides?:
    | MetroInputConfig
    | ((defaultConfig: MetroInputConfig) => MetroInputConfig)
} = {}): PluginOption {
  // let projectRoot = ''

  return {
    name: 'metro',
    // configResolved(config) {
    //   projectRoot = config.root
    // },

    async configureServer(server) {
      const { logger, root: projectRoot } = server.config

      const { default: Metro, loadConfig } = await projectImport<{
        default: typeof MetroT
        loadConfig: typeof loadConfigT
      }>(projectRoot, 'metro')
      const { default: MetroHmrServer } = await projectImport<{
        default: typeof MetroHmrServerT
      }>(projectRoot, 'metro/src/HmrServer')
      const { default: createWebsocketServer } = await projectImport<{
        default: typeof createWebsocketServerT
      }>(projectRoot, 'metro/src/lib/createWebsocketServer')
      const { getDefaultConfig } = await projectImport<{
        getDefaultConfig: typeof getDefaultConfigT
      }>(projectRoot, '@expo/metro-config')
      const { createDevMiddleware } = await projectImport<{
        createDevMiddleware: typeof createDevMiddlewareT
      }>(projectRoot, '@react-native/dev-middleware')

      const _defaultConfig: MetroInputConfig = getDefaultConfig(projectRoot) as any
      const defaultConfig: MetroInputConfig = {
        ..._defaultConfig,
        transformer: {
          ..._defaultConfig?.transformer,
          // TODO: This is what Expo is doing, but do we really need this?
          publicPath: '/assets/?unstable_path=.',
        },
        reporter: await getTerminalReporter(projectRoot),
      }

      const config = await loadConfig(
        {
          cwd: projectRoot,
          projectRoot,
          'reset-cache': !!process.env.METRO_RESET_CACHE,
          ...argv,
        },
        {
          ...defaultConfig,
          ...(typeof defaultConfigOverrides === 'function'
            ? defaultConfigOverrides(defaultConfig)
            : defaultConfigOverrides),
        }
      )

      const { middleware, end, metroServer } = await Metro.createConnectMiddleware(config)

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
