import type { InlineConfig } from 'vite'
import { resolvePath } from '@vxrn/resolve'
import FSExtra from 'fs-extra'
import { join } from 'node:path'
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

/**
 * Returns fundamental Vite configs.
 *
 * Here we returns only configs, without plugins. Basic plugins are defined in
 * `getBaseVitePlugins`. By separating plugins and configs, we try to make
 * things more composable and avoid plugins to be nested.
 *
 * The file is named "getBaseViteConfig**Only**" because there's originally
 * a `getBaseViteConfig` that returns both plugins and configs. The "Only"
 * is added to prevent misuse. We can remove it later when things are settled.
 */
export async function getBaseViteConfig(
  config: Pick<VXRNOptionsFilled, 'root' | 'mode'>
): Promise<Omit<InlineConfig, 'plugins'>> {
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
  } satisfies Omit<InlineConfig, 'plugins'>
}
