import './polyfills-server'

import FSExtra from 'fs-extra'
import type { Hono } from 'hono'
import { join } from 'node:path'
import type { VXRNOptions } from 'vxrn'
import { getServerEntry, loadEnv, serve as vxrnServe } from 'vxrn'
import type { RenderAppProps } from './types'

import type { One } from './vite/types'

process.on('uncaughtException', (err) => {
  console.error(`[one] Uncaught exception`, err?.stack || err)
})

export async function serve(args: VXRNOptions['server'] = {}) {
  const buildInfo = (await FSExtra.readJSON(`dist/buildInfo.json`)) as One.BuildInfo

  // ensure cache key matches build
  process.env.ONE_CACHE_KEY = buildInfo.constants.CACHE_KEY

  // to avoid loading the CACHE_KEY before we set it use async imports:
  const { labelProcess } = await import('./cli/label-process')
  const { removeUndefined } = await import('./utils/removeUndefined')
  const { loadUserOneOptions } = await import('./vite/one')

  labelProcess('serve')
  loadEnv('production')

  const oneOptions = await loadUserOneOptions('serve')

  // TODO make this better, this ensures we get react 19
  process.env.VXRN_REACT_19 = '1'

  return await vxrnServe({
    server: {
      // fallback to one plugin
      ...oneOptions.server,
      // override with any flags given to cli
      ...removeUndefined({
        port: args.port ? +args.port : undefined,
        host: args.host,
        compress: args.compress,
        platform: args.platform,
        cacheHeaders: args.cacheHeaders,
      }),

      async beforeStart(options, app) {
        await oneOptions.server?.beforeStart?.(options, app)
        await oneServe(oneOptions, options, buildInfo, app)
      },
    },
  })
}

async function oneServe(
  options: One.PluginOptions,
  vxrnOptions: VXRNOptions,
  buildInfo: One.BuildInfo,
  app: Hono
) {
  const { createHandleRequest } = await import('./createHandleRequest')
  const { isResponse } = await import('./utils/isResponse')
  const { isStatusRedirect } = await import('./utils/isStatus')
  const { resolveAPIRequest } = await import('./vite/resolveAPIRequest')

  const isAPIRequest = new WeakMap<any, boolean>()
  const root = vxrnOptions.root || '.'

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
    ...options,
    root,
  }

  const entryServer = getServerEntry(serverOptions)
  const entry = await import(entryServer)

  const render = entry.default.render as (props: RenderAppProps) => any
  const apiCJS = options.build?.api?.outputFormat === 'cjs'

  const handleRequest = createHandleRequest(
    {},
    {
      async handleAPI({ route, request, loaderProps }) {
        const apiFile = join(
          process.cwd(),
          'dist',
          'api',
          route.page.replace('[', '_').replace(']', '_') + (apiCJS ? '.cjs' : '.js')
        )

        isAPIRequest.set(request, true)

        return resolveAPIRequest(
          async () => {
            try {
              return await import(apiFile)
            } catch (err) {
              console.error(`\n [one] Error importing API route at ${apiFile}:
       
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
      const response = await handleRequest.handler(request)

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
      console.error(` [one] Error handling request: ${(err as any)['stack']}`)
    }

    await next()
  })
}
