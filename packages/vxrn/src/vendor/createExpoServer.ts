import { sync as globSync } from 'glob'
import { defineEventHandler, type App } from 'h3'
import { join } from 'node:path'

// @ts-ignore
import { createRoutesManifest } from '@vxrn/expo-router/routes-manifest'
import type { ViteDevServer } from 'vite'

// TODO move out

export function createExpoServer(root: string, app: App, vite: ViteDevServer) {
  const routePaths = getRoutePaths(join(root, 'app'))
  const manifest = createRoutesManifest(routePaths)

  const apiRoutesMap = manifest.apiRoutes.reduce((acc, cur) => {
    acc[cur.page] = cur
    return acc
  }, {})

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
