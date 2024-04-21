import { sync as globSync } from 'glob'
import { defineEventHandler, type App } from 'h3'
import { extname, join } from 'node:path'
// @ts-ignore
import { renderToString } from '@vxrn/expo-router/render-to-string'

// @ts-ignore
import { createRoutesManifest } from '@vxrn/expo-router/routes-manifest'
import type { ViteDevServer } from 'vite'

// TODO move out

export function createExpoServer({ root }: { root: string }, app: App, vite: ViteDevServer) {
  const routePaths = getRoutePaths(join(root, 'app'))
  const manifest = createRoutesManifest(routePaths)

  const apiRoutesMap = manifest.apiRoutes.reduce((acc, cur) => {
    acc[cur.page] = cur
    return acc
  }, {})

  function getParams(url: URL, config: any) {
    const params: Record<string, string> = {}
    const match = config.namedRegex.exec(url.pathname)
    if (match?.groups) {
      for (const [key, value] of Object.entries(match.groups)) {
        const namedKey = config.routeKeys[key]
        params[namedKey] = value as string
      }
    }
    return params
  }

  // SSR / HTML ROUTES
  app.use(
    defineEventHandler(async ({ node: { req } }) => {
      if (!req.url || (req.method !== 'HEAD' && req.method !== 'GET')) return
      if (extname(req.url) !== '') return

      const url = new URL(req.url, 'http://tamagui.dev')
      const path = url.pathname // sanitized

      for (const route of manifest.htmlRoutes) {
        // mutate TODO fix
        route.namedRegex = new RegExp(route.namedRegex)

        if (!route.namedRegex.test(path)) {
          continue
        }

        const params = getParams(url, route)
        const routeFile = join(root, 'app', route.file)

        console.info('ssr', path, params, routeFile)

        const exported = await vite.ssrLoadModule(routeFile, {
          fixStacktrace: true,
        })

        console.info('exported', path, exported)

        const props = (await exported.generateStaticProps?.({ path, params })) ?? {}

        const Root = exported.default

        console.info('props', props, Root, renderToString)

        const render = (await import(`${root}/dist/server/entry-server.js`)).render

        const out = await render({
          path,
          props,
        })

        console.info('out', out)

        return out.appHtml
      }
    })
  )

  // API ROUTES
  app.use(
    defineEventHandler(async ({ node: { req } }) => {
      const matched = apiRoutesMap[req.url]
      if (!matched) return
      const loaded = await vite.ssrLoadModule(join(root, 'app', matched.file))
      if (!loaded) return
      const requestType = req.method || 'GET'
      const method = loaded[requestType]
      if (!method) return
      return method(req)
    })
  )
}

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
export function getRoutePaths(cwd: string) {
  return globSync('**/*.@(ts|tsx|js|jsx)', {
    cwd,
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}
