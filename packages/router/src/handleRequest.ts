import * as Glob from 'glob'
import { createRoutesManifest, type RouteInfo } from './routes-manifest'

const { sync: globSync } = (Glob['default'] || Glob) as typeof Glob

export type Options = {
  root: string
  shouldIgnore?: (req: Request) => boolean
  disableSSR?: boolean
}

type RequestHandlerProps = {
  request: Request
  route: RouteInfo<string>
  url: URL
  loaderProps?: { path: string; params: Record<string, any> }
}

type RequestHandlerResponse = null | {
  type?: 'text/javascript' | 'application/json'
  response: string | Response
}

export function createHandleRequest(
  options: Options,
  handlers: {
    handleSSR(props: RequestHandlerProps): Promise<any>
    handleLoader(props: RequestHandlerProps): Promise<any>
    handleAPI(props: RequestHandlerProps): Promise<any>
  }
) {
  const { root, shouldIgnore, disableSSR } = options
  const routePaths = getRoutePaths(root)
  const manifest = createRoutesManifest(routePaths, {
    platform: 'web',
  })

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
    const urlString = request.url || ''
    const url = new URL(urlString)
    const { pathname } = url

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

    const apiRoute = apiRoutesMap[pathname]
    if (apiRoute) {
      const out = await handlers.handleAPI({ request, route: apiRoute, url })
      const isJSON = out && typeof out === 'object'
      return {
        type: isJSON ? 'application/json' : undefined,
        response: isJSON ? JSON.stringify(out) : out,
      }
    }

    const isClientRequestingNewRoute = pathname.startsWith('/_vxrn/')
    if (isClientRequestingNewRoute) {
      const finalUrl = getRealUrl(url.host, urlString)

      for (const route of manifest.htmlRoutes) {
        // TODO performance
        if (!new RegExp(route.namedRegex).test(finalUrl.pathname)) {
          continue
        }

        const reply = await handlers.handleLoader({
          request,
          route,
          url,
          loaderProps: {
            path: finalUrl.pathname,
            params: getLoaderParams(finalUrl, route),
          },
        })

        return {
          type: 'text/javascript',
          response: reply,
        }
      }
    }

    const { promise, reject, resolve } = Promise.withResolvers()
    activeRequests[pathname] = promise

    try {
      for (const route of manifest.htmlRoutes) {
        // TODO performance
        if (!new RegExp(route.namedRegex).test(pathname)) {
          continue
        }

        const ssrResponse = {
          response: await handlers.handleSSR({
            request,
            route,
            url,
            loaderProps: {
              path: pathname,
              params: getLoaderParams(url, route),
            },
          }),
        }

        resolve(ssrResponse)
        return ssrResponse
      }
    } catch (err) {
      reject(err)
      throw err
    } finally {
      delete activeRequests[pathname]
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

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
function getRoutePaths(cwd: string) {
  return globSync('**/*.@(ts|tsx|js|jsx)', {
    cwd,
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}

function getRealUrl(host: string, urlString: string) {
  const urlBase = `http://${host}`
  return (() => {
    let _ = new URL(urlString, urlBase)
    const isClientRequestingNewRoute = _.pathname.startsWith('/_vxrn/')
    if (isClientRequestingNewRoute) {
      const search = new URLSearchParams(urlString)
      const realPathName = search.get('pathname') || '/'
      _ = new URL(realPathName, urlBase)
    }
    return _
  })()
}
