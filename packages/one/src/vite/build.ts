import * as constants from '../constants'
import FSExtra from 'fs-extra'
import MicroMatch from 'micromatch'
import { createRequire } from 'node:module'
import Path, { join, relative } from 'node:path'
import type { OutputAsset } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { mergeConfig, build as viteBuild, type InlineConfig } from 'vite'
import {
  fillOptions,
  getOptimizeDeps,
  rollupRemoveUnusedImportsPlugin,
  build as vxrnBuild,
  type ClientManifestEntry,
} from 'vxrn'
import { getLoaderPath, getPreloadPath } from '../cleanUrl'
import { labelProcess } from '../cli/label-process'
import type { RouteInfo } from '../server/createRoutesManifest'
import type { LoaderProps, RenderApp } from '../types'
import { getManifest } from './getManifest'
import { loadUserOneOptions } from './one'
import { replaceLoader } from './replaceLoader'
import type { One } from './types'

const { ensureDir, readFile, outputFile } = FSExtra

process.on('uncaughtException', (err) => {
  console.error(err?.message || err)
})

export async function build(args: {
  step?: string
  only?: string
}) {
  labelProcess('build')

  const userOptions = await loadUserOneOptions('build')
  const serverOutputFormat = userOptions.build?.server?.outputFormat ?? 'esm'

  // TODO make this better, this ensures we get react 19
  process.env.VXRN_REACT_19 = '1'

  if (!process.env.ONE_SERVER_URL) {
    console.warn(
      `⚠️ No ONE_SERVER_URL environment set, set it in your .env to your target deploy URL`
    )
  }

  const vxrnOutput = await vxrnBuild(
    {
      server: userOptions.server,
      build: {
        analyze: true,
        server: {
          outputFormat: serverOutputFormat,
        },
      },
    },
    args
  )

  const options = await fillOptions(vxrnOutput.options)

  const toAbsolute = (p) => Path.resolve(options.root, p)
  const manifest = getManifest()!
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

  if (manifest.apiRoutes.length) {
    console.info(`\n 🔨 build api routes\n`)

    const processEnvDefines = Object.fromEntries(
      Object.entries(process.env).map(([key, value]) => {
        return [`process.env.${key}`, JSON.stringify(value)]
      })
    )

    const apiRouteExternalRegex = buildRegexExcludingDeps(optimizeDeps.include)

    const apiEntryPoints = manifest.apiRoutes.reduce((entries, { page, file }) => {
      entries[page.slice(1) + '.js'] = join('app', file)
      return entries
    }, {}) as Record<string, string>

    const apiOutputFormat = userOptions?.build?.api?.outputFormat ?? serverOutputFormat
    const treeshake = userOptions?.build?.api?.treeshake

    await viteBuild(
      mergeConfig(apiBuildConfig, {
        appType: 'custom',
        configFile: false,

        plugins: [
          nodeExternals({
            exclude: optimizeDeps.include,
          }) as any,
        ],

        define: {
          ...processEnvDefines,
        },

        ssr: {
          noExternal: true,
          // we patched them to switch to react 19
          external: ['react', 'react-dom'],
          optimizeDeps,
        },

        build: {
          ssr: true,
          emptyOutDir: false,
          outDir: 'dist/api',
          copyPublicDir: false,
          minify: false,
          rollupOptions: {
            treeshake: treeshake ?? {
              moduleSideEffects: false,
            },

            plugins: [
              // otherwise rollup is leaving commonjs-only top level imports...
              apiOutputFormat === 'esm' ? rollupRemoveUnusedImportsPlugin : null,
            ].filter(Boolean),

            // too many issues
            // treeshake: {
            //   moduleSideEffects: false,
            // },
            // prevents it from shaking out the exports
            preserveEntrySignatures: 'strict',
            input: apiEntryPoints,
            external: apiRouteExternalRegex,
            output: {
              entryFileNames: '[name]',
              exports: 'auto',
              ...(apiOutputFormat === 'esm'
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
    )
  }

  // for the require Sitemap in getRoutes
  globalThis['require'] = createRequire(join(import.meta.url, '..'))

  const assets: OutputAsset[] = []

  const builtRoutes: One.RouteBuildInfo[] = []

  console.info(`\n 🔨 build static routes\n`)

  let render: RenderApp | null = null
  const entryServer = vxrnOutput.serverEntry

  try {
    const serverImport = await import(entryServer)

    render =
      serverImport.default.render ||
      // for an unknown reason this is necessary
      serverImport.default.default?.render

    if (typeof render !== 'function') {
      console.error(`❌ Error: didn't find render function in entry`, serverImport)
      process.exit(1)
    }
  } catch (err) {
    console.error(`❌ Error importing the root entry:`)
    console.error(`  This error happened in the built file: ${entryServer}`)
    // @ts-expect-error
    console.error(err['stack'])
    process.exit(1)
  }

  const staticDir = join(`dist/static`)
  const clientDir = join(`dist/client`)
  await ensureDir(staticDir)

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

    const findMatchingRoute = (route: RouteInfo<string>) => {
      return route.file && clientManifestKey.endsWith(route.file.slice(1))
    }

    const foundRoute = manifest.pageRoutes.find(findMatchingRoute)

    if (!foundRoute) {
      if (clientManifestKey.startsWith('app')) {
        console.error(` No html route found!`, { id, clientManifestKey })
        console.error(` In manifest`, manifest)
        process.exit(1)
      }
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
              const found = vxrnOutput.clientManifest[name]
              if (!found) {
                console.warn(`No found imports`, name, vxrnOutput.clientManifest)
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
      if (userOptions.setupFile) {
        const needle = userOptions.setupFile.replace(/^\.\//, '')
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

    const serverJsPath = toAbsolute(join('dist/server', output.fileName))

    let exported
    try {
      exported = await import(serverJsPath)
    } catch (err) {
      console.error(`Error importing page (original error)`, err)
      // err cause not showing in vite or something
      throw new Error(`Error importing page: ${serverJsPath}`, {
        cause: err,
      })
    }

    if (
      foundRoute.type !== 'ssr' &&
      !foundRoute.page.includes('+not-found') &&
      !foundRoute.page.includes('_sitemap') &&
      !exported.generateStaticParams &&
      relativeId.includes('[')
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
      const htmlPath = `${path.endsWith('/') ? `${removeTrailingSlash(path)}/index` : path}.html`
      const clientJsPath = join(`dist/client`, clientManifestEntry.file)
      const htmlOutPath = toAbsolute(join(staticDir, htmlPath))

      let loaderData = {}

      try {
        console.info(`  ↦ route ${path}`)

        const cleanPath = path === '/' ? path : removeTrailingSlash(path)

        const preloadPath = getPreloadPath(path)

        // todo await optimize
        await FSExtra.writeFile(
          join(clientDir, preloadPath),
          preloads.map((preload) => `import "${preload}"`).join('\n')
        )

        builtRoutes.push({
          type: foundRoute.type,
          cleanPath,
          preloadPath,
          clientJsPath,
          serverJsPath,
          htmlPath,
          loaderData,
          params,
          path,
          preloads,
        })

        // ssr, we basically skip at build-time and just compile it the js we need
        if (foundRoute.type !== 'ssr') {
          const loaderProps: LoaderProps = { path, params }
          globalThis['__vxrnLoaderProps__'] = loaderProps
          // importing resetState causes issues :/
          globalThis['__vxrnresetState']?.()

          if (exported.loader) {
            loaderData = (await exported.loader?.({ path, params })) ?? null
            const code = await readFile(clientJsPath, 'utf-8')
            const withLoader = replaceLoader({
              code,
              loaderData,
            })
            const loaderPartialPath = join(clientDir, getLoaderPath(path))
            await outputFile(loaderPartialPath, withLoader)
          }

          if (foundRoute.type === 'ssg') {
            const html = await render({ path, preloads, loaderProps, loaderData, css: allCSS })
            await outputFile(htmlOutPath, html)
            continue
          }

          if (foundRoute.type === 'spa') {
            await outputFile(
              htmlOutPath,
              `<html><head>
              <script>globalThis['global'] = globalThis</script>
              <script>globalThis['__vxrnIsSPA'] = true</script>
              ${preloads
                .map((preload) => `   <script type="module" src="${preload}"></script>`)
                .join('\n')}
              ${allCSS.map((file) => `    <link rel="stylesheet" href=${file} />`).join('\n')}
            </head></html>`
            )
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : `${err}`

        console.error(
          `Error building static page at ${path} with id ${relativeId}:

${errMsg}

  loaderData:
  
${JSON.stringify(loaderData || null, null, 2)}
  params:
  
${JSON.stringify(params || null, null, 2)}`
        )
        console.error(err)
        process.exit(1)
      }
    }
  }

  // once done building static we can move it to client dir:
  await moveAllFiles(staticDir, clientDir)
  await FSExtra.rm(staticDir, { force: true, recursive: true })

  // write out the pathname => html map for the server
  const routeMap = builtRoutes.reduce((acc, { cleanPath, htmlPath }) => {
    acc[cleanPath] = htmlPath
    return acc
  }, {}) satisfies Record<string, string>

  const buildInfoForWriting = {
    routeMap,
    builtRoutes,
    constants: JSON.parse(JSON.stringify({ ...constants })),
  }

  const buildInfo = {
    ...buildInfoForWriting,
    ...vxrnOutput,
  }

  await FSExtra.writeJSON(toAbsolute(`dist/buildInfo.json`), buildInfoForWriting)

  let postBuildLogs: string[] = []

  const platform = userOptions.web?.deploy ?? options.server?.platform

  if (platform === 'vercel') {
    await FSExtra.writeFile(
      join(options.root, 'dist', 'index.js'),
      `import { serve } from 'one/serve'
const handler = await serve()
export const { GET, POST, PUT, PATCH, OPTIONS } = handler`
    )
    postBuildLogs.push(`wrote vercel entry to: ${join('.', 'dist', 'index.js')}`)
    postBuildLogs.push(`point vercel outputDirectory to dist`)
  }

  if (userOptions?.afterBuild) {
    await userOptions?.afterBuild?.(buildInfo)
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

function removeTrailingSlash(path: string) {
  return path.endsWith('/') ? path.slice(0, path.length - 1) : path
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

  const nameWithParams = (() => {
    if (fileName === 'index') {
      return '/'
    }
    if (fileName.startsWith('[...')) {
      const part = fileName.replace('[...', '').replace(']', '')
      if (!params[part]) {
        console.warn(`couldn't resolve ${fileName} segment in path ${path}`)
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
              throw new Error(
                `[one] Params doesn't fit route:
                
                - path: ${path} 
                - part: ${part}
                - fileName: ${fileName}
                - params:
  
  ${JSON.stringify(params, null, 2)}`
              )
            }

            return ':' + part.replace('[', '').replace(']', '')
          }
          return found
        }
        return part
      })
      .join('/')}`
  })()

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
