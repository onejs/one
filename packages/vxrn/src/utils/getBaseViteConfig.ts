import reactSwcPlugin from '@vitejs/plugin-react-swc'
import type { InlineConfig } from 'vite'
import { androidExtensions, iosExtensions, webExtensions } from '../constants'

// essentially base web config not base everything

export const dedupe = [
  'vxs',
  '@vxrn/safe-area',
  'react',
  'react-dom',
  'react-dom/client',
  'react-native-web',
  '@tamagui/core',
  '@tamagui/web',
  'react-native-reanimated',
  'expo-modules-core',
]

export function getBaseViteConfig({ mode }: { mode: 'development' | 'production' }): InlineConfig {
  return {
    mode,

    // we load the config ourselves
    configFile: false,

    plugins: [
      {
        name: 'platform-specific-resolve',
        config() {
          return {
            ssr: {
              resolve: {
                extensions: webExtensions,
                conditions: ['vxrn-web'],
                externalConditions: ['vxrn-web'],
              },
            },

            environments: {
              client: {
                resolve: {
                  extensions: webExtensions,
                  conditions: ['vxrn-web'],
                },
              },

              ios: {
                resolve: {
                  extensions: iosExtensions,
                },
              },

              android: {
                resolve: {
                  extensions: androidExtensions,
                },
              },
            },
          }
        },
      },

      reactSwcPlugin({}),
    ],

    // TODO make this documented / configurable through the plugins
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        targets: {
          safari: (15 << 16) | (2 << 8),
        },
      },
    },

    define: {
      __DEV__: `${mode === 'development'}`,
      'process.env.NODE_ENV': `"${mode}"`,
    },

    resolve: {
      alias: {
        'react-native': 'react-native-web',
        'react-native-safe-area-context': '@vxrn/safe-area',
      },

      // TODO auto dedupe all include optimize deps?
      dedupe,
    },

    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }
}
