import FSExtra from 'fs-extra'
import type { Hono } from 'hono'
import { join } from 'node:path'
import type { VXRNConfig } from 'vxrn'
import { createHandleRequest } from '../handleRequest'
import { resolveAPIRequest } from './resolveAPIRequest'
import { isResponse } from '../utils/isResponse'
import { isStatusRedirect } from '../utils/isStatus'

export async function serve(optionsIn: VXRNConfig, app: Hono) {
  const isAPIRequest = new WeakMap<any, boolean>()

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

          if (!response.headers.get('cache-control')) {
            if (isAPIRequest.get(request)) {
              // don't cache api requests by default
              response.headers.set('cache-control', 'no-store')
            } else {
              // pages are static and can be cached:
              response.headers.set('cache-control', 'public, max-age=31536000, immutable')
            }
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
}
