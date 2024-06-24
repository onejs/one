import FSExtra from 'fs-extra'
import type { Hono } from 'hono'
import { join } from 'node:path'
import type { VXRNConfig } from 'vxrn'
import { createHandleRequest } from '../handleRequest'
import { resolveAPIRequest } from './resolveAPIRequest'
import { isResponse } from '../utils/isResponse'
import { isStatusRedirect } from '../utils/isStatus'

export async function serve(optionsIn: VXRNConfig, app: Hono) {
  const handleRequest = createHandleRequest(
    {},
    {
      async handleAPI({ route, request }) {
        const apiFile = join(process.cwd(), 'dist/api', route.page + '.js')
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
      const res = await handleRequest(context.req.raw)

      if (res) {
        if (isResponse(res)) {
          if (isStatusRedirect(res.status)) {
            const location = `${res.headers.get('location') || ''}`
            return context.redirect(location, res.status)
          }
          return res as Response
        }
        return context.json(res)
      }
    } catch (err) {
      console.error(` [vxs] Error handling request: ${err}`)
    }

    await next()
  })
}
