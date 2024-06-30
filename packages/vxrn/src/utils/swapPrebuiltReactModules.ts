import { buildReact, buildReactJSX, buildReactNative } from '@vxrn/react-native-prebuilt'
import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { isBuildingNativeBundle } from './isBuildingNativeBundle'
import { resolveFile } from './resolveFile'

// we should just detect or whitelist and use flow to convert instead of this but i did a
// few things to the prebuilts to make them work, we may need to account for

export async function swapPrebuiltReactModules(cacheDir: string): Promise<Plugin> {
  const prebuilds = {
    reactJSX: join(cacheDir, 'react-jsx-runtime.js'),
    react: join(cacheDir, 'react.js'),
    reactNative: join(cacheDir, 'react-native.js'),
  }

  if (!(await FSExtra.pathExists(prebuilds.reactNative))) {
    console.info('Pre-building react, react-native react/jsx-runtime (one time cost)...')
    await Promise.all([
      buildReactNative({
        entryPoints: [resolveFile('react-native')],
        outfile: prebuilds.reactNative,
      }),
      buildReact({
        // use vendor
        // entryPoints: [resolveFile('react')],
        outfile: prebuilds.react,
      }),
      buildReactJSX({
        // use vendor
        // entryPoints: [resolveFile('react/jsx-dev-runtime')],
        outfile: prebuilds.reactJSX,
      }),
    ])
  }

  // react native port (it scans 19000 +5)
  const jsxRuntime = {
    alias: prebuilds.reactJSX,
    contents: await readFile(prebuilds.reactJSX, 'utf-8'),
  } as const

  const virtualModules = {
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

  return {
    name: `swap-react-native`,
    enforce: 'pre',

    resolveId(id, importer = '') {
      if (id.startsWith('react-native/Libraries')) {
        return `virtual:rn-internals:${id}`
      }

      // this will break web support, we need a way to somehow switch between?
      if (id === 'react-native-web') {
        return prebuilds.reactNative
      }

      for (const targetId in virtualModules) {
        if (id === targetId || id.includes(`node_modules/${targetId}/`)) {
          const info = virtualModules[targetId]
          return info.alias
        }
      }

      // TODO this is terrible and slow, we should be able to get extensions working:
      // having trouble getting .native.js to be picked up via vite
      // tried adding packages to optimizeDeps, tried resolveExtensions + extensions...
      // tried this but seems to not be called for node_modules
      if (isBuildingNativeBundle) {
        if (id[0] === '.') {
          const absolutePath = resolve(dirname(importer), id)
          const nativePath = absolutePath.replace(/(.m?js)/, '.native.js')
          if (nativePath === id) return
          try {
            const directoryPath = absolutePath + '/index.native.js'
            const directoryNonNativePath = absolutePath + '/index.js'
            if (FSExtra.pathExistsSync(directoryPath)) {
              return directoryPath
            }
            if (FSExtra.pathExistsSync(directoryNonNativePath)) {
              return directoryNonNativePath
            }
            if (FSExtra.pathExistsSync(nativePath)) {
              return nativePath
            }
          } catch (err) {
            console.warn(`error probably fine`, err)
          }
        }
      }
    },

    load(id) {
      if (id.startsWith('virtual:rn-internals')) {
        const idOut = id.replace('virtual:rn-internals:', '')
        let out = `const ___val = __cachedModules["${idOut}"]
        const ___defaultVal = ___val ? ___val.default || ___val : ___val
        export default ___defaultVal`
        return out
      }

      for (const targetId in virtualModules) {
        const info = virtualModules[targetId as keyof typeof virtualModules]
        if (id === info.alias) {
          return info.contents
        }
      }
    },
  } satisfies Plugin
}
