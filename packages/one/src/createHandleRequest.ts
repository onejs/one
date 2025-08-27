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

type RequestHandlerProps<RouteExtraProps extends Object = {}> = {
  request: Request
  route: RouteInfo<string> & RouteExtraProps
  url: URL
  loaderProps?: LoaderProps
}

type RequestHandlerResponse = null | string | Response

export async function runMiddlewares(
  handlers: RequestHandlers,
  request: Request,
  route: RouteInfo,
  getResponse: (finalRequest: Request) => Promise<Response>
): Promise<Response> {
  const middlewares = route.middlewares

  if (!middlewares?.length) {
    return await getResponse(request)
  }
  if (!handlers.loadMiddleware) {
    throw new Error(`No middleware handler configured`)
  }

  const context: MiddlewareContext = {}

  async function dispatch(index: number, currentRequest = request): Promise<Response> {
    const middlewareModule = middlewares![index]

    // no more middlewares, finish with potentially modified request
    if (!middlewareModule) {
      return await getResponse(currentRequest)
    }

    const exported = (await handlers.loadMiddleware!(middlewareModule))?.default as
      | Middleware
      | undefined

    if (!exported) {
      throw new Error(`No valid export found in middleware: ${middlewareModule.contextKey}`)
    }

    // go to next middleware, optionally with a modified request
    const next = async (modifiedRequest?: Request) => {
      return dispatch(index + 1, modifiedRequest || currentRequest)
    }

    // run middlewares, if response returned, exit early
    const response = await exported({ request: currentRequest, next, context })

    if (response) {
      return response
    }

    // If the middleware returns null/void, keep going with current request
    return dispatch(index + 1, currentRequest)
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

  try {
    return resolveAPIEndpoint(
      () =>
        handlers.handleAPI!({
          request,
          route,
          url,
          loaderProps: {
            path: pathname,
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
}

export async function resolveLoaderRoute(
  handlers: RequestHandlers,
  request: Request,
  url: URL,
  route: RouteInfoCompiled
) {
  return await runMiddlewares(handlers, request, route, async (finalRequest) => {
    // Extract URL from potentially modified request
    const finalUrl = new URL(finalRequest.url)

    return await resolveResponse(async () => {
      const headers = new Headers()
      headers.set('Content-Type', 'text/javascript')

      try {
        const loaderResponse = await handlers.handleLoader!({
          request: finalRequest,
          route,
          url: finalUrl,
          loaderProps: {
            path: finalUrl.pathname,
            request: route.type === 'ssr' ? finalRequest : undefined,
            params: getLoaderParams(finalUrl, route),
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
  return resolveResponse(async () => {
    const resolved = await runMiddlewares(handlers, request, route, async (finalRequest) => {
      // Extract URL from potentially modified request
      const finalUrl = new URL(finalRequest.url)
      const { pathname, search } = finalUrl

      return await handlers.handlePage!({
        request: finalRequest,
        route,
        url: finalUrl,
        loaderProps: {
          path: pathname + search,
          // Ensure SSR loaders receive the potentially modified request
          request: route.type === 'ssr' ? finalRequest : undefined,
          params: getLoaderParams(finalUrl, route),
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

export function compileManifest(manifest: { pageRoutes: RouteInfo[]; apiRoutes: RouteInfo[] }): {
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
    handler: async function handleRequest(request: Request): Promise<RequestHandlerResponse> {
      const url = getURLfromRequestURL(request)
      const { pathname, search } = url

      if (pathname === '/__vxrnhmr' || pathname.startsWith('/@')) {
        return null
      }

      if (handlers.handleAPI) {
        const apiRoute = compiledManifest.apiRoutes.find((route) => {
          return route.compiledRegex.test(pathname)
        })
        if (apiRoute) {
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

            return resolveLoaderRoute(handlers, request, finalUrl, route)
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
