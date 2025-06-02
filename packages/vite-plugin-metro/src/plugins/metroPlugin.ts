import * as util from 'node:util' // has no default export

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
import type { getDefaultConfig as getDefaultConfigT } from '@expo/metro-config'
import type { createDevMiddleware as createDevMiddlewareT } from '@react-native/dev-middleware'

import { projectImport, projectResolve } from '../utils/projectImport'
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
        resolver: {
          ..._defaultConfig?.resolver,
          // unstable_enablePackageExports: false,
          sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'mjs'],
          resolveRequest: (context, moduleName, platform) => {
            const origResolveRequestFn =
              _defaultConfig?.resolver?.resolveRequest || context.resolveRequest

            // HACK: Do not assert the "import" condition for `@babel/runtime`. This
            // is a workaround for ESM <-> CJS interop, as we need the CJS versions of
            // `@babel/runtime` helpers.
            //
            // This hack is originally made in Metro and was removed in `v0.81.3`, but
            // we somehow still need it.
            // See: https://github.com/facebook/metro/commit/9552a64a0487af64cd86d8591e203a55c59c9686#diff-b03f1b511a2be7abd755b9c2561e47f513f84931466f2cc20a17a4238d70f12bL370-L378
            //
            // Resolves the "TypeError: _interopRequireDefault is not a function (it is Object)" error.
            if (moduleName.startsWith('@babel/runtime')) {
              const contextOverride = {
                ...context,
                unstable_conditionNames: context.unstable_conditionNames.filter(
                  (c) => c !== 'import'
                ),
              }
              return origResolveRequestFn(contextOverride, moduleName, platform)
            }

            return origResolveRequestFn(context, moduleName, platform)
          },
        },
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
          transformer: {
            ...defaultConfig.transformer,
            babelTransformerPath: projectResolve(
              projectRoot,
              '@vxrn/vite-plugin-metro/babel-transformer'
            ),
          },
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

      const devToolsSocketEndpoints = ['/inspector/device', '/inspector/debug']
      const reactNativeDevToolsUrl = `http://${typeof server.config.server.host === 'boolean' ? 'localhost' : server.config.server.host}:${server.config.server.port}`
      console.log(`reactNativeDevToolsUrl`, reactNativeDevToolsUrl)
      const { middleware: rnDevtoolsMiddleware, websocketEndpoints: rnDevtoolsWebsocketEndpoints } =
        createDevMiddleware({
          projectRoot,
          serverBaseUrl: reactNativeDevToolsUrl,
          logger: console,
        })

      server.middlewares.use(async (req, res, next) => {
        console.log(`req.url`, req.url)
        console.log(`req.method`, req.method)
        // console.log(`req`, util.inspect(req))
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

          if (req.url === '/open-stack-frame' && req.method === 'POST') {
            let body = ''

            req.on('data', (chunk) => {
              body += chunk.toString()
            })

            req.on('end', () => {
              try {
                const frame = JSON.parse(body)
                console.log(JSON.stringify(frame))

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
            // if (!('rawBody' in req) || !req.rawBody) {
            //   res.statusCode = 406;
            //   console.log('Open stack frame requires the JSON stack frame as request body');
            //   return res.end('Open stack frame requires the JSON stack frame as request body');
            // }

            return
          }

          await (middleware as any)(req, res, next)
        } catch (error) {
          // TODO: handle errors from Metro middleware?
          console.error('Metro middleware error:', error)
          next()
        }
      })

      server.middlewares.use(rnDevtoolsMiddleware)

      console.log(`rnDevtoolsWebsocketEndpoints keys`, Object.keys(rnDevtoolsWebsocketEndpoints))

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
