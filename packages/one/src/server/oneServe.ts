import type { Hono, MiddlewareHandler } from 'hono'
import type { BlankEnv } from 'hono/types'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  CSS_PRELOAD_JS_POSTFIX,
  LOADER_JS_POSTFIX_UNCACHED,
  PRELOAD_JS_POSTFIX,
} from '../constants'
import {
  compileManifest,
  getURLfromRequestURL,
  type RequestHandlers,
  runMiddlewares,
} from '../createHandleRequest'
import type { RenderAppProps } from '../types'
import { getPathFromLoaderPath } from '../utils/cleanUrl'
import { toAbsolute } from '../utils/toAbsolute'
import type { One } from '../vite/types'
import type { RouteInfoCompiled } from './createRoutesManifest'
import { setSSRLoaderData } from './ssrLoaderData'
import { getFetchStaticHtml } from './staticHtmlFetcher'

const debugRouter = process.env.ONE_DEBUG_ROUTER

async function readStaticHtml(htmlPath: string, outDir = 'dist'): Promise<string | null> {
  const fetchStaticHtml = getFetchStaticHtml()
  if (fetchStaticHtml) {
    const html = await fetchStaticHtml(htmlPath)
    if (html) return html
  }
  try {
    return await readFile(join(`${outDir}/client`, htmlPath), 'utf-8')
  } catch {
    return null
  }
}

/**
 * Lazy import functions for route modules.
 * Modules are loaded on-demand when a route is matched, not all upfront.
 */
type LazyRoutes = {
  serverEntry: () => Promise<{ default: { render: (props: any) => any } }>
  pages: Record<string, () => Promise<any>>
  api: Record<string, () => Promise<any>>
  middlewares: Record<string, () => Promise<any>>
}

