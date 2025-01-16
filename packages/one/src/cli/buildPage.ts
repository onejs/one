import FSExtra from 'fs-extra'
import { join } from 'node:path'
import * as constants from '../constants'
import type { RouteInfo } from '../server/createRoutesManifest'
import type { LoaderProps, RenderApp } from '../types'
import { getLoaderPath, getPreloadPath } from '../utils/cleanUrl'
import { toAbsolute } from '../utils/toAbsolute'
import { replaceLoader } from '../vite/replaceLoader'
import type { One } from '../vite/types'

const { readFile, outputFile } = FSExtra

export async function buildPage(
  serverEntry: string,
  path: string,
  relativeId: string,
  params: any,
  foundRoute: RouteInfo<string>,
  clientManifestEntry: any,
  staticDir: string,
  clientDir: string,
  builtMiddlewares: Record<string, string>,
  serverJsPath: string,
  preloads: string[],
  allCSS: string[]
): Promise<One.RouteBuildInfo> {
  const render = await getRender(serverEntry)
  const htmlPath = `${path.endsWith('/') ? `${removeTrailingSlash(path)}/index` : path}.html`
  const clientJsPath = join(`dist/client`, clientManifestEntry.file)
  const htmlOutPath = toAbsolute(join(staticDir, htmlPath))
  const preloadPath = getPreloadPath(path)

  let loaderData = {}

  try {
    // todo await optimize
    await FSExtra.writeFile(
      join(clientDir, preloadPath),
      preloads.map((preload) => `import "${preload}"`).join('\n')
    )

    const exported = await import(toAbsolute(serverJsPath))

    if (exported.loader) {
      loaderData = (await exported.loader?.({ path, params })) ?? null
      const code = await readFile(clientJsPath, 'utf-8')
      const withLoader =
        // super dirty to quickly make ssr loaders work until we have better
        `
if (typeof document === 'undefined') globalThis.document = {}
` +
        replaceLoader({
          code,
          loaderData,
        })
      const loaderPartialPath = join(clientDir, getLoaderPath(path))
      await outputFile(loaderPartialPath, withLoader)
    }

    // ssr, we basically skip at build-time and just compile it the js we need
    if (foundRoute.type !== 'ssr') {
      const loaderProps: LoaderProps = { path, params }
      // importing resetState causes issues :/
      globalThis['__vxrnresetState']?.()

      if (foundRoute.type === 'ssg') {
        const html = await render({
          path,
          preloads,
          loaderProps,
          loaderData,
          css: allCSS,
          mode: 'ssg',
        })
        await outputFile(htmlOutPath, html)
      } else if (foundRoute.type === 'spa') {
        await outputFile(
          htmlOutPath,
          `<html><head>
          ${constants.getSpaHeaderElements({ serverContext: { loaderProps, loaderData } })}
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

loaderData:\n\n${JSON.stringify(loaderData || null, null, 2)}
params:\n\n${JSON.stringify(params || null, null, 2)}`
    )
    console.error(err)
    process.exit(1)
  }

  const middlewares = (foundRoute.middlewares || []).map((x) => builtMiddlewares[x.contextKey])

  const cleanPath = path === '/' ? path : removeTrailingSlash(path)

  return {
    type: foundRoute.type,
    routeFile: foundRoute.file,
    middlewares,
    cleanPath,
    preloadPath,
    clientJsPath,
    serverJsPath,
    htmlPath,
    loaderData,
    params,
    path,
    preloads,
  }
}

async function getRender(serverEntry: string) {
  let render: RenderApp | null = null

  try {
    const serverImport = await import(serverEntry)

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
    console.error(`  This error happened in the built file: ${serverEntry}`)
    // @ts-expect-error
    console.error(err['stack'])
    process.exit(1)
  }

  return render
}

function removeTrailingSlash(path: string) {
  return path.endsWith('/') ? path.slice(0, path.length - 1) : path
}
