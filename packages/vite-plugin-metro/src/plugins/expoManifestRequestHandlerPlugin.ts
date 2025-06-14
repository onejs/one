import { TLSSocket } from 'node:tls'
import type { PluginOption } from 'vite'

import { projectImport } from '../utils/projectImport'

export function expoManifestRequestHandlerPlugin(): PluginOption {
  // let projectRoot = ''

  return {
    name: 'expo-manifest-request-handler',
    // configResolved(config) {
    //   projectRoot = config.root
    // },
    async configureServer(server) {
      const { root: projectRoot } = server.config

      const ExpoGoManifestHandlerMiddleware = (
        await projectImport(
          projectRoot,
          '@expo/cli/build/src/start/server/middleware/ExpoGoManifestHandlerMiddleware.js'
        )
      ).default.ExpoGoManifestHandlerMiddleware

      server.middlewares.use(async (req, res, next) => {
        if (!req.headers['expo-platform']) {
          // Not an Expo manifest request, skip this middleware and proceed.
          return next()
        }

        const protocol = req.socket instanceof TLSSocket && req.socket.encrypted ? 'https' : 'http'

        const manifestHandlerMiddleware = new ExpoGoManifestHandlerMiddleware(projectRoot, {
          constructUrl: ({ scheme, hostname }) => {
            // Make the dev server work well behind a reverse proxy by deriving the host from request headers.
            const host = req.headers['x-forwarded-host'] || req.headers.host || hostname

            if (!scheme) {
              // Some manifest fields (e.g., extra.expoClient.hostUri) must omit the scheme
              // (e.g., use `127.0.0.1:8081` instead of `http://127.0.0.1:8081`).
              // Including a scheme here can cause issues like images not loading in dev mode.
              return host
            }

            return `${protocol || scheme}://${host}`
          },
        })

        // Handle the Expo manifest request.
        manifestHandlerMiddleware.handleRequestAsync(req, res, next)
      })
    },
  }
}
