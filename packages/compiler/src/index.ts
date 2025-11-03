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
import type { PluginOption, ResolvedConfig, UserConfig } from 'vite'
import { configuration } from './configure'
import { debug, runtimePublicPath, validParsers } from './constants'
import { getBabelOptions, transformBabel } from './transformBabel'
import { transformSWC } from './transformSWC'
import type { Environment, GetTransformProps, Options } from './types'

export * from './configure'
export * from './transformBabel'
export * from './transformSWC'
export type { GetTransform } from './types'

// Shared Babel transform logic
async function performBabelTransform({
  id,
  code,
  environment,
  production,
  reactForRNVersion,
  optionsIn,
}: {
  id: string
  code: string
  environment: Environment
  production: boolean
  reactForRNVersion: '18' | '19'
  optionsIn?: Partial<Options>
}) {
  const transformProps: GetTransformProps = {
    id,
    code,
    development: !production,
    environment,
    reactForRNVersion,
  }

  const userTransform = optionsIn?.transform?.(transformProps)

  if (userTransform === false) {
    return null
  }

  const isPreProcess = id.startsWith(`vxrn-swc-preprocess:`)

  if (!isPreProcess && userTransform !== 'swc') {
    const babelOptions = getBabelOptions({
      ...transformProps,
      userSetting: userTransform,
    })

    if (babelOptions) {
      const babelOut = await transformBabel(id, code, babelOptions)
      if (babelOut?.code) {
        debug?.(`[babel] ${id}`)
        return { code: babelOut.code, map: babelOut.map }
      }
    }
  }

  return null
}

// Full transform (Babel + SWC) for Vite transform hook
async function performFullTransform({
  codeIn,
  _id,
  environment,
  production,
  reactForRNVersion,
  optionsIn,
  mode,
}: {
  codeIn: string
  _id: string
  environment: Environment
  production: boolean
  reactForRNVersion: '18' | '19'
  optionsIn?: Partial<Options>
  mode: 'serve' | 'build'
}) {
  const shouldDebug = process.env.NODE_ENV === 'development' && codeIn.startsWith('// debug')

  if (shouldDebug) {
    console.info(`[one] ${_id} input:`)
    console.info(codeIn)
  }

  let id = _id.split('?')[0]

  const extension = extname(id)

  if (extension === '.css') {
    return
  }

  if (!validParsers.has(extension)) {
    return
  }

  // Skip node_modules to avoid double-processing files already handled by optimizeDeps
  if (id.includes('node_modules')) {
    debug?.(`[skip node_modules] ${id}`)
    return
  }

  const isPreProcess = id.startsWith(`vxrn-swc-preprocess:`)
  if (isPreProcess) {
    id = id.replace(`vxrn-swc-preprocess:`, '')
  }

  if (id.includes(`virtual:`)) {
    return
  }

  let code = codeIn
  let out: {
    code: string
    map: any
  } | null = null

  // Try Babel first
  const babelResult = await performBabelTransform({
    id,
    code,
    environment,
    production,
    reactForRNVersion,
    optionsIn,
  })

  if (babelResult) {
    out = babelResult
    code = babelResult.code
  }

  // Always run SWC for class transforms + react refresh
  const swcOptions = {
    environment,
    mode: optionsIn?.mode || mode,
    production,
    ...optionsIn,
  } satisfies Options

  const swcOut = await transformSWC(id, code, {
    es5: true,
    noHMR: isPreProcess || environment === 'ssr',
    ...swcOptions,
  })

  if (swcOut) {
    debug?.(`[swc] ${id}`)
    out = {
      code: swcOut.code,
      map: swcOut.map,
    }
  }

  if (shouldDebug) {
    console.info(`swcOptions`, swcOptions)
    console.info(`final output:`, out?.code)
  }

  return out
}

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

  /**
   * Vite config, filled by a `configResolved` hook.
   */
  let config: ResolvedConfig

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
        const createEnvironmentConfig = (environment: Environment) => {
          return {
            optimizeDeps: {
              esbuildOptions: {
                plugins: [
                  {
                    name: `transform-before-optimize-deps-${environment}`,
                    setup(build) {
                      build.onLoad(
                        { filter: /node_modules\/.*\.(tsx?|jsx?|mjs|cjs)$/ },
                        async (args) => {
                          const production = process.env.NODE_ENV === 'production'
                          const code = await readFile(args.path, 'utf-8')

                          debug?.(`[esbuild optimizeDeps] ${args.path}`)

                          const result = await performBabelTransform({
                            id: args.path,
                            code,
                            environment,
                            production,
                            reactForRNVersion,
                            optionsIn,
                          })

                          if (!result) {
                            return null
                          }

                          // Determine loader based on file extension
                          const ext = extname(args.path)
                          const loader =
                            ext === '.tsx'
                              ? 'tsx'
                              : ext === '.ts'
                                ? 'ts'
                                : ext === '.jsx'
                                  ? 'jsx'
                                  : 'js'

                          return {
                            contents: result.code,
                            loader,
                          }
                        }
                      )
                    },
                  },
                ],
              },
            },

            define: {
              'process.env.NATIVEWIND_OS': JSON.stringify(
                environment === 'ios' || environment === 'android' ? 'native' : 'web'
              ),
            },
          } satisfies UserConfig
        }

        return {
          environments: {
            ios: createEnvironmentConfig('ios'),
            android: createEnvironmentConfig('android'),
            client: createEnvironmentConfig('client'),
            ssr: createEnvironmentConfig('ssr'),
          },
        }
      },

      configResolved(resolvedConfig) {
        config = resolvedConfig
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

        return performFullTransform({
          codeIn,
          _id,
          environment,
          production,
          reactForRNVersion,
          optionsIn,
          mode: config.command,
        })
      },
    },
  ]
}
