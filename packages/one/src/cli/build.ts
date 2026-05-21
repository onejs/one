import { createRequire } from 'node:module'
import { cpus } from 'node:os'
import Path, { join, posix, relative, resolve } from 'node:path'
import { resolvePath } from '@vxrn/resolve'
import FSExtra from 'fs-extra'
import MicroMatch from 'micromatch'
import type { OutputAsset, RolldownOutput } from 'rolldown'
import {
  createBuilder,
  type InlineConfig,
  mergeConfig,
  normalizePath,
  build as viteBuild,
} from 'vite'
import {
  type ClientManifestEntry,
  fillOptions,
  getOptimizeDeps,
  rollupRemoveUnusedImportsPlugin,
  build as vxrnBuild,
} from 'vxrn'

import * as constants from '../constants'
import { setServerGlobals } from '../server/setServerGlobals'
import { getPathnameFromFilePath } from '../utils/getPathnameFromFilePath'
import { getRouterRootFromOneOptions } from '../utils/getRouterRootFromOneOptions'
import { isRolldown } from '../utils/isRolldown'
import { toAbsolute, toAbsoluteUrl } from '../utils/toAbsolute'
import { buildVercelOutputDirectory } from '../vercel/build/buildVercelOutputDirectory'
import { getManifest } from '../vite/getManifest'
import { loadUserOneOptions } from '../vite/loadConfig'
import { runWithAsyncLocalContext } from '../vite/one-server-only'
import type { DeployConfig, DeployTarget, One, RouteInfo } from '../vite/types'
import { buildPage, printBuildTimings } from './buildPage'
import { checkNodeVersion } from './checkNodeVersion'
import { getWorkerPool, terminateWorkerPool } from './workerPool'
import { generateSitemap, type RouteSitemapData } from './generateSitemap'
import { labelProcess } from './label-process'
import { pLimit } from '../utils/pLimit'
import { getCriticalCSSOutputPaths } from '../vite/plugins/criticalCSSPlugin'

const { ensureDir, writeJSON } = FSExtra

function normalizeDeploy(
  deploy?: DeployTarget | DeployConfig
): { target: DeployTarget; url?: string } | undefined {
  if (!deploy) return undefined
  if (typeof deploy === 'string') return { target: deploy }
  return deploy
}

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

const GENERATED_CLOUDFLARE_WRANGLER_RULES = [
  { type: 'ESModule', globs: ['./server/**/*.js'], fallthrough: true },
  { type: 'ESModule', globs: ['./api/**/*.js'], fallthrough: true },
  { type: 'ESModule', globs: ['./middlewares/**/*.js'], fallthrough: true },
  { type: 'ESModule', globs: ['./assets/**/*.js'], fallthrough: true },
]

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function mergeJsonObjects(
  base: Record<string, JsonValue>,
  overrides: Record<string, JsonValue>
): Record<string, JsonValue> {
  const merged: Record<string, JsonValue> = { ...base }

  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key]
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      merged[key] = mergeJsonObjects(baseValue, value)
    } else {
      merged[key] = value
    }
  }

  return merged
}

