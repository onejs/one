import { TLSSocket } from "node:tls";
import type { PluginOption } from "vite";

import { projectImport } from "../utils/projectImport";
import { patchExpoGoManifestHandlerMiddlewareWithCustomMainModuleName } from "../utils/patchExpoGoManifestHandlerMiddlewareWithCustomMainModuleName";

export type ExpoManifestRequestHandlerPluginPluginOptions = {
  /**
   * Overrides the main module name which is normally defined as the `main` field in `package.json`.
   *
   * This will affect the `launchAsset.url` field in the Expo manifest response.
   *
   * It can be used to change the entry point of the React Native app without the need of using
   * the `main` field in `package.json`.
   */
  mainModuleName?: string;
};

export function expoManifestRequestHandlerPlugin(
  options?: ExpoManifestRequestHandlerPluginPluginOptions,
): PluginOption {
  // let projectRoot = ''

  return {
    name: "expo-manifest-request-handler",
    // configResolved(config) {
    //   projectRoot = config.root
    // },
    configureServer(server) {
      const { root: projectRoot } = server.config;

      // Lazy load the ExpoGoManifestHandlerMiddleware to avoid blocking Vite startup
      let ExpoGoManifestHandlerMiddleware: any;
      const importPromise = projectImport(
        projectRoot,
        "@expo/cli/build/src/start/server/middleware/ExpoGoManifestHandlerMiddleware.js",
      ).then((mod) => {
        ExpoGoManifestHandlerMiddleware = mod.default.ExpoGoManifestHandlerMiddleware;
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.headers["expo-platform"]) {
          // Not an Expo manifest request, skip this middleware and proceed.
          return next();
        }

        // Wait for the import to complete if it hasn't yet
        if (!ExpoGoManifestHandlerMiddleware) {
          await importPromise;
        }

        const protocol = req.socket instanceof TLSSocket && req.socket.encrypted ? "https" : "http";

        const manifestHandlerMiddleware = new ExpoGoManifestHandlerMiddleware(projectRoot, {
          constructUrl: ({ scheme, hostname }) => {
            // Make the dev server work well behind a reverse proxy by deriving the host from request headers.
            const host = req.headers["x-forwarded-host"] || req.headers.host || hostname;

            if (!scheme) {
              // Some manifest fields (e.g., extra.expoClient.hostUri) must omit the scheme
              // (e.g., use `127.0.0.1:8081` instead of `http://127.0.0.1:8081`).
              // Including a scheme here can cause issues like images not loading in dev mode.
              return host;
            }

            return `${protocol || scheme}://${host}`;
          },
        });

        if (options?.mainModuleName) {
          patchExpoGoManifestHandlerMiddlewareWithCustomMainModuleName(
            manifestHandlerMiddleware,
            options.mainModuleName,
          );
        }

        // Handle the Expo manifest request.
        manifestHandlerMiddleware.handleRequestAsync(req, res, next);
      });
    },
  };
}
