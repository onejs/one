import { buildReact, buildReactJSX, buildReactNative } from '@vxrn/react-native-prebuilt'
import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { isBuildingNativeBundle } from './isBuildingNativeBundle'
import { resolveFile } from './resolveFile'

// we should just detect or whitelist and use flow to convert instead of this but i did a
// few things to the prebuilts to make them work, we may need to account for

const getPrebuilds = (cacheDir: string) => ({
  reactJSX: join(cacheDir, 'react-jsx-runtime.js'),
  react: join(cacheDir, 'react.js'),
  reactNative: join(cacheDir, 'react-native.js'),
})

const requireResolve = (inPath: string) => {
  return import.meta.resolve(inPath, join(process.cwd(), 'index.js')).replace('file://', '')
}

type PrebuildVersions = {
  react: string
  reactNative: string
}

const getVendoredPrebuilds = (versions: PrebuildVersions) => {
  try {
    return {
      reactJSX: requireResolve(
        `@vxrn/react-native-prebuilt/vendor/react-jsx-runtime-${versions.react}`
      ),
      react: requireResolve(`@vxrn/react-native-prebuilt/vendor/react-${versions.react}`),
      reactNative: requireResolve(
        `@vxrn/react-native-prebuilt/vendor/react-native-${versions.reactNative}`
      ),
    }
  } catch {
    return null
  }
}

const allExist = async (paths: string[]) => {
  return (await Promise.all(paths.map((p) => FSExtra.pathExists(p)))).every(Boolean)
}

export async function prebuildReactNativeModules(cacheDir: string, versions?: PrebuildVersions) {
  const prebuilds = getPrebuilds(cacheDir)

  if (versions) {
    const vendored = getVendoredPrebuilds(versions)
    if (vendored && (await allExist(Object.values(vendored)))) {
      // already vendored
      return vendored
    }
  }

  if (await allExist(Object.values(prebuilds))) {
    return
  }

  console.info('\n ❶ Pre-building react-native (one time cost)...\n')

  await Promise.all([
    buildReactNative({
      entryPoints: [resolveFile('react-native')],
      outfile: prebuilds.reactNative,
    }),
    buildReact({
      entryPoints: [resolveFile('react')],
      outfile: prebuilds.react,
    }),
    buildReactJSX({
      entryPoints: [resolveFile('react/jsx-dev-runtime')],
      outfile: prebuilds.reactJSX,
    }),
  ])
}

export async function swapPrebuiltReactModules(
  cacheDir: string,
  versions?: PrebuildVersions
): Promise<Plugin> {
  let prebuilds = getPrebuilds(cacheDir)

  if (versions) {
    const vendored = getVendoredPrebuilds(versions)
    if (vendored && (await allExist(Object.values(vendored)))) {
      prebuilds = vendored
    }
  }

  let cached: null | Record<
    'react-native' | 'react' | 'react/jsx-runtime' | 'react/jsx-dev-runtime',
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

      if (id === 'react-native-web') {
        return prebuilds.reactNative
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
