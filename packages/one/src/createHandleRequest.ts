import { getPathFromLoaderPath } from './cleanUrl'
import { LOADER_JS_POSTFIX_UNCACHED } from './constants'
import type { Middleware, MiddlewareContext } from './createMiddleware'
import type { RouteNode } from './Route'
import type { RouteInfo, RouteInfoWithRegex } from './server/createRoutesManifest'
import type { LoaderProps } from './types'
import { isResponse } from './utils/isResponse'
import { getManifest } from './vite/getManifest'
import { resolveAPIEndpoint, resolveResponse } from './vite/resolveResponse'
import type { One } from './vite/types'

export type RequestHandlers = {
  handleSSR?: (props: RequestHandlerProps) => Promise<any>
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

async function runMiddlewares(
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

  const context: MiddlewareContext = {}
  async function dispatch(index: number): Promise<Response> {
    const middlewareModule = middlewares![index]

    // no more middlewares, finish
    if (!middlewareModule) {
      return await getResponse()
    }

    const exported = (await handlers.loadMiddleware!(middlewareModule))?.default as
      | Middleware
      | undefined
    if (!exported) {
      throw new Error(`No valid export found in middleware: ${middlewareModule.contextKey}`)
    }

    // go to next middlware
    const next = async () => {
      return dispatch(index + 1)
    }

    // run middlewares, if response returned, exit early
    const response = await exported({ request, next, context })
    if (response) {
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
  route: RouteInfoWithRegex
) {
  const { pathname } = url
  const params = getRouteParams(pathname, route)

  try {
    return resolveAPIEndpoint(
      await handlers.handleAPI!({
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
  route: RouteInfoWithRegex
) {
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

export async function resolveSSRRoute(
  handlers: RequestHandlers,
  request: Request,
  url: URL,
  route: RouteInfoWithRegex
) {
  const { pathname, search } = url
  return resolveResponse(async () => {
    return await runMiddlewares(handlers, request, route, async () => {
      return await handlers.handleSSR!({
        request,
        route,
        url,
        loaderProps: {
          path: pathname + search,
          params: getLoaderParams(url, route),
        },
      })
    })
  })
}

// in dev mode we do it more simply:
export function createHandleRequest(options: One.PluginOptions, handlers: RequestHandlers) {
  const manifest = getManifest()
  if (!manifest) {
    throw new Error(`No routes manifest`)
  }

  const apiRoutesMap: Record<string, RouteInfo & { compiledRegex: RegExp }> =
    manifest.apiRoutes.reduce((acc, cur) => {
      acc[cur.page] = { ...cur, compiledRegex: new RegExp(cur.namedRegex) }
      return acc
    }, {})

  const apiRoutesList = Object.values(apiRoutesMap)

  // shouldn't be mapping back and forth...
  const pageRoutes = manifest.pageRoutes.map((route) => ({
    ...route,
    compiledRegex: new RegExp(route.namedRegex),
  }))

  return {
    manifest,
    handler: async function handleRequest(request: Request): Promise<RequestHandlerResponse> {
      const urlString = request.url || ''
      const url = new URL(
        urlString || '',
        request.headers.get('host') ? `http://${request.headers.get('host')}` : ''
      )
      const { pathname, search } = url

      if (pathname === '/__vxrnhmr' || pathname.startsWith('/@')) {
        return null
      }

      if (handlers.handleAPI) {
        const apiRoute = apiRoutesList.find((route) => {
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

          for (const route of pageRoutes) {
            if (route.file === '') {
              // ignore not found route
              // TODO improve/remove when not found is fixed
              continue
            }

            const finalUrl = new URL(originalUrl, url.origin)

            if (!route.compiledRegex.test(finalUrl.pathname)) {
              continue
            }

            return resolveLoaderRoute(handlers, request, finalUrl, route)
          }

          if (process.env.NODE_ENV === 'development') {
            console.error(`No matching route found!`, {
              originalUrl,
              routes: manifest.pageRoutes,
            })
          }

          // error no match!

          return Response.error()
        }
      }

      if (handlers.handleSSR) {
        for (const route of pageRoutes) {
          if (!route.compiledRegex.test(pathname)) {
            continue
          }
          return resolveSSRRoute(handlers, request, url, route)
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
