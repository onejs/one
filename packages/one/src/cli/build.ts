import { createRequire } from 'node:module'
import { cpus } from 'node:os'
import Path, { join, relative, resolve } from 'node:path'
import FSExtra from 'fs-extra'
import MicroMatch from 'micromatch'
import type { OutputAsset, RollupOutput } from 'rollup'
import { type InlineConfig, mergeConfig, build as viteBuild } from 'vite'
import {
  type ClientManifestEntry,
  fillOptions,
  getOptimizeDeps,
  loadEnv,
  rollupRemoveUnusedImportsPlugin,
  build as vxrnBuild,
} from 'vxrn'

import * as constants from '../constants'
import { setServerGlobals } from '../server/setServerGlobals'
import { getPathnameFromFilePath } from '../utils/getPathnameFromFilePath'
import { getRouterRootFromOneOptions } from '../utils/getRouterRootFromOneOptions'
import { isRolldown } from '../utils/isRolldown'
import { toAbsolute } from '../utils/toAbsolute'
import { buildVercelOutputDirectory } from '../vercel/build/buildVercelOutputDirectory'
import { getManifest } from '../vite/getManifest'
import { loadUserOneOptions } from '../vite/loadConfig'
import { runWithAsyncLocalContext } from '../vite/one-server-only'
import type { One, RouteInfo } from '../vite/types'
import { buildPage, printBuildTimings } from './buildPage'
import { checkNodeVersion } from './checkNodeVersion'
import { getWorkerPool, terminateWorkerPool } from './workerPool'
import { generateSitemap, type RouteSitemapData } from './generateSitemap'
import { labelProcess } from './label-process'
import { pLimit } from '../utils/pLimit'

const { ensureDir, writeJSON } = FSExtra

// concurrency limit for parallel page builds
// can be overridden with ONE_BUILD_CONCURRENCY env var
// default based on CPU count for I/O parallelism benefits
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

process.on('uncaughtException', (err) => {
  console.error(err?.message || err)
})

