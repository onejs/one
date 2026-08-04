import path from 'node:path'
import type { Plugin } from 'vite'
import { isPathInsideDirectory } from '../../utils/routeFileWatch'

export function createRouteModuleHmrPlugin(routerRoot: string): Plugin {
  return {
    name: 'route-module-hmr-fix',
    hotUpdate({ server, modules, file }) {
      const absoluteRouterRoot = path.resolve(server.config.root, routerRoot)
      const fileRelativePath = path.relative(server.config.root, file)

      // for ssr, prevent a full page reload for route files. the module runner
      // picks up the invalidated module on the next request.
      if (
        this.environment?.name === 'ssr' &&
        isPathInsideDirectory(file, absoluteRouterRoot)
      ) {
        return []
      }

      let hasRouteUpdate = false
      const result = modules.map((module) => {
        if (!module.id) return module

        const moduleFile = module.id.split('?')[0]
        if (isPathInsideDirectory(moduleFile, absoluteRouterRoot)) {
          const relativeRoutePath = path.relative(absoluteRouterRoot, moduleFile)

          // vite forces a full reload when a route is not imported by another
          // module. an empty accepted export set keeps that route in hmr.
          module.acceptedHmrExports = new Set()

          // root layouts are called as functions to support html elements, so
          // react refresh cannot update them without the route event.
          if (/^(?:\([^)]+\)[\\/])?_layout\.[jt]sx?$/.test(relativeRoutePath)) {
            hasRouteUpdate = true
          }
        }

        return module
      })

      if (hasRouteUpdate) {
        server.hot.send({
          type: 'custom',
          event: 'one:route-update',
          data: { file: fileRelativePath },
        })
      }

      return result
    },
  }
}
