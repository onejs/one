import module from 'node:module'
import { TLSSocket } from 'node:tls'

import type { Plugin } from 'vite'

type ExpoManifestRequestHandlerPluginConfig = {
  /** The root of the Expo project. */
  projectRoot: string
  // Can support more [options](https://github.com/expo/expo/blob/sdk-50/packages/%40expo/cli/src/start/server/middleware/ManifestMiddleware.ts#L113-L121) in the future.
}

/**
 * Let the Vite dev server support handling [Expo Manifest Request](https://github.com/expo/expo/blob/sdk-50/docs/pages/archive/technical-specs/expo-updates-0.mdx#manifest-request), which is required for Expo Go to work.
 */
export function expoManifestRequestHandlerPlugin({
  projectRoot,
}: ExpoManifestRequestHandlerPluginConfig): Plugin {
  return {
    name: 'vxrn:expo-manifest-request-handler',

    configureServer(server) {
      // Add a middleware to Vite's internal Connect server to handle the Expo Manifest Request.
      server.middlewares.use(async (req, res, next) => {
        if (!req.headers['expo-platform']) {
          // Not an Expo manifest request, skip this middleware and proceed.
          return next()
        }

        const protocol = req.socket instanceof TLSSocket && req.socket.encrypted ? 'https' : 'http'
        const host = `${req.headers['x-forwarded-host']}` || req.headers.host

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
            console.warn(
              `Failed to locate Expo SDK in your project: ${expoGoManifestHandlerMiddlewareImportError}`
            )
          } else {
            console.warn(
              `Failed to import Expo SDK from your project: ${expoGoManifestHandlerMiddlewareImportError}`
            )
          }

          console.warn(
            'Ignoring the error and proceeding without handling the Expo manifest request.'
          )
          console.warn(
            `Is this a Expo project, or are you using a supported version of Expo SDK? (${projectRoot})`
          )

          return next()
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

        // Handle the Expo manifest request.
        manifestHandlerMiddleware.handleRequestAsync(req, res, next)
      })
    },
  }
}
