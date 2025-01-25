import type { InlineConfig } from 'vite'
import { webExtensions } from '../constants'
import { resolvePath } from '@vxrn/resolve'
import FSExtra from 'fs-extra'
import { join } from 'node:path'
import { createVXRNCompilerPlugin } from '@vxrn/compiler'
import type { VXRNOptionsFilled } from './getOptionsFilled'

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
  'escape-string-regexp',
]

export async function getBaseViteConfig(
  run: 'serve' | 'build',
  config: VXRNOptionsFilled
): Promise<InlineConfig> {
  const { root, mode } = config

  const postCSSPaths = [
    join(root, 'postcss.config.js'),
    join(root, 'postcss.config.ts'),
    join(root, 'postcss.config.json'),
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

  const reactNativePackageJsonPath = resolvePath('react-native/package.json', root)
  const { version } = await FSExtra.readJSON(reactNativePackageJsonPath)

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

      createVXRNCompilerPlugin({
        mode: run,
      }),
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
      'process.env.REACT_NATIVE_VERSION': `"${version}"`,
    },

    resolve: {
      alias: {
        'react-native/package.json': resolvePath('react-native-web/package.json', root),
        'react-native': resolvePath('react-native-web', root),
        'react-native-safe-area-context': resolvePath('@vxrn/safe-area', root),

        // bundle size optimizations
        'query-string': resolvePath('@vxrn/query-string', root),
        'url-parse': resolvePath('@vxrn/url-parse', root),
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
