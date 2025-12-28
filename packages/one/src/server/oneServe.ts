import type { Hono, MiddlewareHandler } from 'hono'
import type { BlankEnv } from 'hono/types'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
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

const debugRouter = process.env.ONE_DEBUG_ROUTER

/**
 * Lazy import functions for route modules.
 * Modules are loaded on-demand when a route is matched, not all upfront.
 */
type LazyRoutes = {
  serverEntry: () => Promise<{ default: { render: (props: any) => any } }>
  pages: Record<string, () => Promise<any>>
  api: Record<string, () => Promise<any>>
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
  const { resolveAPIRoute, resolveLoaderRoute, resolvePageRoute } = await import(
    '../createHandleRequest'
  )
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

  const serverOptions = {
    ...oneOptions,
    root: '.',
  }

  const apiCJS = oneOptions.build?.api?.outputFormat === 'cjs'

  // useRolldown is determined at build time and stored in buildInfo
  const useRolldown = buildInfo.useRolldown ?? false

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
      const fileName = useRolldown
        ? route.page.slice(1)
        : route.page.slice(1).replace(/\[/g, '_').replace(/\]/g, '_')
      const apiFile = join(process.cwd(), 'dist', 'api', fileName + (apiCJS ? '.cjs' : '.js'))
      return await import(apiFile)
    },

    async loadMiddleware(route) {
      return await import(toAbsolute(route.contextKey))
    },

    async handleLoader({ route, loaderProps }) {
      // Use lazy import if available (workers), otherwise dynamic import (Node.js)
      const exports = options?.lazyRoutes?.pages?.[route.file]
        ? await options.lazyRoutes.pages[route.file]()
        : await import(toAbsolute(join('./', 'dist/server', route.file)))

      const { loader } = exports

      if (!loader) {
        console.warn(`No loader found in exports`, route.file)
        return null
      }

      const json = await loader(loaderProps)

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
          const loaderData = await exported.loader?.(loaderProps)

          const headers = new Headers()
          headers.set('content-type', 'text/html')

          const rendered = await (await getRender())({
            mode: route.type,
            loaderData,
            loaderProps,
            path: loaderProps?.path || '/',
            // Use separated preloads for optimal loading
            preloads: buildInfo.criticalPreloads || buildInfo.preloads,
            deferredPreloads: buildInfo.deferredPreloads,
            css: buildInfo.css,
            cssContents: buildInfo.cssContents,
          })

          return new Response(rendered, {
            headers,
            status: route.isNotFound ? 404 : 200,
          })
        } catch (err) {
          console.error(`[one] Error rendering SSR route ${route.file}

${err?.['stack'] ?? err}

url: ${url}`)
        }
      } else {
        const htmlPath = routeMap[url.pathname] || routeMap[buildInfo?.cleanPath]

        if (htmlPath) {
          const html = await readFile(join('dist/client', htmlPath), 'utf-8')
          const headers = new Headers()
          headers.set('content-type', 'text/html')
          return new Response(html, { headers, status: route.isNotFound ? 404 : 200 })
        }
      }
    },
  }

  function createHonoHandler(route: RouteInfoCompiled): MiddlewareHandler<BlankEnv, never, {}> {
    return async (context, next) => {
      try {
        const request = context.req.raw

        if (route.page.endsWith('/+not-found') || Reflect.ownKeys(route.routeKeys).length > 0) {
          // Static assets should have the highest priority - which is the behavior of the dev server.
          // But if we handle every matching static asset here, it seems to break some of the static routes.
          // So we only handle it if there's a matching not-found or dynamic route, to prevent One from taking over the static asset.
          // If there's no matching not-found or dynamic route, it's very likely that One won't handle it and will fallback to VxRN serving the static asset so it will also work.
          // Note: serveStaticAssets is optional - workers handle static assets via platform config
          if (options?.serveStaticAssets) {
            const staticAssetResponse = await options.serveStaticAssets({ context })
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
            const finalUrl = new URL(originalUrl, url.origin)
            const cleanedRequest = new Request(finalUrl, request)
            return resolveLoaderRoute(requestHandlers, cleanedRequest, finalUrl, route)
          }

          switch (route.type) {
            case 'api': {
              if (debugRouter) {
                console.info(`[one] ⚡ ${url.pathname} → matched API route: ${route.page}`)
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

        // for now just change this
        const loaderRoute = {
          ...route,
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
          console.error(`Error running loader: ${err}`)
          return next()
        }
      }
    }

    return next()
  })
}
