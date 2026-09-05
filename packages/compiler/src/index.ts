/**
 * Compiler plugin for One/VXRN
 * Automates babel transforms (react compiler, codegen, user transforms) and
 * react native CSS-to-JS conversion.
 */

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePath } from '@vxrn/utils'
import { cssToReactNativeRuntime } from 'react-native-css-interop/css-to-rn/index.js'
import type { OutputChunk } from 'rolldown'
import type { PluginOption, ResolvedConfig, UserConfig } from 'vite'
import { configuration, isNativeWorkletsEnabled } from './configure'
import { debug, runtimePublicPath, validParsers } from './constants'
import {
  getBabelOptions,
  transformBabel,
  transformOxcReactCompiler,
} from './transformBabel'
import { shouldSourceMap } from './transformSWC'
import { shouldTransformWorklets, transformWorklets } from './transformWorklets'
import type { Environment, GetTransformProps, Options } from './types'
import { getCachedTransform, logCacheStats, setCachedTransform } from './cache'

export * from './configure'
export * from './transformBabel'
export * from './transformSWC'
export * from './transformWorklets'
export type { GetTransform } from './types'

// Performance tracking
const perfStats = {
  babel: {
    totalCalls: 0,
    totalTransforms: 0,
    totalTime: 0,
    byEnvironment: {} as Record<
      string,
      { calls: number; transforms: number; time: number }
    >,
  },
  optimizeDeps: {
    byEnvironment: {} as Record<
      string,
      { filesChecked: number; filesTransformed: number; startTime: number }
    >,
  },
}

function logPerfSummary() {
  // Only log detailed perf stats when debugging
  if (!process.env.DEBUG_COMPILER_PERF) {
    return
  }

  console.info('\n📊 [Compiler Performance Summary]')
  console.info(
    `Babel: ${perfStats.babel.totalTransforms} transforms / ${perfStats.babel.totalCalls} calls (${((perfStats.babel.totalTransforms / Math.max(perfStats.babel.totalCalls, 1)) * 100).toFixed(1)}% transform rate)`
  )
  console.info(`Babel total time: ${perfStats.babel.totalTime}ms`)

  for (const [env, stats] of Object.entries(perfStats.babel.byEnvironment)) {
    if (stats.transforms > 0) {
      console.info(
        `  ${env}: ${stats.transforms} transforms, ${stats.time}ms (${(stats.time / stats.transforms).toFixed(1)}ms avg)`
      )
    }
  }

  for (const [env, stats] of Object.entries(perfStats.optimizeDeps.byEnvironment)) {
    const elapsed = Date.now() - stats.startTime
    console.info(
      `optimizeDeps ${env}: checked ${stats.filesChecked} files, transformed ${stats.filesTransformed} (${elapsed}ms)`
    )
  }
}

// a single page request can run the compiler over hundreds of files, so
// accumulate and print one line once transforms go quiet instead of per-file
const compilerLog = {
  compiled: 0,
  cached: 0,
  time: 0,
  // typed loose because the dom lib types setTimeout as number, but node gives
  // us a Timeout we need to unref so the debounce never holds the process open
  timer: null as any,
}

function logCompiled(cached: boolean, ms: number) {
  if (cached) {
    compilerLog.cached++
  } else {
    compilerLog.compiled++
    compilerLog.time += ms
  }

  if (compilerLog.timer) clearTimeout(compilerLog.timer)
  compilerLog.timer = setTimeout(() => {
    const total = compilerLog.compiled + compilerLog.cached
    const detail = compilerLog.compiled
      ? `${compilerLog.compiled} compiled in ${compilerLog.time}ms${compilerLog.cached ? `, ${compilerLog.cached} cached` : ''}`
      : `all cached`
    console.info(` 🪄 [compiler] ${total} file${total === 1 ? '' : 's'} (${detail})`)
    compilerLog.compiled = 0
    compilerLog.cached = 0
    compilerLog.time = 0
    compilerLog.timer = null
  }, 500)
  compilerLog.timer.unref?.()
}

