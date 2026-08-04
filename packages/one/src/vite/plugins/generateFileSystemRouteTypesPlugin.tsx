import { join, resolve } from 'node:path'
import { debounce } from 'perfect-debounce'
import type { Plugin } from 'vite'
import { generateRouteTypes } from '../../typed-routes/generateRouteTypes'
import { getRouterRootFromOneOptions } from '../../utils/getRouterRootFromOneOptions'
import type { RouteIndex } from '../../utils/routeIndex'
import { isRouteFileWatchEvent } from '../../utils/routeFileWatch'
import type { One } from '../types'

export function generateFileSystemRouteTypesPlugin(
  options: One.PluginOptions,
  routeIndex: RouteIndex
): Plugin {
  const routerRoot = getRouterRootFromOneOptions(options)

  return {
    name: `one-generate-fs-route-types`,
    enforce: 'post',
    apply: 'serve',

    configureServer(server) {
      const appDir = resolve(process.cwd(), getRouterRootFromOneOptions(options))
      // Generate routes.d.ts inside the app directory to keep it organized
      const outFile = join(appDir, 'routes.d.ts')

      const typedRoutesGeneration =
        options.router?.experimental?.typedRoutesGeneration || undefined

      // on change ./app stuff lets reload this to pick up any route changes
      const generateRouteTypesDebounced = debounce(async () => {
        await generateRouteTypes(
          outFile,
          routerRoot,
          options.router?.ignoredRouteFiles,
          typedRoutesGeneration,
          routeIndex.getPaths()
        )
      }, 100)
      const fileWatcherChangeListener = (type: string, path: string) => {
        if (
          isRouteFileWatchEvent({
            event: type,
            filePath: path,
            routerRoot: appDir,
            includeChangeEvents: true,
          })
        ) {
          routeIndex.update(type, path)
          return generateRouteTypesDebounced()
        }
      }

      server.watcher.addListener('all', fileWatcherChangeListener)

      return () => {
        // once on startup:

        generateRouteTypes(
          outFile,
          routerRoot,
          options.router?.ignoredRouteFiles,
          typedRoutesGeneration,
          routeIndex.getPaths()
        )
      }
    },
  } satisfies Plugin
}
