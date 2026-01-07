import { buildReact, buildReactJSX, buildReactNative } from '@vxrn/react-native-prebuilt'
import { resolvePath } from '@vxrn/resolve'
import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { isNativeEnvironment } from './environmentUtils'

// we should just detect or whitelist and use flow to convert instead of this but i did a
// few things to the prebuilts to make them work, we may need to account for

const getPrebuilds = (cacheDir: string, mode) => ({
  reactJSX: join(cacheDir, `react-jsx-runtime${mode === 'prod' ? '.production' : ''}.js`),
  react: join(cacheDir, `react${mode === 'prod' ? '.production' : ''}.js`),
  reactNativeIos: join(
    cacheDir,
    `react-native${mode === 'prod' ? '.production' : ''}.ios.js`
  ),
  reactNativeAndroid: join(
    cacheDir,
    `react-native${mode === 'prod' ? '.production' : ''}.android.js`
  ),
})

const allExist = async (paths: string[]) => {
  return (await Promise.all(paths.map((p) => FSExtra.pathExists(p)))).every(Boolean)
}

export async function prebuildReactNativeModules(
  cacheDir: string,
  internal: { mode?: 'dev' | 'prod' } = { mode: 'dev' }
) {
  const prebuilds = getPrebuilds(cacheDir, internal.mode)

  if (
    internal.mode !== 'prod' && // Do not use cached prebuilds while building for production, since the performance gain is little (build time is already slower anyway) and can avoid potential issues.
    (await allExist(Object.values(prebuilds)))
  ) {
    return
  }

  if (internal.mode !== 'prod') {
    console.info('\n ❶ Pre-building react-native (one time cost)...\n')
  } else {
    console.info('\n ❶ Pre-building react-native for production...\n')
  }

  /** Some build option overrides depending on the mode (dev/prod). */
  const buildOptions =
    internal.mode === 'prod'
      ? {
          define: {
            __DEV__: 'false',
            'process.env.NODE_ENV': `"production"`,
          },
        }
      : {}

  let enableExperimentalReactNativeWithReact19Support = false
  const reactPackageJsonPath = resolvePath('react/package.json')
  const reactPackageJsonContents = await readFile(reactPackageJsonPath, 'utf8')
  const reactPackageJson = JSON.parse(reactPackageJsonContents)
  const reactNativePackageJsonPath = resolvePath('react/package.json')
  const reactNativePackageJsonContents = await readFile(
    reactNativePackageJsonPath,
    'utf8'
  )
  const reactNativePackageJson = JSON.parse(reactNativePackageJsonContents)

  const reactVersion = reactPackageJson?.version
  const reactNativeVersion = reactNativePackageJson?.version
  if (reactVersion?.startsWith('19') && Number.parseFloat(reactNativeVersion) < 0.78) {
    console.info(
      `🧪 React ${reactVersion} detected. Enabling experimental React 19 support for React Native.`
    )
    enableExperimentalReactNativeWithReact19Support = true
  }

  await Promise.all([
    buildReactNative(
      {
        entryPoints: [resolvePath('react-native')],
        outfile: prebuilds.reactNativeIos,
        ...buildOptions,
      },
      { platform: 'ios', enableExperimentalReactNativeWithReact19Support }
    ).catch((err) => {
      console.error(`Error pre-building react-native for iOS`)
      throw err
    }),
    buildReactNative(
      {
        entryPoints: [resolvePath('react-native')],
        outfile: prebuilds.reactNativeAndroid,
        ...buildOptions,
      },
      { platform: 'android', enableExperimentalReactNativeWithReact19Support }
    ).catch((err) => {
      console.error(`Error pre-building react-native for Android`)
      throw err
    }),
    buildReact({
      entryPoints: [resolvePath('react')],
      outfile: prebuilds.react,
      ...buildOptions,
    }).catch((err) => {
      console.error(`Error pre-building react`)
      throw err
    }),
    buildReactJSX({
      entryPoints: [
        internal.mode === 'dev'
          ? resolvePath('react/jsx-dev-runtime')
          : resolvePath('react/jsx-runtime'),
      ],
      outfile: prebuilds.reactJSX,
      ...buildOptions,
    }).catch((err) => {
      console.error(`Error pre-building react/jsx-runtime`)
      throw err
    }),
  ])
}

