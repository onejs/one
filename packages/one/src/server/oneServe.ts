import type { Hono } from 'hono'
import { join } from 'node:path'
import { getServerEntry } from 'vxrn/serve'
import type { RenderAppProps } from '../types'
import type { One } from '../vite/types'

export async function oneServe(
  oneOptions: One.PluginOptions,
  buildInfo: One.BuildInfo,
  app: Hono,
  serveStatic = true
) {
  const { createHandleRequest } = await import('../createHandleRequest')
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

  const { routeMap, builtRoutes } = buildInfo as One.BuildInfo

  const routeToBuildInfo: Record<string, One.RouteBuildInfo> = {}
  for (const route of builtRoutes) {
    routeToBuildInfo[route.cleanPath] = route

    // temp - make it back into brackets style
    const bracketRoutePath = route.cleanPath
      .split('/')
      .map((part) => {
        return part[0] === ':' ? `[${part.slice(1)}]` : part
      })
      .join('/')
    routeToBuildInfo[bracketRoutePath] = route
  }

  const serverOptions = {
    ...oneOptions,
    root: '.',
  }

  const entryServer = getServerEntry(serverOptions)
  const entry = await import(entryServer)

  const render = entry.default.render as (props: RenderAppProps) => any
  const apiCJS = oneOptions.build?.api?.outputFormat === 'cjs'

  const handleRequest = createHandleRequest(
    {},
    {
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
        console.warn('load middleware')
        const middlewareFile = join(
          process.cwd(),
          'dist',
          'middleware',
          route.contextKey.replace('[', '_').replace(']', '_') + (apiCJS ? '.cjs' : '.js')
        )
        return await import(middlewareFile)
      },

      async handleSSR({ route, url, loaderProps }) {
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
        }
      },
    }
  )

  // preload reading in all the files, for prod performance:
  const htmlFiles: Record<string, string> = {}

  if (serveStatic) {
    const { readFile } = await import('node:fs/promises')

    for (const key in routeMap) {
      const info = routeToBuildInfo[key]

      if (info?.type === 'ssr') {
        // we handle this on each request
        continue
      }

      htmlFiles[key] = await readFile(join('dist/client', routeMap[key]), 'utf-8')
    }
  }

  app.use(async (context, next) => {
    // serve our generated html files
    const html = htmlFiles[context.req.path]
    if (html) {
      console.warn('wtff bro', routeToBuildInfo[context.req.path])
      return context.html(html)
    }

    try {
      const request = context.req.raw
      const response = await handleRequest.handler(request)

      console.log('??', response)

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

        return context.json(
          response,
          200,
          isAPIRequest.get(request)
            ? {
                'Cache-Control': 'no-store',
              }
            : undefined
        )
      }
    } catch (err) {
      console.error(` [one] Error handling request: ${(err as any)['stack']}`)
    }

    await next()
  })
}
