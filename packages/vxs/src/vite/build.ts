import { build as esbuild } from 'esbuild'
import FSExtra from 'fs-extra'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import Path, { join } from 'node:path'
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

  console.log('manifest', JSON.stringify(manifest, null, 2))

  for (const { page, file } of manifest.apiRoutes) {
    console.info(` [api]`, file)
    await viteBuild(
      mergeConfig(apiBuildConfig, {
        appType: 'custom',
        plugins: [nodeExternals() as any],
        build: {
          outDir: 'dist/api',
          copyPublicDir: false,
          rollupOptions: {
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

  for (const output of props.output) {
    if (output.type === 'asset') {
      assets.push(output)
      continue
    }

    const id = output.facadeModuleId || ''
    const file = Path.basename(id)
    const name = file.replace(/\.[^/.]+$/, '')

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

    const preloads = [
      // add the main entry js (like ./app/index.ts)
      clientManifestEntry.file,

      // add in the layouts
      ...(htmlRoute?.layouts?.flatMap((layout) => {
        // TODO hardcoded app/
        const clientKey = `app${layout.slice(1)}`
        const layoutClientEntry = props.clientManifest[clientKey]?.file
        return [layoutClientEntry].filter(Boolean)
      }) || []),

      ...clientManifestEntry.imports.flatMap((x) =>
        // for some reason it starts with a _
        x.endsWith('.js') ? [`assets/${x.slice(1)}`] : []
      ),
    ]

    const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Object[]

    console.info(` [build] ${id} with params`, paramsList)

    for (const params of paramsList) {
      const path = getUrl(params)
      const loaderData = (await exported.loader?.({ path, params })) ?? {}

      allRoutes.push({ path, params, loaderData, preloads })
    }

    function getUrl(_params = {}) {
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
    }
  }

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
  await ensureDir(staticDir)

  // pre-render each route...
  const template = await readFile(toAbsolute('index.html'), 'utf-8')
  for (const { path, loaderData, params, preloads } of allRoutes) {
    try {
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
      assertIsError(err)
      throw new Error(
        `Error building static page at ${path}:

${err.message}
${err.stack}

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
}

function assertIsError(error: unknown): asserts error is Error {
  if (!(error instanceof Error)) {
    throw error
  }
}
