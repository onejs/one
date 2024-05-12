import { build as esbuild } from 'esbuild'
import FSExtra from 'fs-extra'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import Path, { join } from 'node:path'
import type { OutputAsset, OutputChunk } from 'rollup'
import { getHtml, getOptionsFilled, type VXRNConfig } from 'vxrn'
// import { resetState } from '../global-state/useInitializeExpoRouter'

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch {
    return require.resolve(path)
  }
}

const { ensureDir, existsSync, readFile, outputFile } = FSExtra

export async function build(optionsIn: VXRNConfig, serverOutput: (OutputChunk | OutputAsset)[]) {
  const options = await getOptionsFilled(optionsIn)
  const toAbsolute = (p) => Path.resolve(options.root, p)

  const staticDir = toAbsolute(`dist/static`)
  await ensureDir(staticDir)
  const template = fs.readFileSync(toAbsolute('index.html'), 'utf-8')

  const entryServer = `${options.root}/dist/server/entry-server.js`
  console.info(`import entry-server`, entryServer)

  // for the require Sitemap in getRoutes
  globalThis['require'] = createRequire(join(import.meta.url, '..'))

  const render = (await import(entryServer)).render

  const assets: OutputAsset[] = []

  const allRoutes: {
    path: string
    params: Object
    loaderData: any
  }[] = []

  // const manifest = getManifest(join(options.root, 'app'))!
  // for (const { page } of manifest.htmlRoutes) {
  //   const outFile = join('dist/static/_vxrn', page.replace(/\/index$/, '/'), 'route.js')
  //   console.info('generate js partial', outFile)
  // }

  for (const output of serverOutput) {
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

    const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Object[]

    console.info(` [build] ${id} with params`, paramsList)

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
  const tmpCssFile = Path.join(tmpdir(), 'tmp.css')
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
  const cssString = await readFile(tmpCssFile, 'utf-8')

  // pre-render each route...
  for (const { path, loaderData, params } of allRoutes) {
    try {
      const loaderProps = { params }
      globalThis['__vxrnLoaderProps__'] = loaderProps

      globalThis['__vxrnresetState']?.()

      const { appHtml, headHtml } = await render({ path })

      // output the static js (for client side navigation)

      // output the static html
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
