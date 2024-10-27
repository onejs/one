import reactSwcPlugin from '@vitejs/plugin-react-swc'
import type { InlineConfig } from 'vite'
import { webExtensions } from '../constants'
import { resolvePath } from '@vxrn/resolve'
import { dirname } from 'path'

// essentially base web config not base everything

export const dedupe = [
  'one',
  '@vxrn/safe-area',
  'react',
  'react-dom',
  'react-dom/client',
  'react-native-web',
  '@react-navigation/core',
  '@react-navigation/elements',
  '@tamagui/core',
  '@tamagui/web',
  '@tamagui/react-native-web',
  'tamagui',
  'react-native-reanimated',
  'expo-modules-core',
]

export function getBaseViteConfig({
  mode,
  projectRoot,
}: { mode: 'development' | 'production'; projectRoot: string }): InlineConfig {
  return {
    mode,

    // we load the config ourselves
    configFile: false,

    plugins: [
      {
        name: 'platform-specific-resolve',
        enforce: 'pre',
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
            },
          }
        },
      },

      // this should be web only
      // added to fix issues with node modules that import things like `react-native/Libraries/...`
      {
        name: 'one-resolve-react-native-web-only',
        enforce: 'pre',

        config() {
          return {
            resolve: {
              alias: [
                {
                  find: /^react-native$/,
                  replacement: resolvePath('react-native-web', process.cwd()),
                },

                {
                  find: 'react-native/Libraries/Utilities/codegenNativeComponent',
                  replacement: resolvePath('@tamagui/proxy-worm'),
                },

                {
                  find: /^react-native\/(.*)$/,
                  replacement:
                    dirname(dirname(resolvePath('react-native-web', process.cwd()))) +
                    '/vendor/react-native/$1.js',
                },
              ],
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
        'react-native': resolvePath('react-native-web', projectRoot),
        'react-native-safe-area-context': '@vxrn/safe-area',

        // bundle size optimizations
        'query-string': resolvePath('@vxrn/query-string', projectRoot),
        'url-parse': resolvePath('@vxrn/url-parse', projectRoot),
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