function dedupeJsonValues<T extends JsonValue>(values: T[]): T[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = JSON.stringify(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeCloudflareCompatibilityFlags(flags: unknown): string[] {
  const userFlags = Array.isArray(flags)
    ? flags.filter((flag): flag is string => typeof flag === 'string')
    : []

  return dedupeJsonValues<string>(['nodejs_compat', ...userFlags])
}

function mergeCloudflareRules(rules: unknown): JsonValue[] {
  const userRules = Array.isArray(rules)
    ? rules.filter((rule): rule is JsonValue => isPlainObject(rule))
    : []

  return dedupeJsonValues<JsonValue>([
    ...GENERATED_CLOUDFLARE_WRANGLER_RULES,
    ...userRules,
  ])
}

// minimal JSONC parser: strips line/block comments (string-aware) and trailing
// commas, then runs JSON.parse. sufficient for small hand-written config files.
function parseJsonc(text: string): unknown {
  let out = ''
  let i = 0
  let inString = false
  let quote = ''
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (inString) {
      if (ch === '\\') {
        out += ch + (next ?? '')
        i += 2
        continue
      }
      if (ch === quote) inString = false
      out += ch
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      quote = ch
      out += ch
      i++
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < text.length - 1 && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    out += ch
    i++
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

async function loadUserWranglerConfig(
  root: string
): Promise<{ path: string; config: Record<string, JsonValue> } | null> {
  const candidateRoots = [...new Set([root, process.cwd()])]

  for (const candidateRoot of candidateRoots) {
    for (const fileName of ['wrangler.jsonc', 'wrangler.json']) {
      const configPath = join(candidateRoot, fileName)
      if (!(await FSExtra.pathExists(configPath))) {
        continue
      }

      const contents = await FSExtra.readFile(configPath, 'utf-8')
      let parsed: unknown
      try {
        parsed = parseJsonc(contents)
      } catch (err) {
        throw new Error(
          `Failed to parse ${relative(process.cwd(), configPath)}: ${(err as Error).message}`
        )
      }

      if (!isPlainObject(parsed)) {
        throw new Error(
          `Expected ${relative(process.cwd(), configPath)} to contain a top-level JSON object`
        )
      }

      return {
        path: configPath,
        config: parsed,
      }
    }
  }

  return null
}

function createCloudflareWranglerConfig(
  projectName: string,
  userConfig?: Record<string, JsonValue>
): Record<string, JsonValue> {
  const generatedConfig: Record<string, JsonValue> = {
    name: projectName,
    main: 'worker.js',
    compatibility_date: '2024-12-05',
    compatibility_flags: ['nodejs_compat'],
    find_additional_modules: true,
    rules: GENERATED_CLOUDFLARE_WRANGLER_RULES,
    assets: {
      directory: 'client',
      binding: 'ASSETS',
      run_worker_first: true,
    },
  }

  const mergedConfig = userConfig
    ? mergeJsonObjects(generatedConfig, userConfig)
    : generatedConfig

  mergedConfig.main = 'worker.js'
  mergedConfig.find_additional_modules = true
  mergedConfig.compatibility_flags = mergeCloudflareCompatibilityFlags(
    mergedConfig.compatibility_flags
  )
  mergedConfig.rules = mergeCloudflareRules(mergedConfig.rules)
  mergedConfig.assets = {
    ...(isPlainObject(mergedConfig.assets) ? mergedConfig.assets : {}),
    directory: 'client',
    binding: 'ASSETS',
    run_worker_first: true,
  }

  return mergedConfig
}

// reads package.json name, strips npm scope prefix for use as cloudflare worker name
async function getCloudflareProjectName(root: string): Promise<string> {
  try {
    const pkg = JSON.parse(await FSExtra.readFile(join(root, 'package.json'), 'utf-8'))
    if (pkg.name) {
      return pkg.name.replace(/^@[^/]+\//, '')
    }
  } catch {}
  return 'one-app'
}

// concurrency limit for parallel page builds
// can be overridden with ONE_BUILD_CONCURRENCY env var
// default based on CPU count for I/O parallelism benefits
// ensure worker threads inherit the same CACHE_KEY as the main process
process.env.ONE_CACHE_KEY = constants.CACHE_KEY

const BUILD_CONCURRENCY = process.env.ONE_BUILD_CONCURRENCY
  ? Math.max(1, parseInt(process.env.ONE_BUILD_CONCURRENCY, 10))
  : Math.max(1, Math.min(cpus().length, 8))

// worker threads enabled by default, can be disabled via config or env var
function shouldUseWorkers(oneOptions?: { build?: { workers?: boolean } }) {
  // env var takes precedence (ONE_BUILD_WORKERS=0 to disable, =1 to force enable)
  if (process.env.ONE_BUILD_WORKERS === '0') return false
  if (process.env.ONE_BUILD_WORKERS === '1') return true
  // then check config option (defaults to true)
  return oneOptions?.build?.workers !== false
}

// formatErrorSafely temporarily zeroes Error.prepareStackTrace before reading
// err.stack — prevents a broken transitive prepareStackTrace formatter (e.g.
// source-map-support without a recursion guard) from spinning V8 forever on
// the way out. exit(1) so a fatal build doesn't leave a 100%-cpu zombie when
// CI cancels the parent. see install-error-handlers.ts for the full story.
import {
  formatErrorSafely,
  installPrepareStackTraceGuard,
} from './install-error-handlers'

installPrepareStackTraceGuard()

// these handlers must only attach when `build` is actually invoked. attaching
// them at module load leaks into `one dev`, because `one/vite` re-exports from
// this file — and dev intentionally does NOT exit on unhandled rejection (see
// dev.ts). a stray rejection from expo's manifest middleware (client closing
// the connection mid-stream) was killing the dev server.
let buildErrorHandlersInstalled = false
function installBuildErrorHandlers() {
  if (buildErrorHandlersInstalled) return
  buildErrorHandlersInstalled = true
  process.on('uncaughtException', (err) => {
    try {
      process.stderr.write(`[one build] uncaught exception\n${formatErrorSafely(err)}\n`)
    } catch {}
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    try {
      process.stderr.write(
        `[one build] unhandled rejection\n${formatErrorSafely(reason)}\n`
      )
    } catch {}
    process.exit(1)
  })
}

const HOOK_KEYS = [
  'resolveId',
  'load',
  'transform',
  'renderChunk',
  'generateBundle',
  'writeBundle',
  'buildStart',
  'buildEnd',
  'moduleParsed',
]

// vite defines non-configurable getters on plugin hook objects during a build.
// when the same plugins are reused in a second build (eg api routes), the new
// vite instance can't redefine those properties and throws. this clones the
// hook objects so each build gets its own references.
function clonePluginHooks(config: InlineConfig): InlineConfig {
  if (!config.plugins) return config
  return {
    ...config,
    plugins: config.plugins.map((p: any) => {
      if (!p || typeof p !== 'object') return p
      const cloned = { ...p }
      for (const key of HOOK_KEYS) {
        if (cloned[key] && typeof cloned[key] === 'object' && 'handler' in cloned[key]) {
          cloned[key] = { ...cloned[key] }
        }
      }
      return cloned
    }),
  }
}

export async function build(args: {
  step?: string
  only?: string
  platform?: 'ios' | 'web' | 'android'
  skipEnv?: boolean
}) {
  installBuildErrorHandlers()
  process.env.IS_VXRN_CLI = 'true'

  // set NODE_ENV, do before loading vite.config (see loadConfigFromFile)
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `\n ⚠️  Warning: NODE_ENV is set to "${process.env.NODE_ENV}" (builds default to "production")\n`
    )
  }

  labelProcess('build')
  checkNodeVersion()
  setServerGlobals()

  const { oneOptions, config: viteLoadedConfig } = await loadUserOneOptions('build')
  const routerRoot = getRouterRootFromOneOptions(oneOptions)

  // Set defaultRenderMode env var so getManifest knows the correct route types
  if (oneOptions.web?.defaultRenderMode) {
    process.env.ONE_DEFAULT_RENDER_MODE = oneOptions.web.defaultRenderMode
  }

  const deployConfig = normalizeDeploy(oneOptions.web?.deploy)

  // auto-detect ONE_SERVER_URL from deploy config when not explicitly set
  if (!process.env.ONE_SERVER_URL && deployConfig) {
    const url =
      deployConfig.url ??
      (deployConfig.target === 'cloudflare'
        ? `https://${await getCloudflareProjectName(process.cwd())}.workers.dev`
        : undefined)

    if (url) {
      process.env.ONE_SERVER_URL = url
      console.info(`\n ☁️ ONE_SERVER_URL: ${url}\n`)
    }
  }

  // respect vite's build.outDir config, default to 'dist'
  const outDir = viteLoadedConfig?.config?.build?.outDir ?? 'dist'

  const manifest = getManifest({
    routerRoot,
    ignoredRouteFiles: oneOptions.router?.ignoredRouteFiles,
  })!

  const serverOutputFormat =
    oneOptions.build?.server === false
      ? 'esm'
      : (oneOptions.build?.server?.outputFormat ?? 'esm')

  const buildStartTime = performance.now()

  const vxrnOutput = await vxrnBuild(
    {
      skipEnv: args.skipEnv ?? oneOptions.skipEnv,
      server: oneOptions.server,
      build: {
        analyze: true,
        server:
          oneOptions.build?.server === false
            ? false
            : {
                outputFormat: serverOutputFormat,
              },
      },
    },
    args
  )

  const bundleTime = performance.now() - buildStartTime
  console.info(`\n ⏱️ vite bundle: ${(bundleTime / 1000).toFixed(2)}s\n`)

  if (!vxrnOutput || args.platform !== 'web') {
    return
  }

  const options = await fillOptions(vxrnOutput.options, { mode: 'prod' })

  const { optimizeDeps } = getOptimizeDeps('build')
  const { rolldownOptions: _rolldownOptions, ...optimizeDepsNoRolldown } = optimizeDeps

  // unified mode: api + middleware routes share config with the SSR server build —
  // same defines, plugins, externalization rules, no blanket noExternal: true.
  // when off, keep the legacy path that derives from webBuildConfig with
  // ssr.noExternal: true hard-coded (back-compat).
  const serverOpts = oneOptions.build?.server
  const isUnified =
    typeof serverOpts === 'object' && serverOpts !== null && serverOpts.unified === true

  // clone plugin hooks so vite's wrapHookObject doesn't fail on reuse across builds
  // (vite defines non-configurable getters on hook objects during the first build)
  let baseForApi = isUnified
    ? clonePluginHooks(vxrnOutput.serverBuildConfig ?? vxrnOutput.webBuildConfig)
    : clonePluginHooks(vxrnOutput.webBuildConfig)

  if (isUnified) {
    // serverBuildConfig has rolldownOptions.input: ['virtual:one-entry'] —
    // vite mergeConfig concatenates that with the api build's input object,
    // which rolldown then tries to iterate as a string list. strip it so the
    // per-routes input map in buildCustomRoutes takes effect cleanly.
    //
    // also strip `omit-api-routes`, the server's transform plugin that empties
    // any +api / _middleware file. correct for the SSR render bundle, wrong
    // for api/middleware builds where those files ARE the entry points.
    const clone: InlineConfig = {
      ...baseForApi,
      build: baseForApi.build ? { ...baseForApi.build } : undefined,
      plugins: baseForApi.plugins
        ? (baseForApi.plugins as any[]).filter(
            (p) => p && typeof p === 'object' && p.name !== 'omit-api-routes'
          )
        : undefined,
    }
    if (clone.build && (clone.build as any).rolldownOptions) {
      const ro = { ...((clone.build as any).rolldownOptions as any) }
      delete ro.input
      ;(clone.build as any).rolldownOptions = ro
    }
    if (clone.build) {
      delete (clone.build as any).outDir
    }
    baseForApi = clone
  }

  const apiBuildConfig = mergeConfig(baseForApi, {
    configFile: false,
    appType: 'custom',
    optimizeDeps: optimizeDepsNoRolldown,
    environments: {
      client: {
        optimizeDeps: { rolldownOptions: _rolldownOptions },
      },
    },
  } satisfies InlineConfig)

  async function buildCustomRoutes(subFolder: string, routes: RouteInfo<string>[]) {
    const input = routes.reduce((entries, { page, file }) => {
      entries[page.slice(1) + '.js'] = join(routerRoot, file)
      return entries
    }, {}) as Record<string, string>

    // TODO this is specific to API but used for middelwares too now
    const outputFormat = oneOptions?.build?.api?.outputFormat ?? serverOutputFormat
    const treeshake = oneOptions?.build?.api?.treeshake

    const mergedConfig = mergeConfig(apiBuildConfig, {
      appType: 'custom',
      configFile: false,

      define: vxrnOutput!.processEnvDefines,

      ssr: isUnified
        ? {
            // in unified mode let the base (serverBuildConfig) set ssr.noExternal
            // — default is now ['react', 'react-dom'] instead of `true`, so
            // rolldown can externalize the rest.
            optimizeDeps: optimizeDepsNoRolldown,
          }
        : {
            noExternal: true,
            external: ['react', 'react-dom'],
            optimizeDeps: optimizeDepsNoRolldown,
          },

      environments: {
        ssr: {
          optimizeDeps: { rolldownOptions: _rolldownOptions },
        },
      },

      build: {
        ssr: true,
        emptyOutDir: false,
        outDir: `${outDir}/${subFolder}`,
        copyPublicDir: false,
        minify: false,
        rolldownOptions: {
          treeshake: treeshake ?? {
            moduleSideEffects: false,
          },

          plugins: [
            // otherwise rollup is leaving commonjs-only top level imports...
            outputFormat === 'esm' ? rollupRemoveUnusedImportsPlugin : null,
          ].filter(Boolean),

          // too many issues
          // treeshake: {
          //   moduleSideEffects: false,
          // },
          // prevents it from shaking out the exports
          preserveEntrySignatures: 'strict',
          input: input,
          // in unified mode, inherit externals from serverBuildConfig (user
          // ssr.external / rolldownOptions.external). the legacy path resets
          // them to [] so per-route files bundle everything.
          ...(isUnified ? {} : { external: [] }),
          output: {
            entryFileNames: '[name]',
            exports: 'auto',
            ...(outputFormat === 'esm'
              ? {
                  format: 'esm',
                  esModule: true,
                }
              : {
                  format: 'cjs',
                  // Preserve folder structure and use .cjs extension
                  entryFileNames: (chunkInfo) => {
                    const name = chunkInfo.name.replace(/\.js$/, '.cjs')
                    return name
                  },
                  chunkFileNames: (chunkInfo) => {
                    const dir = Path.dirname(chunkInfo.name)
                    const name = Path.basename(
                      chunkInfo.name,
                      Path.extname(chunkInfo.name)
                    )
                    return posix.join(dir, `${name}-[hash].cjs`)
                  },
                  assetFileNames: (assetInfo) => {
                    const name = assetInfo.name ?? ''
                    const dir = Path.dirname(name)
                    const baseName = Path.basename(name, Path.extname(name))
                    const ext = Path.extname(name)
                    return posix.join(dir, `${baseName}-[hash]${ext}`)
                  },
                }),
          },
        },
      },
    } satisfies InlineConfig)

    const userApiBuildConf = oneOptions.build?.api?.config

    const finalApiBuildConf = userApiBuildConf
      ? mergeConfig(mergedConfig, userApiBuildConf)
      : mergedConfig

    const output = await viteBuild(
      // allow user merging api build config
      finalApiBuildConf
    )

    return output as RolldownOutput
  }

  // build api routes and middlewares in parallel
  const builtMiddlewares: Record<string, string> = {}

  const apiPromise = manifest.apiRoutes.length
    ? (console.info(`\n 🔨 build api routes\n`),
      buildCustomRoutes('api', manifest.apiRoutes))
    : Promise.resolve(null)

  const middlewarePromise = manifest.middlewareRoutes.length
    ? (console.info(`\n 🔨 build middlewares\n`),
      buildCustomRoutes('middlewares', manifest.middlewareRoutes))
    : Promise.resolve(null)

  const [apiOutput, middlewareBuildInfo] = await Promise.all([
    apiPromise,
    middlewarePromise,
  ])

  if (middlewareBuildInfo) {
    for (const middleware of manifest.middlewareRoutes) {
      const absoluteRoot = resolve(process.cwd(), options.root)
      const fullPath = normalizePath(join(absoluteRoot, routerRoot, middleware.file))
      const outChunks = middlewareBuildInfo.output.filter((x) => x.type === 'chunk')
      const chunk = outChunks.find((x) => x.facadeModuleId === fullPath)
      if (!chunk) throw new Error(`internal err finding middleware`)
      builtMiddlewares[middleware.file] = posix.join(
        outDir,
        'middlewares',
        chunk.fileName
      )
    }
  }

  // for the require Sitemap in getRoutes
  globalThis['require'] = createRequire(import.meta.dirname + '/')

  const assets: OutputAsset[] = []

  const builtRoutes: One.RouteBuildInfo[] = []
  const sitemapData: RouteSitemapData[] = []

  // caches for expensive operations
  const collectImportsCache = new Map<string, string[]>()
  const cssFileContentsCache = new Map<string, string>()

  // css files with .inline.css extension — should be inlined as <style>
  const criticalCSSOutputPaths = getCriticalCSSOutputPaths(vxrnOutput.clientManifest)

  // concurrency limiter for parallel page builds
  const limit = pLimit(BUILD_CONCURRENCY)

  // initialize worker pool if enabled (default: true)
  const useWorkers = shouldUseWorkers(oneOptions)
  const workerPool = useWorkers ? getWorkerPool(BUILD_CONCURRENCY) : null
  if (workerPool) {
    // strip non-cloneable values so workers skip re-loading vite config
    const serializableOptions = JSON.parse(
      JSON.stringify(oneOptions, (_key, value) =>
        typeof value === 'function' ? undefined : value
      )
    )
    await workerPool.initialize(serializableOptions)
  }

  const staticStartTime = performance.now()
  const modeLabel = useWorkers
    ? `workers: ${workerPool?.size}`
    : `concurrency: ${BUILD_CONCURRENCY}`
  console.info(`\n 🔨 build static routes (${modeLabel})\n`)

  const staticDir = join(`${outDir}/static`)
  const clientDir = join(`${outDir}/client`)
  await ensureDir(staticDir)

  if (!vxrnOutput.serverOutput) {
    throw new Error(`No server output`)
  }

  // build a direct mapping from source file path to client chunk info
  // this is more reliable than manifest.json which can have ambiguous keys
  const clientChunksBySource = new Map<string, { fileName: string; imports: string[] }>()
  if (vxrnOutput.clientOutput) {
    for (const chunk of vxrnOutput.clientOutput) {
      if (chunk.type === 'chunk' && chunk.facadeModuleId) {
        clientChunksBySource.set(chunk.facadeModuleId, {
          fileName: chunk.fileName,
          imports: chunk.imports || [],
        })
      }
    }
  }

  const outputEntries = [...vxrnOutput.serverOutput.entries()]

  // build a map of layout contextKey -> server output fileName
  // this is used to run layout loaders in production
  const layoutServerPaths = new Map<string, string>()
  for (const [, output] of outputEntries) {
    if (output.type === 'asset') continue
    const id = output.facadeModuleId || ''
    const file = Path.basename(id)
    // layout files start with _layout
    if (file.startsWith('_layout') && id.includes(`/${routerRoot}/`)) {
      // contextKey format is "./_layout.tsx" or "./subdir/_layout.tsx"
      const relativePath = normalizePath(relative(process.cwd(), id)).replace(
        `${routerRoot}/`,
        ''
      )
      const contextKey = `./${relativePath}`
      layoutServerPaths.set(contextKey, output.fileName)
    }
  }

  // build a map for O(1) route lookups instead of O(n) find per route
  const routeByPath = new Map<string, RouteInfo<string>>()
  for (const route of manifest.pageRoutes) {
    if (route.file) {
      const routePath = `${routerRoot}${route.file.slice(1)}`
      routeByPath.set(routePath, route)
    }
  }

  // collect assets from output
  for (const [, output] of outputEntries) {
    if (output.type === 'asset') {
      assets.push(output)
    }
  }

  // build a map from module ID to server chunk for route matching
  // when experimentalMinChunkSize merges chunks, facadeModuleId only reflects
  // one module. we check ALL moduleIds in each chunk to find routes.
  const moduleIdToServerChunk = new Map<string, string>()
  for (const [, output] of outputEntries) {
    if (output.type === 'asset') continue
    const moduleIds =
      output.moduleIds || (output.facadeModuleId ? [output.facadeModuleId] : [])
    for (const moduleId of moduleIds) {
      moduleIdToServerChunk.set(moduleId, output.fileName)
    }
  }

  // iterate over routes (not chunks) to ensure all SSG routes are processed
  // even when experimentalMinChunkSize merges their chunks
  for (const foundRoute of manifest.pageRoutes) {
    if (!foundRoute.file) {
      continue
    }

    // resolve the full module path for this route
    const routeModulePath = normalizePath(
      join(resolve(process.cwd(), options.root), routerRoot, foundRoute.file.slice(2))
    )

    // find the server chunk containing this route
    const serverFileName = moduleIdToServerChunk.get(routeModulePath)
    if (!serverFileName) {
      // SPA routes may not have server chunks - that's expected
      if (foundRoute.type === 'spa') {
        continue
      }
      console.warn(`[one] No server chunk found for route: ${foundRoute.file}`)
      continue
    }

    const onlyBuild = vxrnOutput.buildArgs?.only
    if (onlyBuild) {
      const relativeId = foundRoute.file.slice(1)
      if (!MicroMatch.contains(relativeId, onlyBuild)) {
        continue
      }
    }

    // look up client chunk directly by source file path (from rollup output)
    const clientChunk = clientChunksBySource.get(routeModulePath)

    // also look up in manifest for additional info (css, nested imports, etc)
    const manifestKey = `${routerRoot}${foundRoute.file.slice(1)}`
    const clientManifestEntry = vxrnOutput.clientManifest[manifestKey]

    // SPA and SSG routes may not have client chunks - that's expected
    if (!clientChunk && foundRoute.type !== 'spa' && foundRoute.type !== 'ssg') {
      console.warn(`No client chunk found for route: ${routeModulePath}`)
      continue
    }

    foundRoute.loaderServerPath = serverFileName

    // relativeId is used for logging and path generation
    // foundRoute.file starts with "./" but getPathnameFromFilePath expects "/" prefix
    const relativeId = foundRoute.file.replace(/^\.\//, '/')

    // attach layout server paths for running layout loaders in production
    if (foundRoute.layouts) {
      for (const layout of foundRoute.layouts) {
        const serverPath = layoutServerPaths.get(layout.contextKey)
        if (serverPath) {
          layout.loaderServerPath = serverPath
        }
      }
    }

    function collectImports(
      entry: ClientManifestEntry,
      { type = 'js' }: { type?: 'js' | 'css' } = {}
    ): string[] {
      const { imports = [], css } = entry
      // use entry.file as cache key (unique per manifest entry)
      const cacheKey = `${entry.file || imports.join(',')}:${type}`
      const cached = collectImportsCache.get(cacheKey)
      if (cached) return cached

      const result = [
        ...new Set(
          [
            ...(type === 'js' ? imports : css || []),
            ...imports.flatMap((name) => {
              const found = vxrnOutput!.clientManifest[name]
              if (!found) {
                console.warn(`No found imports`, name, vxrnOutput!.clientManifest)
              }
              return collectImports(found, { type })
            }),
          ]
            .flat()
            .filter((x) => x && (type === 'css' || x.endsWith('.js')))
            .map((x) =>
              type === 'css' ? x : x.startsWith('assets/') ? x : `assets/${x.slice(1)}`
            )
        ),
      ]
      collectImportsCache.set(cacheKey, result)
      return result
    }

    const entryImports = collectImports(clientManifestEntry || {})

    // TODO isn't this getting all layouts not just the ones for this route?
    const layoutEntries =
      foundRoute.layouts?.flatMap((layout) => {
        const clientKey = `${routerRoot}${layout.contextKey.slice(1)}`
        const found = vxrnOutput.clientManifest[clientKey]
        return found ? found : []
      }) ?? []

    const layoutImports = layoutEntries.flatMap((entry) => {
      return [entry.file, ...collectImports(entry)]
    })

    // create mapping of route keys to bundle paths for hydration preloading
    const routePreloads: Record<string, string> = {}

    // add root layout
    const rootLayoutKey = `${routerRoot}/_layout.tsx`
    const rootLayoutEntry = vxrnOutput.clientManifest[rootLayoutKey]
    if (rootLayoutEntry) {
      routePreloads[`/${rootLayoutKey}`] = `/${rootLayoutEntry.file}`
    }

    // add all layouts for this route
    if (foundRoute.layouts) {
      for (const layout of foundRoute.layouts) {
        const clientKey = `${routerRoot}${layout.contextKey.slice(1)}`
        const entry = vxrnOutput.clientManifest[clientKey]
        if (entry) {
          routePreloads[`/${clientKey}`] = `/${entry.file}`
        }
      }
    }

    // add the page itself using the direct chunk lookup (more reliable than manifest)
    if (clientChunk) {
      const routeKey = `/${routerRoot}${foundRoute.file.slice(1)}`
      routePreloads[routeKey] = `/${clientChunk.fileName}`
    } else if (clientManifestEntry) {
      // fallback to manifest if no chunk (shouldn't happen normally)
      const routeKey = `/${routerRoot}${foundRoute.file.slice(1)}`
      routePreloads[routeKey] = `/${clientManifestEntry.file}`
    }

    const preloadSetupFilePreloads = (() => {
      if (!oneOptions.setupFile) return []

      // Get the client setup file path
      const clientSetupFile =
        typeof oneOptions.setupFile === 'string'
          ? oneOptions.setupFile
          : oneOptions.setupFile.client

      if (!clientSetupFile) return []

      const needle = clientSetupFile.replace(/^\.\//, '')
      for (const file in vxrnOutput.clientManifest) {
        if (file === needle) {
          const entry = vxrnOutput.clientManifest[file]
          return [
            entry.file as string,
            // getting 404s for preloading the imports as well?
            // ...(entry.imports as string[])
          ]
        }
      }

      return []
    })()

    // All preloads combined (original behavior)
    const allPreloads = [
      ...new Set([
        ...preloadSetupFilePreloads,
        // add the route entry js (like ./app/index.ts) - prefer direct chunk lookup
        ...(clientChunk
          ? [clientChunk.fileName]
          : clientManifestEntry
            ? [clientManifestEntry.file]
            : []),
        // add the virtual entry
        vxrnOutput.clientManifest['virtual:one-entry'].file,
        ...entryImports,
        ...layoutImports,
      ]),
    ].map((path) => `/${path}`)

    // Check experimental script loading mode
    const scriptLoadingMode = oneOptions.web?.experimental_scriptLoading

    // Modes that need separated critical/deferred preloads
    const useDeferredLoading = scriptLoadingMode === 'defer-non-critical'
    const useAggressiveLCP = scriptLoadingMode === 'after-lcp-aggressive'
    const needsSeparatedPreloads = useDeferredLoading || useAggressiveLCP

    // Critical: scripts that must execute immediately (entry points, layouts)
    const criticalPreloads = needsSeparatedPreloads
      ? [
          ...new Set([
            ...preloadSetupFilePreloads,
            // add the virtual entry (framework bootstrap)
            vxrnOutput.clientManifest['virtual:one-entry'].file,
            // add the route entry js (like ./app/index.ts) - prefer direct chunk lookup
            ...(clientChunk
              ? [clientChunk.fileName]
              : clientManifestEntry
                ? [clientManifestEntry.file]
                : []),
            // add layout files (but not their deep imports)
            ...layoutEntries.map((entry) => entry.file),
          ]),
        ].map((path) => `/${path}`)
      : undefined

    // Non-critical: component imports, utilities - will be modulepreload hints only
    const deferredPreloads = needsSeparatedPreloads
      ? [
          ...new Set([
            ...entryImports,
            ...layoutEntries.flatMap((entry) => collectImports(entry)),
          ]),
        ]
          .filter((path) => !criticalPreloads!.includes(`/${path}`))
          .map((path) => `/${path}`)
      : undefined

    // Use all preloads when not using deferred loading
    const preloads = needsSeparatedPreloads
      ? [...criticalPreloads!, ...deferredPreloads!]
      : allPreloads

    const allEntries = [clientManifestEntry, ...layoutEntries].filter(Boolean)

    // layout css (from layout entries) - should load before scripts to prevent FOUC
    const layoutCSS = [
      ...new Set(
        layoutEntries
          .flatMap((entry) => collectImports(entry, { type: 'css' }))
          .map((path) => `/${path}`)
      ),
    ]

    // all css including page entry and root-level css
    const allCSS = [
      ...new Set([
        ...layoutCSS,
        // css from page entry
        ...(clientManifestEntry
          ? collectImports(clientManifestEntry, { type: 'css' }).map((path) => `/${path}`)
          : []),
        // root-level css for cssCodeSplit: false (vite emits a single
        // top-level `style.css` entry whose `src` equals `style.css`). when
        // cssCodeSplit is true (default), the manifest also contains a
        // per-component css entry for every chunk that ships any css — those
        // are owned by their JS chunk and must NOT be injected globally, or
        // every SSG page ends up preloading every css chunk in the project
        // (the prod /download was loading 23 stylesheets with editor/IDE
        // chunks despite being a marketing route).
        ...Object.entries(vxrnOutput.clientManifest)
          .filter(([key, entry]) => {
            if (!key.endsWith('.css')) return false
            const src = (entry as ClientManifestEntry & { src?: string }).src
            // bundled-merge css from cssCodeSplit: false uses `src: "style.css"`.
            return src === 'style.css'
          })
          .map(([, entry]) => `/${(entry as ClientManifestEntry).file}`),
      ]),
    ]

    // check if any css needs inlining (inlineLayoutCSS option or .inline.css imports)
    const hasCriticalCSS = allCSS.some((p) => criticalCSSOutputPaths.has(p))
    const needsCSSContents = oneOptions.web?.inlineLayoutCSS || hasCriticalCSS

    // read css file contents for inlining (with caching)
    let allCSSContents: string[] | undefined
    if (needsCSSContents) {
      allCSSContents = await Promise.all(
        allCSS.map(async (cssPath) => {
          // only read contents for css that should be inlined:
          // - all css when inlineLayoutCSS is enabled
          // - only .inline.css otherwise
          if (!oneOptions.web?.inlineLayoutCSS && !criticalCSSOutputPaths.has(cssPath)) {
            return ''
          }

          // check cache first
          const cached = cssFileContentsCache.get(cssPath)
          if (cached !== undefined) return cached

          const filePath = join(clientDir, cssPath)
          try {
            const content = await FSExtra.readFile(filePath, 'utf-8')
            cssFileContentsCache.set(cssPath, content)
            return content
          } catch (err) {
            console.warn(`[one] Warning: Could not read CSS file ${filePath}`)
            cssFileContentsCache.set(cssPath, '')
            return ''
          }
        })
      )
    }

    if (process.env.DEBUG) {
      console.info('[one] building routes', {
        foundRoute,
        layoutEntries,
        allEntries,
        allCSS,
      })
    }

    // posix so downstream `.includes('${outDir}/server')` substring checks match on Windows
    const serverJsPath = posix.join(outDir, 'server', serverFileName)

    let exported
    try {
      exported = await import(toAbsoluteUrl(serverJsPath))
    } catch (err) {
      console.error(`Error importing page (original error)`, err)
      // err cause not showing in vite or something
      throw new Error(`Error importing page: ${serverJsPath}`, {
        cause: err,
      })
    }

    // record whether this route exports a loader. the worker checks this and
    // skips importing the page bundle for loader requests on routes with no
    // loader — otherwise workerd may crash evaluating RN/Tamagui deps.
    foundRoute.hasLoader = typeof exported.loader === 'function'

    const isDynamic = !!Object.keys(foundRoute.routeKeys).length

    if (
      foundRoute.type === 'ssg' &&
      isDynamic &&
      !foundRoute.page.includes('+not-found') &&
      !foundRoute.page.includes('_sitemap') &&
      !exported.generateStaticParams
    ) {
      throw new Error(`[one] Error: Missing generateStaticParams

  Route ${foundRoute.page} of type ${foundRoute.type} must export generateStaticParams so build can complete.

  See docs on generateStaticParams:
    https://onestack.dev/docs/routing-exports#generatestaticparams

`)
    }

    const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Record<
      string,
      string
    >[]

    console.info(`\n [build] page ${relativeId} (with ${paramsList.length} routes)\n`)

    if (process.env.DEBUG) {
      console.info(`paramsList`, JSON.stringify(paramsList, null, 2))
    }

    // Get route-level sitemap export if present
    const routeSitemapExport = exported.sitemap as One.RouteSitemap | undefined

    // Determine if after-lcp script loading should be used for this route
    // Only applies to SSG pages (SPA pages need JS to render anything)
    const isAfterLCPMode =
      scriptLoadingMode === 'after-lcp' || scriptLoadingMode === 'after-lcp-aggressive'
    const useAfterLCP = foundRoute.type === 'ssg' && isAfterLCPMode
    const useAfterLCPAggressive =
      foundRoute.type === 'ssg' && scriptLoadingMode === 'after-lcp-aggressive'

    // determine if this route can be built in parallel
    // routes that use sitemap exports or have side effects should be sequential
    const shouldCollectSitemap =
      foundRoute.type !== 'api' &&
      foundRoute.type !== 'layout' &&
      !foundRoute.isNotFound &&
      !foundRoute.page.includes('+not-found') &&
      !foundRoute.page.includes('_sitemap')

    // build pages in parallel with concurrency limit (or workers if enabled)
    const pageBuilds = paramsList.map((params) => {
      const path = getPathnameFromFilePath(relativeId, params, foundRoute.type === 'ssg')

      // use worker pool for true multicore parallelism if enabled
      if (workerPool) {
        console.info(`  ↦ route ${path}`)
        return workerPool
          .buildPage({
            serverEntry: vxrnOutput.serverEntry,
            path,
            relativeId,
            params,
            foundRoute,
            clientManifestEntry,
            staticDir,
            clientDir,
            builtMiddlewares,
            serverJsPath,
            preloads,
            allCSS,
            layoutCSS,
            routePreloads,
            allCSSContents,
            criticalPreloads,
            deferredPreloads,
            useAfterLCP,
            useAfterLCPAggressive,
          })
          .then((built) => ({ built, path }))
          .catch((err) => {
            console.warn(`  ⚠ skipping page ${path}: ${err.message}`)
            return null
          })
      }

      // fallback to pLimit for async parallelism
      return limit(async () => {
        console.info(`  ↦ route ${path}`)

        try {
          const built = await runWithAsyncLocalContext(async () => {
            return await buildPage(
              vxrnOutput.serverEntry,
              path,
              relativeId,
              params,
              foundRoute,
              clientManifestEntry,
              staticDir,
              clientDir,
              builtMiddlewares,
              serverJsPath,
              preloads,
              allCSS,
              layoutCSS,
              routePreloads,
              allCSSContents,
              criticalPreloads,
              deferredPreloads,
              useAfterLCP,
              useAfterLCPAggressive
            )
          })

          return { built, path }
        } catch (err: any) {
          console.warn(`  ⚠ skipping page ${path}: ${err.message}`)
          return null
        }
      })
    })

    const results = (await Promise.all(pageBuilds)).filter(Boolean) as {
      built: any
      path: string
    }[]

    for (const { built, path } of results) {
      builtRoutes.push(built)

      // Collect sitemap data for page routes (exclude API, not-found, layouts)
      if (shouldCollectSitemap) {
        sitemapData.push({
          path,
          routeExport: routeSitemapExport,
        })
      }
    }
  }

  // terminate worker pool if used
  if (workerPool) {
    await terminateWorkerPool()
  }

  const staticTime = performance.now() - staticStartTime
  console.info(
    `\n ⏱️ static routes: ${(staticTime / 1000).toFixed(2)}s (${builtRoutes.length} pages)\n`
  )
  printBuildTimings()

  // once done building static we can move it to client dir:
  await moveAllFiles(staticDir, clientDir)
  await FSExtra.rm(staticDir, { force: true, recursive: true })

  // write out the static paths (pathname => html) for the server
  const routeMap: Record<string, string> = {}
  const routeToBuildInfo: Record<string, Omit<One.RouteBuildInfo, 'loaderData'>> = {}
  const pathToRoute: Record<string, string> = {}
  const preloads: Record<string, boolean> = {}
  const cssPreloads: Record<string, boolean> = {}
  const loaders: Record<string, boolean> = {}

  for (const route of builtRoutes) {
    if (!route.cleanPath.includes('*')) {
      routeMap[route.cleanPath] = route.htmlPath
    }
    const {
      // dont include loaderData it can be huge
      loaderData: _loaderData,
      ...rest
    } = route

    routeToBuildInfo[route.routeFile] = rest
    for (const p of getCleanPaths([route.path, route.cleanPath])) {
      pathToRoute[p] = route.routeFile
    }
    preloads[route.preloadPath] = true
    cssPreloads[route.cssPreloadPath] = true
    loaders[route.loaderPath] = true
  }

  function createBuildManifestRoute(route: RouteInfo) {
    // remove the full layouts (they're huge with all children), but keep minimal info
    // needed for running layout loaders in production
    const { layouts, ...built } = route

    // keep simplified layout info for loader execution
    if (layouts?.length) {
      ;(built as any).layouts = layouts.map((layout) => ({
        contextKey: layout.contextKey,
        loaderServerPath: (layout as any).loaderServerPath,
      }))
    }

    // swap out for the built middleware path.
    // page routes have compiled middleware paths attached via buildPage
    // (buildInfo.middlewares). api routes don't go through buildPage, so fall
    // back to the builtMiddlewares map keyed by the middleware source file.
    const buildInfo = builtRoutes.find((x) => x.routeFile === route.file)
    if (built.middlewares) {
      for (const [index, mw] of built.middlewares.entries()) {
        const viaBuildInfo = buildInfo?.middlewares?.[index]
        if (viaBuildInfo) {
          mw.contextKey = viaBuildInfo
          continue
        }
        const viaMiddlewareMap = builtMiddlewares[mw.contextKey]
        if (viaMiddlewareMap) {
          mw.contextKey = viaMiddlewareMap
        }
      }
    }

    if (buildInfo) {
      built.loaderPath = buildInfo.loaderPath
    }

    return built
  }

  const buildInfoForWriting: One.BuildInfo = {
    outDir,
    oneOptions,
    routeToBuildInfo,
    pathToRoute,
    manifest: {
      pageRoutes: manifest.pageRoutes.map(createBuildManifestRoute),
      apiRoutes: manifest.apiRoutes.map(createBuildManifestRoute),
      allRoutes: manifest.allRoutes.map(createBuildManifestRoute),
    },
    routeMap,
    constants: JSON.parse(JSON.stringify({ ...constants })) as any,
    preloads,
    cssPreloads,
    loaders,
    useRolldown: await isRolldown(),
  }

  await writeJSON(toAbsolute(`${outDir}/buildInfo.json`), buildInfoForWriting)

  // emit version.json for skew protection polling
  await FSExtra.writeFile(
    join(clientDir, 'version.json'),
    JSON.stringify({ version: constants.CACHE_KEY })
  )
  console.info(`\n 🛡 skew protection: emitted version.json\n`)

  // Generate sitemap.xml if enabled
  const sitemapConfig = oneOptions.web?.sitemap
  if (sitemapConfig) {
    const sitemapOptions: One.SitemapOptions =
      typeof sitemapConfig === 'boolean' ? {} : sitemapConfig

    const sitemapXml = generateSitemap(sitemapData, sitemapOptions)
    const sitemapPath = join(clientDir, 'sitemap.xml')
    await FSExtra.writeFile(sitemapPath, sitemapXml)
    console.info(`\n 📄 generated sitemap.xml (${sitemapData.length} URLs)\n`)
  }

  const postBuildLogs: string[] = []

  const platform = deployConfig?.target

  if (platform) {
    postBuildLogs.push(`[one.build] platform ${platform}`)
  }

  switch (platform) {
    case 'vercel': {
      // Check for cleanUrls in vercel.json - required for SSG direct URL access
      const vercelJsonPath = join(options.root, 'vercel.json')
      if (FSExtra.existsSync(vercelJsonPath)) {
        try {
          const vercelConfig = JSON.parse(FSExtra.readFileSync(vercelJsonPath, 'utf-8'))
          if (!vercelConfig.cleanUrls) {
            console.warn(`\n ⚠️  Warning: Your vercel.json is missing "cleanUrls": true`)
            console.warn(`    Without this, direct navigation to SSG pages will 404.`)
            console.warn(`    Add "cleanUrls": true to your vercel.json to fix this.\n`)
          }
        } catch {
          // ignore parse errors
        }
      }

      await buildVercelOutputDirectory({
        apiOutput,
        buildInfoForWriting,
        clientDir,
        oneOptionsRoot: options.root,
        postBuildLogs,
      })

      break
    }

    case 'cloudflare': {
      // Generate lazy import functions - modules load on-demand, not all upfront
      // The worker config keeps route modules separate so they can stay lazy.
      const workerSrcDir = join(options.root, outDir)
      const getWorkerSourceImportPath = (routeFile: string) => {
        const importPath = normalizePath(
          relative(workerSrcDir, join(options.root, routerRoot, routeFile))
        )
        return importPath.startsWith('.') ? importPath : `./${importPath}`
      }
      const pageRouteMap: string[] = []
      const apiRouteMap: string[] = []
      const middlewareRouteMap: string[] = []

      // Generate lazy imports for SSR/SSG page server bundles
      for (const [routeFile, info] of Object.entries(
        buildInfoForWriting.routeToBuildInfo
      )) {
        if (info.serverJsPath) {
          const importPath =
            './' + info.serverJsPath.replace(new RegExp(`^${outDir}/`), '')
          pageRouteMap.push(`  '${routeFile}': () => import('${importPath}')`)
        }
      }

      // Generate lazy imports for API routes
      for (const route of buildInfoForWriting.manifest.apiRoutes) {
        if (route.file) {
          // Import API routes from source so the Cloudflare plugin can apply its
          // own unenv/CJS transforms instead of re-bundling pre-built chunks.
          const importPath = getWorkerSourceImportPath(route.file)
          apiRouteMap.push(`  '${route.page}': () => import('${importPath}')`)
        }
      }

      // Generate lazy imports for middlewares
      // Keep the built output path as the lookup key, but import the source
      // file so the plugin owns the middleware dependency graph too.
      for (const [sourceFile, builtPath] of Object.entries(builtMiddlewares)) {
        const importPath = getWorkerSourceImportPath(sourceFile)
        middlewareRouteMap.push(`  '${builtPath}': () => import('${importPath}')`)
      }

      const workerSrcPath = join(options.root, outDir, '_worker-src.js')
      const workerCode = `// Polyfill MessageChannel for React SSR (not available in Cloudflare Workers by default)
if (typeof MessageChannel === 'undefined') {
  globalThis.MessageChannel = class MessageChannel {
    constructor() {
      this.port1 = { postMessage: () => {}, onmessage: null, close: () => {} }
      this.port2 = { postMessage: () => {}, onmessage: null, close: () => {} }
    }
  }
}

import { serve, setFetchStaticHtml } from 'one/serve-worker'

// Lazy import map - modules load on-demand when route is matched
const lazyRoutes = {
  serverEntry: () => import('./server/_virtual_one-entry.js'),
  pages: {
${pageRouteMap.join(',\n')}
  },
  api: {
${apiRouteMap.join(',\n')}
  },
  middlewares: {
${middlewareRouteMap.join(',\n')}
  }
}

const buildInfo = ${JSON.stringify(buildInfoForWriting)}

let server

export default {
  async fetch(request, env, ctx) {
    if (!server) {
      server = await serve(buildInfo, lazyRoutes)
    }

    // set up static HTML fetcher for this request (uses ASSETS binding)
    if (env.ASSETS) {
      setFetchStaticHtml(async (path) => {
        try {
          const url = new URL(request.url)
          url.pathname = path
          const assetResponse = await env.ASSETS.fetch(new Request(url))
          if (assetResponse && assetResponse.ok) {
            return await assetResponse.text()
          }
        } catch (e) {
          // asset not found
        }
        return null
      })
    }

    try {
      const response = await server.fetch(request, env, ctx)

      // no route matched or 404 → try static assets
      if (!response || response.status === 404) {
        if (env.ASSETS) {
          try {
            const assetResponse = await env.ASSETS.fetch(request)
            if (assetResponse && assetResponse.status !== 404) {
              return assetResponse
            }
          } catch (e) {
            // asset not found, continue with original response
          }
        }
      }

      return response
    } finally {
      setFetchStaticHtml(null)
    }
  }
}
`
      await FSExtra.writeFile(workerSrcPath, workerCode)

      const projectName = await getCloudflareProjectName(options.root)
      const userWranglerConfig = await loadUserWranglerConfig(options.root)
      const wranglerInputConfig = createCloudflareWranglerConfig(
        projectName,
        userWranglerConfig?.config
      )
      // serialized wrangler config is diffed cross-platform; keep forward-slash
      wranglerInputConfig.main = normalizePath(
        relative(join(options.root, outDir), workerSrcPath)
      )

      const wranglerInputPath = join(options.root, outDir, '_wrangler.input.jsonc')
      await FSExtra.writeFile(
        wranglerInputPath,
        `${JSON.stringify(wranglerInputConfig, null, 2)}\n`
      )

      // Bundle the worker using Cloudflare's Vite plugin so we pick up unenv
      // polyfills and esmExternalRequirePlugin for Node-first CJS deps.
      console.info('\n [cloudflare] Bundling worker...')
      const { cloudflare } = await import('@cloudflare/vite-plugin')
      const builder = await createBuilder({
        root: options.root,
        mode: 'production',
        logLevel: 'warn',
        configFile: false,
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
          'process.env.VITE_ENVIRONMENT': JSON.stringify('ssr'),
          'process.env.ONE_CACHE_KEY': JSON.stringify(constants.CACHE_KEY),
        },
        plugins: [
          cloudflare({
            configPath: wranglerInputPath,
            viteEnvironment: { name: 'worker' },
          }),
        ],
        resolve: {
          alias: [
            // rolldown can't parse react-native's Flow syntax; alias to react-native-web for ssr
            {
              find: /^react-native\/Libraries\/.*/,
              replacement: resolvePath('@vxrn/vite-plugin-metro/empty', options.root),
            },
            {
              find: 'react-native/package.json',
              replacement: resolvePath('react-native-web/package.json', options.root),
            },
            {
              find: 'react-native',
              replacement: resolvePath('react-native-web', options.root),
            },
            {
              find: 'react-native-safe-area-context',
              replacement: resolvePath('@vxrn/safe-area', options.root),
            },
          ],
        },
        build: {
          outDir,
          emptyOutDir: false,
          rolldownOptions: {
            // Match the main web build behavior so RN packages that import
            // native-only symbols from react-native can still bundle against
            // the react-native-web alias in the worker graph.
            shimMissingExports: true,
          },
        },
      })
      const workerEnv = builder.environments.worker
      if (!workerEnv) {
        throw new Error('[one] plugin did not register "worker" environment')
      }
      await builder.build(workerEnv)

      // Clean up temp file
      await FSExtra.remove(workerSrcPath)
      await FSExtra.remove(wranglerInputPath)

      if (userWranglerConfig) {
        console.info(
          ` [cloudflare] Merging ${relative(options.root, userWranglerConfig.path)} into ${outDir}/worker/wrangler.json`
        )
      }

      postBuildLogs.push(`Cloudflare worker bundled at ${outDir}/worker/index.js`)
      postBuildLogs.push(`To deploy: cd ${outDir}/worker && wrangler deploy`)

      break
    }
  }

  // security scan for leaked secrets in client bundles
  const securityScanOption = oneOptions.build?.securityScan
  // default to 'warn', normalize all forms
  const securityScanLevel: 'warn' | 'error' | null =
    securityScanOption === false
      ? null
      : securityScanOption === true || securityScanOption === undefined
        ? 'warn'
        : typeof securityScanOption === 'string'
          ? securityScanOption
          : (securityScanOption.level ?? 'warn')

  const securitySafePatterns =
    typeof securityScanOption === 'object' && securityScanOption !== null
      ? securityScanOption.safePatterns
      : undefined

  if (securityScanLevel) {
    const { runSecurityScan } = await import('./securityScan')
    const passed = await runSecurityScan(
      clientDir,
      securityScanLevel,
      securitySafePatterns
    )
    if (!passed) {
      process.exit(1)
    }
  }

  if (postBuildLogs.length) {
    console.info(`\n\n`)
    postBuildLogs.forEach((log) => {
      console.info(`  · ${log}`)
    })
  }

  console.info(`\n 💛 build complete\n`)
}

const TRAILING_INDEX_REGEX = /\/index(\.(web))?/
function getCleanPaths(possiblePaths: Array<string>) {
  return Array.from(
    new Set(
      Array.from(new Set(possiblePaths)).flatMap((p) => {
        const paths = [p]

        if (p.match(TRAILING_INDEX_REGEX)) {
          const pathWithTrailingIndexRemoved = p.replace(TRAILING_INDEX_REGEX, '')
          paths.push(pathWithTrailingIndexRemoved)
          paths.push(pathWithTrailingIndexRemoved + '/')
        }

        return paths
      })
    )
  )
}

async function moveAllFiles(src: string, dest: string) {
  try {
    await FSExtra.copy(src, dest, { overwrite: true, errorOnExist: false })
  } catch (err) {
    console.error('Error moving files:', err)
  }
}
