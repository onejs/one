import FSExtra from 'fs-extra'
import MicroMatch from 'micromatch'
import { createRequire } from 'node:module'
import Path, { join, relative, resolve } from 'node:path'
import type { OutputAsset, RollupOutput } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
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
import { buildPage } from './buildPage'
import { checkNodeVersion } from './checkNodeVersion'
import { labelProcess } from './label-process'

const { ensureDir } = FSExtra

process.on('uncaughtException', (err) => {
  console.error(err?.message || err)
})

export async function build(args: {
  step?: string
  only?: string
  platform?: 'ios' | 'web' | 'android'
}) {
  labelProcess('build')
  checkNodeVersion()
  setServerGlobals()
  await loadEnv('production')

  if (!process.env.ONE_SERVER_URL) {
    console.warn(
      `⚠️ No ONE_SERVER_URL environment set, set it in your .env to your target deploy URL`
    )
  }

  const oneOptions = await loadUserOneOptions('build')
  const manifest = getManifest()!

  const serverOutputFormat = oneOptions.build?.server?.outputFormat ?? 'esm'

  const vxrnOutput = await vxrnBuild(
    {
      server: oneOptions.server,
      build: {
        analyze: true,
        server: {
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

  // const externalRegex = buildRegexExcludingDeps(optimizeDeps.include)
  const processEnvDefines = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => {
      return [`process.env.${key}`, JSON.stringify(value)]
    })
  )

  async function buildCustomRoutes(subFolder: string, routes: RouteInfo<string>[]) {
    const input = routes.reduce((entries, { page, file }) => {
      entries[page.slice(1) + '.js'] = join('app', file)
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
        ...processEnvDefines,
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

  if (manifest.apiRoutes.length) {
    console.info(`\n 🔨 build api routes\n`)
    await buildCustomRoutes('api', manifest.apiRoutes)
  }

  const builtMiddlewares: Record<string, string> = {}

  if (manifest.middlewareRoutes.length) {
    console.info(`\n 🔨 build middlewares\n`)
    const middlewareBuildInfo = await buildCustomRoutes('middlewares', manifest.middlewareRoutes)

    for (const middleware of manifest.middlewareRoutes) {
      const absoluteRoot = resolve(process.cwd(), options.root)
      const fullPath = join(absoluteRoot, 'app', middleware.file)
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
    if (!id.includes('/app/')) {
      continue
    }

    const relativeId = relative(process.cwd(), id)
      // TODO hardcoded app
      .replace('app/', '/')

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
      return route.file && clientManifestKey.replace(/^app/, '') === route.file.slice(1)
    })

    if (!foundRoute) {
      // should probably error?
      continue
    }

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
        // TODO hardcoded app/
        const clientKey = `app${layout.contextKey.slice(1)}`
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
      foundRoute.type !== 'ssr' &&
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
      const cleanId = relativeId.replace(/\+(spa|ssg|ssr)\.tsx?$/, '')
      const path = getPathnameFromFilePath(cleanId, params, foundRoute.type === 'ssg')
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
  for (const route of builtRoutes) {
    if (!route.cleanPath.includes('*')) {
      routeMap[route.cleanPath] = route.htmlPath
    }
  }

  const routeToBuildInfo: Record<string, One.RouteBuildInfo> = {}
  for (const route of builtRoutes) {
    routeToBuildInfo[route.routeFile] = route
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

    return built
  }

  const buildInfoForWriting: One.BuildInfo = {
    oneOptions,
    routeToBuildInfo,
    manifest: {
      pageRoutes: manifest.pageRoutes.map(createBuildManifestRoute),
      apiRoutes: manifest.apiRoutes.map(createBuildManifestRoute),
    },
    routeMap,
    constants: JSON.parse(JSON.stringify({ ...constants })) as any,
  }

  await FSExtra.writeJSON(toAbsolute(`dist/buildInfo.json`), buildInfoForWriting)

  let postBuildLogs: string[] = []

  const platform = oneOptions.web?.deploy ?? options.server?.platform

  switch (platform) {
    case 'vercel': {
      await FSExtra.writeFile(
        join(options.root, 'dist', 'index.js'),
        `import { serve } from 'one/serve'
export const handler = await serve()
export const { GET, POST, PUT, PATCH, OPTIONS } = handler`
      )

      postBuildLogs.push(`wrote vercel entry to: ${join('.', 'dist', 'index.js')}`)
      postBuildLogs.push(`point vercel outputDirectory to dist`)

      break
    }

    case 'cloudflare': {
      await FSExtra.writeFile(
        join(options.root, 'dist', 'worker.js'),
        `import { serve } from 'one/serve-worker'

const buildInfo = ${JSON.stringify(buildInfoForWriting)}

const handler = await serve(buildInfo)

export default {
  fetch: handler.fetch,
}`
      )

      await FSExtra.writeFile(
        join(options.root, 'dist', 'wrangler.toml'),
        `assets = { directory = "client" }
compatibility_date = "2024-12-05"
`
      )

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

async function moveAllFiles(src: string, dest: string) {
  try {
    await FSExtra.copy(src, dest, { overwrite: true, errorOnExist: false })
  } catch (err) {
    console.error('Error moving files:', err)
  }
}

function getPathnameFromFilePath(path: string, params = {}, strict = false) {
  const dirname = Path.dirname(path).replace(/\([^\/]+\)/gi, '')
  const file = Path.basename(path)
  const fileName = file.replace(/\.[a-z]+$/, '')

  function paramsError(part: string) {
    throw new Error(
      `[one] Params doesn't fit route:

      - path: ${path}
      - part: ${part}
      - fileName: ${fileName}
      - params:

${JSON.stringify(params, null, 2)}`
    )
  }

  const nameWithParams = (() => {
    if (fileName === 'index') {
      return '/'
    }
    if (fileName.startsWith('[...')) {
      const part = fileName.replace('[...', '').replace(']', '')
      if (!params[part]) {
        if (strict) {
          throw paramsError(part)
        }
        return `/*`
      }
      return `/${params[part]}`
    }
    return `/${fileName
      .split('/')
      .map((part) => {
        if (part[0] === '[') {
          const found = params[part.slice(1, part.length - 1)]
          if (!found) {
            if (strict) {
              throw paramsError(part)
            }

            return ':' + part.replace('[', '').replace(']', '')
          }
          return found
        }
        return part
      })
      .join('/')}`
  })()

  // hono path will convert +not-found etc too
  return `${dirname}${nameWithParams}`.replace(/\/\/+/gi, '/')
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
