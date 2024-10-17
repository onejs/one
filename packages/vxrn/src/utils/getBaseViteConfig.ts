import reactSwcPlugin from '@vitejs/plugin-react-swc'
import type { InlineConfig } from 'vite'
import FSExtra from 'fs-extra'
import { webExtensions } from '../constants'
import { resolvePath } from '@vxrn/resolve'
import { scanDepsToPreBundleForSsr } from './scanDepsToPreBundleForSsr'
import { getFileHash, lookupFile } from './utils'
import path from 'node:path'

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
  root,
  noCache,
}: { mode: 'development' | 'production'; root: string; noCache?: boolean }): Promise<InlineConfig> {
  const lockFile = await lookupFile(root, [
    'yarn.lock',
    'package-lock.json',
    'pnpm-lock.yaml',
    'bun.lockb',
  ])
  const lockFileHash = lockFile ? await getFileHash(lockFile) : undefined

  const noExternalDepsForSsrCacheFilePath = path.join(
    root,
    'node_modules',
    '.vxrn',
    'deps-to-pre-bundle-for-ssr-cache.json'
  )

  let depsToPreBundleForSsr: string[] | undefined = undefined
  if (lockFileHash && !noCache) {
    try {
      const { lockFileHash: cachedLockFileHash, depsToPreBundleForSsr: cachedDepsToPreBundle } =
        await FSExtra.readJSON(noExternalDepsForSsrCacheFilePath)

      if (lockFileHash === cachedLockFileHash && Array.isArray(cachedDepsToPreBundle)) {
        depsToPreBundleForSsr = cachedDepsToPreBundle
      }
    } catch {}
  }

  if (!depsToPreBundleForSsr) {
    depsToPreBundleForSsr = await scanDepsToPreBundleForSsr(`${root}/package.json`)

    if (!noCache) {
      // no need to wait for this
      FSExtra.outputJSON(noExternalDepsForSsrCacheFilePath, {
        lockFileHash,
        depsToPreBundleForSsr,
      })
    }
  }

  return {
    mode,

    // we load the config ourselves
    configFile: false,

    ssr: {
      optimizeDeps: {
        // include: depsToPreBundleForSsr,
        exclude: [
          'fsevents',
          '@swc/core',
          'swc/core-darwin-arm64',
          'swc/core-darwin-x64',
          'swc/core-linux-arm-gnueabihf',
          'swc/core-linux-arm64-gnu',
          'swc/core-linux-arm64-musl',
          'swc/core-linux-x64-gnu',
          'swc/core-linux-x64-musl',
          'swc/core-win32-arm64-msvc',
          'swc/core-win32-ia32-msvc',
          'swc/core-win32-x64-msvc',
          'lightningcss',
        ],
      },
    },

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
        'react-native': resolvePath('react-native-web'),
        'react-native-safe-area-context': '@vxrn/safe-area',

        // bundle size optimizations
        'query-string': resolvePath('@vxrn/query-string'),
        'url-parse': resolvePath('@vxrn/url-parse'),
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
