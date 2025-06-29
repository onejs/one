import type { PluginOption } from 'vite'
import { webExtensions } from '../constants'
import FSExtra from 'fs-extra'
import { extname } from 'node:path'
import { createVXRNCompilerPlugin } from '@vxrn/compiler'

// essentially base web config not base everything

export function getBaseVitePlugins(): PluginOption[] {
  return [
    {
      name: 'platform-specific-resolve',
      enforce: 'pre',
      config() {
        return {
          resolve: {
            // if this is on it breaks resolveId below
            // optimizeDeps config should apply to packages in monorepo
            // https://vite.dev/config/shared-options#resolve-preservesymlinks
            // preserveSymlinks: true,
          },

          environments: {
            ssr: {
              resolve: {
                extensions: webExtensions,
                conditions: ['vxrn-web'],
                externalConditions: ['vxrn-web'],
              },
            },

            client: {
              resolve: {
                extensions: webExtensions,
                conditions: ['vxrn-web'],
              },
            },
          },
        }
      },

      // this fix platform extensions if they aren't picked up, but seems it is working with resolve.extensions
      async resolveId(source, importer, options) {
        // if (process.env.NODE_ENV !== 'development') {
        //   // is this only dev mode problem?
        //   return
        // }

        const resolved = await this.resolve(source, importer, options)

        if (!resolved || resolved.id.includes('node_modules')) {
          return resolved
        }

        // not in node_modules, vite doesn't apply extensions! we need to manually
        const jsExtension = extname(resolved.id)
        const withoutExt = resolved.id.replace(new RegExp(`\\${jsExtension}$`), '')

        const extensionsByEnvironment = {
          client: ['web'],
          ssr: ['web'],
          ios: ['ios', 'native'],
          android: ['android', 'native'],
        }

        const platformSpecificExtension = extensionsByEnvironment[this.environment.name]

        if (platformSpecificExtension) {
          for (const platformExtension of platformSpecificExtension) {
            const fullPath = `${withoutExt}.${platformExtension}${jsExtension}`
            if (await FSExtra.pathExists(fullPath)) {
              return {
                id: fullPath,
              }
            }
          }
        }
      },
    },

    // temp fix
    // avoid logging the optimizeDeps we add that aren't in the app:
    // likely we need a whole better solution to optimize deps
    {
      name: `avoid-optimize-logs`,

      configureServer() {
        const ogWarn = console.warn
        console.warn = (...args: any[]) => {
          if (typeof args[0] === 'string' && args[0].startsWith(`Failed to resolve dependency:`)) {
            return
          }
          return ogWarn(...args)
        }
      },
    },

    createVXRNCompilerPlugin({}),
  ]
}
