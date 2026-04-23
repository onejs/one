import type { InlineConfig, UserConfig } from 'vite'

import { getOptimizeDeps } from './getOptimizeDeps'

import { webExtensions } from '../constants'

/**
 * These configs are originally in `getViteServerConfig`. Maybe we should organize and move each of them into other more appropriate places.
 */
export function getAdditionalViteConfig(): Omit<InlineConfig, 'plugins'> {
  const { optimizeDeps } = getOptimizeDeps('serve')

  // TODO: can we move most of this into `one` plugin:
  const { rolldownOptions, ...ssrOptimizeDepsWithoutRolldown } = optimizeDeps

  return {
    appType: 'custom',
    clearScreen: false,
    publicDir: 'public',

    // keep include/exclude/needsInterop on the deprecated ssr path (still works)
    // but rolldownOptions must go on environments.ssr to avoid a Vite compat-proxy
    // bug that fires a spurious deprecation warning when both paths have rolldownOptions
    ssr: {
      optimizeDeps: ssrOptimizeDepsWithoutRolldown,
    },

    environments: {
      client: {
        optimizeDeps: {
          include: ['react-native-screens'],
          rolldownOptions: {
            ...rolldownOptions,
          },
        },
      },
      ssr: {
        optimizeDeps: {
          rolldownOptions,
        },
      },
    },

    optimizeDeps: {},

    server: {
      // preflightContinue lets OPTIONS fall through Vite's cors middleware so
      // user middleware / api route OPTIONS handlers get to shape the preflight
      // response — same as prod where Hono dispatches OPTIONS to the api handler
      // (see oneServe.ts). origin: true + credentials: true keep non-preflight
      // cross-origin dev asset fetches permissive (echo origin + allow creds).
      cors: {
        origin: true,
        credentials: true,
        preflightContinue: true,
      },
    },
  } satisfies Omit<UserConfig, 'plugins'>
}
