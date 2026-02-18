import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import type { Hono, MiddlewareHandler } from 'hono'
import type { BlankEnv } from 'hono/types'
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
import { getFetchStaticHtml } from './staticHtmlFetcher'

const debugRouter = process.env.ONE_DEBUG_ROUTER

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
  const { resolveAPIRoute, resolveLoaderRoute, resolvePageRoute } =
    await import('../createHandleRequest')
  const { isResponse } = await import('../utils/isResponse')
  const { isStatusRedirect } = await import('../utils/isStatus')

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

  const serverOptions = {
    ...oneOptions,
    root: '.',
  }

  const apiCJS = oneOptions.build?.api?.outputFormat === 'cjs'

  // Lazy load server entry only when needed for SSR
  let render: ((props: RenderAppProps) => any) | null = null
  async function getRender() {
    if (!render) {
      // Use lazy import if available (workers), otherwise dynamic import (Node.js)
      const entry = options?.lazyRoutes?.serverEntry
        ? await options.lazyRoutes.serverEntry()
        : await import(
            resolve(
              process.cwd(),
              `${serverOptions.root}/dist/server/_virtual_one-entry.${typeof oneOptions.build?.server === 'object' && oneOptions.build.server.outputFormat === 'cjs' ? 'c' : ''}js`
            )
          )
      render = entry.default.render as (props: RenderAppProps) => any
    }
    return render
  }

  const requestHandlers: RequestHandlers = {
    async handleAPI({ route }) {
      // Use lazy import if available (workers), otherwise dynamic import (Node.js)
      if (options?.lazyRoutes?.api?.[route.page]) {
        return await options.lazyRoutes.api[route.page]()
      }
      // both vite and rolldown-vite replace brackets with underscores in output filenames
      const fileName = route.page.slice(1).replace(/\[/g, '_').replace(/\]/g, '_')
      const apiFile = join(
        process.cwd(),
        'dist',
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
      // Use lazy import if available (workers), otherwise dynamic import (Node.js)
      // For workers, look up by routeFile (original file path like "./dynamic/[id]+ssr.tsx")
      // For Node.js, use route.file which may be loaderServerPath (already includes dist/server)
      const routeFile = (route as any).routeFile || route.file
      // route.file may already include dist/server if it came from loaderServerPath
      const serverPath = route.file.includes('dist/server')
        ? route.file
        : join('./', 'dist/server', route.file)

      let exports
      try {
        exports = options?.lazyRoutes?.pages?.[routeFile]
          ? await options.lazyRoutes.pages[routeFile]()
          : await import(toAbsolute(serverPath))
      } catch (err) {
        // module doesn't exist (e.g., dynamic route with slug not in generateStaticParams)
        if ((err as any)?.code === 'ERR_MODULE_NOT_FOUND') {
          return null
        }
        throw err
      }

      const { loader } = exports

      if (!loader) {
        return null
      }

      const json = await loader(loaderProps)

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
          // Use lazy import if available (workers), otherwise dynamic import (Node.js)
          const exported = options?.lazyRoutes?.pages?.[route.file]
            ? await options.lazyRoutes.pages[route.file]()
            : await import(toAbsolute(buildInfo.serverJsPath))

          // helper to import and run a single loader
          async function runLoader(
            routeId: string,
            serverPath: string | undefined,
            lazyKey?: string
          ): Promise<{ loaderData: unknown; routeId: string }> {
            if (!serverPath && !lazyKey) {
              return { loaderData: undefined, routeId }
            }

            try {
              // serverPath may already include dist/server if it came from buildInfo.serverJsPath
              const pathToResolve = serverPath || lazyKey || ''
              const resolvedPath = pathToResolve.includes('dist/server')
                ? pathToResolve
                : join('./', 'dist/server', pathToResolve)

              const routeExported = lazyKey
                ? options?.lazyRoutes?.pages?.[lazyKey]
                  ? await options.lazyRoutes.pages[lazyKey]()
                  : await import(toAbsolute(resolvedPath))
                : await import(toAbsolute(serverPath!))

              const loaderData = await routeExported?.loader?.(loaderProps)
              return { loaderData, routeId }
            } catch (err) {
              // if a loader throws a Response (redirect), re-throw it
              if (isResponse(err)) {
                throw err
              }
              console.error(`[one] Error running loader for ${routeId}:`, err)
              return { loaderData: undefined, routeId }
            }
          }

          // collect layout loaders to run in parallel
          const layoutRoutes = route.layouts || []
          const layoutLoaderPromises = layoutRoutes.map((layout: any) => {
            // layouts may have loaderServerPath set from build, or we can try contextKey
            const serverPath = layout.loaderServerPath || layout.contextKey
            return runLoader(layout.contextKey, serverPath, layout.contextKey)
          })

          // run page loader
          const pageLoaderPromise = runLoader(
            route.file,
            buildInfo.serverJsPath,
            route.file
          )

          // wait for all loaders in parallel
          let layoutResults: Array<{ loaderData: unknown; routeId: string }>
          let pageResult: { loaderData: unknown; routeId: string }

          try {
            ;[layoutResults, pageResult] = await Promise.all([
              Promise.all(layoutLoaderPromises),
              pageLoaderPromise,
            ])
          } catch (err) {
            // Handle thrown responses (e.g., redirect) from any loader
            if (isResponse(err)) {
              return err
            }
            throw err
          }

          // build matches array (layouts + page)
          const matches: One.RouteMatch[] = [
            ...layoutResults.map((result) => ({
              routeId: result.routeId,
              pathname: loaderProps?.path || '/',
              params: loaderProps?.params || {},
              loaderData: result.loaderData,
            })),
            {
              routeId: pageResult.routeId,
              pathname: loaderProps?.path || '/',
              params: loaderProps?.params || {},
              loaderData: pageResult.loaderData,
            },
          ]

          // for backwards compat, loaderData is still the page's loader data
          const loaderData = pageResult.loaderData

          const headers = new Headers()
          headers.set('content-type', 'text/html')

          // Reset router state for each SSR request to ensure correct routing
          // TODO: Consider using AsyncLocalStorage to isolate router state per request
          // instead of using global reset, for better concurrency handling
          globalThis['__vxrnresetState']?.()

          const rendered = await (
            await getRender()
          )({
            mode: route.type,
            loaderData,
            loaderProps,
            path: loaderProps?.path || '/',
            // Use separated preloads for optimal loading
            preloads: buildInfo.criticalPreloads || buildInfo.preloads,
            deferredPreloads: buildInfo.deferredPreloads,
            css: buildInfo.css,
            cssContents: buildInfo.cssContents,
            matches,
          })

          return new Response(rendered, {
            headers,
            status: route.isNotFound ? 404 : 200,
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
            // helper to import and run a single loader
            async function runShellLoader(
              routeId: string,
              serverPath: string | undefined,
              lazyKey?: string
            ): Promise<{ loaderData: unknown; routeId: string }> {
              if (!serverPath && !lazyKey) {
                return { loaderData: undefined, routeId }
              }
              try {
                const pathToResolve = serverPath || lazyKey || ''
                const resolvedPath = pathToResolve.includes('dist/server')
                  ? pathToResolve
                  : join('./', 'dist/server', pathToResolve)

                const routeExported = lazyKey
                  ? options?.lazyRoutes?.pages?.[lazyKey]
                    ? await options.lazyRoutes.pages[lazyKey]()
                    : await import(toAbsolute(resolvedPath))
                  : await import(toAbsolute(serverPath!))

                const loaderData = await routeExported?.loader?.(loaderProps)
                return { loaderData, routeId }
              } catch (err) {
                if (isResponse(err)) {
                  throw err
                }
                console.error(`[one] Error running shell loader for ${routeId}:`, err)
                return { loaderData: undefined, routeId }
              }
            }

            // run layout loaders only (page content is client-rendered)
            const layoutResults = await Promise.all(
              layoutRoutes.map((layout: any) => {
                const serverPath = layout.loaderServerPath || layout.contextKey
                return runShellLoader(layout.contextKey, serverPath, layout.contextKey)
              })
            )

            const matches: One.RouteMatch[] = layoutResults.map((result) => ({
              routeId: result.routeId,
              pathname: loaderProps?.path || '/',
              params: loaderProps?.params || {},
              loaderData: result.loaderData,
            }))

            const headers = new Headers()
            headers.set('content-type', 'text/html')

            globalThis['__vxrnresetState']?.()

            const rendered = await (
              await getRender()
            )({
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
              headers,
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
          // Try Worker ASSETS binding first (for Cloudflare Workers), fall back to filesystem
          const fetchStaticHtml = getFetchStaticHtml()
          let html: string | null = null

          if (fetchStaticHtml) {
            html = await fetchStaticHtml(htmlPath)
          }

          if (!html) {
            // Fall back to filesystem (Node.js)
            try {
              html = await readFile(join('dist/client', htmlPath), 'utf-8')
            } catch {
              // File not found
            }
          }

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
            const fetchStaticHtml = getFetchStaticHtml()
            let notFoundHtml: string | null = null

            if (fetchStaticHtml) {
              notFoundHtml = await fetchStaticHtml(notFoundHtmlPath)
            }

            if (!notFoundHtml) {
              try {
                notFoundHtml = await readFile(
                  join('dist/client', notFoundHtmlPath),
                  'utf-8'
                )
              } catch {
                // File not found
              }
            }

            if (notFoundHtml) {
              const headers = new Headers()
              headers.set('content-type', 'text/html')
              return new Response(notFoundHtml, {
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
    return async (context, next) => {
      try {
        const request = context.req.raw

        if (
          route.page.endsWith('/+not-found') ||
          Reflect.ownKeys(route.routeKeys).length > 0
        ) {
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

        // for js we want to serve our js files directly, as they can match a route on accident
        // middleware my want to handle this eventually as well but for now this is a fine balance
        if (extname(request.url) === '.js' || extname(request.url) === '.css') {
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
                const nfPath = findNearestNotFoundPath(originalUrl)
                return new Response(
                  `export function loader(){return{__oneError:404,__oneErrorMessage:'Not Found',__oneNotFoundPath:${JSON.stringify(nfPath)}}}`,
                  { headers: { 'Content-Type': 'text/javascript' } }
                )
              }
            }

            const finalUrl = new URL(originalUrl, url.origin)
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

            // prevent browsers (safari) from caching html pages
            // which causes stale js references after deploys
            if (
              !response.headers.has('cache-control') &&
              !response.headers.has('Cache-Control')
            ) {
              response.headers.set('cache-control', 'no-cache')
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
          const nfPath = findNearestNotFoundPath(originalUrl)
          c.header('Content-Type', 'text/javascript')
          c.status(200)
          return c.body(
            `export function loader(){return{__oneError:404,__oneErrorMessage:'Not Found',__oneNotFoundPath:${JSON.stringify(nfPath)}}}`
          )
        }

        // for now just change this
        const loaderRoute = {
          ...route,
          routeFile: route.file, // preserve original for lazy route lookup
          file: route.loaderServerPath || c.req.path,
        }

        const finalUrl = new URL(originalUrl, url.origin)
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
