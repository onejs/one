import { LOADER_JS_POSTFIX_UNCACHED } from '../constants'
import {
  compileManifest,
  getSubdomain,
  getURLfromRequestURL,
  type RequestHandlers,
  resolveAPIRoute,
  resolveLoaderRoute,
  resolvePageRoute,
} from '../createHandleRequest'
import type { RenderAppProps } from '../types'
import { getPathFromLoaderPath } from '../utils/cleanUrl'
import { isResponse } from '../utils/isResponse'
import { resolveResponse } from '../vite/resolveResponse'
import type { One } from '../vite/types'
import type { RouteInfoCompiled } from './createRoutesManifest'
import { setSSRLoaderData } from './ssrLoaderData'
import { getFetchStaticHtml } from './staticHtmlFetcher'

export type LazyRoutes = {
  serverEntry: () => Promise<{
    default: {
      render: (props: any) => any
      renderStream?: (props: any) => Promise<ReadableStream>
    }
  }>
  pages: Record<string, () => Promise<any>>
  api: Record<string, () => Promise<any>>
  middlewares: Record<string, () => Promise<any>>
}

type WorkerHandlerOptions = {
  oneOptions: One.PluginOptions
  buildInfo: One.BuildInfo
  lazyRoutes: LazyRoutes
}

