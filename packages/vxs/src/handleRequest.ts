import type { RouteInfo } from './server/createRoutesManifest'
import { getManifest } from './vite/getManifest'

export type Options = {
  shouldIgnore?: (req: Request) => boolean
  disableSSR?: boolean
}

type RequestHandlerProps = {
  request: Request
  route: RouteInfo<string>
  url: URL
  loaderProps?: { path: string; params: Record<string, any> }
}

type RequestHandlerResponse = null | string | Response

export function createHandleRequest(
  options: Options,
  handlers: {
    handleSSR?: (props: RequestHandlerProps) => Promise<any>
    handleLoader?: (props: RequestHandlerProps) => Promise<any>
    handleAPI?: (props: RequestHandlerProps) => Promise<any>
  }
) {
  const { shouldIgnore, disableSSR } = options

  const manifest = getManifest('app')
  if (!manifest) {
    throw new Error(`No routes manifest`)
  }

  const apiRoutesMap = manifest.apiRoutes.reduce((acc, cur) => {
    acc[cur.page] = cur
    return acc
  }, {})

  // its really common for people to hit refresh a couple times even on accident
  // sending two ssr requests at once and causing slowdown.
  // use this to avoid
  const activeRequests = {}

  return async function handleRequest(request: Request): Promise<RequestHandlerResponse> {
    const { method } = request
    const urlString = request.url || ''
    const url = new URL(urlString)
    const { pathname, search } = url

    if (urlString in activeRequests) {
      return await activeRequests[urlString]
    }

    if (
      request.method !== 'GET' ||
      pathname === '/__vxrnhmr' ||
      pathname.startsWith('/@') ||
      shouldIgnore?.(request)
    ) {
      return null
    }

    const logPrefix = ` [vxs] ${method}`

    if (handlers.handleAPI) {
      console.info(`${logPrefix} API ${pathname}`)
      const apiRoute = apiRoutesMap[pathname]
      if (apiRoute) {
        return await handlers.handleAPI({ request, route: apiRoute, url })
      }
    }

    if (handlers.handleLoader) {
      console.info(`${logPrefix} loader ${pathname}`)
      const isClientRequestingNewRoute = pathname.endsWith('_vxrn_loader.js')
      if (isClientRequestingNewRoute) {
        const originalUrl = pathname.replace('_vxrn_loader.js', '')
        const finalUrl = new URL(originalUrl, url.origin)

        for (const route of manifest.htmlRoutes) {
          // TODO performance
          if (!new RegExp(route.namedRegex).test(finalUrl.pathname)) {
            continue
          }

          const headers = new Headers()
          headers.set('Content-Type', 'text/javascript')

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
        }

        if (import.meta.env.DEV) {
          console.error(`No matching route found!`, {
            originalUrl,
            htmlRoutes: manifest.htmlRoutes,
          })
        }

        // error no match!

        return Response.error()
      }
    }

    if (handlers.handleSSR) {
      console.info(`${logPrefix} SSR ${pathname}`)
      const { promise, reject, resolve } = Promise.withResolvers()
      activeRequests[pathname] = promise

      try {
        for (const route of manifest.htmlRoutes) {
          // TODO performance
          if (!new RegExp(route.namedRegex).test(pathname)) {
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
  }
}

function getLoaderParams(url: URL, config: any) {
  const params: Record<string, string> = {}
  const match = new RegExp(config.namedRegex).exec(url.pathname)
  if (match?.groups) {
    for (const [key, value] of Object.entries(match.groups)) {
      const namedKey = config.routeKeys[key]
      params[namedKey] = value as string
    }
  }
  return params
}
