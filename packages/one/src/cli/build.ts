import { createRequire } from 'node:module'
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
import { toAbsolute } from '../utils/toAbsolute'
import { buildVercelOutputDirectory } from '../vercel/build/buildVercelOutputDirectory'
import { getManifest } from '../vite/getManifest'
import { loadUserOneOptions } from '../vite/loadConfig'
import { runWithAsyncLocalContext } from '../vite/one-server-only'
import type { One, RouteInfo } from '../vite/types'
import { buildPage } from './buildPage'
import { checkNodeVersion } from './checkNodeVersion'
import { generateSitemap, type RouteSitemapData } from './generateSitemap'
import { labelProcess } from './label-process'
import { isRolldown } from '../utils/isRolldown'

const { ensureDir, writeJSON } = FSExtra

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
  const routerRootRegexp = new RegExp(`^${routerRoot}`)

  const manifest = getManifest({ routerRoot })!

  const serverOutputFormat =
    oneOptions.build?.server === false
      ? 'esm'
      : (oneOptions.build?.server?.outputFormat ?? 'esm')

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

  if (!vxrnOutput || args.platform !== 'web') {
    return
  }

  const options = await fillOptions(vxrnOutput.options)

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

  let apiOutput: RollupOutput | null = null
  if (manifest.apiRoutes.length) {
    console.info(`\n 🔨 build api routes\n`)
    apiOutput = await buildCustomRoutes('api', manifest.apiRoutes)
  }

  const builtMiddlewares: Record<string, string> = {}

  if (manifest.middlewareRoutes.length) {
    console.info(`\n 🔨 build middlewares\n`)
    const middlewareBuildInfo = await buildCustomRoutes(
      'middlewares',
      manifest.middlewareRoutes
    )

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

  console.info(`\n 🔨 build static routes\n`)

  const staticDir = join(`dist/static`)
  const clientDir = join(`dist/client`)
  await ensureDir(staticDir)

  if (!vxrnOutput.serverOutput) {
    throw new Error(`No server output`)
  }

  const outputEntries = [...vxrnOutput.serverOutput.entries()]

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

    // Match route by server output id against manifest.pageRoutes
    const foundRoute = manifest.pageRoutes.find((route: RouteInfo<string>) => {
      if (!route.file) return false
      const routePath = `${routerRoot}${route.file.slice(1)}`
      return id.endsWith(routePath)
    })

    if (!foundRoute) {
      continue
    }

    // Find client manifest entry - first by exact key match, then by src property
    let clientManifestKey =
      Object.keys(vxrnOutput.clientManifest).find((key) => {
        return id.endsWith(key)
      }) || ''

    // If not found by key, search by src property (handles shared chunks)
    if (!clientManifestKey) {
      const expectedSrc = `${routerRoot}${foundRoute.file.slice(1)}`
      clientManifestKey =
        Object.keys(vxrnOutput.clientManifest).find((key) => {
          const entry = vxrnOutput.clientManifest[key]
          return entry.src === expectedSrc
        }) || ''
    }

    if (!clientManifestKey) {
      console.warn(`No client manifest entry found for route: ${id}`)
      continue
    }

    const clientManifestEntry = vxrnOutput.clientManifest[clientManifestKey]

    foundRoute.loaderServerPath = output.fileName

    function collectImports(
      { imports = [], css }: ClientManifestEntry,
      { type = 'js' }: { type?: 'js' | 'css' } = {}
    ): string[] {
      return [
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
    }

    if (!clientManifestEntry) {
      console.warn(
        `No client manifest entry found: ${clientManifestKey} in manifest ${JSON.stringify(
          vxrnOutput.clientManifest,
          null,
          2
        )}`
      )
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

    // add the page itself
    routePreloads[`/${clientManifestKey}`] = `/${clientManifestEntry.file}`

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
        // add the route entry js (like ./app/index.ts)
        clientManifestEntry.file,
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
            // add the route entry js (like ./app/index.ts)
            clientManifestEntry.file,
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

    const allEntries = [clientManifestEntry, ...layoutEntries]
    const allCSS = allEntries
      .flatMap((entry) => collectImports(entry, { type: 'css' }))
      // nested path pages need to reference root assets
      .map((path) => `/${path}`)

    // Read CSS file contents if inlineLayoutCSS is enabled
    let allCSSContents: string[] | undefined
    if (oneOptions.web?.inlineLayoutCSS) {
      allCSSContents = await Promise.all(
        allCSS.map(async (cssPath) => {
          const filePath = join(clientDir, cssPath)
          try {
            return await FSExtra.readFile(filePath, 'utf-8')
          } catch (err) {
            console.warn(`[one] Warning: Could not read CSS file ${filePath}`)
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

    for (const params of paramsList) {
      const path = getPathnameFromFilePath(relativeId, params, foundRoute.type === 'ssg')
      console.info(
        `  ↦ route ${path}${useAfterLCPAggressive ? ' (after-lcp-aggressive)' : useAfterLCP ? ' (after-lcp)' : ''}`
      )

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

      builtRoutes.push(built)

      // Collect sitemap data for page routes (exclude API, not-found, layouts)
      if (
        foundRoute.type !== 'api' &&
        foundRoute.type !== 'layout' &&
        !foundRoute.isNotFound &&
        !foundRoute.page.includes('+not-found') &&
        !foundRoute.page.includes('_sitemap')
      ) {
        sitemapData.push({
          path,
          routeExport: routeSitemapExport,
        })
      }
    }
  }

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
    for (let p of getCleanPaths([route.path, route.cleanPath])) {
      pathToRoute[p] = route.routeFile
    }
    preloads[route.preloadPath] = true
    cssPreloads[route.cssPreloadPath] = true
    loaders[route.loaderPath] = true
  }

  function createBuildManifestRoute(route: RouteInfo) {
    // remove layouts, they are huge due to keeping all children, not needed after build
    // TODO would be clean it up in manifst
    const { layouts, ...built } = route

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

  let postBuildLogs: string[] = []

  const platform = oneOptions.web?.deploy

  if (platform) {
    postBuildLogs.push(`[one.build] platform ${platform}`)
  }

  switch (platform) {
    case 'vercel': {
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

  if (process.env.VXRN_ANALYZE_BUNDLE) {
    postBuildLogs.push(`client build report: ${toAbsolute(`dist/report.html`)}`)
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