export async function build(args: {
  step?: string
  only?: string
  platform?: 'ios' | 'web' | 'android'
}) {
  process.env.IS_VXRN_CLI = 'true'

  // set NODE_ENV, do before loading vite.config (see loadConfigFromFile)
  process.env.NODE_ENV = 'production'

  labelProcess('build')
  checkNodeVersion()
  setServerGlobals()

  const { oneOptions } = await loadUserOneOptions('build')
  const routerRoot = getRouterRootFromOneOptions(oneOptions)

  // Set defaultRenderMode env var so getManifest knows the correct route types
  if (oneOptions.web?.defaultRenderMode) {
    process.env.ONE_DEFAULT_RENDER_MODE = oneOptions.web.defaultRenderMode
  }

  const manifest = getManifest({ routerRoot })!

  const serverOutputFormat =
    oneOptions.build?.server === false
      ? 'esm'
      : (oneOptions.build?.server?.outputFormat ?? 'esm')

  const buildStartTime = performance.now()

  const vxrnOutput = await vxrnBuild(
    {
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
  console.info(`\n ⏱️  vite bundle: ${(bundleTime / 1000).toFixed(2)}s\n`)

  if (!vxrnOutput || args.platform !== 'web') {
    return
  }

  const options = await fillOptions(vxrnOutput.options, { mode: 'prod' })

  const { optimizeDeps } = getOptimizeDeps('build')

  const apiBuildConfig = mergeConfig(
    // feels like this should build off the *server* build config not web
    vxrnOutput.webBuildConfig,
    {
      configFile: false,
      appType: 'custom',
      optimizeDeps,
    } satisfies InlineConfig
  )

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

      // plugins: [
      //   nodeExternals({
      //     exclude: optimizeDeps.include,
      //   }) as any,
      // ],

      define: {
        ...vxrnOutput!.processEnvDefines,
      },

      ssr: {
        noExternal: true,
        external: ['react', 'react-dom'],
        optimizeDeps,
      },

      build: {
        ssr: true,
        emptyOutDir: false,
        outDir: `dist/${subFolder}`,
        copyPublicDir: false,
        minify: false,
        rollupOptions: {
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
          external: (id) => false,
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
                    return Path.join(dir, `${name}-[hash].cjs`)
                  },
                  assetFileNames: (assetInfo) => {
                    const name = assetInfo.name ?? ''
                    const dir = Path.dirname(name)
                    const baseName = Path.basename(name, Path.extname(name))
                    const ext = Path.extname(name)
                    return Path.join(dir, `${baseName}-[hash]${ext}`)
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

    return output as RollupOutput
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
      const fullPath = join(absoluteRoot, routerRoot, middleware.file)
      const outChunks = middlewareBuildInfo.output.filter((x) => x.type === 'chunk')
      const chunk = outChunks.find((x) => x.facadeModuleId === fullPath)
      if (!chunk) throw new Error(`internal err finding middleware`)
      builtMiddlewares[middleware.file] = join('dist', 'middlewares', chunk.fileName)
    }
  }

  // for the require Sitemap in getRoutes
  globalThis['require'] = createRequire(join(import.meta.url, '..'))

  const assets: OutputAsset[] = []

  const builtRoutes: One.RouteBuildInfo[] = []
  const sitemapData: RouteSitemapData[] = []

  // caches for expensive operations
  const collectImportsCache = new Map<string, string[]>()
  const cssFileContentsCache = new Map<string, string>()

  // concurrency limiter for parallel page builds
  const limit = pLimit(BUILD_CONCURRENCY)

  // initialize worker pool if enabled (default: true)
  const useWorkers = shouldUseWorkers(oneOptions)
  const workerPool = useWorkers ? getWorkerPool(BUILD_CONCURRENCY) : null
  if (workerPool) {
    await workerPool.initialize()
  }

  const staticStartTime = performance.now()
  const modeLabel = useWorkers
    ? `workers: ${workerPool?.size}`
    : `concurrency: ${BUILD_CONCURRENCY}`
  console.info(`\n 🔨 build static routes (${modeLabel})\n`)

  const staticDir = join(`dist/static`)
  const clientDir = join(`dist/client`)
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
      const relativePath = relative(process.cwd(), id).replace(`${routerRoot}/`, '')
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

  for (const [index, output] of outputEntries) {
    if (output.type === 'asset') {
      assets.push(output)
      continue
    }

    const id = output.facadeModuleId || ''
    const file = Path.basename(id)

    if (!id || file[0] === '_' || file.includes('entry-server')) {
      continue
    }
    if (id.includes('+api')) {
      continue
    }

    // temp we should use manifest but lets just filter out non-app dir stuff
    if (!id.includes(`/${routerRoot}/`)) {
      continue
    }

    const relativeId = relative(process.cwd(), id).replace(`${routerRoot}/`, '/')

    const onlyBuild = vxrnOutput.buildArgs?.only
    if (onlyBuild) {
      if (!MicroMatch.contains(relativeId, onlyBuild)) {
        continue
      }
    }

    // Match route by server output id against manifest.pageRoutes (O(1) lookup)
    let foundRoute: RouteInfo<string> | undefined
    for (const [routePath, route] of routeByPath) {
      if (id.endsWith(routePath)) {
        foundRoute = route
        break
      }
    }

    if (!foundRoute) {
      continue
    }

    // look up client chunk directly by source file path (from rollup output)
    // this is more reliable than the manifest.json which can have ambiguous keys
    const clientChunk = clientChunksBySource.get(id)

    // also look up in manifest for additional info (css, nested imports, etc)
    const manifestKey = `${routerRoot}${foundRoute.file.slice(1)}`
    const clientManifestEntry = vxrnOutput.clientManifest[manifestKey]

    // SPA and SSG routes may not have client chunks - that's expected
    if (!clientChunk && foundRoute.type !== 'spa' && foundRoute.type !== 'ssg') {
      console.warn(`No client chunk found for route: ${id}`)
      continue
    }

    foundRoute.loaderServerPath = output.fileName

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
    const allCSS = allEntries
      .flatMap((entry) => collectImports(entry, { type: 'css' }))
      // nested path pages need to reference root assets
      .map((path) => `/${path}`)

    // Read CSS file contents if inlineLayoutCSS is enabled (with caching)
    let allCSSContents: string[] | undefined
    if (oneOptions.web?.inlineLayoutCSS) {
      allCSSContents = await Promise.all(
        allCSS.map(async (cssPath) => {
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

    const serverJsPath = join('dist/server', output.fileName)

    let exported
    try {
      exported = await import(toAbsolute(serverJsPath))
    } catch (err) {
      console.error(`Error importing page (original error)`, err)
      // err cause not showing in vite or something
      throw new Error(`Error importing page: ${serverJsPath}`, {
        cause: err,
      })
    }

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
            routePreloads,
            allCSSContents,
            criticalPreloads,
            deferredPreloads,
            useAfterLCP,
            useAfterLCPAggressive,
          })
          .then((built) => ({ built, path }))
      }

      // fallback to pLimit for async parallelism
      return limit(async () => {
        console.info(`  ↦ route ${path}`)

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
            routePreloads,
            allCSSContents,
            criticalPreloads,
            deferredPreloads,
            useAfterLCP,
            useAfterLCPAggressive
          )
        })

        return { built, path }
      })
    })

    const results = await Promise.all(pageBuilds)

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
    `\n ⏱️  static routes: ${(staticTime / 1000).toFixed(2)}s (${builtRoutes.length} pages)\n`
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

    // swap out for the built middleware path
    const buildInfo = builtRoutes.find((x) => x.routeFile === route.file)
    if (built.middlewares && buildInfo?.middlewares) {
      for (const [index, mw] of built.middlewares.entries()) {
        mw.contextKey = buildInfo.middlewares[index]
      }
    }

    if (buildInfo) {
      built.loaderPath = buildInfo.loaderPath
    }

    return built
  }

  const buildInfoForWriting: One.BuildInfo = {
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

  await writeJSON(toAbsolute(`dist/buildInfo.json`), buildInfoForWriting)

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

  const platform = oneOptions.web?.deploy

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
      // Uses find_additional_modules in wrangler config to keep modules separate
      const pageRouteMap: string[] = []
      const apiRouteMap: string[] = []
      const middlewareRouteMap: string[] = []

      // Generate lazy imports for SSR/SSG page server bundles
      for (const [routeFile, info] of Object.entries(
        buildInfoForWriting.routeToBuildInfo
      )) {
        if (info.serverJsPath) {
          const importPath = './' + info.serverJsPath.replace(/^dist\//, '')
          pageRouteMap.push(`  '${routeFile}': () => import('${importPath}')`)
        }
      }

      // Generate lazy imports for API routes
      for (const route of buildInfoForWriting.manifest.apiRoutes) {
        if (route.file) {
          // API files are built to dist/api/
          // route.page is like "/api/hello", files are at "dist/api/api/hello.js"
          // rolldown preserves brackets, esbuild replaces them with underscores
          const apiFileName = buildInfoForWriting.useRolldown
            ? route.page.slice(1)
            : route.page.slice(1).replace(/\[/g, '_').replace(/\]/g, '_')
          const importPath = `./api/${apiFileName}.js`
          apiRouteMap.push(`  '${route.page}': () => import('${importPath}')`)
        }
      }

      // Generate lazy imports for middlewares
      // The key must match the contextKey used to look up the middleware (e.g., "dist/middlewares/_middleware.js")
      for (const [middlewareFile, builtPath] of Object.entries(builtMiddlewares)) {
        const importPath = './' + builtPath.replace(/^dist\//, '')
        middlewareRouteMap.push(`  '${builtPath}': () => import('${importPath}')`)
      }

      const workerSrcPath = join(options.root, 'dist', '_worker-src.js')
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

let app

export default {
  async fetch(request, env, ctx) {
    if (!app) {
      app = await serve(buildInfo, lazyRoutes)
    }

    // Set up static HTML fetcher for this request (uses ASSETS binding)
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
          // Asset not found
        }
        return null
      })
    }

    try {
      // Try the app first
      const response = await app.fetch(request, env, ctx)

      // If no route matched (404) or no response, try serving static assets
      if (!response || response.status === 404) {
        if (env.ASSETS) {
          try {
            const assetResponse = await env.ASSETS.fetch(request)
            // If asset exists, return it
            if (assetResponse && assetResponse.status !== 404) {
              return assetResponse
            }
          } catch (e) {
            // Asset not found, continue with original response
          }
        }
      }

      return response
    } finally {
      // Clean up per-request state
      setFetchStaticHtml(null)
    }
  }
}
`
      await FSExtra.writeFile(workerSrcPath, workerCode)

      // Bundle the worker using Vite/esbuild
      // Cloudflare Workers with nodejs_compat supports Node.js built-ins
      console.info('\n [cloudflare] Bundling worker...')
      await viteBuild({
        root: options.root,
        logLevel: 'warn',
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          // Use SSR mode with node target for proper Node.js module resolution
          ssr: workerSrcPath,
          rollupOptions: {
            external: [
              // React Native dev tools - not needed in production
              '@react-native/dev-middleware',
              '@react-native/debugger-shell',
              'metro',
              'metro-core',
              'metro-runtime',
              // Native modules that can't run in workers
              /\.node$/,
            ],
            output: {
              entryFileNames: 'worker.js',
              format: 'es',
              // Keep dynamic imports separate for lazy loading
              inlineDynamicImports: false,
            },
          },
          minify: true,
          target: 'esnext',
        },
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
          'process.env.VITE_ENVIRONMENT': JSON.stringify('ssr'),
        },
        resolve: {
          conditions: ['workerd', 'worker', 'node', 'module', 'default'],
        },
        ssr: {
          target: 'node',
          noExternal: true,
        },
      })

      // Clean up temp file
      await FSExtra.remove(workerSrcPath)

      // Use jsonc for wrangler config (recommended for new projects)
      // Use assets with run_worker_first so all requests go through worker (enables middleware on SSG pages)
      const wranglerConfig = `{
  "name": "one-app",
  "main": "worker.js",
  "compatibility_date": "2024-12-05",
  "compatibility_flags": ["nodejs_compat"],
  "find_additional_modules": true,
  "rules": [
    { "type": "ESModule", "globs": ["./server/**/*.js"], "fallthrough": true },
    { "type": "ESModule", "globs": ["./api/**/*.js"], "fallthrough": true },
    { "type": "ESModule", "globs": ["./middlewares/**/*.js"], "fallthrough": true }
  ],
  "assets": { "directory": "client", "binding": "ASSETS", "run_worker_first": true }
}
`
      await FSExtra.writeFile(
        join(options.root, 'dist', 'wrangler.jsonc'),
        wranglerConfig
      )

      postBuildLogs.push(`Cloudflare worker bundled at dist/worker.js`)
      postBuildLogs.push(`To deploy: cd dist && wrangler deploy`)

      break
    }
  }

  if (postBuildLogs.length) {
    console.info(`\n\n`)
    postBuildLogs.forEach((log) => {
      console.info(`  · ${log}`)
    })
  }

  console.info(`\n\n  💛 build complete\n\n`)
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

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

function buildRegexExcludingDeps(deps: string[]) {
  // Sanitize each dependency
  const sanitizedDeps = deps.map((dep) => escapeRegex(dep))
  // Join them with the OR operator |
  const exclusionPattern = sanitizedDeps.join('|')
  // Build the final regex pattern
  const regexPattern = `node_modules/(?!(${exclusionPattern})).*`
  return new RegExp(regexPattern)
}
