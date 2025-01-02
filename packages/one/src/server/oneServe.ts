import type { Hono, MiddlewareHandler } from 'hono'
import type { BlankEnv } from 'hono/types'
import { join } from 'node:path'
import { getServerEntry } from 'vxrn/serve'
import { getPathFromLoaderPath } from '../cleanUrl'
import { LOADER_JS_POSTFIX_UNCACHED } from '../constants'
import { compileManifest, getURLfromRequestURL, type RequestHandlers } from '../createHandleRequest'
import type { RenderAppProps } from '../types'
import { toAbsolute } from '../utils/toAbsolute'
import type { One } from '../vite/types'
import type { RouteInfoCompiled } from './createRoutesManifest'
import { default as FSExtra } from 'fs-extra'

export async function oneServe(
  oneOptions: One.PluginOptions,
  buildInfo: One.BuildInfo,
  app: Hono,
  serveStatic = true
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

  const entryServer = getServerEntry(serverOptions)
  const entry = await import(entryServer)

  const render = entry.default.render as (props: RenderAppProps) => any
  const apiCJS = oneOptions.build?.api?.outputFormat === 'cjs'

  const requestHandlers: RequestHandlers = {
    async handleAPI({ route }) {
      const apiFile = join(
        process.cwd(),
        'dist',
        'api',
        route.page.replace('[', '_').replace(']', '_') + (apiCJS ? '.cjs' : '.js')
      )
      return await import(apiFile)
    },

    async loadMiddleware(route) {
      return await import(toAbsolute(route.contextKey))
    },

    async handlePage({ route, url, loaderProps }) {
      if (route.type === 'ssr') {
        const buildInfo = routeToBuildInfo[route.page]
        if (!buildInfo) {
          throw new Error(
            `No buildinfo found for ${url}, route: ${route.page}, in keys: ${Object.keys(routeToBuildInfo)}`
          )
        }

        try {
          const exported = await import(buildInfo.serverJsPath)
          const loaderData = await exported.loader?.(loaderProps)
          const preloads = buildInfo.preloads

          const headers = new Headers()
          headers.set('content-type', 'text/html')

          return new Response(
            await render({
              loaderData,
              loaderProps,
              path: loaderProps?.path || '/',
              preloads,
            }),
            {
              headers,
            }
          )
        } catch (err) {
          console.error(`[one] Error rendering SSR route ${route.page}

${err?.['stack'] ?? err}

url: ${url}`)
        }
      } else {
        const htmlPath = routeMap[route['honoPath']]
        if (htmlPath) {
          const html = await FSExtra.readFile(
            join('dist/client', routeMap[route['honoPath']]),
            'utf-8'
          )
          const headers = new Headers()
          headers.set('content-type', 'text/html')
          return new Response(html, { headers })
        }
      }
    },
  }

  function createHonoHandler(route: RouteInfoCompiled): MiddlewareHandler<BlankEnv, never, {}> {
    return async (context, next) => {
      try {
        const request = context.req.raw
        const url = getURLfromRequestURL(request)

        const response = await (() => {
          // where to put this best? can likely be after some of the switch?
          if (url.pathname.endsWith(LOADER_JS_POSTFIX_UNCACHED)) {
            const originalUrl = getPathFromLoaderPath(url.pathname)
            const finalUrl = new URL(originalUrl, url.origin)
            return resolveLoaderRoute(requestHandlers, request, finalUrl, route)
          }

          switch (route.type) {
            case 'api': {
              return resolveAPIRoute(requestHandlers, request, url, route)
            }
            case 'ssg':
            case 'spa':
            case 'ssr': {
              return resolvePageRoute(requestHandlers, request, url, route)
            }
          }
        })()

        if (response) {
          if (isResponse(response)) {
            if (isStatusRedirect(response.status)) {
              const location = `${response.headers.get('location') || ''}`
              response.headers.forEach((value, key) => {
                context.header(key, value)
              })
              return context.redirect(location, response.status)
            }

            if (isAPIRequest.get(request)) {
              try {
                // don't cache api requests by default
                response.headers.set('Cache-Control', 'no-store')
              } catch (err) {
                console.info(
                  `Error udpating cache header on api route "${
                    context.req.path
                  }" to no-store, it is ${response.headers.get('cache-control')}, continue`,
                  err
                )
              }
            }

            return response as Response
          }

          return response
        }
      } catch (err) {
        console.error(` [one] Error handling request: ${(err as any)['stack']}`)
      }

      return await next()
    }
  }

  const compiledManifest = compileManifest(buildInfo.manifest)

  for (const route of compiledManifest.pageRoutes) {
    app.get(route.honoPath, createHonoHandler(route))
  }

  for (const route of compiledManifest.apiRoutes) {
    app.get(route.honoPath, createHonoHandler(route))
    app.put(route.honoPath, createHonoHandler(route))
    app.post(route.honoPath, createHonoHandler(route))
    app.delete(route.honoPath, createHonoHandler(route))
    app.patch(route.honoPath, createHonoHandler(route))
  }
}
