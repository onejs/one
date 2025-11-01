import { join } from 'node:path'
import { debounce } from 'perfect-debounce'
import type { Plugin } from 'vite'
import type { One } from '../types'
import { generateRouteTypes } from '../../typed-routes/generateRouteTypes'
import { getRouterRootFromOneOptions } from '../../utils/getRouterRootFromOneOptions'

export function generateFileSystemRouteTypesPlugin(options: One.PluginOptions): Plugin {
  return {
    name: `one-generate-fs-route-types`,
    enforce: 'post',
    apply: 'serve',

    configureServer(server) {
      const appDir = join(process.cwd(), getRouterRootFromOneOptions(options))
      // Generate routes.d.ts inside the app directory to keep it organized
      const outFile = join(appDir, 'routes.d.ts')

      const routerRoot = getRouterRootFromOneOptions(options)

      // on change ./app stuff lets reload this to pick up any route changes
      const fileWatcherChangeListener = debounce(async (type: string, path: string) => {
        if (type === 'add' || type === 'delete') {
          if (path.startsWith(appDir)) {
            // generate
            generateRouteTypes(outFile, routerRoot, options.router?.ignoredRouteFiles)
          }
        }
      }, 100)

      server.watcher.addListener('all', fileWatcherChangeListener)

      return () => {
        // once on startup:

        generateRouteTypes(outFile, routerRoot, options.router?.ignoredRouteFiles)
      }
    },
  } satisfies Plugin
}
