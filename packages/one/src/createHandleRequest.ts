import { LOADER_JS_POSTFIX_UNCACHED } from './constants'
import type { Middleware, MiddlewareContext } from './createMiddleware'
import type { RouteNode } from './router/Route'
import type { RouteInfoCompiled } from './server/createRoutesManifest'
import type { LoaderProps } from './types'
import { isResponse } from './utils/isResponse'
import { resolveAPIEndpoint, resolveResponse } from './vite/resolveResponse'
import type { RouteInfo } from './vite/types'

export type RequestHandlers = {
  handlePage?: (props: RequestHandlerProps) => Promise<any>
  handleLoader?: (props: RequestHandlerProps) => Promise<any>
  handleAPI?: (props: RequestHandlerProps) => Promise<any>
  handleStaticFile?: (path: string) => Promise<Response | null>
  loadMiddleware?: (route: RouteNode) => Promise<any>
}

type RequestHandlerProps<RouteExtraProps extends object = {}> = {
  request: Request
  route: RouteInfo<string> & RouteExtraProps
  url: URL
  loaderProps?: LoaderProps
}

export type RequestHandlerResponse = null | string | Response

const debugRouter = process.env.ONE_DEBUG_ROUTER
const staticAssetPathRe = /\.(?:[a-z0-9]{2,4}|webmanifest|wasm|woff2)$/i

export function isStaticAssetRequestPath(pathname: string): boolean {
  return (
    !pathname.endsWith(LOADER_JS_POSTFIX_UNCACHED) && staticAssetPathRe.test(pathname)
  )
}

// page (document) routes answer HEAD exactly like GET. the transport drops the
// body: node's ServerResponse suppresses it for HEAD and workerd does the same.
// without this a HEAD document request falls through to a bare 404 while GET is 200.
export function isPageRequestMethod(method: string) {
  return method === 'GET' || method === 'HEAD'
}

// ensure handler results are always a proper Response so middleware
// can safely use response.body / response.headers / new Response(response.body, ...)
function ensureResponse(value: any): Response {
  // use isResponse (duck-type check) instead of instanceof — the Response
  // constructor may differ across module realms (e.g. API handler vs middleware)
  if (isResponse(value)) return value
  if (typeof value === 'string') {
    return new Response(value, {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  if (value && typeof value === 'object') {
    return Response.json(value)
  }
  return new Response(value)
}

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
      return ensureResponse(await getResponse())
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
  route: RouteInfoCompiled,
  env?: unknown,
  executionCtx?: unknown
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
              subdomain: getSubdomain(url),
              params,
            },
          }),
        request,
        params || {},
        env,
        executionCtx
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

  const isNativeRequest =
    url.searchParams.get('platform') === 'ios' ||
    url.searchParams.get('platform') === 'android'

  const response = await runMiddlewares(handlers, request, route, async () => {
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
            subdomain: getSubdomain(url),
            request: route.type === 'ssr' ? request : undefined,
            params: getLoaderParams(url, route),
          },
        })

        // native needs CJS format for eval()
        const body =
          isNativeRequest && loaderResponse ? toCjsLoader(loaderResponse) : loaderResponse

        return new Response(body, {
          headers,
        })
      } catch (err) {
        // allow throwing a response in a loader
        if (isResponse(err)) {
          return err
        }

        if ((err as any)?.code !== 'ERR_MODULE_NOT_FOUND') {
          console.error(`Error running loader: ${err}`)
        }

        throw err
      }
    })
  })

  // transform redirect responses into js modules so the client can detect
  // and handle them during client-side navigation (instead of the browser
  // silently following the 302 and trying to parse HTML as javascript)
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (location) {
      const redirectUrl = new URL(location, url.origin)
      const redirectPath = redirectUrl.pathname + redirectUrl.search + redirectUrl.hash
      const data = `{__oneRedirect:${JSON.stringify(redirectPath)},__oneRedirectStatus:${response.status}}`
      const body = isNativeRequest
        ? `exports.loader=function(){return ${data}}`
        : `export function loader(){return${data}}`
      return new Response(body, {
        headers: { 'Content-Type': 'text/javascript' },
      })
    }
  }

  // transform auth error responses (401/403) into js modules so the client
  // gets a clean error signal instead of a parse failure
  if (response.status === 401 || response.status === 403) {
    const data = `{__oneError:${response.status},__oneErrorMessage:${JSON.stringify(response.statusText || 'Unauthorized')}}`
    const body = isNativeRequest
      ? `exports.loader=function(){return ${data}}`
      : `export function loader(){return${data}}`
    return new Response(body, {
      headers: { 'Content-Type': 'text/javascript' },
    })
  }

  return response
}

/**
 * convert an ESM loader response to CJS for native eval().
 * extracts the JSON data from `export function loader() { return {...} }`
 * and wraps it as `exports.loader = function() { return {...} }`
 */
function toCjsLoader(esmCode: string): string {
  // already CJS (dev plugin pre-converts for native)
  if (esmCode.startsWith('exports.')) {
    return esmCode
  }
  // match: export function loader() { return DATA }
  const match = esmCode.match(
    /export\s+function\s+loader\s*\(\)\s*\{\s*return\s+([\s\S]+)\s*\}/
  )
  if (match) {
    return `exports.loader=function(){return ${match[1]}}`
  }
  // fallback: wrap the whole thing
  return `exports.loader=function(){return {}}`
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

  const loaderProps = {
    path: pathname,
    search: search,
    subdomain: getSubdomain(url),
    request: route.type === 'ssr' ? request : undefined,
    params: getLoaderParams(url, route),
  }

  // flatten the async chain for SSR: skip runMiddlewares wrapper when no middlewares
  if (!route.middlewares?.length) {
    return resolveResponse(() => {
      return handlers.handlePage!({ request, route, url, loaderProps })
    })
  }

  return resolveResponse(async () => {
    return await runMiddlewares(handlers, request, route, async () => {
      return await handlers.handlePage!({ request, route, url, loaderProps })
    })
  })
}

// weakmap cache to avoid re-parsing the same request URL
const _urlCache = new WeakMap<Request, URL>()

export function getURLfromRequestURL(request: Request) {
  let url = _urlCache.get(request)
  if (url) return url
  const urlString = request.url || ''
  const host = request.headers.get('host')
  // `undefined`, never '': a base is only optional when it is ABSENT. passing
  // an empty string is passing an invalid base, and URL throws on it even when
  // urlString is already absolute. an incoming cloudflare/node request always
  // carries Host so this never showed there, but a Request built by hand has
  // no Host (it is a forbidden header name in a browser) and every call threw
  // "Invalid base URL".
  url = new URL(urlString || '', host ? `http://${host}` : undefined)
  _urlCache.set(request, url)
  return url
}

export function getSubdomain(url: URL): string | undefined {
  const host = url.hostname
  // skip for IP addresses and localhost
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return undefined
  }
  const parts = host.split('.')
  // need at least 3 parts for a subdomain (sub.example.com)
  if (parts.length < 3) {
    return undefined
  }
  // return everything before the last two parts (domain.tld)
  return parts.slice(0, -2).join('.')
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

export function getLoaderParams(
  url: URL,
  config: { compiledRegex: RegExp; routeKeys: Record<string, string> }
) {
  const params: Record<string, string> = {}
  const match = config.compiledRegex.exec(url.pathname)
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
