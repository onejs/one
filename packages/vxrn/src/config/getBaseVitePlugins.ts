import { createVXRNCompilerPlugin } from '@vxrn/compiler'
import { existsSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import type { PluginOption } from 'vite'
import { ssrExtensions, webExtensions } from '../constants'

// essentially base web config not base everything

// a source that already ends in a js extension: resolve.extensions can't help
// these, because it only appends to extensionless imports
const JS_EXTENSION_RE = /\.[cm]?[jt]sx?$/
// what may reach the resolveId hook below. the `.server` alternative keeps bare
// `./db.server` imports (no js extension) reaching the server-only stub.
const PLATFORM_RESOLVE_SOURCE_RE = /(?:\.[cm]?[jt]sx?|\.server)$/

const PLATFORM_EXTENSIONS_BY_ENVIRONMENT = {
  client: ['web'],
  ssr: ['server', 'web'],
  worker: ['server', 'web'],
  ios: ['ios', 'native'],
  android: ['android', 'native'],
}

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

      load: {
        filter: { id: /^\0server-only-stub:/ },
        handler(id) {
          const source = id.slice('\0server-only-stub:'.length)
          return `throw new Error("[one] .server file cannot be imported on client: ${source}")`
        },
      },

      // vite's resolve.extensions already prefers platform variants for
      // extensionless imports in every environment (webExtensions /
      // ssrExtensions here, getNativeExtensions for ios+android), verified by
      // building with this hook disabled. the only thing left for this hook is
      // an import that already carries an extension, since resolve.extensions
      // only ever appends. so filter to those rust-side, plus bare `.server`
      // which still needs an extension appended to be recognised as a server
      // file. measured on onestack.dev this takes the hook from 25422 calls to
      // 6880.
      resolveId: {
        filter: { id: PLATFORM_RESOLVE_SOURCE_RE },
        async handler(source, importer, options) {
          // Skip during Vite's dependency optimization scan to avoid interfering with dep discovery
          // which can cause hard page reloads when new deps are found during navigation
          // @see https://github.com/remix-run/remix/discussions/8917
          // @ts-expect-error - scan is not in Vite's types but exists at runtime
          if (options?.scan) return

          // a relative or absolute source that already carries a js extension
          // needs no extension appending, so its target is just the join and we
          // can skip re-entering the whole resolver. that covered 6872 of the
          // 6880 sources reaching this hook, which is the actual cost here: this
          // plugin is enforce:'pre', so every this.resolve() re-ran the resolveId
          // chain of every other plugin.
          let resolvedId: string | undefined
          if (JS_EXTENSION_RE.test(source)) {
            if (source[0] === '/') {
              resolvedId = source
            } else if (source[0] === '.' && importer) {
              resolvedId = resolve(dirname(importer), source)
            }
          }

          if (!resolvedId) {
            const resolved = await this.resolve(source, importer, options)
            if (!resolved) return resolved
            resolvedId = resolved.id
          }

          if (resolvedId.includes('node_modules')) {
            return
          }

          // resolve .server files to a throwing stub on client/native
          // instead of erroring at build time, since dynamic imports behind
          // dead code branches (e.g. if (process.env.VITE_ENVIRONMENT === 'ssr'))
          // are still resolved by vite's import analysis
          if (
            this.environment.name !== 'ssr' &&
            this.environment.name !== 'worker' &&
            /\.server\.\w+$/.test(resolvedId)
          ) {
            return { id: `\0server-only-stub:${source}` }
          }

          if (process.env.VXRN_SKIP_STRICTER_PLATFORM_RESOLVE) {
            return undefined
          }

          // an import that already carries an extension (`./x.js`) still has to
          // prefer a `./x.web.js` sibling, and resolve.extensions only appends to
          // extensionless imports, so this probe can't be replaced by it. see
          // packages/test-package + tests/test/tests/resolving.test.ts
          const jsExtension = extname(resolvedId)
          const withoutExt = resolvedId.slice(0, resolvedId.length - jsExtension.length)
          const platformSpecificExtension =
            PLATFORM_EXTENSIONS_BY_ENVIRONMENT[this.environment.name]

          if (platformSpecificExtension) {
            for (const platformExtension of platformSpecificExtension) {
              const fullPath = `${withoutExt}.${platformExtension}${jsExtension}`
              if (cachedPathExists(fullPath)) {
                return { id: fullPath }
              }
            }
          }
        },
      },

      // adding or deleting a .web/.native sibling changes what a source
      // resolves to, so drop the exists cache when the watcher sees a change
      watchChange() {
        pathExistsCache.clear()
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
