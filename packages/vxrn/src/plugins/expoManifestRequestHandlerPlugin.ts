import { join } from 'node:path'
import module from 'node:module'
import { TLSSocket } from 'node:tls'
import type { Plugin } from 'vite'
import colors from 'picocolors'

// Can support more [options](https://github.com/expo/expo/blob/sdk-50/packages/%40expo/cli/src/start/server/middleware/ManifestMiddleware.ts#L113-L121) in the future.
type ExpoManifestRequestHandlerPluginConfig = {
  /** The root of the Expo project. */
  projectRoot: string
  port: number
}

/**
 * Let the Vite dev server support handling [Expo Manifest Request](https://github.com/expo/expo/blob/sdk-50/docs/pages/archive/technical-specs/expo-updates-0.mdx#manifest-request), which is required for Expo Go to work.
 */
export function expoManifestRequestHandlerPlugin(
  options: ExpoManifestRequestHandlerPluginConfig
): Plugin {
  const { projectRoot } = options
  return {
    name: 'vxrn:expo-manifest-request-handler',

    configureServer(server) {
      const { logger } = server.config
      const defaultLogOptions = { timestamp: true }

      // Add a middleware to Vite's internal Connect server to handle the Expo Manifest Request.
      server.middlewares.use(async (req, res, next) => {
        if (!req.headers['expo-platform']) {
          // Not an Expo manifest request, skip this middleware and proceed.
          return next()
        }

        const protocol = req.socket instanceof TLSSocket && req.socket.encrypted ? 'https' : 'http'
        const host = `${req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1'}`

        // Try to dynamically import the internal Expo manifest handler from expo packages installed in the user's project.
        let ExpoGoManifestHandlerMiddleware
        let expoGoManifestHandlerMiddlewareImportError
        try {
          // Import Expo from the user's project instead of from where vxrn is installed, since vxrn may be installed globally or at the root workspace.
          const require = module.createRequire(projectRoot)
          const importPath = require.resolve(
            '@expo/cli/build/src/start/server/middleware/ExpoGoManifestHandlerMiddleware.js',
            { paths: [projectRoot] }
          )

          ExpoGoManifestHandlerMiddleware = (await import(importPath)).default
            .ExpoGoManifestHandlerMiddleware
        } catch (e) {
          expoGoManifestHandlerMiddlewareImportError = e
        }

        // If we failed to import the Expo manifest handler, show a warning and ignore the error.
        if (!ExpoGoManifestHandlerMiddleware) {
          if (
            expoGoManifestHandlerMiddlewareImportError instanceof Error &&
            (expoGoManifestHandlerMiddlewareImportError as any).code === 'MODULE_NOT_FOUND'
          ) {
            logger.warn(
              colors.yellow(
                `Failed to locate Expo SDK in your project: ${expoGoManifestHandlerMiddlewareImportError}`
              ),
              defaultLogOptions
            )
          } else {
            logger.warn(
              colors.yellow(
                `Failed to import Expo SDK from your project: ${expoGoManifestHandlerMiddlewareImportError}`
              ),
              defaultLogOptions
            )
          }

          logger.warn(
            'Ignoring the error and responding with preset manifest, this may not work with Expo Go or your development build.',
            defaultLogOptions
          )
          logger.warn(
            colors.yellow(
              `Is this a Expo project, or are you using a supported version of Expo SDK? (${projectRoot})`
            ),
            defaultLogOptions
          )

          const json = getIndexJsonResponse(options)

          res.setHeader('content-type', 'application/json')
          res.write(JSON.stringify(json))
          res.end()

          // fallback to our preset index json for now
          return
        }

        const manifestHandlerMiddleware = new ExpoGoManifestHandlerMiddleware(projectRoot, {
          constructUrl: () => {
            return `${protocol}://${host}`
          },
        })

        // Override the `_getBundleUrl` method ensure the same host and protocol are used for the bundle URL.
        const origGetBundleUrl =
          manifestHandlerMiddleware._getBundleUrl.bind(manifestHandlerMiddleware)
        manifestHandlerMiddleware._getBundleUrl = (...args) => {
          /** Will be something like `http://127.0.0.1:8081/index.bundle?platform=ios&dev=true&hot=false&transform.engine=hermes&transform.bytecode=true&transform.routerRoot=app`. */
          const origBundleUrl = origGetBundleUrl(...args)

          let url = new URL(origBundleUrl)
          if (host) url.host = host
          url.protocol = protocol

          // For now, vxrn will always serve the React Native bundle at `/index.bundle`, while Expo may use something like `/src/App.tsx.bundle`.
          url.pathname = '/index.bundle'

          return url.toString()
        }

        manifestHandlerMiddleware._origGetManifestResponseAsync =
          manifestHandlerMiddleware._getManifestResponseAsync

        manifestHandlerMiddleware._getManifestResponseAsync = async (...args) => {
          try {
            const results = await manifestHandlerMiddleware._origGetManifestResponseAsync(...args)

            // Seems that results.body may have a leading and trailing string that is not JSON, so we need to extract the JSON from it.
            const [, beforeBodyJson, bodyJson, afterBodyJson] =
              results.body.match(/([^\{]*)(\{.*\})([^\}]*)/) || []
            if (!bodyJson) {
              throw new Error(`Unrecognized manifest response from expo: ${results.body}`)
            }

            const parsedBody = JSON.parse(bodyJson)
            if (!parsedBody.extra) {
              parsedBody.extra = {}
            }
            if (!parsedBody.extra.expoClient) {
              parsedBody.extra.expoClient = {}
            }
            // TODO: Using a static icon and splash for branding for now.
            parsedBody.extra.expoClient.iconUrl =
              'https://github.com/user-attachments/assets/6894506b-df81-417c-a4cd-9c125c7ba37f' // TODO: Host this icon somewhere.
            parsedBody.extra.expoClient.splash = {
              image: '__vxrn_unstable_internal/icon.png',
              resizeMode: 'contain',
              backgroundColor: '#000000',
              imageUrl:
                'https://github.com/user-attachments/assets/e816c207-e7d2-4c2e-8aa5-0d4cbaa622bf', // TODO: Host this image somewhere.
            }
            results.body = beforeBodyJson + JSON.stringify(parsedBody) + afterBodyJson

            return results
          } catch (e) {
            if (e instanceof Error) {
              e.message = `[vxrn:expo-manifest-request-handler] Failed to parse the Expo manifest response from expo: ${e.message}`
              throw e
            }

            throw new Error(
              `[vxrn:expo-manifest-request-handler] Failed to parse the Expo manifest response from expo: ${e}`
            )
          }
        }

        // Handle the Expo manifest request.
        manifestHandlerMiddleware.handleRequestAsync(req, res, next)
      })
    },
  }
}

