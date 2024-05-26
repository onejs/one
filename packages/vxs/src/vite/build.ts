import { build as esbuild } from 'esbuild'
import FSExtra from 'fs-extra'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import Path, { join, relative } from 'node:path'
import type { OutputAsset } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { mergeConfig, build as viteBuild, type UserConfig } from 'vite'
import { getHtml, getOptimizeDeps, getOptionsFilled, type AfterBuildProps } from 'vxrn'
import { getManifest } from './getManifest'
import { replaceLoader } from './replaceLoader'
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
    htmlPath: string
    clientJsPath: string
    params: Object
    loaderData: any
    preloads: string[]
  }[] = []

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

  const staticDir = join(`dist/static`)
  const clientDir = join(`dist/client`)
  await ensureDir(staticDir)

  const outputEntries = [...props.serverOutput.entries()]

  const template = await readFile(toAbsolute(join(`dist/client/index.html`)), 'utf-8')

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

    const jsPath = toAbsolute(join('dist/server', output.fileName))

    let exported
    try {
      exported = await import(jsPath)
    } catch (err) {
      console.error(`Error importing page (original error)`, err)
      // err cause not showing in vite or something
      throw new Error(`Error importing page: ${jsPath}`, {
        cause: err,
      })
    }

    // gather the initial import.meta.glob js parts:
    const clientManifestKey =
      Object.keys(props.clientManifest).find((key) => {
        return id.endsWith(key)
      }) || ''

    if (!clientManifestKey) {
      // this is something that has /app in it but isnt actually in our manifest, ignore
      continue
    }

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
              const found = props.clientManifest[name]
              if (!found) {
                console.warn(`No found imports`, name, props.clientManifest)
              }
              return found?.imports ?? []
            }),
          ]
            .flat()
            .filter((x) => x && x.endsWith('.js'))
            .map((x) => `assets/${x.slice(1)}`)
        ),
      ]
    }

    if (!clientManifestEntry) {
      console.warn(
        `No client manifest entry found: ${clientManifestKey} in manifest ${JSON.stringify(
          props.clientManifest,
          null,
          2
        )}`
      )
    }

    const allSubImports = getAllClientManifestImports(clientManifestEntry || {})

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

    for (const params of paramsList) {
      const path = getPathnameFromFilePath(relativeId, params)
      const htmlPath = `${path === '/' ? '/index' : path}.html`
      const loaderData = (await exported.loader?.({ path, params })) ?? {}
      const clientJsPath = join(`dist/client`, clientManifestEntry.file)

      try {
        console.info(` [build] static ${path} params ${JSON.stringify(params)}`)
        const loaderProps = { params }

        globalThis['__vxrnLoaderProps__'] = loaderProps

        // importing resetState causes issues :/
        globalThis['__vxrnresetState']?.()

        const { appHtml, headHtml } = await render({ path })

        // output the static html
        const html = getHtml({
          template,
          appHtml,
          headHtml,
          loaderData,
          loaderProps,
          preloads,
          css: cssString,
        })

        const filePath = join(staticDir, htmlPath)
        const loaderPartialPath = join(
          staticDir,
          'assets',
          path.slice(1).replaceAll('/', '_') + '_vxrn_loader.js'
        )

        const code = await readFile(clientJsPath, 'utf-8')

        await Promise.all([
          outputFile(toAbsolute(filePath), html),
          outputFile(loaderPartialPath, replaceLoader(code, loaderData, '[a-z]+')),
        ])
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
  await FSExtra.writeJSON(
    toAbsolute(`dist/routeMap.json`),
    allRoutes.reduce((acc, { path, htmlPath }) => {
      acc[path] = htmlPath
      return acc
    }, {}),
    {
      spaces: 2,
    }
  )
}

async function moveAllFiles(src: string, dest: string) {
  try {
    await FSExtra.copy(src, dest, { overwrite: true, errorOnExist: false })
  } catch (err) {
    console.error('Error moving files:', err)
  }
}

function getPathnameFromFilePath(path: string, params = {}) {
  const dirname = Path.dirname(path).replace(/\([^\/]+\)/gi, '')

  const file = Path.basename(path)
  const name = file.replace(/\.[^/.]+$/, '')

  const nameWithParams = (() => {
    if (name === 'index') {
      return '/'
    }
    if (name.startsWith('[...')) {
      const part = name.replace('[...', '').replace(']', '')
      return `/${params[part]}`
    }
    return `/${name
      .split('/')
      .map((part) => {
        if (part[0] === '[') {
          const found = params[part.slice(1, part.length - 1)]
          if (!found) {
            console.warn('not found', { params, part })
          }
          return found
        }
        return part
      })
      .join('/')}`
  })()

  return `${dirname}${nameWithParams}`.replace(/\/\/+/gi, '/')
}
