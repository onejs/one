import FSExtra from 'fs-extra'
import type { Hono } from 'hono'
import Path, { join } from 'node:path'

import { createHandleRequest } from '../handleRequest'
import { isResponse } from '../utils/isResponse'
import { isStatusRedirect } from '../utils/isStatus'
import { resolveAPIRequest } from './resolveAPIRequest'
import type { VXS } from './types'
import type { VXRNOptions } from 'vxrn'

export async function serve(options: VXS.Options, vxrnOptions: VXRNOptions, app: Hono) {
  const isAPIRequest = new WeakMap<any, boolean>()
  const toAbsolute = (p) => Path.resolve(options.root || '.', p)

  // add redirects
  if (options.redirects) {
    for (const redirect of options.redirects) {
      app.get(redirect.source, (context) => {
        const destinationUrl = redirect.destination.replace(/:\w+/g, (param) => {
          const paramName = param.substring(1)
          return context.req.param(paramName) || ''
        })
        return context.redirect(destinationUrl, redirect.permanent ? 301 : 302)
      })
    }
  }

  const handleRequest = createHandleRequest(
    {},
    {
      async handleAPI({ route, request }) {
        const apiFile = join(process.cwd(), 'dist/api', route.page + '.js')

        isAPIRequest.set(request, true)

        return resolveAPIRequest(
          () =>
            import(apiFile).catch((err) => {
              console.error(`\n [vxs] Error importing API route at ${apiFile}:
         
    ${err}

    If this is an import error, you can likely fix this by adding this dependency to
    the "optimizeDeps.include" array in your vite.config.ts.

    🐞 For a better error message run "node" and enter:
    
    import('${apiFile}')\n\n`)
              return {}
            }),
          request
        )
      },
    }
  )

  const routeMap = await FSExtra.readJSON('dist/routeMap.json')

  // preload reading in all the files, for prod performance:
  const htmlFiles: Record<string, string> = {}
  for (const key in routeMap) {
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
            // don't cache api requests by default
            response.headers.set('cache-control', 'no-store')
          }

          return response as Response
        }

        return context.json(response)
      }
    } catch (err) {
      console.error(` [vxs] Error handling request: ${err}`)
    }

    await next()
  })

  if (options?.afterServerStart) {
    await options?.afterServerStart?.(
      options,
      app,
      JSON.parse(await FSExtra.readFile(toAbsolute(`dist/buildInfo.json`), 'utf-8'))
    )
  }
}
