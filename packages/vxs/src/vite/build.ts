import FSExtra from 'fs-extra'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import MicroMatch from 'micromatch'
import { createRequire } from 'node:module'
import Path, { join, relative } from 'node:path'
import { version } from 'react'
import type { OutputAsset } from 'rollup'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { mergeConfig, build as viteBuild, type UserConfig } from 'vite'
import {
  getOptimizeDeps,
  getOptionsFilled,
  type AfterBuildProps,
  type ClientManifestEntry,
} from 'vxrn'
import type { RenderApp } from '../types'
import { getManifest } from './getManifest'
import { replaceLoader } from './replaceLoader'

if (!version.startsWith('19.')) {
  console.error(`Must be on React 19, instead found`, version)
  process.exit(1)
}

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
          emptyOutDir: false,
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

  // for the require Sitemap in getRoutes
  globalThis['require'] = createRequire(join(import.meta.url, '..'))

  const assets: OutputAsset[] = []

  const allRoutes: {
    path: string
    htmlPath: string
    clientJsPath: string
    params: Object
    loaderData: any
    preloads: string[]
  }[] = []

  console.info(`\n 🔨 build static routes\n`)
  const entryServer = `${options.root}/dist/server/_virtual_vxs-entry.js`
  const render = (await import(entryServer)).default.render as RenderApp

  const staticDir = join(`dist/static`)
  const clientDir = join(`dist/client`)
  await ensureDir(staticDir)

  const outputEntries = [...props.serverOutput.entries()]

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

    if (!htmlRoute) {
      if (clientManifestKey.startsWith('app')) {
        console.error(` No html route found!`, { id, clientManifestKey })
        console.error(` In manifest`, manifest.htmlRoutes)
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
              const found = props.clientManifest[name]
              if (!found) {
                console.warn(`No found imports`, name, props.clientManifest)
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
          props.clientManifest,
          null,
          2
        )}`
      )
    }

    const entryImports = collectImports(clientManifestEntry || {})

    // TODO isnt this getting all layouts not just the ones for this route?
    const layoutEntries =
      htmlRoute?.layouts?.flatMap((layout) => {
        // TODO hardcoded app/
        const clientKey = `app${layout.contextKey.slice(1)}`
        return props.clientManifest[clientKey]
      }) ?? []

    const layoutImports = layoutEntries.flatMap((entry) => {
      return [entry.file, ...collectImports(entry)]
    })

    const preloads = [
      ...new Set([
        // add the main entry js (like ./app/index.ts)
        clientManifestEntry.file,
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

    const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Object[]

    const relativeId = relative(process.cwd(), id)
      // TODO hardcoded app
      .replace('app/', '/')

    const onlyBuild = props.buildArgs?.only
    if (onlyBuild) {
      if (!MicroMatch.isMatch(relativeId, `**/${onlyBuild}*`)) {
        continue
      }
    }

    console.info(`\n [build] page ${relativeId} (with ${paramsList.length} routes)\n`)

    for (const params of paramsList) {
      const path = getPathnameFromFilePath(relativeId, params)
      const htmlPath = `${path === '/' ? '/index' : path}.html`
      const loaderData = (await exported.loader?.({ path, params })) ?? null
      const clientJsPath = join(`dist/client`, clientManifestEntry.file)

      try {
        console.info(`  ↦ route ${path} params ${JSON.stringify(params)}`)
        const loaderProps = { path, params }

        globalThis['__vxrnLoaderProps__'] = loaderProps

        // importing resetState causes issues :/
        globalThis['__vxrnresetState']?.()

        const html = await render({ path, preloads, loaderProps, loaderData, css: allCSS })

        const filePath = join(staticDir, htmlPath)
        const loaderPartialPath = join(
          staticDir,
          'assets',
          path
            .slice(1)
            .replaceAll('/', '_')
            // remove trailing _
            .replace(/_$/, '') + '_vxrn_loader.js'
        )

        const code = await readFile(clientJsPath, 'utf-8')

        await Promise.all([
          outputFile(toAbsolute(filePath), html),
          outputFile(
            loaderPartialPath,
            replaceLoader({
              code,
              loaderData,
              loaderRegexName: '[a-z]+',
            })
          ),
        ])

        allRoutes.push({
          clientJsPath,
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

  console.info(`\n\n🩶 build complete\n\n`)
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
