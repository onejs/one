import FSExtra from 'fs-extra'
import MicroMatch from 'micromatch'
import { createRequire } from 'node:module'
import Path, { join, relative, resolve } from 'node:path'
import type { OutputAsset, RollupOutput } from 'rollup'
import { mergeConfig, build as viteBuild, type InlineConfig } from 'vite'
import {
  fillOptions,
  getOptimizeDeps,
  loadEnv,
  rollupRemoveUnusedImportsPlugin,
  build as vxrnBuild,
  type ClientManifestEntry,
} from 'vxrn'

import * as constants from '../constants'
import { setServerGlobals } from '../server/setServerGlobals'
import { toAbsolute } from '../utils/toAbsolute'
import { getManifest } from '../vite/getManifest'
import { loadUserOneOptions } from '../vite/loadConfig'
import { runWithAsyncLocalContext } from '../vite/one-server-only'
import type { One, RouteInfo } from '../vite/types'
import { buildVercelOutputDirectory } from '../vercel/build/buildVercelOutputDirectory'
import { getRouterRootFromOneOptions } from '../utils/getRouterRootFromOneOptions'

import { buildPage } from './buildPage'
import { checkNodeVersion } from './checkNodeVersion'
import { labelProcess } from './label-process'
import { getPathnameFromFilePath } from '../utils/getPathnameFromFilePath'

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
    oneOptions.build?.server === false ? 'esm' : (oneOptions.build?.server?.outputFormat ?? 'esm')

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

      // dont think this is doing anything
      ssr: {
        noExternal: true,
        // we patched them to switch to react 19
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
                    const name = Path.basename(chunkInfo.name, Path.extname(chunkInfo.name))
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

    const output = await viteBuild(
      // allow user merging api build config
      userApiBuildConf ? mergeConfig(mergedConfig, userApiBuildConf) : mergedConfig
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
    const middlewareBuildInfo = await buildCustomRoutes('middlewares', manifest.middlewareRoutes)

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

    // gather the initial import.meta.glob js parts:
    const clientManifestKey =
      Object.keys(vxrnOutput.clientManifest).find((key) => {
        return id.endsWith(key)
      }) || ''

    if (!clientManifestKey) {
      // this is something that has /app in it but isnt actually in our manifest, ignore
      continue
    }

    const clientManifestEntry = vxrnOutput.clientManifest[clientManifestKey]

    const foundRoute = manifest.pageRoutes.find((route: RouteInfo<string>) => {
      return route.file && clientManifestKey.replace(routerRootRegexp, '') === route.file.slice(1)
    })

    if (!foundRoute) {
      // should probably error?
      continue
    }

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
            .map((x) => (type === 'css' ? x : x.startsWith('assets/') ? x : `assets/${x.slice(1)}`))
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
        return vxrnOutput.clientManifest[clientKey]
      }) ?? []

    const layoutImports = layoutEntries.flatMap((entry) => {
      return [entry.file, ...collectImports(entry)]
    })

    const preloadSetupFilePreloads = (() => {
      if (oneOptions.setupFile) {
        const needle = oneOptions.setupFile.replace(/^\.\//, '')
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
      }

      return []
    })()

    const preloads = [
      ...new Set([
        ...preloadSetupFilePreloads,
        // add the route entry js (like ./app/index.ts)
        clientManifestEntry.file,
        // add the virtual entry
        vxrnOutput.clientManifest['virtual:one-entry'].file,
        ...entryImports,
        ...layoutImports,
      ]),
    ]
      // nested path pages need to reference root assets
      .map((path) => `/${path}`)

    const allEntries = [clientManifestEntry, ...layoutEntries]
    const allCSS = allEntries
      .flatMap((entry) => collectImports(entry, { type: 'css' }))
      // nested path pages need to reference root assets
      .map((path) => `/${path}`)

    if (process.env.DEBUG) {
      console.info('[one] building routes', { foundRoute, layoutEntries, allEntries, allCSS })
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

    for (const params of paramsList) {
      const path = getPathnameFromFilePath(relativeId, params, foundRoute.type === 'ssg')
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
          allCSS
        )
      })

      builtRoutes.push(built)
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
    loaders,
  }

  await writeJSON(toAbsolute(`dist/buildInfo.json`), buildInfoForWriting)

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

    //     case 'cloudflare': {
    //       await FSExtra.writeFile(
    //         join(options.root, 'dist', 'worker.js'),
    //         `import { serve } from 'one/serve-worker'

    // const buildInfo = ${JSON.stringify(buildInfoForWriting)}

    // const handler = await serve(buildInfo)

    // export default {
    //   fetch: handler.fetch,
    // }`
    //       )

    //       await FSExtra.writeFile(
    //         join(options.root, 'dist', 'wrangler.toml'),
    //         `assets = { directory = "client" }
    // compatibility_date = "2024-12-05"
    // `
    //       )

    //       break
    //     }
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
