/**
 * Adapted from https://github.com/vitejs/vite-plugin-react-swc/blob/main/src/index.ts
 * to work on both native and web, and with reanimated and other babel fallbacks
 */

import { resolvePath } from '@vxrn/utils'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, sep } from 'node:path'
import { cssToReactNativeRuntime } from 'react-native-css-interop/css-to-rn/index.js'
import type { OutputChunk } from 'rollup'
import type { PluginOption, UserConfig } from 'vite'
import { configuration } from './configure'
import { debug, runtimePublicPath, validParsers } from './constants'
import { getBabelOptions, transformBabel } from './transformBabel'
import { transformSWC } from './transformSWC'
import type { Environment, GetTransformProps, Options } from './types'
import { createHash } from 'node:crypto'

export * from './configure'
export * from './transformBabel'
export * from './transformSWC'
export type { GetTransform } from './types'

const getCacheId = (environment: string, id: string) => `${environment}${id}`
const getCacheHash = (code: string) => createHash('sha1').update(code).digest('base64')

export const clearCompilerCache = () => {
  memoryCache = {}
  cacheSize = 0
}

let memoryCache: Record<string, { hash: string; out: { code: string; map?: any } }> = {}
let cacheSize = 0

export async function createVXRNCompilerPlugin(
  optionsIn?: Partial<Options>
): Promise<PluginOption[]> {
  const reactVersion = await (async () => {
    const path = resolvePath('react/package.json')
    const json = JSON.parse(await readFile(path, 'utf-8'))
    return json.version as string
  })()

  const envNames = {
    ios: true,
    android: true,
    client: true,
    ssr: true,
  }

  function getEnvName(name: string) {
    if (!envNames[name]) throw new Error(`Invalid env: ${name}`)
    return name as Environment
  }

  const reactForRNVersion = reactVersion.split('.')[0] as '18' | '19'

  const cssTransformCache = new Map<string, string>()

  // fix so we can align the diff between vite and rollup id (rollup resolves from root monorepo)
  const rollupPath = resolvePath('rollup')
  const rollupNodeMods = rollupPath.slice(0, rollupPath.indexOf(sep + 'node_modules'))

  return [
    {
      name: 'one:compiler-resolve-refresh-runtime',
      apply: 'serve',
      enforce: 'pre', // Run before Vite default resolve to avoid syscalls
      resolveId: (id) => (id === runtimePublicPath ? id : undefined),
      load: (id) =>
        id === runtimePublicPath
          ? readFileSync(join(import.meta.dirname, 'refresh-runtime.js'), 'utf-8')
          : undefined,
    },

    {
      name: `one:compiler-css-to-js`,

      transform(codeIn, id) {
        const environment = getEnvName(this.environment.name)
        if (configuration.enableNativeCSS && (environment === 'ios' || environment === 'android')) {
          if (extname(id) === '.css') {
            const data = JSON.stringify(cssToReactNativeRuntime(codeIn, { inlineRem: 16 }))
            // TODO were hardcoding the require id we bundle as: nativewind/dist/index.js
            // could at least resolve this using resolvePath
            const code = `require("nativewind/dist/index.js").__require().StyleSheet.registerCompiled(${data})`
            const newId = `${id}.js`

            // rollup uses relative to its node_modules parent dir, vite here uses absolute
            const cssId = newId.replace(rollupNodeMods + sep, '')
            cssTransformCache.set(cssId, code)

            return {
              code,
              id: newId,
              map: null,
            }
          }
        }
      },

      generateBundle(_, bundle) {
        const environment = getEnvName(this.environment.name)

        if (configuration.enableNativeCSS && (environment === 'ios' || environment === 'android')) {
          const rootJSName = Object.keys(bundle).find((i) => {
            const chunk = bundle[i]
            return chunk.type == 'chunk' && chunk.fileName.match(/.[cm]?js(?:\?.+)?$/) != null
          })
          if (!rootJSName) {
            throw new Error(`Can't find root js, internal one error`)
          }

          const rootJS = bundle[rootJSName] as OutputChunk

          const cssAssets = Object.keys(bundle).filter((i) =>
            bundle[i].fileName.endsWith('.css.js')
          )

          for (const name of cssAssets) {
            delete bundle[name]

            const jsCSS = cssTransformCache.get(name)
            rootJS.code = `
${jsCSS}
${rootJS.code}
`
          }
        }
      },
    },

    {
      name: 'one:compiler',
      enforce: 'pre',

      config: () => {
        const config = {
          esbuild: false,
          optimizeDeps: {
            noDiscovery: true,
          },

          define: {
            'process.env.NATIVEWIND_OS': 'native',
          },
        } satisfies UserConfig

        return {
          environments: {
            ios: config,
            android: config,
          },
        }
      },

      async transform(codeIn, _id) {
        let code = codeIn
        const environment = getEnvName(this.environment.name)
        const isNative = environment === 'ios' || environment === 'android'
        const production =
          process.env.NODE_ENV === 'production' ||
          JSON.parse(this.environment.config?.define?.['process.env.NODE_ENV'] || '""') ===
            'production'

        // it has a hidden special character
        // TODO: use === special char this is in sensitive perf path
        const isEntry = _id.includes('one-entry-native')

        if (isEntry) {
          if (isNative && !production) {
            code = `import '@vxrn/vite-native-client'\n${code}`
          }
          if (isNative && configuration.enableNativewind) {
            // ensure we have nativewind import in bundle root
            code = `import * as x from 'nativewind'\n${code}`
          }

          // TODO sourcemap add two ';;'?
          return code
        }

        const shouldDebug = process.env.NODE_ENV === 'development' && codeIn.startsWith('// debug')

        if (shouldDebug) {
          console.info(`[one] ${_id} input:`)
          console.info(codeIn)
        }

        const cacheId = getCacheId(environment, _id)
        const cacheHash = getCacheHash(code)
        const cached = memoryCache[cacheId]

        if (cached?.hash === cacheHash) {
          debug?.(`Using cache ${_id} ${cacheId}`)
          return cached.out
        }

        const extension = extname(_id)

        if (extension === '.css') {
          // handled in one:compiler-css-to-js
          return
        }

        if (!validParsers.has(extension)) {
          return
        }

        let id = _id.split('?')[0]

        // pre process = hmr just are removing jsx but leaving imports as esm
        const isPreProcess = id.startsWith(`vxrn-swc-preprocess:`)
        if (isPreProcess) {
          id = id.replace(`vxrn-swc-preprocess:`, '')
        }

        if (id.includes(`virtual:`)) {
          return
        }

        const transformProps: GetTransformProps = {
          id,
          code,
          development: !production,
          environment,
          reactForRNVersion,
        }

        const userTransform = optionsIn?.transform?.(transformProps)

        if (userTransform === false) {
          return
        }

        if (!isPreProcess && userTransform !== 'swc') {
          const babelOptions = getBabelOptions({
            ...transformProps,
            userSetting: userTransform,
          })

          if (babelOptions) {
            // TODO we probably need to forward sourceMap here?
            const babelOut = await transformBabel(id, code, babelOptions)
            if (babelOut?.code) {
              debug?.(`[${id}] transformed with babel options: ${JSON.stringify(babelOptions)}`)
              // TODO we may want to just avoid SWC after babel it likely is faster
              // we'd need to have metro or metro-like preset
              code = babelOut.code
            }
          }

          // we always go to swc for now to ensure class transforms + react refesh
          // we could make the babel plugin support those if we want to avoid
        }

        const swcOptions = {
          environment: environment,
          mode: optionsIn?.mode || 'serve',
          production,
          ...optionsIn,
        } satisfies Options

        const out = await transformSWC(id, code, {
          ...swcOptions,
          es5: true,
          noHMR: isPreProcess,
        })

        if (shouldDebug) {
          console.info(`swcOptions`, swcOptions)
          console.info(`final output:`, out?.code)
        }

        if (out) {
          cacheSize += out?.code.length
          // ~100Mb cache for recent compiler files
          if (cacheSize > 52_428_800) {
            clearCompilerCache()
          }
          memoryCache[cacheId] = { out, hash: cacheHash }
        }

        return out
      },
    },
  ]
}
