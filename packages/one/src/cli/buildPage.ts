import { join } from 'node:path'
import FSExtra from 'fs-extra'
import * as constants from '../constants'
import type { LoaderProps, RenderApp } from '../types'
import { getLoaderPath, getPreloadPath, getPreloadCSSPath } from '../utils/cleanUrl'
import { isResponse } from '../utils/isResponse'
import { toAbsolute } from '../utils/toAbsolute'
import { replaceLoader } from '../vite/replaceLoader'
import type { One, RouteInfo } from '../vite/types'

const { readFile, outputFile } = FSExtra

// Convert URL path (with forward slashes) to filesystem path for cross-platform compatibility
function urlPathToFilePath(urlPath: string): string {
  // Remove leading slash and split by forward slash (URL separator)
  const parts = urlPath.replace(/^\//, '').split('/')
  return join(...parts)
}

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
  allCSSContents?: string[],
  criticalPreloads?: string[],
  deferredPreloads?: string[],
  useAfterLCP?: boolean,
  useAfterLCPAggressive?: boolean
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

    await FSExtra.writeFile(
      join(clientDir, urlPathToFilePath(preloadPath)),
      preloadContent
    )

    // Generate CSS preload file with prefetch (on hover) and inject (on navigation) functions
    // Deduplicate CSS URLs to avoid loading the same file multiple times
    const uniqueCSS = [...new Set(allCSS)]
    const cssPreloadContent = `
const CSS_TIMEOUT = 1000
const cssUrls = ${JSON.stringify(uniqueCSS)}

// Global cache for loaded CSS - avoids DOM queries and tracks across navigations
const loaded = (window.__oneLoadedCSS ||= new Set())

// Prefetch CSS without applying - called on link hover
export function prefetchCSS() {
  cssUrls.forEach(href => {
    if (loaded.has(href)) return
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
    // Skip if already loaded
    if (loaded.has(href)) return Promise.resolve()
    // Remove any prefetch link for this href
    const prefetchLink = document.querySelector(\`link[rel="prefetch"][href="\${href}"]\`)
    if (prefetchLink) prefetchLink.remove()
    // Skip if stylesheet already exists in DOM
    if (document.querySelector(\`link[rel="stylesheet"][href="\${href}"]\`)) {
      loaded.add(href)
      return Promise.resolve()
    }
    return new Promise(resolve => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      const timeoutId = setTimeout(() => {
        console.warn('[one] CSS load timeout:', href)
        loaded.add(href)
        resolve()
      }, CSS_TIMEOUT)
      link.onload = link.onerror = () => {
        clearTimeout(timeoutId)
        loaded.add(href)
        resolve()
      }
      document.head.appendChild(link)
    })
  }))
}

// For backwards compatibility, also prefetch on import
prefetchCSS()
`
    await FSExtra.writeFile(
      join(clientDir, urlPathToFilePath(cssPreloadPath)),
      cssPreloadContent
    )

    const exported = await import(toAbsolute(serverJsPath))

    if (exported.loader) {
      try {
        loaderData = (await exported.loader?.({ path, params })) ?? null
      } catch (err) {
        // Handle thrown responses (e.g., redirect) - skip loader data generation for this page
        // The redirect will happen at runtime instead
        if (isResponse(err)) {
          // Keep loaderData as empty object, the redirect will happen at runtime
        } else {
          throw err
        }
      }

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
      const loaderPartialPath = join(clientDir, urlPathToFilePath(getLoaderPath(path)))
      await outputFile(loaderPartialPath, withLoader)
      loaderPath = getLoaderPath(path)
    }

    // ssr, we basically skip at build-time and just compile it the js we need
    if (foundRoute.type !== 'ssr') {
      const loaderProps: LoaderProps = { path, params }
      // importing resetState causes issues :/
      globalThis['__vxrnresetState']?.()

      if (foundRoute.type === 'ssg') {
        // Aggressive mode: only modulepreload critical scripts, skip deferred to prevent network saturation
        // Regular after-lcp mode: modulepreload all scripts for parallel downloads, defer execution
        // Default: all scripts load normally
        const renderPreloads = criticalPreloads || preloads
        const renderDeferredPreloads = useAfterLCPAggressive ? [] : deferredPreloads

        let html = await render({
          path,
          preloads: renderPreloads,
          deferredPreloads: renderDeferredPreloads,
          loaderProps,
          loaderData,
          css: allCSS,
          cssContents: allCSSContents,
          mode: 'ssg',
          routePreloads,
        })

        // Apply after-LCP script loading if enabled
        // Load all preloads (not just critical) to ensure good TTI after first paint
        if (useAfterLCP) {
          html = applyAfterLCPScriptLoad(html, preloads)
        }

        await outputFile(htmlOutPath, html)
      } else if (foundRoute.type === 'spa') {
        // Generate CSS - either inline styles or link tags
        const cssOutput = allCSSContents
          ? allCSSContents
              .filter(Boolean)
              .map((content) => `    <style>${content}</style>`)
              .join('\n')
          : allCSS.map((file) => `    <link rel="stylesheet" href=${file} />`).join('\n')

        // Use separated preloads if available
        const criticalScripts = (criticalPreloads || preloads)
          .map((preload) => `   <script type="module" src="${preload}"></script>`)
          .join('\n')

        // Non-critical scripts as modulepreload hints only
        const deferredLinks = (deferredPreloads || [])
          .map(
            (preload) =>
              `   <link rel="modulepreload" fetchPriority="low" href="${preload}"/>`
          )
          .join('\n')

        await outputFile(
          htmlOutPath,
          `<html><head>
          ${constants.getSpaHeaderElements({ serverContext: { loaderProps, loaderData } })}
          ${criticalScripts}
          ${deferredLinks}
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

  const middlewares = (foundRoute.middlewares || []).map(
    (x) => builtMiddlewares[x.contextKey]
  )

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
    criticalPreloads,
    deferredPreloads,
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

/**
 * Transforms HTML to delay script execution until after first paint.
 * Keeps modulepreload links so critical scripts download in parallel.
 * Removes async script tags and adds a loader that executes scripts after paint.
 */
function applyAfterLCPScriptLoad(html: string, preloads: string[]): string {
  // Remove all <script type="module" ... async> tags (prevents immediate execution)
  // Keep modulepreload links so critical scripts download in parallel
  html = html.replace(/<script\s+type="module"[^>]*async[^>]*><\/script>/gi, '')

  // Create the loader script
  // Nested setTimeout yields to event loop multiple times, letting browser settle before loading scripts
  const loaderScript = `
<script>
(function() {
  var scripts = ${JSON.stringify(preloads)};
  function loadScripts() {
    scripts.forEach(function(src) {
      var script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      document.head.appendChild(script);
    });
  }
  function waitIdle(n) {
    if (n <= 0) {
      requestAnimationFrame(function() {
        requestAnimationFrame(loadScripts);
      });
      return;
    }
    setTimeout(function() {
      setTimeout(function() {
        waitIdle(n - 1);
      }, 0);
    }, 0);
  }
  waitIdle(5);
})();
</script>`

  // Insert the loader script before </head>
  html = html.replace('</head>', `${loaderScript}</head>`)

  return html
}
