import { createVXRNCompilerPlugin } from '@vxrn/compiler'
import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import type { PluginOption } from 'vite'
import { ssrExtensions, webExtensions } from '../constants'

// essentially base web config not base everything

export function getBaseVitePlugins(): PluginOption[] {
  // cache pathExists results during build (files don't change)
  // skip caching in dev since files can be added/removed
  const pathExistsCache = new Map<string, boolean>()
  let isBuild = false

  function cachedPathExists(path: string): boolean {
    if (!isBuild) return existsSync(path)
    const cached = pathExistsCache.get(path)
    if (cached !== undefined) return cached
    const exists = existsSync(path)
    pathExistsCache.set(path, exists)
    return exists
  }

  return [
    {
      name: 'platform-specific-resolve',
      enforce: 'pre',
      config(_, { command }) {
        isBuild = command === 'build'
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
                extensions: ssrExtensions,
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

      load(id) {
        if (id.startsWith('\0server-only-stub:')) {
          const source = id.slice('\0server-only-stub:'.length)
          return `throw new Error("[one] .server file cannot be imported on client: ${source}")`
        }
      },

      // this fix platform extensions if they aren't picked up, but seems it is working with resolve.extensions
      async resolveId(source, importer, options) {
        // Skip during Vite's dependency optimization scan to avoid interfering with dep discovery
        // which can cause hard page reloads when new deps are found during navigation
        // @see https://github.com/remix-run/remix/discussions/8917
        // @ts-expect-error - scan is not in Vite's types but exists at runtime
        if (options?.scan) return

        // if (process.env.NODE_ENV !== 'development') {
        //   // is this only dev mode problem?
        //   return
        // }

        const resolved = await this.resolve(source, importer, options)

        if (!resolved || resolved.id.includes('node_modules')) {
          return resolved
        }

        // resolve .server files to a throwing stub on client/native
        // instead of erroring at build time, since dynamic imports behind
        // dead code branches (e.g. if (process.env.VITE_ENVIRONMENT === 'ssr'))
        // are still resolved by vite's import analysis
        if (this.environment.name !== 'ssr' && /\.server\.\w+$/.test(resolved.id)) {
          return {
            id: `\0server-only-stub:${source}`,
          }
        }

        if (!process.env.VXRN_SKIP_STRICTER_PLATFORM_RESOLVE) {
          // not in node_modules, vite doesn't apply extensions! we need to manually
          const jsExtension = extname(resolved.id)
          const withoutExt = resolved.id.replace(new RegExp(`\\${jsExtension}$`), '')

          const extensionsByEnvironment = {
            client: ['web'],
            ssr: ['server', 'web'],
            ios: ['ios', 'native'],
            android: ['android', 'native'],
          }

          const platformSpecificExtension = extensionsByEnvironment[this.environment.name]

          if (platformSpecificExtension) {
            for (const platformExtension of platformSpecificExtension) {
              const fullPath = `${withoutExt}.${platformExtension}${jsExtension}`
              if (cachedPathExists(fullPath)) {
                return {
                  id: fullPath,
                }
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
          if (
            typeof args[0] === 'string' &&
            args[0].startsWith(`Failed to resolve dependency:`)
          ) {
            return
          }
          return ogWarn(...args)
        }
      },
    },

    createVXRNCompilerPlugin({}),
  ]
}
