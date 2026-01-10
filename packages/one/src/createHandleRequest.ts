import { LOADER_JS_POSTFIX_UNCACHED } from './constants'
import type { Middleware, MiddlewareContext } from './createMiddleware'
import type { RouteNode } from './router/Route'
import type { RouteInfoCompiled } from './server/createRoutesManifest'
import type { LoaderProps } from './types'
import { getPathFromLoaderPath } from './utils/cleanUrl'
import { isResponse } from './utils/isResponse'
import { getManifest } from './vite/getManifest'
import { resolveAPIEndpoint, resolveResponse } from './vite/resolveResponse'
import type { RouteInfo } from './vite/types'

export type RequestHandlers = {
  handlePage?: (props: RequestHandlerProps) => Promise<any>
  handleLoader?: (props: RequestHandlerProps) => Promise<any>
  handleAPI?: (props: RequestHandlerProps) => Promise<any>
  loadMiddleware?: (route: RouteNode) => Promise<any>
}

type RequestHandlerProps<RouteExtraProps extends object = {}> = {
  request: Request
  route: RouteInfo<string> & RouteExtraProps
  url: URL
  loaderProps?: LoaderProps
}

type RequestHandlerResponse = null | string | Response

const debugRouter = process.env.ONE_DEBUG_ROUTER

export async function runMiddlewares(
  handlers: RequestHandlers,
  request: Request,
  route: RouteInfo,
  getResponse: () => Promise<Response>
): Promise<Response> {
  const middlewares = route.middlewares

  if (!middlewares?.length) {
    return await getResponse()
  }
  if (!handlers.loadMiddleware) {
    throw new Error(`No middleware handler configured`)
  }

  if (debugRouter) {
    console.info(`[one] 🔗 middleware chain (${middlewares.length}) for ${route.page}`)
  }

  const context: MiddlewareContext = {}

  async function dispatch(index: number): Promise<Response> {
    const middlewareModule = middlewares![index]

    // no more middlewares, finish
    if (!middlewareModule) {
      if (debugRouter) {
        console.info(`[one] ✓ middleware chain complete`)
      }
      return await getResponse()
    }

    if (debugRouter) {
      console.info(`[one]   → middleware[${index}]: ${middlewareModule.contextKey}`)
    }

    const exported = (await handlers.loadMiddleware!(middlewareModule))?.default as
      | Middleware
      | undefined

    if (!exported) {
      throw new Error(
        `No valid export found in middleware: ${middlewareModule.contextKey}`
      )
    }

    // go to next middleware
    const next = async () => {
      return dispatch(index + 1)
    }

    // run middlewares, if response returned, exit early
    const response = await exported({ request, next, context })

    if (response) {
      if (debugRouter) {
        console.info(
          `[one]   ← middleware[${index}] returned early (status: ${response.status})`
        )
      }
      return response
    }

    // If the middleware returns null/void, keep going
    return dispatch(index + 1)
  }

  // Start with the first middleware (index 0).
  return dispatch(0)
}

export async function resolveAPIRoute(
  handlers: RequestHandlers,
  request: Request,
  url: URL,
  route: RouteInfoCompiled
) {
  const { pathname } = url
  const params = getRouteParams(pathname, route)

  if (debugRouter) {
    console.info(`[one] 📡 API ${request.method} ${pathname} → ${route.file}`, params)
  }

  return await runMiddlewares(handlers, request, route, async () => {
    try {
      return resolveAPIEndpoint(
        () =>
          handlers.handleAPI!({
            request,
            route,
            url,
            loaderProps: {
              path: pathname,
              search: url.search,
              params,
            },
          }),
        request,
        params || {}
      )
    } catch (err) {
      if (isResponse(err)) {
        return err
      }

      if (process.env.NODE_ENV === 'development') {
        console.error(`\n [one] Error importing API route at ${pathname}:

          ${err}

          If this is an import error, you can likely fix this by adding this dependency to
          the "optimizeDeps.include" array in your vite.config.ts.
        `)
      }

      throw err
    }
  })
}

export async function resolveLoaderRoute(
  handlers: RequestHandlers,
  request: Request,
  url: URL,
  route: RouteInfoCompiled
) {
  if (debugRouter) {
    console.info(`[one] 📦 loader ${url.pathname} → ${route.file}`)
  }

  return await runMiddlewares(handlers, request, route, async () => {
    return await resolveResponse(async () => {
      const headers = new Headers()
      headers.set('Content-Type', 'text/javascript')

      try {
        const loaderResponse = await handlers.handleLoader!({
          request,
          route,
          url,
          loaderProps: {
            path: url.pathname,
            search: url.search,
            request: route.type === 'ssr' ? request : undefined,
            params: getLoaderParams(url, route),
          },
        })

        return new Response(loaderResponse, {
          headers,
        })
      } catch (err) {
        // allow throwing a response in a loader
        if (isResponse(err)) {
          return err
        }

        console.error(`Error running loader: ${err}`)

        throw err
      }
    })
  })
}

