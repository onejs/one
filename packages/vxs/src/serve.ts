import './polyfills-server'

import FSExtra from 'fs-extra'
import type { Hono } from 'hono'
import Path, { join } from 'node:path'
import type { VXRNOptions } from 'vxrn'
import { createHandleRequest } from './handleRequest'
import type { RenderAppProps } from './types'
import { isResponse } from './utils/isResponse'
import { isStatusRedirect } from './utils/isStatus'
import { resolveAPIRequest } from './vite/resolveAPIRequest'
import type { VXS } from './vite/types'
import { loadUserVXSOptions } from './vite/vxs'
import { getServerCJSSetting, getServerEntry, serve as vxrnServe } from 'vxrn'
import { removeUndefined } from './utils/removeUndefined'

process.on('uncaughtException', (err) => {
  console.error(`[vxs] Uncaught exception`, err?.stack || err)
})

export async function serve(args: VXRNOptions['server'] = {}) {
  const vxsOptions = await loadUserVXSOptions('serve')

  // TODO make this better, this ensures we get react 19
  process.env.VXRN_REACT_19 = '1'

  return await vxrnServe({
    server: {
      // fallback to vxs plugin
      ...vxsOptions.server,
      // override with any flags given to cli
      ...removeUndefined({
        port: args.port ? +args.port : undefined,
        host: args.host,
        compression: args.compression,
        platform: args.platform,
        cacheHeaders: args.cacheHeaders,
      }),
    },
    afterServerStart(options, app) {
      oneServe(vxsOptions, options, app)
    },
  })
}

async function oneServe(options: VXS.Options, vxrnOptions: VXRNOptions, app: Hono) {
  const root = options.root || vxrnOptions.root || '.'
  const isAPIRequest = new WeakMap<any, boolean>()
  const toAbsolute = (p: string) => Path.resolve(root, p)

  // add redirects
  const redirects = options.web?.redirects
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

  const buildInfo = await FSExtra.readJSON(toAbsolute(`dist/buildInfo.json`))

  if (!buildInfo) {
    throw new Error(`No build info found, have you run build?`)
  }

  const { routeMap, builtRoutes } = buildInfo as VXS.BuildInfo

  const routeToBuildInfo: Record<string, VXS.RouteBuildInfo> = {}
  for (const route of builtRoutes) {
    routeToBuildInfo[route.cleanPath] = route
  }

  const serverOptions = {
    ...options,
    root,
  }

  const entryServer = getServerEntry(serverOptions)
  const serverCJS = getServerCJSSetting(serverOptions)
  const entry = await import(entryServer)

  const render = entry.default.render as (props: RenderAppProps) => any

  const apiCJS = options.build?.api?.outputFormat !== 'esm'

  const handleRequest = createHandleRequest(
    {},
    {
      async handleAPI({ route, request, loaderProps }) {
        const apiFile = join(
          process.cwd(),
          'dist',
          'api',
          route.page.replace('[', '_').replace(']', '_') + (apiCJS ? '.js.cjs' : '.js')
        )

        isAPIRequest.set(request, true)

        return resolveAPIRequest(
          async () => {
            try {
              return await import(apiFile)
            } catch (err) {
              console.error(`\n [vxs] Error importing API route at ${apiFile}:
       
  ${err}

  If this is an import error, you can likely fix this by adding this dependency to
  the "optimizeDeps.include" array in your vite.config.ts.

  🐞 For a better error message run "node" and enter:
  
  import('${apiFile}')\n\n`)
              return {}
            }
          },
          request,
          loaderProps?.params || {}
        )
      },

      async handleSSR({ route, url, loaderProps }) {
        if (route.type === 'ssr') {
          const buildInfo = routeToBuildInfo[route.page]
          if (!buildInfo) {
            throw new Error(`No buildinfo found for ${url}, route: ${route.page}`)
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
            console.error(`[vxs] Error rendering SSR route ${route.page}

  ${err?.['stack'] ?? err}

  url: ${url}`)
          }
        }
      },
    }
  )

  // preload reading in all the files, for prod performance:
  const htmlFiles: Record<string, string> = {}
  for (const key in routeMap) {
    const info = routeToBuildInfo[key]

    if (info?.type === 'ssr') {
      // we handle this on each request
      continue
    }

    htmlFiles[key] = await FSExtra.readFile(join('dist/client', routeMap[key]), 'utf-8')
  }

  app.use(async (context, next) => {
    // serve our generated html files
    const html = htmlFiles[context.req.path]
    if (html) {
      return context.html(html)
    }

    try {
      const request = context.req.raw
      const response = await handleRequest(request)

      if (response) {
        if (isResponse(response)) {
          if (isStatusRedirect(response.status)) {
            const location = `${response.headers.get('location') || ''}`
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
      console.error(` [vxs] Error handling request: ${(err as any)['stack']}`)
    }

    await next()
  })

  if (options?.afterServerStart) {
    await options?.afterServerStart?.(options, app, buildInfo)
  }
}
