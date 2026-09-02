import { LOADER_JS_POSTFIX_UNCACHED } from './constants'
import {
  compileManifest,
  getURLfromRequestURL,
  isPageRequestMethod,
  isStaticAssetRequestPath,
  resolveAPIRoute,
  resolveLoaderRoute,
  resolvePageRoute,
  runMiddlewares,
  type RequestHandlerResponse,
  type RequestHandlers,
} from './createHandleRequest'
import { getPathFromLoaderPath } from './utils/cleanUrl'
import { getManifest } from './vite/getManifest'

const debugRouter = process.env.ONE_DEBUG_ROUTER

// node-dev request handler. kept out of createHandleRequest.ts so the worker
// graph (one/serve-worker) does not pull getManifest -> micromatch/fast-glob.
export function createHandleRequest(
  handlers: RequestHandlers,
  {
    routerRoot,
    ignoredRouteFiles,
    routePaths,
  }: { routerRoot: string; ignoredRouteFiles?: string[]; routePaths?: string[] }
) {
  const manifest = getManifest({ routerRoot, ignoredRouteFiles, routePaths })
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
      const { pathname } = url

      // skip paths handled by vite internals or react native dev middleware
      if (
        pathname === '/__vxrnhmr' ||
        pathname.startsWith('/@vite/') ||
        pathname.startsWith('/@fs/') ||
        pathname.startsWith('/@id/') ||
        pathname.startsWith('/node_modules/') ||
        pathname.startsWith('/debugger-frontend') ||
        pathname.startsWith('/inspector')
      ) {
        return null
      }

      const looksLikeStaticFile = isStaticAssetRequestPath(pathname)

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

      if (!isPageRequestMethod(request.method)) {
        return null
      }

      if (handlers.handleLoader) {
        const isClientRequestingNewRoute = pathname.endsWith(LOADER_JS_POSTFIX_UNCACHED)

        if (isClientRequestingNewRoute) {
          const platformParam = url.searchParams.get('platform')
          const isNativePlatform =
            platformParam === 'ios' ||
            platformParam === 'android' ||
            platformParam === 'native'

          // for native requests, try serving the pre-built .native.js static file first
          // (SSG/SPA routes generate standalone CJS loaders at build time)
          if (isNativePlatform && handlers.handleStaticFile) {
            const nativeLoaderPath = pathname.replace(/\.js$/, '.native.js')
            const staticResponse = await handlers.handleStaticFile(nativeLoaderPath)
            if (staticResponse) {
              return staticResponse
            }
          }

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

            // route is known to export no loader → return empty module without
            // importing the page bundle. on workerd/cloudflare, evaluating a
            // no-loader SSG page's server bundle can crash when it pulls in
            // RN/Tamagui modules that aren't compatible with the workers runtime.
            if (route.hasLoader === false) {
              const emptyBody = isNativePlatform
                ? 'exports.loader=function(){return undefined}'
                : 'export function loader() { return undefined }'
              return new Response(emptyBody, {
                headers: { 'Content-Type': 'text/javascript' },
              })
            }

            const cleanedRequest = new Request(finalUrl, request)
            return resolveLoaderRoute(handlers, cleanedRequest, finalUrl, route)
          }

          // no matching route - return empty module so client handles gracefully
          const emptyBody = isNativePlatform
            ? 'exports.loader=function(){return{}}'
            : 'export {}'
          return new Response(emptyBody, {
            headers: { 'Content-Type': 'text/javascript' },
          })
        }
      }

      if (handlers.handlePage) {
        for (const route of compiledManifest.pageRoutes) {
          if (!route.compiledRegex.test(pathname)) {
            continue
          }

          // static asset requests (sourcemaps, favicons, fonts, …) should not
          // SSR the user's +not-found page or hijack a dynamic route. for
          // +not-found we still run middleware so it can intercept, then
          // short-circuit to a bare 404 instead of rendering the page tree.
          const isDynamicRoute = Object.keys(route.routeKeys).length > 0
          const isNotFoundRoute = route.page.endsWith('/+not-found')
          if (looksLikeStaticFile && isNotFoundRoute) {
            if (debugRouter) {
              console.info(
                `[one] ⚡ ${pathname} → bare 404 for static probe on ${route.page}`
              )
            }
            if (!route.middlewares?.length) {
              return null
            }
            return await runMiddlewares(handlers, request, route, async () => {
              return new Response(null, {
                status: 404,
                headers: { 'Content-Type': 'text/plain' },
              })
            })
          }
          if (looksLikeStaticFile && isDynamicRoute) {
            if (debugRouter) {
              console.info(
                `[one] ⚡ ${pathname} → skipping dynamic route ${route.page} for static asset`
              )
            }
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