export async function resolvePageRoute(
  handlers: RequestHandlers,
  request: Request,
  url: URL,
  route: RouteInfoCompiled
) {
  const { pathname, search } = url

  if (debugRouter) {
    console.info(`[one] 📄 page ${pathname} → ${route.file} (${route.type})`)
  }

  return resolveResponse(async () => {
    const resolved = await runMiddlewares(handlers, request, route, async () => {
      return await handlers.handlePage!({
        request,
        route,
        url,
        loaderProps: {
          path: pathname,
          search: search,
          // Ensure SSR loaders receive the original request
          request: route.type === 'ssr' ? request : undefined,
          params: getLoaderParams(url, route),
        },
      })
    })
    return resolved
  })
}

export function getURLfromRequestURL(request: Request) {
  const urlString = request.url || ''
  return new URL(
    urlString || '',
    request.headers.get('host') ? `http://${request.headers.get('host')}` : ''
  )
}

function compileRouteRegex(route: RouteInfo): RouteInfoCompiled {
  return {
    ...route,
    compiledRegex: new RegExp(route.namedRegex),
  }
}

export function compileManifest(manifest: {
  pageRoutes: RouteInfo[]
  apiRoutes: RouteInfo[]
}): {
  pageRoutes: RouteInfoCompiled[]
  apiRoutes: RouteInfoCompiled[]
} {
  return {
    pageRoutes: manifest.pageRoutes.map(compileRouteRegex),
    apiRoutes: manifest.apiRoutes.map(compileRouteRegex),
  }
}

// in dev mode we do it more simply:
export function createHandleRequest(
  handlers: RequestHandlers,
  { routerRoot }: { routerRoot: string }
) {
  const manifest = getManifest({ routerRoot })
  if (!manifest) {
    throw new Error(`No routes manifest`)
  }
  const compiledManifest = compileManifest(manifest)

  return {
    manifest,
    handler: async function handleRequest(
      request: Request
    ): Promise<RequestHandlerResponse> {
      const url = getURLfromRequestURL(request)
      const { pathname, search } = url

      if (pathname === '/__vxrnhmr' || pathname.startsWith('/@')) {
        return null
      }

      // skip static file requests - let vite serve them instead of matching dynamic routes
      // this mirrors Next.js behavior: paths with file extensions don't match page routes
      if (pathname.includes('.')) {
        return null
      }

      if (handlers.handleAPI) {
        const apiRoute = compiledManifest.apiRoutes.find((route) => {
          return route.compiledRegex.test(pathname)
        })
        if (apiRoute) {
          if (debugRouter) {
            console.info(`[one] ⚡ ${pathname} → matched API route: ${apiRoute.page}`)
          }
          return await resolveAPIRoute(handlers, request, url, apiRoute)
        }
      }

      if (request.method !== 'GET') {
        return null
      }

      if (handlers.handleLoader) {
        const isClientRequestingNewRoute = pathname.endsWith(LOADER_JS_POSTFIX_UNCACHED)

        if (isClientRequestingNewRoute) {
          const originalUrl = getPathFromLoaderPath(pathname)

          for (const route of compiledManifest.pageRoutes) {
            if (route.file === '') {
              // ignore not found route
              continue
            }

            const finalUrl = new URL(originalUrl, url.origin)
            finalUrl.search = url.search

            if (!route.compiledRegex.test(finalUrl.pathname)) {
              continue
            }

            const cleanedRequest = new Request(finalUrl, request)
            return resolveLoaderRoute(handlers, cleanedRequest, finalUrl, route)
          }

          if (process.env.NODE_ENV === 'development') {
            console.error(`No matching route found for loader!`, {
              originalUrl,
              pathname,
              routes: manifest.pageRoutes,
            })
          }

          // error no match!

          return Response.error()
        }
      }

      if (handlers.handlePage) {
        for (const route of compiledManifest.pageRoutes) {
          if (!route.compiledRegex.test(pathname)) {
            continue
          }
          if (debugRouter) {
            console.info(
              `[one] ⚡ ${pathname} → matched page route: ${route.page} (${route.type})`
            )
          }
          return resolvePageRoute(handlers, request, url, route)
        }
      }

      return null
    },
  }
}

function getLoaderParams(
  url: URL,
  config: { compiledRegex: RegExp; routeKeys: Record<string, string> }
) {
  const params: Record<string, string> = {}
  const match = new RegExp(config.compiledRegex).exec(url.pathname)
  if (match?.groups) {
    for (const [key, value] of Object.entries(match.groups)) {
      const namedKey = config.routeKeys[key]
      params[namedKey] = value as string
    }
  }
  return params
}

// Add this helper function
function getRouteParams(pathname: string, route: RouteInfo<string>) {
  const regex = new RegExp(route.namedRegex)
  const match = regex.exec(pathname)
  if (!match) return {}
  return Object.fromEntries(
    Object.entries(route.routeKeys).map(([key, value]) => {
      return [value, (match.groups?.[key] || '') as string]
    })
  )
}
