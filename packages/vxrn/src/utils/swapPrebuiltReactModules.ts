import { buildReact, buildReactJSX, buildReactNative } from '@vxrn/react-native-prebuilt'
import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import path, { dirname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { requireResolve } from './requireResolve'
import { resolveFile } from './resolveFile'

// we should just detect or whitelist and use flow to convert instead of this but i did a
// few things to the prebuilts to make them work, we may need to account for

const getPrebuilds = (cacheDir: string, mode) => ({
  reactJSX: join(cacheDir, `react-jsx-runtime${mode === 'prod' ? '.production' : ''}.js`),
  react: join(cacheDir, `react${mode === 'prod' ? '.production' : ''}.js`),
  reactNative: join(cacheDir, `react-native${mode === 'prod' ? '.production' : ''}.js`),
})

type PrebuildVersions = {
  react: string
  reactNative: string
}

const getVendoredPrebuilds = (versions: PrebuildVersions, mode) => {
  try {
    return {
      reactJSX: requireResolve(
        `@vxrn/react-native-prebuilt/vendor/react-jsx-runtime-${versions.react}${mode === 'prod' ? '.production' : ''}`
      ),
      react: requireResolve(
        `@vxrn/react-native-prebuilt/vendor/react-${versions.react}${mode === 'prod' ? '.production' : ''}`
      ),
      reactNative: requireResolve(
        `@vxrn/react-native-prebuilt/vendor/react-native-${versions.reactNative}${mode === 'prod' ? '.production' : ''}`
      ),
    }
  } catch {
    return null
  }
}

const allExist = async (paths: string[]) => {
  return (await Promise.all(paths.map((p) => FSExtra.pathExists(p)))).every(Boolean)
}

export async function prebuildReactNativeModules(
  cacheDir: string,
  versions?: PrebuildVersions,
  internal: { mode?: 'dev' | 'prod' } = { mode: 'dev' }
) {
  const prebuilds = getPrebuilds(cacheDir, internal.mode)

  if (versions) {
    const vendored = getVendoredPrebuilds(versions, internal.mode)
    if (vendored && (await allExist(Object.values(vendored)))) {
      // already vendored
      return vendored
    }
  }

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

  await Promise.all([
    buildReactNative({
      entryPoints: [resolveFile('react-native')],
      outfile: prebuilds.reactNative,
      ...buildOptions,
    }),
    buildReact({
      entryPoints: [resolveFile('react')],
      outfile: prebuilds.react,
      ...buildOptions,
    }),
    buildReactJSX({
      entryPoints: [
        internal.mode === 'dev'
          ? resolveFile('react/jsx-dev-runtime')
          : resolveFile('react/jsx-runtime'),
      ],
      outfile: prebuilds.reactJSX,
      ...buildOptions,
    }),
  ])
}

export async function swapPrebuiltReactModules(
  cacheDir: string,
  versions?: PrebuildVersions,
  internal: { mode?: 'dev' | 'prod' } = { mode: 'dev' }
): Promise<Plugin> {
  let prebuilds = getPrebuilds(cacheDir, internal.mode)

  if (versions) {
    const vendored = getVendoredPrebuilds(versions, internal.mode)
    if (vendored && (await allExist(Object.values(vendored)))) {
      prebuilds = vendored
    }
  }

  let cached: null | Record<
    'react-native' | 'react' | 'react/jsx-runtime' | 'react/jsx-dev-runtime' | 'react/jsx-runtime',
    {
      alias: string
      contents: string
    }
  > = null

  const getVirtualModules = async () => {
    if (cached) return cached

    const jsxRuntime = {
      alias: prebuilds.reactJSX,
      contents: await readFile(prebuilds.reactJSX, 'utf-8'),
    } as const

    cached = {
      'react-native': {
        alias: prebuilds.reactNative,
        contents: await readFile(prebuilds.reactNative, 'utf-8'),
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

    async resolveId(id, importer = '') {
      if (id.startsWith('react-native/Libraries')) {
        return `virtual:rn-internals:${id}`
      }

      // We might have aliased `react-native` to `react-native-web` (see `'react-native': 'react-native-web'` in `utils/getBaseViteConfig.ts`) so we need to handle that case too.
      if (
        id.startsWith('react-native-web/Libraries') ||
        id.includes('react-native-web/dist/cjs/index.js/Libraries') // Possible after switched to CJS (Tamagui 1.112.3)
      ) {
        return `virtual:rn-internals:${id.replace(/^.*react-native-web(\/dist\/cjs\/index.js)?/, 'react-native')}`
      }

      if (id === 'react-native-web') {
        return prebuilds.reactNative
      }

      for (const targetId in virtualModules) {
        if (id === targetId || id.includes(`/node_modules/${targetId}/`)) {
          const info = virtualModules[targetId]
          return info.alias
        }
      }

      // TODO this also shouldnt be here
      // TODO this is terrible and slow, we should be able to get extensions working:
      // having trouble getting .native.js to be picked up via vite
      // tried adding packages to optimizeDeps, tried resolveExtensions + extensions...
      // tried this but seems to not be called for node_modules
      if (id[0] === '.') {
        const absolutePath = resolve(dirname(importer), id)
        const nativePath = absolutePath.replace(/(.m?js)/, '.native.js')
        if (nativePath === id) return
        // Only comparing `nativePath === id` is not enough, because id can be a relative path while nativePath is an absolute path. We need to make sure things are not accidentally handled by this plugin so other plugins such as assets can work.
        if (path.join(path.dirname(importer), id) === nativePath) {
          return
        }

        // // if exists can skip
        // if (await FSExtra.pathExists(absolutePath)) {
        //   return
        // }

        try {
          const directoryPath = absolutePath + '/index.native.js'
          const directoryNonNativePath = absolutePath + '/index.js'
          if (await FSExtra.pathExists(directoryPath)) {
            return directoryPath
          }
          if (await FSExtra.pathExists(directoryNonNativePath)) {
            return directoryNonNativePath
          }
          try {
            if (
              (await FSExtra.stat(nativePath)).isFile() // Prevents "EISDIR: illegal operation on a directory, read" errors
            ) {
              return nativePath
            }
          } catch (err: any) {
            if (err.code !== 'ENOENT') {
              throw err
            }
          }
        } catch (err) {
          console.warn(`error probably fine`, err)
        }
      }
    },

    async load(id) {
      if (id.startsWith('virtual:rn-internals')) {
        const idOut = id.replace('virtual:rn-internals:', '')
        let out = `const ___val = __cachedModules["${idOut}"]
        const ___defaultVal = ___val ? ___val.default || ___val : ___val
        export default ___defaultVal`

        // Some packages such as react-native-gesture-handler are importing from react-native internals with named imports.
        // TODO: This is a workaround to handle it case by case.
        if (id.includes('react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry')) {
          out += '\nexport const customBubblingEventTypes = ___val.customBubblingEventTypes'
          out += '\nexport const customDirectEventTypes = ___val.customDirectEventTypes'
        }
        if (id.includes('react-native/Libraries/Pressability/PressabilityDebug')) {
          out += '\nexport const PressabilityDebugView = ___val.PressabilityDebugView'
        }

        return out
      }

      if (id in cachedIdToContents) {
        return cachedIdToContents[id]
      }
    },
  } satisfies Plugin
}
