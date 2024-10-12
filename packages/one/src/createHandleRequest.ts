import { getPathFromLoaderPath } from './cleanUrl'
import type { RouteInfo } from './server/createRoutesManifest'
import { isResponse } from './utils/isResponse'
import { promiseWithResolvers } from './utils/promiseWithResolvers'
import { getManifest } from './vite/getManifest'
import type { One } from './vite/types'

type RequestHandlerProps<RouteExtraProps extends Object = {}> = {
  request: Request
  route: RouteInfo<string> & RouteExtraProps
  url: URL
  loaderProps?: { path: string; params: Record<string, any> }
}

type RequestHandlerResponse = null | string | Response

export function createHandleRequest(
  options: One.PluginOptions,
  handlers: {
    handleSSR?: (props: RequestHandlerProps) => Promise<any>
    handleLoader?: (props: RequestHandlerProps) => Promise<any>
    handleAPI?: (props: RequestHandlerProps) => Promise<any>
  }
) {
  if (!import.meta.env) {
    throw new Error(`No import.meta.env - Node 20 or greater required.`)
  }

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

  // its really common for people to hit refresh a couple times even on accident
  // sending two ssr requests at once and causing slowdown.
  // use this to avoid
  const activeRequests = {}

  // shouldn't be mapping back and forth...
  const pageRoutes = manifest.pageRoutes.map((route) => ({
    ...route,
    workingRegex: new RegExp(route.namedRegex),
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

      if (process.env.NODE_ENV !== 'production') {
        if (activeRequests[pathname]) {
          return await activeRequests[pathname]
        }
      }

      if (pathname === '/__vxrnhmr' || pathname.startsWith('/@')) {
        return null
      }

      if (handlers.handleAPI) {
        const apiRoute = apiRoutesList.find((route) => {
          const regex = route.compiledRegex
          return regex.test(pathname)
        })

        if (apiRoute) {
          const params = getRouteParams(pathname, apiRoute)

          try {
            return await handlers.handleAPI({
              request,
              route: apiRoute,
              url,
              loaderProps: {
                path: pathname,
                params,
              },
            })
          } catch (err) {
            if (isResponse(err)) {
              return err
            }
            throw err
          }
        }
      }

      if (request.method !== 'GET') {
        return null
      }

      if (handlers.handleLoader) {
        const isClientRequestingNewRoute = pathname.endsWith('_vxrn_loader.js')

        if (isClientRequestingNewRoute) {
          const originalUrl = getPathFromLoaderPath(pathname)
          const finalUrl = new URL(originalUrl, url.origin)

          for (const route of pageRoutes) {
            if (route.file === '') {
              // ignore not found route
              // TODO improve/remove when not found is fixed
              continue
            }
            if (!route.workingRegex.test(finalUrl.pathname)) {
              continue
            }

            const headers = new Headers()
            headers.set('Content-Type', 'text/javascript')

            try {
              const loaderResponse = await handlers.handleLoader({
                request,
                route,
                url,
                loaderProps: {
                  path: finalUrl.pathname,
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
        const { promise, reject, resolve } = promiseWithResolvers()

        // TODO timeout handler to clear activeRequests and log error
        activeRequests[pathname] = promise

        try {
          for (const route of pageRoutes) {
            if (!route.workingRegex.test(pathname)) {
              continue
            }

            const ssrResponse = await handlers.handleSSR({
              request,
              route,
              url,
              loaderProps: {
                path: pathname + search,
                params: getLoaderParams(url, route),
              },
            })

            resolve(ssrResponse)
            return ssrResponse
          }
        } catch (err) {
          reject(err)
          throw err
        } finally {
          delete activeRequests[pathname]
        }
      }

      return null
    },
  }
}

function getLoaderParams(
  url: URL,
  config: { workingRegex: RegExp; routeKeys: Record<string, string> }
) {
  const params: Record<string, string> = {}
  const match = new RegExp(config.workingRegex).exec(url.pathname)
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
    Object.entries(route.routeKeys).map(([key, value]) => [value, match.groups?.[key]])
  )
}
