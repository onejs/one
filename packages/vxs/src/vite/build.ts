import FSExtra from 'fs-extra'
import MicroMatch from 'micromatch'
import { createRequire } from 'node:module'
import Path, { join, relative } from 'node:path'
import type { OutputAsset } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { mergeConfig, build as viteBuild, type InlineConfig } from 'vite'
import {
  getOptimizeDeps,
  getOptionsFilled,
  build as vxrnBuild,
  type ClientManifestEntry,
} from 'vxrn'
import type { RouteInfo } from '../server/createRoutesManifest'
import type { RenderApp } from '../types'
import { getManifest } from './getManifest'
import { replaceLoader } from './replaceLoader'
import type { VXS } from './types'
import { loadUserVXSOptions } from './vxs'

const { ensureDir, readFile, outputFile } = FSExtra

process.on('uncaughtException', (err) => {
  console.error(err?.message || err)
})

export async function build(args: {
  step?: string
  only?: string
}) {
  const userOptions = await loadUserVXSOptions('build')
  const serverOutputFormat = userOptions.build?.server?.outputFormat ?? 'esm'

  // TODO make this better, this ensures we get react 19
  process.env.VXRN_REACT_19 = '1'

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

  const options = await getOptionsFilled(vxrnOutput.options)

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

    const apiOutputFormat = userOptions?.build?.api?.outputFormat ?? 'esm'

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

        build: {
          emptyOutDir: false,
          outDir: 'dist/api',
          copyPublicDir: false,
          minify: false,
          rollupOptions: {
            treeshake: {
              moduleSideEffects: 'no-external',
            },
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

  const builtRoutes: VXS.RouteBuildInfo[] = []

  console.info(`\n 🔨 build static routes\n`)

  const entryServer = `${options.root}/dist/server/_virtual_vxs-entry.js`
  let render: RenderApp | null = null

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
      return clientManifestKey.endsWith(route.file.slice(1))
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

    const preloads = [
      ...new Set([
        // add the route entry js (like ./app/index.ts)
        clientManifestEntry.file,
        // add the virtual entry
        vxrnOutput.clientManifest['virtual:vxs-entry'].file,
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

    if (foundRoute.type !== 'ssr' && !exported.generateStaticParams && relativeId.includes('[')) {
      throw new Error(`[vxs] Error: Missing generateStaticParams

  Routes of type ${foundRoute.type} that use dynamic path segments must export generateStaticParams so build can complete.

  See docs on generateStaticParams:
    https://onestack.dev/docs/routing-exports#generatestaticparams

`)
    }

    const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Object[]

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

        // ssr, we basically skip at build-time and just compile it the js we need
        if (foundRoute.type !== 'ssr') {
          const loaderProps = { path, params }
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
            const loaderPartialPath = join(
              staticDir,
              'assets',
              path
                .slice(1)
                .replaceAll('/', '_')
                // remove trailing _
                .replace(/_$/, '') + `_vxrn_loader.js`
            )
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

        const cleanPath = path === '/' ? path : removeTrailingSlash(path)

        builtRoutes.push({
          type: foundRoute.type,
          cleanPath,
          clientJsPath,
          serverJsPath,
          htmlPath,
          loaderData,
          params,
          path,
          preloads,
        })
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
  }

  const buildInfo = {
    ...buildInfoForWriting,
    ...vxrnOutput,
  }

  await FSExtra.writeJSON(toAbsolute(`dist/buildInfo.json`), buildInfoForWriting)

  let postBuildLogs: string[] = []

  if (options.server?.platform === 'vercel') {
    await FSExtra.writeFile(
      join(options.root, 'dist', 'index.js'),
      `import { serve } from 'vxs/serve'
const handler = await serve()
export const { GET, POST, PUT, PATCH, OPTIONS } = handler`
    )
    postBuildLogs.push(`wrote vercel entry to: ${join('.', 'dist', 'index.js')}`)
    postBuildLogs.push(`point vercel outputDirectory to dist`)
  }

  if (userOptions?.afterBuild) {
    await userOptions?.afterBuild?.(buildInfo)
  }

  console.info(`\n\n  💛 build complete\n\n`)
  console.info(`  · client build report: ${join('.', 'dist', 'report.html')}`)
  postBuildLogs.forEach((log) => {
    console.info(`  · ${log}`)
  })
  console.info(`\n\n`)
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
                `[vxs] Params doesn't fit route:
                
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
