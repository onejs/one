import { build as esbuild } from 'esbuild'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { mergeConfig, build as viteBuild, type UserConfig } from 'vite'
import FSExtra from 'fs-extra'
import type { OutputAsset, OutputChunk, RollupOutput } from 'rollup'
import type { VXRNConfig } from '../types'
import { getBaseViteConfig } from '../utils/getBaseViteConfig'
import { getHtml } from '../utils/getHtml'
import { getOptimizeDeps } from '../utils/getOptimizeDeps'
import { getOptionsFilled, type VXRNConfigFilled } from '../utils/getOptionsFilled'

Error.stackTraceLimit = Infinity

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch {
    return require.resolve(path)
  }
}

const { ensureDir, existsSync, readFile, pathExists } = FSExtra

type BuildOptions = { step?: string; page?: string }

// web only for now

// TODO:
//  - make this only build native or web bundles
//  - move router stuff into router package
//  - generateStaticPages becomes a vite 'post' postbuild callback in router plugin

export const build = async (optionsIn: VXRNConfig, buildOptions: BuildOptions = {}) => {
  const options = await getOptionsFilled(optionsIn)

  // TODO?
  process.env.NODE_ENV = 'production'

  const { optimizeDeps } = getOptimizeDeps('build')

  let webBuildConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'production',
    }),
    {
      root: options.root,
      clearScreen: false,
      optimizeDeps,
    }
  ) satisfies UserConfig

  if (options.webConfig) {
    webBuildConfig = mergeConfig(webBuildConfig, options.webConfig) as any
  }

  if (buildOptions.step !== 'generate') {
    console.info(`build client`)
    await viteBuild(
      mergeConfig(webBuildConfig, {
        build: {
          ssrManifest: true,
          outDir: 'dist/client',
        },
      } satisfies UserConfig)
    )
  }

  console.info(`build server`)
  const { output } = (await viteBuild(
    mergeConfig(webBuildConfig, {
      // optimizeDeps: {
      //   esbuildOptions: {
      //     format: 'cjs',
      //   },
      // },

      ssr: {
        noExternal: optimizeDeps.include,
        optimizeDeps,
      },

      build: {
        // we want one big file of css
        cssCodeSplit: false,
        ssr: 'src/entry-server.tsx',
        outDir: 'dist/server',
        rollupOptions: {
          external: [],
        },
      },
    } satisfies UserConfig)
  )) as RollupOutput

  console.info(`generating static pages`)
  await generateStaticPages(options, output)
}

async function generateStaticPages(
  options: VXRNConfigFilled,
  serverOutput: (OutputChunk | OutputAsset)[]
) {
  const toAbsolute = (p) => path.resolve(options.root, p)

  const staticDir = toAbsolute(`dist/static`)
  await ensureDir(staticDir)
  const template = fs.readFileSync(toAbsolute('index.html'), 'utf-8')

  const render = (await import(`${options.root}/dist/server/entry-server.js`)).render

  // load routes
  // const entry = serverOutput.find(
  //   (x) => x.type === 'chunk' && x.facadeModuleId?.includes('entry-server')
  // )

  const assets: OutputAsset[] = []

  const allRoutes: {
    path: string
    params: Object
    loaderData: any
  }[] = []

  for (const output of serverOutput) {
    if (output.type === 'asset') {
      assets.push(output)
      continue
    }

    const id = output.facadeModuleId || ''
    const file = path.basename(id)
    const name = file.replace(/\.[^/.]+$/, '')

    if (!id || file[0] === '_' || file.includes('entry-server')) {
      continue
    }
    if (id.includes('+api')) {
      continue
    }

    const endpointPath = path.join(options.root, 'dist/server', output.fileName)

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

    const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Object[]

    for (const params of paramsList) {
      const path = getUrl(params)
      const loaderData = (await exported.loader?.({ path, params })) ?? {}
      allRoutes.push({ path, params, loaderData })
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

  // can build them in parallel
  // const allRoutes = (
  //   await Promise.all(
  //   )
  // ).flat()

  // for now just inline
  const cssStringRaw = assets
    .filter((x) => x.name?.endsWith('.css'))
    .map((x) => x.source)
    .join('\n\n')

  // awkward way to get prefixes:
  const tmpCssFile = path.join(tmpdir(), 'tmp.css')
  await FSExtra.writeFile(tmpCssFile, cssStringRaw, 'utf-8')
  await esbuild({
    entryPoints: [tmpCssFile],
    target: 'safari17',
    bundle: true,
    minifyWhitespace: true,
    sourcemap: false,
    outfile: tmpCssFile,
    loader: { '.css': 'css' },
  })
  const cssString = await FSExtra.readFile(tmpCssFile, 'utf-8')

  // pre-render each route...
  for (const { path, loaderData, params } of allRoutes) {
    try {
      const loaderProps = { params }
      globalThis['__vxrnLoaderProps__'] = loaderProps
      console.info(`render`, path)
      const { appHtml, headHtml } = await render({ path })
      const slashFileName = `${path === '/' ? '/index' : path}.html`
      const clientHtmlPath = toAbsolute(`dist/client${slashFileName}`)
      const clientHtml = existsSync(clientHtmlPath) ? await readFile(clientHtmlPath, 'utf-8') : null
      const html = getHtml({
        template: clientHtml || template,
        appHtml,
        headHtml,
        loaderData,
        loaderProps,
        css: cssString,
      })
      const filePath = toAbsolute(`dist/static${slashFileName}`)
      fs.writeFileSync(toAbsolute(filePath), html)
    } catch (err) {
      throw new Error(
        `Error building static page: ${path} with:
  loaderData: ${JSON.stringify(loaderData || null)}
  params: ${JSON.stringify(params || null)}`,
        {
          cause: err,
        }
      )
    }
  }
}