export async function oneServe(
  oneOptions: One.PluginOptions,
  buildInfo: One.BuildInfo,
  app: Hono,
  options?: {
    serveStaticAssets?: (ctx: { context: any }) => Promise<Response | undefined>
    lazyRoutes?: LazyRoutes
  }
) {
  const outDir = buildInfo.outDir || 'dist'
  const { resolveAPIRoute, resolveLoaderRoute, resolvePageRoute } =
    await import('../createHandleRequest')
  const { isResponse } = await import('../utils/isResponse')
  const { isStatusRedirect } = await import('../utils/isStatus')
  const { withRequestContext } = await import('../vite/resolveResponse')

  const isAPIRequest = new WeakMap<any, boolean>()

  // add redirects
  const redirects = oneOptions.web?.redirects
  if (redirects) {
    for (const redirect of redirects) {
      app.get(redirect.source, (context) => {
        const destinationUrl = redirect.destination.replace(/:\w+/g, (param) => {
          const paramName = param.substring(1)
          return context.req.param(paramName) || ''
        })
        if (debugRouter) {
          console.info(`[one] ↪ redirect ${context.req.path} → ${destinationUrl}`)
        }
        return context.redirect(destinationUrl, redirect.permanent ? 301 : 302)
      })
    }
  }

  if (!buildInfo) {
    throw new Error(`No build info found, have you run build?`)
  }

  const { routeToBuildInfo, routeMap } = buildInfo as One.BuildInfo

  // find nearest +not-found path by walking up from a url path
  function findNearestNotFoundPath(urlPath: string): string {
    let cur = urlPath
    while (cur) {
      const parent = cur.lastIndexOf('/') > 0 ? cur.slice(0, cur.lastIndexOf('/')) : ''
      if (routeMap[`${parent}/+not-found`]) {
        return `${parent}/+not-found`
      }
      if (!parent) break
      cur = parent
    }
    return '/+not-found'
  }

  // generate a 404 loader response that triggers client-side not-found navigation
  function make404LoaderJs(path: string, logReason?: string): string {
    const nfPath = findNearestNotFoundPath(path)
    if (logReason) {
      console.error(`[one] 404 loader for ${path}: ${logReason}`)
    }
    return `export function loader(){return{__oneError:404,__oneErrorMessage:'Not Found',__oneNotFoundPath:${JSON.stringify(nfPath)}}}`
  }

  const serverOptions = {
    ...oneOptions,
    root: '.',
  }

  const apiCJS = oneOptions.build?.api?.outputFormat === 'cjs'

  // pre-computed constants to avoid per-request overhead
  const useStreaming = !process.env.ONE_BUFFERED_SSR
  const htmlHeaders = { 'content-type': 'text/html' }
  // SSR responses get no-cache by default — include it in headers to avoid per-response mutation
  const ssrHtmlHeaders = { 'content-type': 'text/html', 'cache-control': 'no-cache' }

  // cache resolved loader functions directly (not just modules)
  const loaderCache = new Map<string, Function | null>()
  const moduleImportCache = new Map<string, any>()

  // loader coalescing via static loaderCache export
  // when a route exports loaderCache, concurrent requests with the same key share one execution
  const loaderCacheFnMap = new Map<string, Function | null>()
  const pendingLoaderResults = new Map<
    string,
    { promise: Promise<any>; expires: number }
  >()

  // resolve a route module's loader - sync on cache hit, async on cold start
  function resolveLoaderSync(
    serverPath: string | undefined,
    lazyKey: string | undefined
  ): Function | null | Promise<Function | null> {
    const cacheKey = lazyKey || serverPath || ''
    const cached = loaderCache.get(cacheKey)
    if (cached !== undefined) return cached // sync!

    // cold path - async import
    return (async () => {
      const pathToResolve = serverPath || lazyKey || ''
      const resolvedPath = pathToResolve.includes(`${outDir}/server`)
        ? pathToResolve
        : join('./', `${outDir}/server`, pathToResolve)

      let routeExported: any
      if (moduleImportCache.has(cacheKey)) {
        routeExported = moduleImportCache.get(cacheKey)
      } else {
        routeExported = lazyKey
          ? options?.lazyRoutes?.pages?.[lazyKey]
            ? await options.lazyRoutes.pages[lazyKey]()
            : await import(toAbsolute(resolvedPath))
          : await import(toAbsolute(serverPath!))
        moduleImportCache.set(cacheKey, routeExported)
      }

      const loader = routeExported?.loader || null
      loaderCache.set(cacheKey, loader)
      // also cache loaderCache export for coalescing
      const loaderCacheFn = routeExported?.loaderCache ?? null
      loaderCacheFnMap.set(cacheKey, loaderCacheFn)
      return loader
    })()
  }

  // shared helper to import a route module and run its loader
  async function importAndRunLoader(
    routeId: string,
    serverPath: string | undefined,
    lazyKey: string | undefined,
    loaderProps: any
  ): Promise<{ loaderData: unknown; routeId: string; isEnoent?: boolean }> {
    if (!serverPath && !lazyKey) {
      return { loaderData: undefined, routeId }
    }

    // check loaderCache BEFORE resolving the loader (fast path for coalesced requests)
    const cacheMapKey = lazyKey || serverPath || ''
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
        // expires=0 means pending or no-TTL (coalesce-only), so !0 is true
        if (existing && (!existing.expires || Date.now() < existing.expires)) {
          // coalesce: reuse pending/cached result (never even resolves the loader fn)
          const loaderData = await existing.promise
          return { loaderData, routeId }
        }
      }
    }

    try {
      const loaderOrPromise = resolveLoaderSync(serverPath, lazyKey)
      const loader =
        loaderOrPromise instanceof Promise ? await loaderOrPromise : loaderOrPromise
      if (!loader) {
        return { loaderData: undefined, routeId }
      }

      // first caller with loaderCache: execute and register for coalescing
      if (coalFullKey) {
        const promise = loader(loaderProps)
        const entry = { promise, expires: 0 }
        pendingLoaderResults.set(coalFullKey, entry)
        promise.then(
          () => {
            entry.expires = coalTtl > 0 ? Date.now() + coalTtl : 0
            if (coalTtl <= 0) {
              Promise.resolve().then(() => pendingLoaderResults.delete(coalFullKey!))
            }
          },
          () => {
            pendingLoaderResults.delete(coalFullKey!)
          }
        )

        const loaderData = await promise
        return { loaderData, routeId }
      }

      // no coalescing: run loader directly
      const loaderData = await loader(loaderProps)
      return { loaderData, routeId }
    } catch (err) {
      if (isResponse(err)) {
        throw err
      }
      if ((err as any)?.code === 'ENOENT') {
        return { loaderData: undefined, routeId, isEnoent: true }
      }
      console.error(`[one] Error running loader for ${routeId}:`, err)
      return { loaderData: undefined, routeId }
    }
  }

  // lazy load server entry - sync on cache hit
  let render: ((props: RenderAppProps) => any) | null = null
  let renderStream: ((props: RenderAppProps) => Promise<ReadableStream>) | null = null
  let renderLoading: Promise<void> | null = null

  function ensureRenderLoaded(): void | Promise<void> {
    if (render) return // sync!
    if (renderLoading) return renderLoading
    renderLoading = (async () => {
      const entry = options?.lazyRoutes?.serverEntry
        ? await options.lazyRoutes.serverEntry()
        : await import(
            resolve(
              process.cwd(),
              `${serverOptions.root}/${outDir}/server/_virtual_one-entry.${typeof oneOptions.build?.server === 'object' && oneOptions.build.server.outputFormat === 'cjs' ? 'c' : ''}js`
            )
          )
      render = entry.default.render as (props: RenderAppProps) => any
      renderStream = entry.default.renderStream as
        | ((props: RenderAppProps) => Promise<ReadableStream>)
        | null
    })()
    return renderLoading
  }

  const clientDir = join(process.cwd(), outDir, 'client')

  const requestHandlers: RequestHandlers = {
    async handleStaticFile(filePath: string) {
      try {
        // filePath is like /assets/index_123_vxrn_loader.native.js
        const fullPath = join(clientDir, filePath)
        const content = await readFile(fullPath, 'utf-8')
        return new Response(content, {
          headers: { 'Content-Type': 'text/javascript' },
        })
      } catch {
        return null
      }
    },

    async handleAPI({ route }) {
      // Use lazy import if available (workers), otherwise dynamic import (Node.js)
      if (options?.lazyRoutes?.api?.[route.page]) {
        return await options.lazyRoutes.api[route.page]()
      }
      // both vite and rolldown-vite replace brackets with underscores in output filenames
      const fileName = route.page.slice(1).replace(/\[/g, '_').replace(/\]/g, '_')
      const apiFile = join(
        process.cwd(),
        outDir,
        'api',
        fileName + (apiCJS ? '.cjs' : '.js')
      )
      return await import(apiFile)
    },

    async loadMiddleware(route) {
      // Use lazy import if available (workers), otherwise dynamic import (Node.js)
      if (options?.lazyRoutes?.middlewares?.[route.contextKey]) {
        return await options.lazyRoutes.middlewares[route.contextKey]()
      }
      return await import(toAbsolute(route.contextKey))
    },

    async handleLoader({ route, loaderProps }) {
      const routeFile = (route as any).routeFile || route.file
      const serverPath = route.file.includes(`${outDir}/server`)
        ? route.file
        : join('./', `${outDir}/server`, route.file)

      let loader: Function | null
      try {
        const loaderResult = resolveLoaderSync(serverPath, routeFile)
        loader = loaderResult instanceof Promise ? await loaderResult : loaderResult
      } catch (err) {
        if ((err as any)?.code === 'ERR_MODULE_NOT_FOUND') {
          return null
        }
        throw err
      }

      if (!loader) {
        return null
      }

      let json
      try {
        json = await loader(loaderProps)
      } catch (err) {
        // for file-not-found errors (e.g., missing MDX for non-existent slug),
        // return a 404 signal so the client navigates to +not-found
        if ((err as any)?.code === 'ENOENT') {
          return make404LoaderJs(
            loaderProps?.path || '/',
            `ENOENT ${(err as any)?.path || err}`
          )
        }
        throw err
      }

      // if the loader returned a Response (e.g. redirect()), throw it
      // so it bubbles up through resolveResponse and can be transformed
      // into a JS redirect module for client-side navigation
      if (isResponse(json)) {
        throw json
      }

      return `export function loader() { return ${JSON.stringify(json)} }`
    },

    async handlePage({ route, url, loaderProps }) {
      const buildInfo = routeToBuildInfo[route.file]

      if (route.type === 'ssr') {
        if (!buildInfo) {
          console.error(`Error in route`, route)
          throw new Error(
            `No buildinfo found for ${url}, route: ${route.file}, in keys:\n  ${Object.keys(routeToBuildInfo).join('\n  ')}`
          )
        }

        try {
          // collect layout loaders to run in parallel
          const layoutRoutes = route.layouts || []

          // fast path: check which layouts actually have loaders (sync on cache hit)
          // skip importAndRunLoader entirely for layouts with no loader
          const layoutLoaderPromises: Array<ReturnType<typeof importAndRunLoader>> = []
          const noLoaderResults: Array<{ loaderData: unknown; routeId: string }> = []

          for (const layout of layoutRoutes) {
            const serverPath = layout.loaderServerPath || layout.contextKey
            const cacheKey = layout.contextKey || serverPath || ''
            const cachedLoader = loaderCache.get(cacheKey)

            if (cachedLoader === null) {
              // loader already resolved to null - skip the async call entirely
              noLoaderResults.push({ loaderData: undefined, routeId: layout.contextKey })
            } else {
              layoutLoaderPromises.push(
                importAndRunLoader(
                  layout.contextKey,
                  serverPath,
                  layout.contextKey,
                  loaderProps
                )
              )
            }
          }

          // run page loader
          const pageLoaderPromise = importAndRunLoader(
            route.file,
            buildInfo.serverJsPath,
            route.file,
            loaderProps
          )

          // wait for all loaders in parallel
          let layoutResults: Array<{
            loaderData: unknown
            routeId: string
            isEnoent?: boolean
          }>
          let pageResult: { loaderData: unknown; routeId: string; isEnoent?: boolean }

          try {
            if (layoutLoaderPromises.length === 0) {
              // fast path: all layout loaders are null or no layouts
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
            // Handle thrown responses (e.g., redirect) from any loader
            if (isResponse(err)) {
              return err
            }
            throw err
          }

          // if loader threw ENOENT, serve the nearest +not-found page
          if (pageResult.isEnoent) {
            const nfPath = findNearestNotFoundPath(loaderProps?.path || '/')
            const nfHtml = routeMap[nfPath]
            if (nfHtml) {
              try {
                const html = await readFile(
                  join(process.cwd(), `${outDir}/client`, nfHtml),
                  'utf-8'
                )
                return new Response(html, {
                  headers: { 'content-type': 'text/html' },
                  status: 404,
                })
              } catch {}
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

          // for backwards compat, loaderData is still the page's loader data
          const loaderData = pageResult.loaderData

          // populate per-loader WeakMap so layout useLoader gets correct data
          for (const layout of layoutRoutes) {
            const key = layout.contextKey
            const loaderFn = loaderCache.get(key)
            if (loaderFn) {
              const result = layoutResults.find((r) => r.routeId === key)
              if (result) {
                setSSRLoaderData(loaderFn, result.loaderData)
              }
            }
          }
          const pageLoaderFn = loaderCache.get(route.file)
          if (pageLoaderFn) {
            setSSRLoaderData(pageLoaderFn, pageResult.loaderData)
          }

          // prepare router for this SSR render (lightweight version bump)
          globalThis['__vxrnresetState']?.()

          const renderProps = {
            mode: route.type,
            loaderData,
            loaderProps,
            path: loaderProps?.path || '/',
            preloads: buildInfo.criticalPreloads || buildInfo.preloads,
            deferredPreloads: buildInfo.deferredPreloads,
            css: buildInfo.css,
            cssContents: buildInfo.cssContents,
            matches,
          }

          const _rl = ensureRenderLoaded()
          if (_rl) await _rl

          const status = route.isNotFound ? 404 : 200
          // use ssrHtmlHeaders (includes cache-control: no-cache) to avoid
          // per-response header mutation in the Hono handler
          const responseHeaders = route.isNotFound ? htmlHeaders : ssrHtmlHeaders

          // streaming SSR by default, fall back to buffered with ONE_BUFFERED_SSR=1
          if (useStreaming) {
            const stream = await renderStream!(renderProps)
            return new Response(stream, {
              headers: responseHeaders,
              status,
            })
          }

          // render is guaranteed loaded after ensureRenderLoaded above
          const rendered = await render!(renderProps)

          return new Response(rendered, {
            headers: responseHeaders,
            status,
          })
        } catch (err) {
          // Handle thrown responses (e.g., redirect) that weren't caught above
          if (isResponse(err)) {
            return err
          }

          console.error(`[one] Error rendering SSR route ${route.file}

${err?.['stack'] ?? err}

url: ${url}`)
        }
      } else {
        // for SPA routes only, check if we need to SSR the root layout shell
        // spa-shell: render if any parent layout has ssg/ssr render mode
        const layoutRoutes = route.layouts || []
        const needsSpaShell =
          route.type === 'spa' &&
          layoutRoutes.some(
            (layout: any) =>
              layout.layoutRenderMode === 'ssg' || layout.layoutRenderMode === 'ssr'
          )

        if (needsSpaShell) {
          try {
            // run layout loaders only (page content is client-rendered)
            const layoutResults = await Promise.all(
              layoutRoutes.map((layout: any) => {
                const serverPath = layout.loaderServerPath || layout.contextKey
                return importAndRunLoader(
                  layout.contextKey,
                  serverPath,
                  layout.contextKey,
                  loaderProps
                )
              })
            )

            const matches: One.RouteMatch[] = layoutResults.map((result) => ({
              routeId: result.routeId,
              pathname: loaderProps?.path || '/',
              params: loaderProps?.params || {},
              loaderData: result.loaderData,
            }))

            globalThis['__vxrnresetState']?.()

            const _rl3 = ensureRenderLoaded()
            if (_rl3) await _rl3
            const rendered = await render!({
              mode: 'spa-shell',
              // don't pass loaderData for spa-shell - the page loader runs on client
              // passing {} here would make useLoaderState think data is preloaded
              loaderData: undefined,
              loaderProps,
              path: loaderProps?.path || '/',
              preloads: buildInfo?.criticalPreloads || buildInfo?.preloads,
              deferredPreloads: buildInfo?.deferredPreloads,
              css: buildInfo?.css,
              cssContents: buildInfo?.cssContents,
              matches,
            })

            return new Response(rendered, {
              headers: htmlHeaders,
              status: route.isNotFound ? 404 : 200,
            })
          } catch (err) {
            if (isResponse(err)) {
              return err
            }
            console.error(
              `[one] Error rendering spa-shell for ${route.file}\n${err?.['stack'] ?? err}\nurl: ${url}`
            )
          }
        }

        // for SPA routes (not SSR), look up the HTML file
        const isDynamicRoute = Object.keys(route.routeKeys).length > 0
        // for dynamic SPA routes, use the parameterized path to look up the single HTML file
        // (e.g., /home/feed/post/:feedId -> /home/feed/post/:feedId.html)
        // urlCleanPath has ? after optional params (e.g. /:id?), strip all of them to match routeMap keys
        const routeCleanPath = route.urlCleanPath.replace(/\?/g, '')

        // for +not-found routes, derive the routeMap key from the route's page field
        // route.page is like "/case8/[param1]/+not-found", routeMap key is "/case8/:param1/+not-found"
        const notFoundKey = route.isNotFound
          ? route.page.replace(/\[([^\]]+)\]/g, ':$1')
          : null

        const htmlPath = notFoundKey
          ? routeMap[notFoundKey]
          : isDynamicRoute
            ? routeMap[routeCleanPath] || routeMap[url.pathname]
            : routeMap[url.pathname] || routeMap[buildInfo?.cleanPath]

        if (htmlPath) {
          const html = await readStaticHtml(htmlPath, outDir)

          if (html) {
            const headers = new Headers()
            headers.set('content-type', 'text/html')
            return new Response(html, {
              headers,
              status: route.isNotFound ? 404 : 200,
            })
          }
        }

        // dynamic route matched but no static HTML exists for this path
        // (slug wasn't in generateStaticParams) - return 404
        if (isDynamicRoute) {
          const notFoundRoute = findNearestNotFoundPath(url.pathname)
          const notFoundHtmlPath = routeMap[notFoundRoute]

          if (notFoundHtmlPath) {
            const notFoundHtml = await readStaticHtml(notFoundHtmlPath, outDir)

            if (notFoundHtml) {
              // inject 404 marker so client knows this is a 404 response
              // this prevents hydration mismatch when the URL matches a dynamic route
              const notFoundMarker = `<script>window.__one404=${JSON.stringify({ originalPath: url.pathname, notFoundPath: notFoundRoute })}</script>`
              // inject before </head> or at start of <body>
              const injectedHtml = notFoundHtml.includes('</head>')
                ? notFoundHtml.replace('</head>', `${notFoundMarker}</head>`)
                : notFoundHtml.replace('<body', `${notFoundMarker}<body`)

              const headers = new Headers()
              headers.set('content-type', 'text/html')
              return new Response(injectedHtml, {
                headers,
                status: 404,
              })
            }
          }

          // no +not-found.html found, return basic 404
          return new Response('404 Not Found', { status: 404 })
        }
      }
    },
  }

  function createHonoHandler(
    route: RouteInfoCompiled
  ): MiddlewareHandler<BlankEnv, never, {}> {
    // pre-compute per-route checks (constant for the lifetime of the handler)
    const isDynamicOrNotFound =
      route.page.endsWith('/+not-found') || Object.keys(route.routeKeys).length > 0

    return async (context, next) => {
      try {
        const request = context.req.raw

        if (isDynamicOrNotFound) {
          // Static assets should have the highest priority - which is the behavior of the dev server.
          // But if we handle every matching static asset here, it seems to break some of the static routes.
          // So we only handle it if there's a matching not-found or dynamic route, to prevent One from taking over the static asset.
          // If there's no matching not-found or dynamic route, it's very likely that One won't handle it and will fallback to VxRN serving the static asset so it will also work.
          // Note: serveStaticAssets is optional - workers handle static assets via platform config
          if (options?.serveStaticAssets) {
            const staticAssetResponse = await options.serveStaticAssets({
              context,
            })
            if (staticAssetResponse) {
              return await runMiddlewares(
                requestHandlers,
                request,
                route,
                async () => staticAssetResponse
              )
            }
          }
        }

        // for js/css we want to serve our files directly, as they can match a route on accident
        // use the hono-parsed path to avoid parsing the full URL string
        const reqPath = context.req.path
        if (reqPath.endsWith('.js') || reqPath.endsWith('.css')) {
          return next()
        }

        // fast path for SSR pages without middleware:
        // skip URL parsing, resolvePageRoute, and resolveResponse entirely.
        // use hono's pre-parsed path and compute params inline.
        if (
          route.type === 'ssr' &&
          !route.middlewares?.length &&
          !reqPath.endsWith(LOADER_JS_POSTFIX_UNCACHED)
        ) {
          if (debugRouter) {
            console.info(`[one] ⚡ ${reqPath} → matched page route: ${route.page} (ssr)`)
          }
          const pathname = reqPath
          // extract search from raw URL (after ?)
          const rawUrl = request.url
          const qIdx = rawUrl.indexOf('?')
          const search = qIdx >= 0 ? rawUrl.slice(qIdx) : ''

          // compute params from compiled regex using pathname
          const params: Record<string, string> = {}
          const match = route.compiledRegex.exec(pathname)
          if (match?.groups) {
            for (const [key, value] of Object.entries(match.groups)) {
              const namedKey = route.routeKeys[key]
              params[namedKey] = value as string
            }
          }

          const loaderProps = {
            path: pathname,
            search,
            request,
            params,
          }

          // lazy-create URL only when needed (error paths, non-SSR branches)
          const url = getURLfromRequestURL(request)

          const response = await withRequestContext(async () => {
            try {
              return await requestHandlers.handlePage!({
                request,
                route,
                url,
                loaderProps,
              })
            } catch (err) {
              if (isResponse(err)) {
                return err as Response
              }
              throw err
            }
          })

          if (response) {
            if (isResponse(response)) {
              if (isStatusRedirect(response.status)) {
                const location = `${response.headers.get('location') || ''}`
                response.headers.forEach((value, key) => {
                  context.header(key, value)
                })
                return context.redirect(location, response.status)
              }
              // cache-control is already set in ssrHtmlHeaders for SSR responses
              return response as Response
            }
            return next()
          }
          return next()
        }

        const url = getURLfromRequestURL(request)

        const response = await (() => {
          // this handles all loader refetches or fetches due to navigation
          if (url.pathname.endsWith(LOADER_JS_POSTFIX_UNCACHED)) {
            const originalUrl = getPathFromLoaderPath(url.pathname)

            // for ssg routes with dynamic params, check if this path was statically generated
            // if not in routeMap, the slug wasn't in generateStaticParams - return 404
            if (route.type === 'ssg' && Object.keys(route.routeKeys).length > 0) {
              if (!routeMap[originalUrl]) {
                return new Response(
                  make404LoaderJs(originalUrl, 'ssg route not in routeMap'),
                  {
                    headers: { 'Content-Type': 'text/javascript' },
                  }
                )
              }
            }

            const finalUrl = new URL(originalUrl, url.origin)
            // preserve query params (platform=ios, etc.) for native CJS conversion
            finalUrl.search = url.search
            const cleanedRequest = new Request(finalUrl, request)
            return resolveLoaderRoute(requestHandlers, cleanedRequest, finalUrl, route)
          }

          switch (route.type) {
            case 'api': {
              if (debugRouter) {
                console.info(
                  `[one] ⚡ ${url.pathname} → matched API route: ${route.page}`
                )
              }
              return resolveAPIRoute(requestHandlers, request, url, route)
            }
            case 'ssg':
            case 'spa':
            case 'ssr': {
              if (debugRouter) {
                console.info(
                  `[one] ⚡ ${url.pathname} → matched page route: ${route.page} (${route.type})`
                )
              }
              return resolvePageRoute(requestHandlers, request, url, route)
            }
          }
        })()

        if (response) {
          if (isResponse(response)) {
            // const cloned = response.clone()

            if (isStatusRedirect(response.status)) {
              const location = `${response.headers.get('location') || ''}`
              response.headers.forEach((value, key) => {
                context.header(key, value)
              })
              return context.redirect(location, response.status)
            }

            if (isAPIRequest.get(request)) {
              try {
                if (
                  !response.headers.has('cache-control') &&
                  !response.headers.has('Cache-Control')
                ) {
                  // don't cache api requests by default
                  response.headers.set('cache-control', 'no-store')
                }
                return response
              } catch (err) {
                console.info(
                  `Error updating cache header on api route "${
                    context.req.path
                  }" to no-store, it is ${response.headers.get('cache-control')}, continue`,
                  err
                )
              }
            }

            // set cache headers for page responses
            // ssg/spa: enable CDN edge caching (skew protection handles stale assets)
            // ssr: no-cache since content is dynamic per request
            if (
              !response.headers.has('cache-control') &&
              !response.headers.has('Cache-Control')
            ) {
              if (route.type === 'ssg' || route.type === 'spa') {
                response.headers.set(
                  'cache-control',
                  'public, s-maxage=60, stale-while-revalidate=120'
                )
              } else {
                response.headers.set('cache-control', 'no-cache')
              }
            }

            return response as Response
          }

          return next()
        }
      } catch (err) {
        console.error(` [one] Error handling request: ${(err as any)['stack']}`)
      }

      return next()
    }
  }

  const compiledManifest = compileManifest(buildInfo.manifest)

  for (const route of compiledManifest.apiRoutes) {
    app.get(route.urlPath, createHonoHandler(route))
    app.put(route.urlPath, createHonoHandler(route))
    app.post(route.urlPath, createHonoHandler(route))
    app.delete(route.urlPath, createHonoHandler(route))
    app.patch(route.urlPath, createHonoHandler(route))

    if (route.urlPath !== route.urlCleanPath) {
      app.get(route.urlCleanPath, createHonoHandler(route))
      app.put(route.urlCleanPath, createHonoHandler(route))
      app.post(route.urlCleanPath, createHonoHandler(route))
      app.delete(route.urlCleanPath, createHonoHandler(route))
      app.patch(route.urlCleanPath, createHonoHandler(route))
    }
  }

  for (const route of compiledManifest.pageRoutes) {
    app.get(route.urlPath, createHonoHandler(route))

    if (route.urlPath !== route.urlCleanPath) {
      app.get(route.urlCleanPath, createHonoHandler(route))
    }
  }

  const { preloads, cssPreloads } = buildInfo

  // TODO make this inside each page, need to make loader urls just be REGULAR_URL + loaderpostfix
  app.get('*', async (c, next) => {
    if (c.req.path.endsWith(PRELOAD_JS_POSTFIX)) {
      // TODO handle dynamic segments (i think the below loader has some logic for this)
      if (!preloads[c.req.path]) {
        // no preload exists 200 gracefully
        c.header('Content-Type', 'text/javascript')
        c.status(200)
        return c.body(``)
      }
    }

    if (c.req.path.endsWith(CSS_PRELOAD_JS_POSTFIX)) {
      // Return empty resolved promise if no CSS preload exists for this route
      if (!cssPreloads?.[c.req.path]) {
        c.header('Content-Type', 'text/javascript')
        c.status(200)
        return c.body(`export default Promise.resolve()`)
      }
    }

    if (c.req.path.endsWith(LOADER_JS_POSTFIX_UNCACHED)) {
      const request = c.req.raw
      const url = getURLfromRequestURL(request)
      const originalUrl = getPathFromLoaderPath(c.req.path)

      for (const route of compiledManifest.pageRoutes) {
        if (route.file === '') {
          // ignore not found route
          continue
        }

        if (!route.compiledRegex.test(originalUrl)) {
          continue
        }

        // for ssg routes with dynamic params, check if this path was statically generated
        if (
          route.type === 'ssg' &&
          Object.keys(route.routeKeys).length > 0 &&
          !routeMap[originalUrl]
        ) {
          c.header('Content-Type', 'text/javascript')
          c.status(200)
          return c.body(make404LoaderJs(originalUrl, 'ssg route not in routeMap'))
        }

        // for now just change this
        const loaderRoute = {
          ...route,
          routeFile: route.file, // preserve original for lazy route lookup
          file: route.loaderServerPath || c.req.path,
        }

        const finalUrl = new URL(originalUrl, url.origin)
        // preserve query params (platform=ios, etc.) for native CJS conversion
        finalUrl.search = url.search
        const cleanedRequest = new Request(finalUrl, request)

        try {
          const resolved = await resolveLoaderRoute(
            requestHandlers,
            cleanedRequest,
            finalUrl,
            loaderRoute
          )
          return resolved
        } catch (err) {
          if ((err as any)?.code === 'ERR_MODULE_NOT_FOUND') {
            // module doesn't exist (e.g., dynamic route with slug not in generateStaticParams)
            // return empty loader so client doesn't get import error
            c.header('Content-Type', 'text/javascript')
            c.status(200)
            return c.body(`export function loader() { return undefined }`)
          }
          console.error(`Error running loader: ${err}`)
          return next()
        }
      }
    }

    return next()
  })
}
