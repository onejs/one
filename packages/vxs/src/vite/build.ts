import { build as esbuild } from 'esbuild'
import FSExtra from 'fs-extra'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import Path, { basename, dirname, join, relative } from 'node:path'
import type { OutputAsset } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { mergeConfig, build as viteBuild, type UserConfig } from 'vite'
import { getHtml, getOptimizeDeps, getOptionsFilled, type AfterBuildProps } from 'vxrn'
import { getManifest } from './getManifest'
import pMap from 'p-map'
// import { resetState } from '../global-state/useInitializeExpoRouter'

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch {
    return require.resolve(path)
  }
}

const { ensureDir, existsSync, readFile, outputFile } = FSExtra

export async function build(props: AfterBuildProps) {
  const options = await getOptionsFilled(props.options)
  const toAbsolute = (p) => Path.resolve(options.root, p)

  const manifest = getManifest(join(options.root, 'app'))!
  const { optimizeDeps } = getOptimizeDeps('build')
  const apiBuildConfig = mergeConfig(props.webBuildConfig, {
    appType: 'custom',
    optimizeDeps,
  } satisfies UserConfig)

  // console.info(`\n 🔨 build api\n`)

  // await viteBuild({
  //   environments: {
  //     node: {
  //       build: {
  //         async createEnvironment(builder) {
  //           return {
  //             mode: 'build',
  //             name: 'api',
  //             plugins: [],
  //             logger() {},
  //             async init() {},
  //             options: {
  //               nodeCompatible: true,
  //             },
  //             config: {
  //               appType: 'custom',
  //               ...(props.webBuildConfig as any),
  //             },
  //           } as any
  //         },
  //       },
  //     },
  //   },
  // })

  console.info(`\n 🔨 build api\n`)

  for (const { page, file } of manifest.apiRoutes) {
    console.info(` [api]`, file)
    await viteBuild(
      mergeConfig(apiBuildConfig, {
        appType: 'custom',
        plugins: [nodeExternals() as any],
        build: {
          outDir: 'dist/api',
          copyPublicDir: false,
          minify: false,
          rollupOptions: {
            treeshake: false,
            input: join('app', file),
            preserveEntrySignatures: 'strict',
            external: [/node_modules/],
            output: {
              entryFileNames: page.slice(1) + '.js',
              format: 'esm',
              exports: 'auto',
            },
          },
        },
      } satisfies UserConfig)
    )
  }

  console.info(`\n 🔨 build static routes\n`)
  const entryServer = `${options.root}/dist/server/entry-server.js`

  // for the require Sitemap in getRoutes
  globalThis['require'] = createRequire(join(import.meta.url, '..'))

  const render = (await import(entryServer)).render

  const assets: OutputAsset[] = []

  const allRoutes: {
    path: string
    params: Object
    loaderData: any
    preloads: string[]
  }[] = []

  const outputEntries = [...props.output.entries()]

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

    const endpointPath = Path.join(options.root, 'dist/server', output.fileName)

    let exported
    try {
      exported = await import(endpointPath)
    } catch (err) {
      console.error(`Error importing page (original error)`, err)
      // err cause not showing in vite or something
      throw new Error(`Error importing page: ${endpointPath}`, {
        cause: err,
      })
    }

    // gather the initial import.meta.glob js parts:
    const clientManifestKey =
      Object.keys(props.clientManifest).find((key) => {
        return id.endsWith(key)
      }) || ''
    const clientManifestEntry = props.clientManifest[clientManifestKey]
    const htmlRoute = manifest.htmlRoutes.find((route) => {
      return clientManifestKey.endsWith(route.file.slice(1))
    })

    function getAllClientManifestImports({ imports = [] }: { imports?: string[] }) {
      return [
        ...new Set(
          [
            ...imports,
            // recurse
            ...imports.flatMap((name) => {
              return props.clientManifest[name].imports
            }),
          ]
            .flat()
            .filter((x) => x && x.endsWith('.js'))
            .map((x) => `assets/${x.slice(1)}`)
        ),
      ]
    }

    const allSubImports = getAllClientManifestImports(clientManifestEntry)

    const allLayoutSubImports =
      htmlRoute?.layouts?.flatMap((layout) => {
        // TODO hardcoded app/
        const clientKey = `app${layout.slice(1)}`
        const layoutClientEntry = props.clientManifest[clientKey]?.file
        const subImports = getAllClientManifestImports(props.clientManifest[clientKey])
        return [layoutClientEntry, ...subImports].filter(Boolean)
      }) || []

    const preloads = [
      ...new Set([
        // add the main entry js (like ./app/index.ts)
        clientManifestEntry.file,
        ...allSubImports,
        ...allLayoutSubImports,
      ]),
    ]

    const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Object[]

    const relativeId = relative(process.cwd(), id)
      // TODO hardcoded app
      .replace('app/', '/')

    console.info(`\n [build] page ${relativeId}\n`)

    for (const [index2, params] of paramsList.entries()) {
      const path = getPathnameFromFilePath(relativeId, params)

      console.info(
        ` [build] (${index + index2}/${outputEntries.length}) ${path} with params`,
        params
      )

      try {
        const loaderData = (await exported.loader?.({ path, params })) ?? {}
        allRoutes.push({ path, params, loaderData, preloads })
      } catch (err) {
        console.error(`Error building ${relativeId}`)
        console.error(err)
        process.exit(1)
      }
    }
  }

  console.info(`\n 🔨 build css\n`)

  // for now just inline
  const cssStringRaw = assets
    .filter((x) => x.name?.endsWith('.css'))
    .map((x) => x.source)
    .join('\n\n')

  // awkward way to get prefixes:
  const tmpCssFile = Path.join(tmpdir(), 'tmp.css')
  await FSExtra.writeFile(tmpCssFile, cssStringRaw, 'utf-8')
  await esbuild({
    entryPoints: [tmpCssFile],
    target: 'safari17',
    bundle: true,
    minifyWhitespace: true,
    sourcemap: false,
    allowOverwrite: true,
    outfile: tmpCssFile,
    loader: { '.css': 'css' },
  })
  const cssString = await readFile(tmpCssFile, 'utf-8')

  const staticDir = toAbsolute(`dist/static`)
  const clientDir = toAbsolute(`dist/client`)
  await ensureDir(staticDir)

  console.info(`\n 🔨 building static html\n`)

  // pre-render each route...
  const template = await readFile(toAbsolute('index.html'), 'utf-8')

  for (const { path, loaderData, params, preloads } of allRoutes) {
    try {
      console.info(` [build] static ${path}`)
      const loaderProps = { params }

      globalThis['__vxrnLoaderProps__'] = loaderProps

      // importing resetState causes issues :/
      globalThis['__vxrnresetState']?.()

      const { appHtml, headHtml } = await render({ path })

      // output the static html
      const slashFileName = `${path === '/' ? '/index' : path}.html`
      const clientHtmlPath = toAbsolute(join(`dist/client`, slashFileName))
      const clientHtml = existsSync(clientHtmlPath) ? await readFile(clientHtmlPath, 'utf-8') : null
      const html = getHtml({
        template: clientHtml || template,
        appHtml,
        headHtml,
        loaderData,
        loaderProps,
        preloads,
        css: cssString,
      })
      const filePath = join(staticDir, slashFileName)
      await outputFile(toAbsolute(filePath), html)
    } catch (err) {
      const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : `${err}`

      throw new Error(
        `Error building static page at ${path}:

${errMsg}

  loaderData:
  
${JSON.stringify(loaderData || null, null, 2)}
  params:
  
${JSON.stringify(params || null, null, 2)}`,
        {
          cause: err,
        }
      )
    }
  }

  // once done building static we can move it to client dir:
  await moveAllFiles(staticDir, clientDir)
  await FSExtra.rm(staticDir, { force: true, recursive: true })
}

function assertIsError(error: unknown): asserts error is Error {
  if (!(error instanceof Error)) {
    throw error
  }
}

async function moveAllFiles(src: string, dest: string) {
  try {
    await FSExtra.copy(src, dest, { overwrite: true, errorOnExist: false })
  } catch (err) {
    console.error('Error moving files:', err)
  }
}

function getPathnameFromFilePath(path: string, _params = {}) {
  const dirname = Path.dirname(path).replace(/\([^\/]+\)\//gi, '')

  const file = Path.basename(path)
  const name = file.replace(/\.[^/.]+$/, '')

  const nameWithParams = (() => {
    if (name === 'index') {
      return '/'
    }
    if (name.startsWith('[...')) {
      const part = name.replace('[...', '').replace(']', '')
      return `/${_params[part]}`
    }
    return `/${name
      .split('/')
      .map((part) => {
        if (part[0] === '[') {
          const found = _params[part.slice(1, part.length - 1)]
          if (!found) {
            console.warn('not found', { _params, part })
          }
          return found
        }
        return part
      })
      .join('/')}`
  })()

  return `${dirname}${nameWithParams}`.replace(/\/\/+/gi, '/')
}