export function createWorkerHandler(options: WorkerHandlerOptions) {
  const { oneOptions } = options

  // mutable state for route swapping
  let currentLazyRoutes = options.lazyRoutes
  let compiledManifest = compileManifest(options.buildInfo.manifest)
  let routeToBuildInfo = options.buildInfo.routeToBuildInfo
  let routeMap = options.buildInfo.routeMap
  let currentPreloads = options.buildInfo.preloads
  let currentCssPreloads = options.buildInfo.cssPreloads

  const debugRouter = process.env.ONE_DEBUG_ROUTER

  // compile redirects for fast matching
  const redirects = oneOptions.web?.redirects
  let compiledRedirects: Array<{
    regex: RegExp
    destination: string
    permanent: boolean
  }> | null = null

  if (redirects?.length) {
    compiledRedirects = redirects.map((r) => {
      const regexSource = r.source.replace(/:(\w+)/g, (_, name) => `(?<${name}>[^/]+)`)
      return {
        regex: new RegExp(`^${regexSource}$`),
        destination: r.destination,
        permanent: r.permanent || false,
      }
    })
  }

  // pre-computed constants
  const useStreaming = !process.env.ONE_BUFFERED_SSR
  const htmlHeaders = { 'content-type': 'text/html' }
  const ssrHtmlHeaders = { 'content-type': 'text/html', 'cache-control': 'no-cache' }

  // caches
  const loaderCache = new Map<string, Function | null>()
  const moduleImportCache = new Map<string, any>()
  const loaderCacheFnMap = new Map<string, Function | null>()
  const pendingLoaderResults = new Map<
    string,
    { promise: Promise<any>; expires: number }
  >()

  // render entry (lazy loaded from serverEntry)
  let render: ((props: RenderAppProps) => any) | null = null
  let renderStream: ((props: RenderAppProps) => Promise<ReadableStream>) | null = null
  let renderLoading: Promise<void> | null = null
  let renderGeneration = 0

  function ensureRenderLoaded(): void | Promise<void> {
    if (render) return
    if (renderLoading) return renderLoading
    const gen = ++renderGeneration
    renderLoading = (async () => {
      const entry = await currentLazyRoutes.serverEntry()
      // if updateRoutes was called while we were loading, discard stale entry
      if (gen !== renderGeneration) return
      render = entry.default.render as any
      renderStream = (entry.default as any).renderStream || null
    })()
    return renderLoading
  }

  function findNearestNotFoundPath(urlPath: string): string {
    let cur = urlPath
    while (cur) {
      const parent = cur.lastIndexOf('/') > 0 ? cur.slice(0, cur.lastIndexOf('/')) : ''
      if (routeMap[`${parent}/+not-found`]) return `${parent}/+not-found`
      if (!parent) break
      cur = parent
    }
    return '/+not-found'
  }

  function make404LoaderJs(path: string, logReason?: string): string {
    const nfPath = findNearestNotFoundPath(path)
    if (logReason) console.error(`[one] 404 loader for ${path}: ${logReason}`)
    return `export function loader(){return{__oneError:404,__oneErrorMessage:'Not Found',__oneNotFoundPath:${JSON.stringify(nfPath)}}}`
  }

  async function readStaticHtml(htmlPath: string): Promise<string | null> {
    const fetchStaticHtml = getFetchStaticHtml()
    if (fetchStaticHtml) return await fetchStaticHtml(htmlPath)
    if (debugRouter) {
      console.warn(`[one/worker] no fetchStaticHtml set, cannot read ${htmlPath}`)
    }
    return null
  }

  // resolve a route module's loader - sync on cache hit, async on cold start
  function resolveLoaderSync(
    lazyKey: string | undefined
  ): Function | null | Promise<Function | null> {
    const cacheKey = lazyKey || ''
    const cached = loaderCache.get(cacheKey)
    if (cached !== undefined) return cached

    return (async () => {
      let routeExported: any
      if (moduleImportCache.has(cacheKey)) {
        routeExported = moduleImportCache.get(cacheKey)
      } else if (lazyKey && currentLazyRoutes.pages[lazyKey]) {
        routeExported = await currentLazyRoutes.pages[lazyKey]()
        moduleImportCache.set(cacheKey, routeExported)
      } else {
        console.warn(`[one/worker] no lazy route for ${cacheKey}`)
        loaderCache.set(cacheKey, null)
        return null
      }

      const loader = routeExported?.loader || null
      loaderCache.set(cacheKey, loader)
      loaderCacheFnMap.set(cacheKey, routeExported?.loaderCache ?? null)
      return loader
    })()
  }

  // import and run a loader with coalescing support
  async function importAndRunLoader(
    routeId: string,
    lazyKey: string | undefined,
    loaderProps: any
  ): Promise<{ loaderData: unknown; routeId: string; isEnoent?: boolean }> {
    if (!lazyKey) return { loaderData: undefined, routeId }

    // check loaderCache coalescing before resolving
    const cacheMapKey = lazyKey
    const loaderCacheFn = loaderCacheFnMap.get(cacheMapKey)
    let coalFullKey: string | undefined
    let coalTtl = 0

    if (loaderCacheFn) {
      const cacheResult = loaderCacheFn(loaderProps?.params, loaderProps?.request)
      const cacheKey = typeof cacheResult === 'string' ? cacheResult : cacheResult?.key
      coalTtl = typeof cacheResult === 'string' ? 0 : (cacheResult?.ttl ?? 0)

      if (cacheKey != null) {
        coalFullKey = routeId + '\0' + cacheKey
        const existing = pendingLoaderResults.get(coalFullKey)
        if (existing && (!existing.expires || Date.now() < existing.expires)) {
          const loaderData = await existing.promise
          return { loaderData, routeId }
        }
      }
    }

    try {
      const loaderOrPromise = resolveLoaderSync(lazyKey)
      const loader =
        loaderOrPromise instanceof Promise ? await loaderOrPromise : loaderOrPromise
      if (!loader) return { loaderData: undefined, routeId }

      if (coalFullKey) {
        const promise = loader(loaderProps)
        const entry = { promise, expires: 0 }
        pendingLoaderResults.set(coalFullKey, entry)
        promise.then(
          () => {
            entry.expires = coalTtl > 0 ? Date.now() + coalTtl : 0
            if (coalTtl <= 0)
              Promise.resolve().then(() => pendingLoaderResults.delete(coalFullKey!))
          },
          () => pendingLoaderResults.delete(coalFullKey!)
        )
        const loaderData = await promise
        return { loaderData, routeId }
      }

      const loaderData = await loader(loaderProps)
      return { loaderData, routeId }
    } catch (err) {
      if (isResponse(err)) throw err
      if ((err as any)?.code === 'ENOENT')
        return { loaderData: undefined, routeId, isEnoent: true }
      console.error(`[one] Error running loader for ${routeId}:`, err)
      return { loaderData: undefined, routeId }
    }
  }

  // request handlers - worker-only, always uses lazyRoutes
  const requestHandlers: RequestHandlers = {
    async handleStaticFile() {
      // workers serve static assets via platform (ASSETS binding)
      return null
    },

    async handleAPI({ route }) {
      if (currentLazyRoutes.api[route.page]) {
        return await currentLazyRoutes.api[route.page]()
      }
      console.warn(`[one/worker] no lazy API route for ${route.page}`)
      return null
    },

    async loadMiddleware(route) {
      if (currentLazyRoutes.middlewares[route.contextKey]) {
        return await currentLazyRoutes.middlewares[route.contextKey]()
      }
      console.warn(`[one/worker] no lazy middleware for ${route.contextKey}`)
      return null
    },

    async handleLoader({ route, loaderProps }) {
      const routeFile = (route as any).routeFile || route.file

      let loader: Function | null
      try {
        const loaderResult = resolveLoaderSync(routeFile)
        loader = loaderResult instanceof Promise ? await loaderResult : loaderResult
      } catch (err) {
        if ((err as any)?.code === 'ERR_MODULE_NOT_FOUND') return null
        throw err
      }

      if (!loader) return null

      let json
      try {
        json = await loader(loaderProps)
      } catch (err) {
        if ((err as any)?.code === 'ENOENT') {
          return make404LoaderJs(
            loaderProps?.path || '/',
            `ENOENT ${(err as any)?.path || err}`
          )
        }
        throw err
      }

      if (isResponse(json)) throw json
      return `export function loader() { return ${JSON.stringify(json)} }`
    },

    async handlePage({ route, url, loaderProps }) {
      const routeBuildInfo = routeToBuildInfo[route.file]

      if (route.type === 'ssr') {
        if (!routeBuildInfo) {
          console.error(`Error in route`, route)
          throw new Error(
            `No buildinfo found for ${url}, route: ${route.file}, in keys:\n  ${Object.keys(routeToBuildInfo).join('\n  ')}`
          )
        }

        try {
          const layoutRoutes = route.layouts || []

          // fast path: skip layouts with no loader
          const layoutLoaderPromises: Array<ReturnType<typeof importAndRunLoader>> = []
          const noLoaderResults: Array<{
            loaderData: unknown
            routeId: string
          }> = []

          for (const layout of layoutRoutes) {
            const cacheKey = layout.contextKey || ''
            const cachedLoader = loaderCache.get(cacheKey)

            if (cachedLoader === null) {
              noLoaderResults.push({
                loaderData: undefined,
                routeId: layout.contextKey,
              })
            } else {
              layoutLoaderPromises.push(
                importAndRunLoader(layout.contextKey, layout.contextKey, loaderProps)
              )
            }
          }

          const pageLoaderPromise = importAndRunLoader(
            route.file,
            route.file,
            loaderProps
          )

          let layoutResults: Array<{
            loaderData: unknown
            routeId: string
            isEnoent?: boolean
          }>
          let pageResult: {
            loaderData: unknown
            routeId: string
            isEnoent?: boolean
          }

          try {
            if (layoutLoaderPromises.length === 0) {
              layoutResults = noLoaderResults
              pageResult = await pageLoaderPromise
            } else {
              const [asyncLayoutResults, pr] = await Promise.all([
                Promise.all(layoutLoaderPromises),
                pageLoaderPromise,
              ])
              layoutResults = [...noLoaderResults, ...asyncLayoutResults]
              pageResult = pr
            }
          } catch (err) {
            if (isResponse(err)) return err
            throw err
          }

          // loader ENOENT → serve nearest +not-found page
          if (pageResult.isEnoent) {
            const nfPath = findNearestNotFoundPath(loaderProps?.path || '/')
            const nfHtml = routeMap[nfPath]
            if (nfHtml) {
              const html = await readStaticHtml(nfHtml)
              if (html) {
                return new Response(html, {
                  headers: { 'content-type': 'text/html' },
                  status: 404,
                })
              }
            }
            return new Response('404 Not Found', { status: 404 })
          }

          // build matches array (layouts + page)
          const matchPathname = loaderProps?.path || '/'
          const matchParams = loaderProps?.params || {}
          const matches: One.RouteMatch[] = new Array(layoutResults.length + 1)
          for (let i = 0; i < layoutResults.length; i++) {
            const result = layoutResults[i]
            matches[i] = {
              routeId: result.routeId,
              pathname: matchPathname,
              params: matchParams,
              loaderData: result.loaderData,
            }
          }
          matches[layoutResults.length] = {
            routeId: pageResult.routeId,
            pathname: matchPathname,
            params: matchParams,
            loaderData: pageResult.loaderData,
          }

          const loaderData = pageResult.loaderData

          // populate per-loader WeakMap for layout useLoader
          for (const layout of layoutRoutes) {
            const key = layout.contextKey
            const loaderFn = loaderCache.get(key)
            if (loaderFn) {
              const result = layoutResults.find((r) => r.routeId === key)
              if (result) setSSRLoaderData(loaderFn, result.loaderData)
            }
          }
          const pageLoaderFn = loaderCache.get(route.file)
          if (pageLoaderFn) setSSRLoaderData(pageLoaderFn, pageResult.loaderData)

          globalThis['__vxrnresetState']?.()

          const renderProps = {
            mode: route.type,
            loaderData,
            loaderProps,
            path: loaderProps?.path || '/',
            preloads: routeBuildInfo.criticalPreloads || routeBuildInfo.preloads,
            deferredPreloads: routeBuildInfo.deferredPreloads,
            css: routeBuildInfo.css,
            cssContents: routeBuildInfo.cssContents,
            matches,
          }

          const _rl = ensureRenderLoaded()
          if (_rl) await _rl

          const status = route.isNotFound ? 404 : 200
          const responseHeaders = route.isNotFound ? htmlHeaders : ssrHtmlHeaders

          if (useStreaming) {
            const stream = await renderStream!(renderProps)
            return new Response(stream, { headers: responseHeaders, status })
          }

          const rendered = await render!(renderProps)
          return new Response(rendered, { headers: responseHeaders, status })
        } catch (err) {
          if (isResponse(err)) return err
          console.error(
            `[one] Error rendering SSR route ${route.file}\n${err?.['stack'] ?? err}\nurl: ${url}`
          )
          return null
        }
      } else {
        // SPA/SSG handling
        const layoutRoutes = route.layouts || []
        const needsSpaShell =
          route.type === 'spa' &&
          layoutRoutes.some(
            (layout: any) =>
              layout.layoutRenderMode === 'ssg' || layout.layoutRenderMode === 'ssr'
          )

        if (needsSpaShell) {
          try {
            const layoutResults = await Promise.all(
              layoutRoutes.map((layout: any) =>
                importAndRunLoader(layout.contextKey, layout.contextKey, loaderProps)
              )
            )

            const matches: One.RouteMatch[] = layoutResults.map((result) => ({
              routeId: result.routeId,
              pathname: loaderProps?.path || '/',
              params: loaderProps?.params || {},
              loaderData: result.loaderData,
            }))

            globalThis['__vxrnresetState']?.()

            const _rl = ensureRenderLoaded()
            if (_rl) await _rl

            const spaRouteBuildInfo = routeToBuildInfo[route.file]
            const rendered = await render!({
              mode: 'spa-shell',
              loaderData: undefined,
              loaderProps,
              path: loaderProps?.path || '/',
              preloads:
                spaRouteBuildInfo?.criticalPreloads || spaRouteBuildInfo?.preloads,
              deferredPreloads: spaRouteBuildInfo?.deferredPreloads,
              css: spaRouteBuildInfo?.css,
              cssContents: spaRouteBuildInfo?.cssContents,
              matches,
            })

            return new Response(rendered, {
              headers: htmlHeaders,
              status: route.isNotFound ? 404 : 200,
            })
          } catch (err) {
            if (isResponse(err)) return err
            console.error(
              `[one] Error rendering spa-shell for ${route.file}\n${err?.['stack'] ?? err}\nurl: ${url}`
            )
          }
        }

        // static HTML lookup for SPA/SSG
        const isDynamicRoute = Object.keys(route.routeKeys).length > 0
        const routeCleanPath = route.urlCleanPath.replace(/\?/g, '')
        const notFoundKey = route.isNotFound
          ? route.page.replace(/\[([^\]]+)\]/g, ':$1')
          : null

        const htmlPath = notFoundKey
          ? routeMap[notFoundKey]
          : isDynamicRoute
            ? routeMap[routeCleanPath] || routeMap[url.pathname]
            : routeMap[url.pathname] || routeMap[routeBuildInfo?.cleanPath]

        if (htmlPath) {
          const html = await readStaticHtml(htmlPath)
          if (html) {
            return new Response(html, {
              headers: htmlHeaders,
              status: route.isNotFound ? 404 : 200,
            })
          }
        }

        // dynamic route with no static HTML → 404
        if (isDynamicRoute) {
          const notFoundRoute = findNearestNotFoundPath(url.pathname)
          const notFoundHtmlPath = routeMap[notFoundRoute]

          if (notFoundHtmlPath) {
            const notFoundHtml = await readStaticHtml(notFoundHtmlPath)
            if (notFoundHtml) {
              const notFoundMarker = `<script>window.__one404=${JSON.stringify({ originalPath: url.pathname, notFoundPath: notFoundRoute })}</script>`
              const injectedHtml = notFoundHtml.includes('</head>')
                ? notFoundHtml.replace('</head>', `${notFoundMarker}</head>`)
                : notFoundHtml.replace('<body', `${notFoundMarker}<body`)

              return new Response(injectedHtml, {
                headers: htmlHeaders,
                status: 404,
              })
            }
          }

          return new Response('404 Not Found', { status: 404 })
        }

        return null
      }
    },
  }

  // set cache headers based on route type
  function setCacheHeaders(
    response: Response,
    route: RouteInfoCompiled,
    isAPI: boolean
  ): Response {
    if (
      !response.headers.has('cache-control') &&
      !response.headers.has('Cache-Control')
    ) {
      try {
        if (isAPI) {
          response.headers.set('cache-control', 'no-store')
        } else if (route.type === 'ssg' || route.type === 'spa') {
          response.headers.set(
            'cache-control',
            'public, s-maxage=60, stale-while-revalidate=120'
          )
        } else {
          response.headers.set('cache-control', 'no-cache')
        }
      } catch {
        // headers might be immutable on some responses
      }
    }
    return response
  }

  // the main fetch handler - matches request to route and dispatches
  async function handleRequest(
    request: Request,
    env?: unknown,
    executionCtx?: unknown
  ): Promise<Response | null> {
    const url = getURLfromRequestURL(request)
    const pathname = url.pathname
    const method = request.method

    // 1. redirects
    if (compiledRedirects) {
      for (const redirect of compiledRedirects) {
        const match = redirect.regex.exec(pathname)
        if (match) {
          let destination = redirect.destination
          if (match.groups) {
            for (const [name, value] of Object.entries(match.groups)) {
              destination = destination.replace(`:${name}`, value)
            }
          }
          if (debugRouter) console.info(`[one] ↪ redirect ${pathname} → ${destination}`)
          return new Response(null, {
            status: redirect.permanent ? 301 : 302,
            headers: {
              location: new URL(destination, url.origin).toString(),
            },
          })
        }
      }
    }

    // 2. preload endpoints (empty response if no preload exists).
    // match by regex, not exact `_<CACHE_KEY>_preload.js` suffix: when
    // ONE_CACHE_KEY isn't pinned in the runtime env the server's
    // CACHE_KEY drifts from the deployed bundle's, so an exact-suffix
    // check misses every client preload request and falls through to a
    // static 404. the manifest lookup still keys on the full path, so a
    // drifted / dynamic-segment request just takes the graceful-empty
    // branch below.
    if (/_\d+_preload\.js$/.test(pathname)) {
      if (!currentPreloads[pathname]) {
        return new Response('', {
          headers: { 'Content-Type': 'text/javascript' },
        })
      }
      // preload exists - let platform serve the static file
      return null
    }

    if (/_\d+_preload_css\.js$/.test(pathname)) {
      if (!currentCssPreloads?.[pathname]) {
        return new Response('export default Promise.resolve()', {
          headers: { 'Content-Type': 'text/javascript' },
        })
      }
      return null
    }

    // 3. loader refetch requests
    if (pathname.endsWith(LOADER_JS_POSTFIX_UNCACHED)) {
      const originalUrl = getPathFromLoaderPath(pathname)

      for (const route of compiledManifest.pageRoutes) {
        if (route.file === '') continue
        if (!route.compiledRegex.test(originalUrl)) continue

        // ssg dynamic route not in routeMap → 404
        if (
          route.type === 'ssg' &&
          Object.keys(route.routeKeys).length > 0 &&
          !routeMap[originalUrl]
        ) {
          return new Response(make404LoaderJs(originalUrl, 'ssg route not in routeMap'), {
            headers: { 'Content-Type': 'text/javascript' },
          })
        }

        // route is known to export no loader → return empty module without
        // importing the page bundle. evaluating the server bundle for a no-loader
        // SSG page inside workerd can crash when the page pulls in RN/Tamagui
        // modules that aren't compatible with the workers runtime.
        if (route.hasLoader === false) {
          return new Response('export function loader() { return undefined }', {
            headers: { 'Content-Type': 'text/javascript' },
          })
        }

        const loaderRoute = {
          ...route,
          routeFile: route.file,
          file: (route as any).loaderServerPath || pathname,
        }

        const finalUrl = new URL(originalUrl, url.origin)
        finalUrl.search = url.search
        const cleanedRequest = new Request(finalUrl, request)

        try {
          return await resolveLoaderRoute(
            requestHandlers,
            cleanedRequest,
            finalUrl,
            loaderRoute as any
          )
        } catch (err) {
          if ((err as any)?.code === 'ERR_MODULE_NOT_FOUND') {
            return new Response('export function loader() { return undefined }', {
              headers: { 'Content-Type': 'text/javascript' },
            })
          }
          console.error(`Error running loader: ${err}`)
          return null
        }
      }

      return null
    }

    // 4. skip plain .js/.css (let platform serve static assets)
    if (pathname.endsWith('.js') || pathname.endsWith('.css')) {
      return null
    }

    // 5. API routes (any method)
    for (const route of compiledManifest.apiRoutes) {
      if (route.compiledRegex.test(pathname)) {
        if (debugRouter)
          console.info(`[one] ⚡ ${pathname} → matched API route: ${route.page}`)
        const response = await resolveAPIRoute(
          requestHandlers,
          request,
          url,
          route,
          env,
          executionCtx
        )
        if (response && isResponse(response)) {
          return setCacheHeaders(response, route, true)
        }
        return null
      }
    }

    // 6. page routes (GET only)
    if (method === 'GET') {
      for (const route of compiledManifest.pageRoutes) {
        if (!route.compiledRegex.test(pathname)) continue

        if (debugRouter) {
          console.info(
            `[one] ⚡ ${pathname} → matched page route: ${route.page} (${route.type})`
          )
        }

        // fast path: SSR without middleware
        if (route.type === 'ssr' && !route.middlewares?.length) {
          const params: Record<string, string> = {}
          const match = route.compiledRegex.exec(pathname)
          if (match?.groups) {
            for (const [key, value] of Object.entries(match.groups)) {
              params[route.routeKeys[key]] = value as string
            }
          }

          const loaderProps = {
            path: pathname,
            search: url.search,
            subdomain: getSubdomain(url),
            request,
            params,
          }

          const response = await resolveResponse(async () => {
            try {
              return await requestHandlers.handlePage!({
                request,
                route,
                url,
                loaderProps,
              })
            } catch (err) {
              if (isResponse(err)) return err as Response
              throw err
            }
          })

          if (response && isResponse(response)) {
            return setCacheHeaders(response, route, false)
          }
          return null
        }

        // general path
        try {
          const response = await resolvePageRoute(requestHandlers, request, url, route)
          if (response && isResponse(response)) {
            return setCacheHeaders(response, route, false)
          }
        } catch (err) {
          console.error(` [one] Error handling request: ${(err as any)['stack']}`)
        }

        return null
      }
    }

    return null
  }

  function updateRoutes(newBuildInfo: One.BuildInfo, newLazyRoutes?: LazyRoutes) {
    compiledManifest = compileManifest(newBuildInfo.manifest)
    routeToBuildInfo = newBuildInfo.routeToBuildInfo
    routeMap = newBuildInfo.routeMap
    currentPreloads = newBuildInfo.preloads
    currentCssPreloads = newBuildInfo.cssPreloads
    if (newLazyRoutes) currentLazyRoutes = newLazyRoutes

    // clear all caches
    loaderCache.clear()
    moduleImportCache.clear()
    loaderCacheFnMap.clear()
    pendingLoaderResults.clear()
    render = null
    renderStream = null
    renderLoading = null
  }

  return { handleRequest, updateRoutes }
}
