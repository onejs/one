import { join } from 'node:path'
import FSExtra from 'fs-extra'
import * as constants from '../constants'
import type { LoaderProps, RenderApp } from '../types'
import { getLoaderPath, getPreloadPath, getPreloadCSSPath } from '../utils/cleanUrl'
import { toAbsolute } from '../utils/toAbsolute'
import { replaceLoader } from '../vite/replaceLoader'
import type { One, RouteInfo } from '../vite/types'

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
  allCSS: string[],
  routePreloads: Record<string, string>,
  allCSSContents?: string[]
): Promise<One.RouteBuildInfo> {
  const render = await getRender(serverEntry)
  const htmlPath = `${path.endsWith('/') ? `${removeTrailingSlash(path)}/index` : path}.html`
  const clientJsPath = join(`dist/client`, clientManifestEntry.file)
  const htmlOutPath = toAbsolute(join(staticDir, htmlPath))
  const preloadPath = getPreloadPath(path)
  const cssPreloadPath = getPreloadCSSPath(path)

  let loaderPath = ''

  let loaderData = {}

  try {
    // generate preload file with route module registration
    const routeImports: string[] = []
    const routeRegistrations: string[] = []
    let routeIndex = 0

    for (const [routeKey, bundlePath] of Object.entries(routePreloads)) {
      const varName = `_r${routeIndex++}`
      routeImports.push(`import * as ${varName} from "${bundlePath}"`)
      routeRegistrations.push(`registerPreloadedRoute("${routeKey}", ${varName})`)
    }

    // Use window global for registration since ES module exports get tree-shaken
    const registrationCalls = routeRegistrations.map((call) =>
      call.replace('registerPreloadedRoute(', 'window.__oneRegisterPreloadedRoute(')
    )

    const preloadContent = [
      // import all route modules
      ...routeImports,
      // static imports for cache warming (original behavior)
      ...preloads.map((preload) => `import "${preload}"`),
      // register all route modules using window global
      ...registrationCalls,
    ].join('\n')

    await FSExtra.writeFile(join(clientDir, preloadPath), preloadContent)

    // Generate CSS preload file with prefetch (on hover) and inject (on navigation) functions
    const cssPreloadContent = `
const CSS_TIMEOUT = 1000
const cssUrls = ${JSON.stringify(allCSS)}

// Prefetch CSS without applying - called on link hover
export function prefetchCSS() {
  cssUrls.forEach(href => {
    if (document.querySelector(\`link[href="\${href}"]\`)) return
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'style'
    link.href = href
    document.head.appendChild(link)
  })
}

// Inject CSS to apply styles - called on actual navigation
export function injectCSS() {
  return Promise.all(cssUrls.map(href => {
    // Remove any prefetch link for this href
    const prefetchLink = document.querySelector(\`link[rel="prefetch"][href="\${href}"]\`)
    if (prefetchLink) prefetchLink.remove()
    // Skip if stylesheet already exists
    if (document.querySelector(\`link[rel="stylesheet"][href="\${href}"]\`)) return Promise.resolve()
    return new Promise(resolve => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = link.onerror = resolve
      document.head.appendChild(link)
      setTimeout(() => {
        console.warn('[one] CSS load timeout:', href)
        resolve()
      }, CSS_TIMEOUT)
    })
  }))
}

// For backwards compatibility, also prefetch on import
prefetchCSS()
`
    await FSExtra.writeFile(join(clientDir, cssPreloadPath), cssPreloadContent)

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
      loaderPath = getLoaderPath(path)
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
          cssContents: allCSSContents,
          mode: 'ssg',
          routePreloads,
        })
        await outputFile(htmlOutPath, html)
      } else if (foundRoute.type === 'spa') {
        // Generate CSS - either inline styles or link tags
        const cssOutput = allCSSContents
          ? allCSSContents
              .filter(Boolean)
              .map((content) => `    <style>${content}</style>`)
              .join('\n')
          : allCSS.map((file) => `    <link rel="stylesheet" href=${file} />`).join('\n')

        await outputFile(
          htmlOutPath,
          `<html><head>
          ${constants.getSpaHeaderElements({ serverContext: { loaderProps, loaderData } })}
          ${preloads
            .map((preload) => `   <script type="module" src="${preload}"></script>`)
            .join('\n')}
          ${cssOutput}
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
    css: allCSS,
    cssContents: allCSSContents,
    routeFile: foundRoute.file,
    middlewares,
    cleanPath,
    preloadPath,
    cssPreloadPath,
    loaderPath,
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