function getIndexJsonResponse({ port, projectRoot }: ExpoManifestRequestHandlerPluginConfig) {
  return {
    name: 'myapp',
    slug: 'myapp',
    scheme: 'myapp',
    version: '1.0.0',
    jsEngine: 'jsc',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
      imageUrl: 'http://127.0.0.1:8081/assets/./assets/splash.png',
    },
    updates: { fallbackToCacheTimeout: 0 },
    assetBundlePatterns: ['**/*'],
    ios: { supportsTablet: true, bundleIdentifier: 'com.natew.myapp' },
    android: {
      package: 'com.tamagui.myapp',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
        foregroundImageUrl: 'http://127.0.0.1:8081/assets/./assets/adaptive-icon.png',
      },
    },
    web: { favicon: './assets/favicon.png' },
    extra: { eas: { projectId: '061b4470-78c7-4d6a-b850-8167fb0a3434' } },
    _internal: {
      isDebug: false,
      projectRoot: projectRoot,
      dynamicConfigPath: null,
      staticConfigPath: join(projectRoot, 'app.json'),
      packageJsonPath: join(projectRoot, 'package.json'),
    },
    sdkVersion: '50.0.0',
    platforms: ['ios', 'android', 'web'],
    iconUrl: `http://127.0.0.1:${port}/assets/./assets/icon.png`,
    debuggerHost: `127.0.0.1:${port}`,
    logUrl: `http://127.0.0.1:${port}/logs`,
    developer: { tool: 'expo-cli', projectRoot: projectRoot },
    packagerOpts: { dev: true },
    mainModuleName: 'index',
    __flipperHack: 'React Native packager is running',
    hostUri: `127.0.0.1:${port}`,
    bundleUrl: `http://127.0.0.1:${port}/index.bundle?platform=ios&dev=true&hot=false&lazy=true`,
    id: '@anonymous/myapp-473c4543-3c36-4786-9db1-c66a62ac9b78',
  }
}
