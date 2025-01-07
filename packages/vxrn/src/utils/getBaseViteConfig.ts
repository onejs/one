import reactSwcPlugin from '@vitejs/plugin-react-swc'
import type { InlineConfig } from 'vite'
import { webExtensions } from '../constants'
import { resolvePath } from '@vxrn/resolve'
import FSExtra from 'fs-extra'
import { join } from 'node:path'

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

export async function getBaseViteConfig({
  mode,
  projectRoot,
}: { mode: 'development' | 'production'; projectRoot: string }): Promise<InlineConfig> {
  const postCSSPaths = [
    join(projectRoot, 'postcss.config.js'),
    join(projectRoot, 'postcss.config.ts'),
    join(projectRoot, 'postcss.config.json'),
  ]

  const postCSSConfigPath = (
    await Promise.all(
      postCSSPaths.map(async (x) => {
        if (await FSExtra.pathExists(x)) {
          return x
        }
      })
    )
  ).find((x) => typeof x === 'string')

  return {
    mode,

    // we load the config ourselves
    // if you disable this is disables auto-reloading config changes
    // configFile: false,

    plugins: [
      {
        name: 'platform-specific-resolve',
        enforce: 'pre',
        config() {
          return {
            environments: {
              ssr: {
                resolve: {
                  extensions: webExtensions,
                  conditions: ['vxrn-web'],
                  externalConditions: ['vxrn-web'],
                },
              },

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

      reactSwcPlugin({}),
    ],

    // TODO make this documented / configurable through the plugins
    css: postCSSConfigPath
      ? {
          postcss: postCSSConfigPath,
        }
      : {
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
        'react-native-safe-area-context': resolvePath('@vxrn/safe-area', projectRoot),

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
