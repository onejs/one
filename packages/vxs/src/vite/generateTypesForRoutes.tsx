import { join } from 'node:path'
import { debounce } from 'perfect-debounce'
import type { Plugin } from 'vite'
import type { VXS } from './types'
import { generateRouteTypes } from '../typed-routes/generateRouteTypes'

export function generateTypesForRoutes(options: VXS.PluginOptions): Plugin {
  return {
    name: `vxs-generate-fs-route-types`,
    enforce: 'post',
    apply: 'serve',

    configureServer(server) {
      const appDir = join(process.cwd(), 'app')
      const outFile = join(process.cwd(), 'routes.d.ts')

      // on change ./app stuff lets reload this to pick up any route changes
      const fileWatcherChangeListener = debounce(async (type: string, path: string) => {
        if (type === 'add' || type === 'delete') {
          if (path.startsWith(appDir)) {
            // generate
            generateRouteTypes(outFile)
          }
        }
      }, 100)

      server.watcher.addListener('all', fileWatcherChangeListener)

      return () => {
        // once on startup:

        generateRouteTypes(outFile)
      }
    },
  } satisfies Plugin
}