// Shared Babel transform logic
async function performBabelTransform({
  id,
  code,
  projectRoot,
  environment,
  production,
  reactForRNVersion,
  optionsIn,
}: {
  id: string
  code: string
  projectRoot: string
  environment: Environment
  production: boolean
  reactForRNVersion: '18' | '19'
  optionsIn?: Partial<Options>
}) {
  // Track stats
  perfStats.babel.totalCalls++
  if (!perfStats.babel.byEnvironment[environment]) {
    perfStats.babel.byEnvironment[environment] = { calls: 0, transforms: 0, time: 0 }
  }
  perfStats.babel.byEnvironment[environment].calls++

  const transformProps: GetTransformProps = {
    id,
    code,
    projectRoot,
    development: !production,
    environment,
    reactForRNVersion,
  }

  const userTransform = optionsIn?.transform?.(transformProps)

  if (userTransform === false) {
    return null
  }

  if (userTransform !== 'swc' && userTransform !== 'oxc') {
    const babelOptions = getBabelOptions({
      ...transformProps,
      userSetting: userTransform,
    })

    if (babelOptions) {
      const hasCompilerPlugin = babelOptions.plugins?.some(
        (x) => Array.isArray(x) && x[0] === 'babel-plugin-react-compiler'
      )

      // Check cache first
      const cached = getCachedTransform(id, code, environment)
      if (cached) {
        perfStats.babel.byEnvironment[environment].transforms++
        if (
          hasCompilerPlugin &&
          (cached.code.includes('react/compiler-runtime') ||
            cached.code.includes('react-compiler-runtime'))
        ) {
          debug?.(` 🪄 [compiler] ${relative(process.cwd(), id)} (cached)`)
          logCompiled(true, 0)
        }
        debug?.(`[babel/cached] ${id}`)
        return cached
      }

      // React compiler through oxc's rust port instead of babel.
      let compilerOut: { code: string; map?: any } | null = null
      const compilerPluginIndex =
        babelOptions.plugins?.findIndex(
          (x) => Array.isArray(x) && x[0] === 'babel-plugin-react-compiler'
        ) ?? -1

      if (compilerPluginIndex !== -1) {
        const compilerTarget =
          (babelOptions.plugins![compilerPluginIndex] as any[])[1]?.target ?? '19'
        compilerOut = await transformOxcReactCompiler(
          id,
          code,
          compilerTarget,
          shouldSourceMap()
        )
        babelOptions.plugins!.splice(compilerPluginIndex, 1)
      }

      let curCode = compilerOut ? compilerOut.code : code

      // Native Worklets through custom native/Oxc worklet transformer instead of babel.
      let workletsOut: { code: string; map?: any } | null = null
      const isWorkletPlugin = (entry: any) => {
        if (!entry) return false
        const name =
          typeof entry === 'string' ? entry : Array.isArray(entry) ? entry[0] : null
        return (
          typeof name === 'string' &&
          (name.includes('react-native-worklets') ||
            name.includes('react-native-reanimated'))
        )
      }
      const workletPluginIndex = babelOptions.plugins?.findIndex(isWorkletPlugin) ?? -1
      let workletPluginOptions: any = undefined
      if (workletPluginIndex !== -1) {
        const entry = babelOptions.plugins![workletPluginIndex]
        if (Array.isArray(entry) && entry[1] && typeof entry[1] === 'object') {
          workletPluginOptions = entry[1]
        }
      }

      if (
        isNativeWorkletsEnabled() &&
        (workletPluginIndex !== -1 || shouldTransformWorklets({ id, code: curCode }))
      ) {
        workletsOut = await transformWorklets(id, curCode, shouldSourceMap(), {
          projectRoot,
          ...workletPluginOptions,
        })
        if (workletPluginIndex !== -1) {
          babelOptions.plugins!.splice(workletPluginIndex, 1)
        }
        curCode = workletsOut.code
      }

      // Cache miss - do the transform
      const startTime = Date.now()
      let babelOut: { code?: string | null; map?: any } | null = null

      if (babelOptions.plugins?.length === 0) {
        let finalMap: any = undefined
        if (shouldSourceMap()) {
          const intermediateMaps = [compilerOut?.map, workletsOut?.map].filter(Boolean)
          if (intermediateMaps.length === 1) {
            finalMap = intermediateMaps[0]
          } else if (intermediateMaps.length > 1) {
            const remapping = (await import('@jridgewell/remapping')).default
            finalMap = remapping(intermediateMaps.slice().reverse(), () => null)
          }
        }
        babelOut = { code: curCode, map: finalMap }
      } else {
        const babelOptsWithMap =
          shouldSourceMap() && (workletsOut?.map || compilerOut?.map)
            ? { ...babelOptions, sourceMaps: true }
            : babelOptions
        babelOut = await transformBabel(id, curCode, babelOptsWithMap)
        if (shouldSourceMap() && babelOut?.map) {
          const priorMaps = [compilerOut?.map, workletsOut?.map].filter(Boolean)
          if (priorMaps.length > 0) {
            const remapping = (await import('@jridgewell/remapping')).default
            babelOut.map = remapping(
              [babelOut.map, ...priorMaps.slice().reverse()],
              () => null
            )
          }
        }
      }
      const babelTime = Date.now() - startTime

      if (babelOut?.code) {
        perfStats.babel.totalTransforms++
        perfStats.babel.totalTime += babelTime
        perfStats.babel.byEnvironment[environment].transforms++
        perfStats.babel.byEnvironment[environment].time += babelTime

        if (
          hasCompilerPlugin &&
          (babelOut.code.includes('react/compiler-runtime') ||
            babelOut.code.includes('react-compiler-runtime'))
        ) {
          debug?.(` 🪄 [compiler] ${relative(process.cwd(), id)} (${babelTime}ms)`)
          logCompiled(false, babelTime)
        }

        debug?.(`[babel] ${id}`)
        const outCode = `${babelOut.code}\n// vxrn-did-babel`
        const result = { code: outCode, map: babelOut.map }

        // Cache the result
        setCachedTransform(id, code, result, environment)

        return result
      }
    }
  }

  return null
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
    // workerd-backed one dev uses a `worker` environment; treat it as ssr
    if (name === 'worker') return 'ssr'
    if (!envNames[name]) throw new Error(`Invalid env: ${name}`)
    return name as Environment
  }

  const reactForRNVersion = reactVersion.split('.')[0] as '18' | '19'

  const cssTransformCache = new Map<string, string>()

  // fix so we can align the diff between vite and rolldown id (rolldown resolves from root monorepo)
  const rolldownPath = resolvePath('rolldown')
  const rolldownNodeMods = rolldownPath.slice(
    0,
    rolldownPath.indexOf(sep + 'node_modules')
  )

  /**
   * Vite config, filled by a `configResolved` hook.
   */
  let config: ResolvedConfig

  return [
    {
      name: 'one:compiler-resolve-refresh-runtime',
      apply: 'serve',
      enforce: 'pre', // Run before Vite default resolve to avoid syscalls
      resolveId: (id) =>
        id === runtimePublicPath || id === `${runtimePublicPath}.map` ? id : undefined,
      load: (id) => {
        const basePath = dirname(fileURLToPath(import.meta.url))
        if (id === runtimePublicPath) {
          // tamagui-build adds a sourceMappingURL to the dist copy of this file,
          // strip it since the browser resolves it relative to the page causing a 404
          return readFileSync(join(basePath, 'refresh-runtime.mjs'), 'utf-8').replace(
            /\/\/# sourceMappingURL=.*/,
            ''
          )
        }
        if (id === `${runtimePublicPath}.map`) {
          return JSON.stringify({ version: 3, sources: [], mappings: '' })
        }
        return undefined
      },
    },

    {
      name: `one:compiler-css-to-js`,

      // only .css files can match, so let rust reject everything else
      transform: {
        filter: { id: /\.css$/ },
        handler(codeIn: string, id: string) {
          const environment = getEnvName(this.environment.name)
          if (
            configuration.enableNativeCSS &&
            (environment === 'ios' || environment === 'android')
          ) {
            {
              const data = JSON.stringify(
                cssToReactNativeRuntime(codeIn, { inlineRem: 16 })
              )
              // TODO were hardcoding the require id we bundle as: nativewind/dist/index.js
              // could at least resolve this using resolvePath
              const code = `require("nativewind/dist/index.js").__require().StyleSheet.registerCompiled(${data})`
              const newId = `${id}.js`

              // rollup uses relative to its node_modules parent dir, vite here uses absolute
              const cssId = newId.replace(rolldownNodeMods + sep, '')
              cssTransformCache.set(cssId, code)

              return {
                code,
                id: newId,
                map: null,
              }
            }
          }
        },
      },

      generateBundle(_, bundle) {
        const environment = getEnvName(this.environment.name)

        if (
          configuration.enableNativeCSS &&
          (environment === 'ios' || environment === 'android')
        ) {
          const rootJSName = Object.keys(bundle).find((i) => {
            const chunk = bundle[i]
            return (
              chunk.type == 'chunk' && chunk.fileName.match(/.[cm]?js(?:\?.+)?$/) != null
            )
          })
          if (!rootJSName) {
            throw new Error(`Can't find root js, internal one error`)
          }

          const rootJS = bundle[rootJSName] as unknown as OutputChunk

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
        // accept either separator: optimizeDeps hands OS-native ids, so a
        // forward-slash-only match dropped every node_modules file on Windows
        const nodeModulesFilter = /node_modules[/\\].*\.(tsx?|jsx?|mjs|cjs)$/

        const createEnvironmentConfig = (environment: Environment) => {
          // init stats for this environment
          if (!perfStats.optimizeDeps.byEnvironment[environment]) {
            perfStats.optimizeDeps.byEnvironment[environment] = {
              filesChecked: 0,
              filesTransformed: 0,
              startTime: Date.now(),
            }
          }

          return {
            optimizeDeps: {
              rolldownOptions: {
                plugins: [
                  {
                    name: `transform-before-optimize-deps-${environment}`,

                    async transform(code: string, id: string) {
                      if (!nodeModulesFilter.test(id)) {
                        return null
                      }

                      perfStats.optimizeDeps.byEnvironment[environment].filesChecked++

                      const production =
                        process.env.NODE_ENV === 'production' ||
                        process.env.NODE_ENV === 'test'

                      debug?.(`[rolldown optimizeDeps] ${id}`)

                      const result = await performBabelTransform({
                        id,
                        code,
                        projectRoot: config.root,
                        environment,
                        production,
                        reactForRNVersion,
                        optionsIn,
                      })

                      if (!result) {
                        return null
                      }

                      perfStats.optimizeDeps.byEnvironment[environment].filesTransformed++

                      return {
                        code: result.code,
                        map: result.map,
                      }
                    },

                    buildEnd() {
                      // only log detailed stats when debugging
                      if (process.env.DEBUG_COMPILER_PERF) {
                        const stats = perfStats.optimizeDeps.byEnvironment[environment]
                        const elapsed = Date.now() - stats.startTime
                        console.info(
                          `[optimizeDeps ${environment}] Done: ${stats.filesChecked} files checked, ${stats.filesTransformed} transformed (${elapsed}ms)`
                        )
                      }

                      // log cache stats when all environments are done
                      const allDone =
                        Object.keys(perfStats.optimizeDeps.byEnvironment).length >= 2
                      if (allDone) {
                        logCacheStats()
                        logPerfSummary()
                      }
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
          config.command === 'build' ||
          process.env.NODE_ENV === 'production' ||
          JSON.parse(
            this.environment.config?.define?.['process.env.NODE_ENV'] || '""'
          ) === 'production'

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

        // filter out non-transformable files
        const id = _id.split('?')[0]
        const extension = extname(id)

        if (extension === '.css' || !validParsers.has(extension)) {
          return
        }

        if (id.includes(`virtual:`)) {
          return
        }

        // avoid double-processing files already handled by optimizeDeps
        if (codeIn.endsWith(`// vxrn-did-babel`)) {
          debug?.(`[skip babel] ${id}`)
          return
        }

        return performBabelTransform({
          id,
          code: codeIn,
          projectRoot: config.root,
          environment,
          production,
          reactForRNVersion,
          optionsIn,
        })
      },
    },

    // wraps client-side TSX/JSX with React Refresh preamble + import.meta.hot.accept
    // runs after vite:oxc (no enforce:'pre') so it sees the already-transformed code
    {
      name: 'one:react-refresh-web',
      apply: 'serve',

      transform(code, _id) {
        if (this.environment.name !== 'client') return
        if (code.includes(runtimePublicPath)) return // already wrapped

        const id = _id.split('?')[0]
        if (id.includes('node_modules')) return
        if (id.includes('virtual:')) return
        if (id === runtimePublicPath) return

        const ext = extname(id)
        if (ext !== '.tsx' && ext !== '.jsx') return

        const hasRefreshCalls = /\$RefreshReg\$\(/.test(code)

        let out = `import * as RefreshRuntime from "${runtimePublicPath}";\n\n`

        if (hasRefreshCalls) {
          out += `if (!window.$RefreshReg$) throw new Error("React refresh preamble was not loaded. Something is wrong.");
const prevRefreshReg = window.$RefreshReg$;
const prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${id}");
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

`
        }

        out += code

        if (hasRefreshCalls) {
          out += `\n\nwindow.$RefreshReg$ = prevRefreshReg;\nwindow.$RefreshSig$ = prevRefreshSig;\n`
        }

        out += `
RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
  RefreshRuntime.registerExportsForReactRefresh("${id}", currentExports);
  import.meta.hot.accept((nextExports) => {
    if (!nextExports) return;
    const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("${id}", currentExports, nextExports);
    if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
  });
});
`

        return { code: out, map: null }
      },
    },
  ]
}
