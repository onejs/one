import type { InlineConfig } from 'vite'
import { webExtensions } from '../constants'
import { resolvePath } from '@vxrn/resolve'
import FSExtra from 'fs-extra'
import { extname, join } from 'node:path'
import { createVXRNCompilerPlugin } from '@vxrn/compiler'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { exists } from 'node:fs'

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
            resolve: {
              // if this is on it breaks resolveId below
              // optimizeDeps config should apply to packages in monorepo
              // https://vite.dev/config/shared-options#resolve-preservesymlinks
              // preserveSymlinks: true,
            },

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

        // this fix platform extensions if they aren't picked up, but seems it is working with resolve.extensions
        async resolveId(source, importer, options) {
          // if (process.env.NODE_ENV === 'development') {
          //   // is this only dev mode problem?
          //   return
          // }

          const resolved = await this.resolve(source, importer, options)

          if (!resolved || resolved.id.includes('node_modules')) {
            return resolved
          }

          // not in node_modules, vite doesn't apply extensions! we need to manually
          const jsExtension = extname(resolved.id)
          const withoutExt = resolved.id.replace(new RegExp(`\\${jsExtension}$`), '')

          const extensionsByEnvironment = {
            client: ['web'],
            ssr: ['web'],
            ios: ['ios', 'native'],
            android: ['android', 'native'],
          }

          const platformSpecificExtension = extensionsByEnvironment[this.environment.name]

          if (platformSpecificExtension) {
            for (const platformExtension of platformSpecificExtension) {
              const fullPath = `${withoutExt}.${platformExtension}${jsExtension}`
              if (await FSExtra.pathExists(fullPath)) {
                return {
                  id: fullPath,
                }
              }
            }
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
