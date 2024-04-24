import { sync as globSync } from 'glob'
import { defineEventHandler, type App } from 'h3'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { ViteDevServer } from 'vite'
import { getHtml } from '../utils/getHtml'

Error.stackTraceLimit = Infinity

// @ts-ignore

// @ts-ignore
import { createRoutesManifest } from '@vxrn/expo-router/routes-manifest'

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

  // SSR / HTML ROUTES
  app.use(
    defineEventHandler(async ({ node: { req } }) => {
      if (!req.url || req.method !== 'GET') return

      if (extname(req.url) !== '') return
      if (req.url.startsWith('/@')) return
      if (req.url === '/__vxrnhmr') return

      const url = new URL(req.url, 'http://tamagui.dev')
      const path = url.pathname // sanitized

      for (const route of manifest.htmlRoutes) {
        if (!(route.namedRegex instanceof RegExp)) {
          // mutate TODO fix
          route.namedRegex = new RegExp(route.namedRegex)
        }

        if (!route.namedRegex.test(path)) {
          continue
        }

        const params = getParams(url, route)
        const routeFile = join(root, 'app', route.file)

        console.info('ssr', path, params, routeFile, req.headers)

        try {
          vite.moduleGraph.invalidateAll()

          const exported = await vite.ssrLoadModule(routeFile, {
            fixStacktrace: true,
          })

          const props = (await exported.generateStaticProps?.({ path, params })) ?? {}

          const { render } = await vite.ssrLoadModule(`${root}/src/entry-server.tsx`)

          console.trace(`SSR loaded the server entry, rendering...`)

          const { appHtml, headHtml } = await render({
            path,
            props,
          })

          const indexHtml = await readFile('./index.html', 'utf-8')
          const template = await vite.transformIndexHtml(path, indexHtml)

          return getHtml({
            appHtml,
            headHtml,
            props,
            template,
          })
        } catch (err) {
          const message = err instanceof Error ? `${err.message}:\n${err.stack}` : `${err}`
          console.error(`Error in SSR: ${message}`)
        }
      }
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
