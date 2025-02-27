import { default as FSExtra } from 'fs-extra'
import type { Hono, MiddlewareHandler } from 'hono'
import type { BlankEnv } from 'hono/types'
import { extname, join } from 'node:path'
import { getServerEntry } from 'vxrn/serve'
import { LOADER_JS_POSTFIX_UNCACHED } from '../constants'
import { compileManifest, getURLfromRequestURL, type RequestHandlers } from '../createHandleRequest'
import type { RenderAppProps } from '../types'
import { getPathFromLoaderPath } from '../utils/cleanUrl'
import { toAbsolute } from '../utils/toAbsolute'
import type { One } from '../vite/types'
import type { RouteInfoCompiled } from './createRoutesManifest'

export async function oneServe(oneOptions: One.PluginOptions, buildInfo: One.BuildInfo, app: Hono) {
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

    async handleLoader({ request, route, url, loaderProps }) {
      // TODO this shouldn't be in dist/client right? we should build a dist/server version?
      return await import(toAbsolute(join('./', 'dist/client', route.file)))
    },

    async handlePage({ route, url, loaderProps }) {
      const buildInfo = routeToBuildInfo[route.file]

      if (route.type === 'ssr') {
        if (!buildInfo) {
          throw new Error(
            `No buildinfo found for ${url}, route: ${route.page}, in keys: ${Object.keys(routeToBuildInfo)}`
          )
        }

        try {
          const exported = await import(toAbsolute(buildInfo.serverJsPath))
          const loaderData = await exported.loader?.(loaderProps)
          const preloads = buildInfo.preloads

          const headers = new Headers()
          headers.set('content-type', 'text/html')

          const rendered = await render({
            mode: route.type,
            loaderData,
            loaderProps,
            path: loaderProps?.path || '/',
            preloads,
          })

          return new Response(rendered, {
            headers,
            status: route.isNotFound ? 404 : 200,
          })
        } catch (err) {
          console.error(`[one] Error rendering SSR route ${route.page}

${err?.['stack'] ?? err}

url: ${url}`)
        }
      } else {
        const htmlPath = routeMap[url.pathname] || routeMap[buildInfo?.cleanPath]

        if (htmlPath) {
          const html = await FSExtra.readFile(join('dist/client', htmlPath), 'utf-8')
          const headers = new Headers()
          headers.set('content-type', 'text/html')
          return new Response(html, { headers, status: route.isNotFound ? 404 : 200 })
        }
      }
    },
  }

  function createHonoHandler(route: RouteInfoCompiled): MiddlewareHandler<BlankEnv, never, {}> {
    return async (context, next) => {
      // assets we ignore
      if (extname(context.req.path)) {
        return next()
      }

      try {
        const request = context.req.raw
        const url = getURLfromRequestURL(request)

        const response = await (() => {
          // this handles the ...rest style routes
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
                // don't cache api requests by default
                response.headers.set('Cache-Control', 'no-store')
                return response
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
  }

  for (const route of compiledManifest.pageRoutes) {
    app.get(route.urlPath, createHonoHandler(route))
  }

  // TODO make this inside each page, need to make loader urls just be REGULAR_URL + loaderpostfix
  app.get('*', async (c, next) => {
    if (
      c.req.path.endsWith(LOADER_JS_POSTFIX_UNCACHED) &&
      // if it includes /assets its a static loader
      !c.req.path.includes('/assets/')
    ) {
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
        route.file = c.req.path

        const finalUrl = new URL(originalUrl, url.origin)
        try {
          return resolveLoaderRoute(requestHandlers, request, finalUrl, route)
        } catch (err) {
          console.error(`Error running loader: ${err}`)
          return next()
        }
      }
    }

    return next()
  })
}