export async function swapPrebuiltReactModules(
  cacheDir: string,
  internal: { mode: 'dev' | 'prod'; platform: 'ios' | 'android' }
): Promise<Plugin> {
  let prebuilds = getPrebuilds(cacheDir, internal.mode)

  let cached: null | Record<
    | 'react-native'
    | 'react'
    | 'react/jsx-runtime'
    | 'react/jsx-dev-runtime'
    | 'react/jsx-runtime',
    {
      alias: string
      contents: string
    }
  > = null

  const rnPrebuilt = (() => {
    switch (internal.platform) {
      case 'ios':
        return prebuilds.reactNativeIos
      case 'android':
        return prebuilds.reactNativeAndroid
      default:
        throw new Error(`Unsupported platform: ${internal.platform}`)
    }
  })()

  const getVirtualModules = async () => {
    if (cached) return cached

    const jsxRuntime = {
      alias: prebuilds.reactJSX,
      contents: await readFile(prebuilds.reactJSX, 'utf-8'),
    } as const

    cached = {
      'react-native': {
        alias: rnPrebuilt,
        contents: await readFile(rnPrebuilt, 'utf-8'),
      },
      react: {
        alias: prebuilds.react,
        contents: await readFile(prebuilds.react, 'utf-8'),
      },
      'react/jsx-runtime': jsxRuntime,
      'react/jsx-dev-runtime': jsxRuntime,
    } as const

    return cached
  }

  const virtualModules = await getVirtualModules()

  const cachedIdToContents = Object.keys(virtualModules).reduce((acc, key) => {
    const cur = virtualModules[key]
    acc[cur.alias] = cur.contents
    return acc
  }, {})

  return {
    name: `swap-react-native`,
    enforce: 'pre',

    async resolveId(id, _importer, options) {
      // Skip during Vite's dependency optimization scan
      // @see https://github.com/remix-run/remix/discussions/8917
      // @ts-expect-error - scan is not in Vite's types but exists at runtime
      if (options?.scan) return

      if (!isNativeEnvironment(this.environment)) {
        return
      }

      if (id === 'react-native-web') {
        return rnPrebuilt
      }

      if (id.startsWith('react-native/')) {
        if (id === 'react-native/package.json') {
          return
        }
        return `virtual:rn-internals:${id}`
      }

      // We might have aliased `react-native` to `react-native-web` (see `'react-native': 'react-native-web'` in `utils/getBaseViteConfig.ts`) so we need to handle that case too.
      if (
        id.startsWith('react-native-web/Libraries') ||
        id.includes('react-native-web/dist/cjs/index.js/Libraries') // Possible after switched to CJS (Tamagui 1.112.3)
      ) {
        return `virtual:rn-internals:${id.replace(/^.*react-native-web(\/dist\/cjs\/index.js)?/, 'react-native')}`
      }

      for (const targetId in virtualModules) {
        if (id === targetId || id.includes(`/node_modules/${targetId}/`)) {
          const info = virtualModules[targetId]
          return info.alias
        }
      }
    },

    async load(id) {
      if (id.startsWith('virtual:rn-internals')) {
        const idOut = id.replace('virtual:rn-internals:', '')

        let out = ''

        if (id.includes('ReactFabric')) {
          // A workaround for some internal modules being loaded when they shouldn't be.
          // See: https://github.com/onejs/one/pull/283#issuecomment-2527356510
          out += `const ___val = __cachedModules["${idOut}"] /* This module shouldn't be loaded if not already been loaded internally. */`
        } else {
          // Normal case, this will dynamically load the module if not already loaded.
          out += `const ___val = __RN_INTERNAL_MODULE_REQUIRES_MAP__["${idOut}"]()`
        }

        out += '\n'

        out += `
        const ___defaultVal = ___val ? ___val.default || ___val : ___val
        export default ___defaultVal
        `

        out += getReactNativeInternalModuleExports(idOut)
          .map(
            (exportName) =>
              `export const ${exportName} = ___val.${exportName} || ___defaultVal.${exportName}`
          )
          .join('\n')

        out += `
        // allow importing named exports of internals:
        if (___defaultVal && typeof ___defaultVal === 'object') {
          Object.keys(___defaultVal).forEach(key => {
            if (key !== 'default') {
              exports[key] = ___defaultVal[key]
            }
          })
        }
        `

        return out
      }

      if (id in cachedIdToContents) {
        return cachedIdToContents[id]
      }
    },
  } satisfies Plugin
}

/**
 * Given a React Native internal module path, return the list of export names that are exported from the module, excluding the default export.
 */
function getReactNativeInternalModuleExports(
  /**
   * Example: `react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry`.
   */
  modulePath: string
): string[] {
  return KNOWN_REACT_NATIVE_INTERNAL_MODULE_EXPORTS[modulePath] || []
}

/**
 * TODO: We can use `es-module-lexer` to parse from source code instead of hardcoding these.
 * Keywords: `"..." is not exported by "virtual:rn-internals:react-native/..."`
 */
const KNOWN_REACT_NATIVE_INTERNAL_MODULE_EXPORTS = {
  'react-native/Libraries/NativeComponent/NativeComponentRegistry': [
    'setRuntimeConfigProvider',
    'get',
    'getWithFallback_DEPRECATED',
    'unstable_hasStaticViewConfig',
  ],
  'react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry': [
    'customBubblingEventTypes',
    'customDirectEventTypes',
    'register',
    'get',
  ],
  'react-native/Libraries/Pressability/PressabilityDebug': [
    'PressabilityDebugView',
    'isEnabled',
    'setEnabled',
  ],
  'react-native/Libraries/Utilities/PolyfillFunctions': [
    'polyfillObjectProperty',
    'polyfillGlobal',
  ],
  'react-native/Libraries/Image/resolveAssetSource': [
    'pickScale',
    'setCustomSourceTransformer',
    'addCustomSourceTransformer',
  ],
}
