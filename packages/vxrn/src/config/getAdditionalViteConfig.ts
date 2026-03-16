import type { InlineConfig, UserConfig } from 'vite'

import { getOptimizeDeps } from './getOptimizeDeps'

import { webExtensions } from '../constants'

/**
 * These configs are originally in `getViteServerConfig`. Maybe we should organize and move each of them into other more appropriate places.
 */
export function getAdditionalViteConfig(): Omit<InlineConfig, 'plugins'> {
  const { optimizeDeps } = getOptimizeDeps('serve')

  // TODO: can we move most of this into `one` plugin:
  return {
    appType: 'custom',
    clearScreen: false,
    publicDir: 'public',

    ssr: {
      optimizeDeps,
    },

    environments: {
      client: {
        optimizeDeps: {
          include: ['react-native-screens'],
          rolldownOptions: {
            resolve: {
              extensions: webExtensions,
            },
          },
        },
      },
    },

    optimizeDeps: {},

    server: {
      cors: true,
    },
  } satisfies Omit<UserConfig, 'plugins'>
}
