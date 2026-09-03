import { configureVXRNCompilerPlugin } from '@vxrn/compiler'
import { resolvePath } from '@vxrn/resolve'
import {
  type ExpoManifestRequestHandlerPluginPluginOptions,
  type MetroPluginOptions,
  getPlatformEnvDefine,
} from '@vxrn/vite-plugin-metro'
import events from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { exactRegex } from 'rolldown/filter'
import { normalizePath, type Plugin, type PluginOption } from 'vite'
import { autoDepOptimizePlugin, getOptionsFilled, loadEnv } from 'vxrn'
import vxrnVitePlugin from 'vxrn/vite-plugin'
import { CACHE_KEY } from '../constants'
import { getViteMetroPluginOptions } from '../metro-config/getViteMetroPluginOptions'
import '../polyfills-server'
import { setServerGlobals } from '../server/setServerGlobals'
import { getRouterRootFromOneOptions } from '../utils/getRouterRootFromOneOptions'
import { createRouteIndex } from '../utils/routeIndex'
import { ensureTSConfig } from './ensureTsConfig'
import { setOneOptions } from './loadConfig'
import { bundledDevPlugin } from './plugins/bundledDevPlugin'
import { clientTreeShakePlugin } from './plugins/clientTreeShakePlugin'
import { createDevtoolsPlugin } from './plugins/devtoolsPlugin'
import { createFileSystemRouterPlugin } from './plugins/fileSystemRouterPlugin'
import { fixDependenciesPlugin } from './plugins/fixDependenciesPlugin'
import { generateFileSystemRouteTypesPlugin } from './plugins/generateFileSystemRouteTypesPlugin'
import { criticalCSSPlugin } from './plugins/criticalCSSPlugin'
import { imageDataPlugin } from './plugins/imageDataPlugin'
import { createRouteModuleHmrPlugin } from './plugins/routeModuleHmrPlugin'
import { sourceInspectorPlugin } from './plugins/sourceInspectorPlugin'
import { SSRCSSPlugin } from './plugins/SSRCSSPlugin'
import { virtualEntryId } from './plugins/virtualEntryConstants'
import { createVirtualEntry } from './plugins/virtualEntryPlugin'
import { environmentGuardPlugin } from './plugins/environmentGuardPlugin'
import {
  createWorkerdDevPlugins,
  shouldEnableWorkerdDev,
} from './plugins/workerdDevPlugin'
import type { One } from './types'

type MetroOptions = MetroPluginOptions

// deep react-native Libraries/* paths that don't exist in react-native-web.
// used as a rust-side resolveId filter so ordinary imports never reach js.
const RN_DEEP_IMPORT_RE =
  /^react-native\/Libraries\/|react-native-web(-lite)?\/.*\/Libraries\//

/**
 * This needs a big refactor!
 * I guess these plugins are all being loaded by native??
 * At least the react compiler plugin is applying to native, so the entire premise of some things
 * here are wrong. we can probably refactor and merge all the stuff
 */

events.setMaxListeners(1_000)

// temporary for tamagui plugin compat
globalThis.__vxrnEnableNativeEnv = true

// temporary until we fix double-load issue, which means we'd have to somehow
// not control the port/host from our config, but still pass it into ENV
// until then we want to avoid double loading everything on first start

export function one(options: One.PluginOptions = {}): PluginOption {
  // ensure server globals are set before any plugin code runs
  // (the side-effect import in vite.ts gets tree-shaken by the build)
  setServerGlobals()

  const routerRoot = getRouterRootFromOneOptions(options)

  // when native is explicitly disabled, skip metro, the vxrn RN plugin set,
  // and all native-only globals — One runs as a pure web framework.
  const nativeDisabled = options.native === false
  const nativeOptions = options.native === false ? undefined : options.native

  if (nativeDisabled) {
    // tamagui compiler reads this to decide whether to process the native env
    globalThis.__vxrnEnableNativeEnv = false
  }

  /**
   * A non-null value means that we are going to use Metro.
   */
  const metroOptions:
    | (MetroOptions & ExpoManifestRequestHandlerPluginPluginOptions)
    | null = (() => {
    if (nativeDisabled) return null
    if (nativeOptions?.bundler !== 'metro' && !process.env.ONE_METRO_MODE) return null

    if (process.env.ONE_METRO_MODE) {
      console.info('ONE_METRO_MODE environment variable is set, enabling Metro mode')
    }

    const routerRoot = getRouterRootFromOneOptions(options)

    const defaultMetroOptions = getViteMetroPluginOptions({
      projectRoot:
        (nativeOptions?.bundlerOptions as any)?.argv?.projectRoot || process.cwd(),
      relativeRouterRoot: routerRoot,
      ignoredRouteFiles: options.router?.ignoredRouteFiles,
      linking: options.router?.linking,
      userDefaultConfigOverrides: (nativeOptions?.bundlerOptions as any)
        ?.defaultConfigOverrides,
      setupFile: options.setupFile,
    })

    const userMetroOptions = nativeOptions?.bundlerOptions as typeof defaultMetroOptions

    const babelConfig = {
      ...defaultMetroOptions?.babelConfig,
      ...userMetroOptions?.babelConfig,
    }

    // TODO: [METRO-OPTIONS-MERGING] We only do shallow merge here.
    return {
      ...defaultMetroOptions,
      ...userMetroOptions,
      defaultConfigOverrides: defaultMetroOptions?.defaultConfigOverrides, // defaultConfigOverrides is merged by getViteMetroPluginOptions, so we need to set it here again.
      argv: {
        ...defaultMetroOptions?.argv,
        ...userMetroOptions?.argv,
      },
      babelConfig: {
        ...babelConfig,
        plugins: [
          ...(babelConfig.plugins || []),
          ...(options.react?.compiler === true || options.react?.compiler === 'native'
            ? ['babel-plugin-react-compiler']
            : []),
        ],
      },
      mainModuleName: 'one/metro-entry', // So users won't need to write `"main": "one/metro-entry"` in their `package.json` like ordinary Expo apps.
      // allow env var to enable lazy startup
      startup: process.env.ONE_METRO_LAZY ? 'lazy' : userMetroOptions?.startup,
    }
  })()

  const vxrnPlugins: PluginOption[] = []

  if (!process.env.IS_VXRN_CLI) {
    console.warn('Experimental: running VxRN as a Vite plugin. This is not yet stable.')
    vxrnPlugins.push(
      vxrnVitePlugin({
        metro: metroOptions,
        disableNative: nativeDisabled,
      })
    )
  } else {
    if (!globalThis.__oneOptions) {
      // first load we are just loading it ourselves to get the user options
      // so we can just set here and return nothing
      setOneOptions(options)
      globalThis['__vxrnPluginConfig__'] = options
      globalThis['__vxrnMetroOptions__'] = metroOptions
      return []
    }
  }

  // ensure tsconfig
  if (options.config?.ensureTSConfig !== false) {
    void ensureTSConfig()
  }

  const vxrnOptions = getOptionsFilled()
  const root = vxrnOptions?.root || process.cwd()

  const compiler = options.react?.compiler
  if (compiler) {
    configureVXRNCompilerPlugin({
      enableCompiler:
        // pass through object config, regex, or function directly
        typeof compiler === 'object' || typeof compiler === 'function'
          ? compiler
          : compiler === 'native'
            ? ['ios', 'android']
            : compiler === 'web'
              ? ['ssr', 'client']
              : true,
    })
  }

  const autoDepsOptions = options.ssr?.autoDepsOptimization
  const dedupeSymlinks = options.ssr?.dedupeSymlinkedModules ?? false

  // closure state for ssr-symlink-dedup plugin
  let ssrDedup_optimizedPackages: Set<string> | null = null
  let ssrDedup_projectRoot = ''

  const ssrSymlinkDedupPlugin: Plugin = {
    name: 'one:ssr-symlink-dedup',
    enforce: 'pre',

    configResolved(config) {
      if (!dedupeSymlinks) return
      ssrDedup_projectRoot = config.root || process.cwd()
      const ssrInclude = config.ssr?.optimizeDeps?.include
      if (!ssrInclude?.length) return

      ssrDedup_optimizedPackages = new Set<string>()
      for (const entry of ssrInclude) {
        if (entry.startsWith('@')) {
          const parts = entry.split('/')
          ssrDedup_optimizedPackages.add(`${parts[0]}/${parts[1]}`)
        } else {
          ssrDedup_optimizedPackages.add(entry.split('/')[0])
        }
      }
    },

    async resolveId(source, importer, options) {
      if (!dedupeSymlinks) return
      // skip relative/absolute imports
      if (source[0] === '.' || source[0] === '/') return

      // extract package name and check for subpath
      let pkgName: string
      let subpath: string | null = null
      if (source.startsWith('@')) {
        const parts = source.split('/')
        pkgName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : source
        if (parts.length > 2) subpath = `./${parts.slice(2).join('/')}`
      } else {
        const parts = source.split('/')
        pkgName = parts[0]
        if (parts.length > 1) subpath = `./${parts.slice(1).join('/')}`
      }

      // resolve normally
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      })
      if (!resolved?.id) return

      // if it already goes through node_modules, no fixup needed
      if (resolved.id.includes('/node_modules/')) return

      // resolved to a real (source) path — find the node_modules equivalent
      const path = await import('node:path')
      const fs = await import('node:fs')
      const { join, dirname } = path
      const { realpathSync, existsSync, readFileSync } = fs
      let dir = ssrDedup_projectRoot
      while (dir !== dirname(dir)) {
        const nmPkgDir = join(dir, 'node_modules', pkgName)
        if (existsSync(nmPkgDir)) {
          // for subpath imports, use package.json exports to resolve correctly
          // (filesystem resolution hits CJS metro-compat shims)
          if (subpath) {
            try {
              const pkg = JSON.parse(readFileSync(join(nmPkgDir, 'package.json'), 'utf8'))
              const exportEntry = pkg.exports?.[subpath]
              if (exportEntry && typeof exportEntry === 'object') {
                const target =
                  exportEntry.import || exportEntry.module || exportEntry.default
                if (target) {
                  const fullPath = join(nmPkgDir, target)
                  if (existsSync(fullPath))
                    // normalize so downstream consumers see POSIX shape on Windows
                    return { id: normalizePath(fullPath), external: resolved.external }
                }
              }
            } catch {}
          }

          // resolved.id is POSIX (Vite's getRealPath normalizes); realpathSync returns native — normalize both
          const realPkgDir = normalizePath(realpathSync(nmPkgDir))
          if (resolved.id.startsWith(realPkgDir)) {
            const relativePart = resolved.id.slice(realPkgDir.length)
            return {
              id: normalizePath(nmPkgDir) + relativePart,
              external: resolved.external,
            }
          }
          break
        }
        dir = dirname(dir)
      }
    },
  }

  const devAndProdPlugins: Plugin[] = [
    {
      name: 'one:config',
      __get: options,
    } as any,

    {
      name: 'one:env-prefix',
      config(userConfig) {
        // only set default if user hasn't configured envPrefix
        if (userConfig.envPrefix) return
        return {
          envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
        }
      },
    },

    bundledDevPlugin(!!options.web?.experimentalBundledDev),

    environmentGuardPlugin(options.environmentGuards),

    criticalCSSPlugin(),

    imageDataPlugin(),

    {
      name: 'one-define-client-env',
      async config(userConfig, env) {
        const clientEnvDefine = options.skipEnv
          ? {}
          : (
              await loadEnv(
                vxrnOptions?.mode ?? userConfig?.mode ?? env?.mode ?? 'development',
                process.cwd(),
                userConfig?.envPrefix
              )
            ).clientEnvDefine
        return {
          define: {
            ...clientEnvDefine,
            ...(process.env.ONE_DEBUG_ROUTER && {
              'process.env.ONE_DEBUG_ROUTER': JSON.stringify(
                process.env.ONE_DEBUG_ROUTER
              ),
            }),
          },
        }
      },
    },

    ...(autoDepsOptions === false
      ? []
      : [
          autoDepOptimizePlugin({
            onScannedDeps({ hasReanimated, hasNativewind }) {
              configureVXRNCompilerPlugin({
                enableReanimated: hasReanimated,
                enableNativeCSS: nativeOptions?.css ?? hasNativewind,
                enableNativewind: hasNativewind,
              })
            },
            root,
            include: /node_modules/,
            ...(autoDepsOptions === true ? {} : autoDepsOptions),
          }),
        ]),

    ...(options.config?.tsConfigPaths === false
      ? []
      : [
          (() => {
            // vite 8's native resolve.tsconfigPaths works for client but fetchModule
            // hardcodes tsconfigPaths: false for SSR, so we also resolve via resolveId
            type PathMapping = { prefix: string; replacement: string; wildcard: boolean }
            let mappings: PathMapping[] = []

            function loadMappings(resolvedRoot: string) {
              try {
                const configPath = path.resolve(resolvedRoot, 'tsconfig.json')
                if (!existsSync(configPath)) return
                const raw = readFileSync(configPath, 'utf-8')
                // strip single-line and multi-line comments for JSON.parse
                const stripped = raw.replace(
                  /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
                  (m, g) => (g ? '' : m)
                )
                const config = JSON.parse(stripped)
                const paths = config?.compilerOptions?.paths
                const baseUrl = config?.compilerOptions?.baseUrl || '.'
                if (!paths) return
                for (const [pattern, targets] of Object.entries(
                  paths as Record<string, string[]>
                )) {
                  const target = targets[0]
                  if (!target) continue
                  if (pattern.endsWith('/*')) {
                    const resolved = path.resolve(
                      resolvedRoot,
                      baseUrl,
                      target.slice(0, -1)
                    )
                    mappings.push({
                      prefix: pattern.slice(0, -1),
                      replacement: resolved.endsWith('/') ? resolved : resolved + '/',
                      wildcard: true,
                    })
                  } else {
                    mappings.push({
                      prefix: pattern,
                      replacement: path.resolve(resolvedRoot, baseUrl, target),
                      wildcard: false,
                    })
                  }
                }
              } catch {}
            }

            // load eagerly so the rust-side hook filter below can be built from
            // the actual tsconfig prefixes. hook filters are fixed at
            // registration time, so waiting for configResolved would mean no
            // filter at all and a napi round trip for every import in the graph
            loadMappings(root)

            // only ids that could match a mapping reach js. if the eager load
            // found nothing we can't narrow to prefixes, so fall back to "any
            // bare specifier" — tsconfig paths are never relative or absolute,
            // so this still drops every ./ and ../ import while staying correct
            // if configResolved loads mappings later from a different root.
            const tsconfigPathsFilter = mappings.length
              ? new RegExp(
                  mappings
                    .map(
                      (m) =>
                        `^${m.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${m.wildcard ? '' : '$'}`
                    )
                    .join('|')
                )
              : /^[^./]/

            return {
              name: 'one:tsconfig-paths',
              enforce: 'pre',

              config() {
                return {
                  resolve: { tsconfigPaths: true },
                }
              },

              configResolved(config) {
                if (mappings.length === 0) {
                  loadMappings(config.root)
                }
              },

              resolveId: {
                filter: { id: tsconfigPathsFilter },
                handler(source: string) {
                  const jsExts = [
                    '.ts',
                    '.tsx',
                    '.js',
                    '.jsx',
                    '.mts',
                    '.mjs',
                    '.cjs',
                    '.cts',
                  ]
                  for (const m of mappings) {
                    let candidate: string | undefined
                    if (m.wildcard) {
                      if (source.startsWith(m.prefix)) {
                        candidate = m.replacement + source.slice(m.prefix.length)
                      }
                    } else if (source === m.prefix) {
                      candidate = m.replacement
                    }
                    if (!candidate) continue
                    // already has a js/ts extension
                    if (jsExts.includes(path.extname(candidate))) return candidate
                    // try appending extensions
                    for (const e of jsExts) {
                      if (existsSync(candidate + e)) return candidate + e
                    }
                    // try /index
                    for (const e of jsExts) {
                      if (existsSync(candidate + '/index' + e))
                        return candidate + '/index' + e
                    }
                    return candidate
                  }
                },
              },
            } satisfies Plugin
          })(),
        ]),

    // resolveId-based aliases that work during both vite transforms AND
    // rolldown dep pre-bundling (where resolve.alias is not applied)
    ...(options.alias
      ? [
          (() => {
            const resolveMap = (map?: Record<string, string>) => {
              if (!map) return null
              const out: Record<string, string> = {}
              for (const [key, value] of Object.entries(map)) {
                try {
                  out[key] = path.isAbsolute(value) ? value : resolvePath(value)
                } catch {
                  out[key] = value
                }
              }
              return out
            }

            const a = options.alias!
            const resolved = {
              web: resolveMap(a.web),
              native: resolveMap(a.native),
              client: resolveMap(a.client),
              ssr: resolveMap(a.ssr),
              ios: resolveMap(a.ios),
              android: resolveMap(a.android),
            }

            // every alias is an exact source match, so the union of all keys is
            // an exact rust-side filter. anything else never enters js.
            const aliasKeys = [
              ...new Set(
                Object.values(resolved).flatMap((m) => (m ? Object.keys(m) : []))
              ),
            ]
            const aliasFilter = aliasKeys.length
              ? new RegExp(
                  `^(?:${aliasKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`
                )
              : /(?!)/

            return {
              name: 'one:alias',
              enforce: 'pre',
              resolveId: {
                filter: { id: aliasFilter },
                handler(source) {
                  const env = this.environment?.name

                  // specific env wins over general
                  const specific = env ? resolved[env as keyof typeof resolved] : null
                  if (specific && source in specific) {
                    return { id: specific[source], external: false }
                  }

                  // fall back to general (web/native)
                  const isWeb = !env || env === 'client' || env === 'ssr'
                  const general = isWeb ? resolved.web : resolved.native
                  if (general && source in general) {
                    return { id: general[source], external: false }
                  }
                },
              },
            } satisfies Plugin
          })(),
        ]
      : []),

    {
      // rolldown fails on deep react-native/Libraries/* imports during dep pre-bundling.
      // these are native-only paths that don't exist in react-native-web.
      name: 'one:redirect-rn-deep-imports',
      enforce: 'pre',

      // rust-side filter matching the two source patterns below, so the ~24k
      // non-matching imports in a build never enter js at all
      resolveId: {
        filter: { id: RN_DEEP_IMPORT_RE },
        handler(source) {
          if (
            this.environment?.name === 'client' ||
            this.environment?.name === 'ssr' ||
            this.environment?.name === 'worker'
          ) {
            return '\0rn-empty-module'
          }
        },
      },

      load: {
        filter: { id: exactRegex('\0rn-empty-module') },
        handler() {
          return 'export default {}; export {};'
        },
      },
    } satisfies Plugin,

    {
      name: 'one-aliases',
      enforce: 'pre',

      config() {
        let tslibLitePath = ''

        try {
          // temp fix for seeing
          // Could not read from file: modules/@vxrn/resolve/dist/esm/@vxrn/tslib-lite
          tslibLitePath = resolvePath('@vxrn/tslib-lite', process.cwd())
        } catch (err) {
          console.info(`Can't find tslib-lite, falling back to tslib`)
          if (process.env.DEBUG) {
            console.error(err)
          }
        }

        return {
          resolve: {
            alias: {
              // testing getting transition between routes working
              // 'use-sync-external-store/with-selector': resolvePath(
              //   'use-sync-external-store/shim/with-selector'
              // ),

              ...(tslibLitePath && {
                tslib: tslibLitePath,
              }),
            },
          },
        }
      },
    },

    {
      name: 'one:init-config',

      config() {
        const setupFileDefines = (() => {
          if (!options.setupFile) return {}

          let setupFiles: {
            client?: string
            server?: string
            ios?: string
            android?: string
          }

          if (typeof options.setupFile === 'string') {
            setupFiles = {
              client: options.setupFile,
              server: options.setupFile,
              ios: options.setupFile,
              android: options.setupFile,
            }
          } else if ('native' in options.setupFile) {
            setupFiles = {
              client: options.setupFile.client,
              server: options.setupFile.server,
              ios: options.setupFile.native,
              android: options.setupFile.native,
            }
          } else {
            setupFiles = options.setupFile
          }

          return {
            ...(setupFiles.client && {
              'process.env.ONE_SETUP_FILE_CLIENT': JSON.stringify(setupFiles.client),
            }),
            ...(setupFiles.server && {
              'process.env.ONE_SETUP_FILE_SERVER': JSON.stringify(setupFiles.server),
            }),
            ...(setupFiles.ios && {
              'process.env.ONE_SETUP_FILE_IOS': JSON.stringify(setupFiles.ios),
            }),
            ...(setupFiles.android && {
              'process.env.ONE_SETUP_FILE_ANDROID': JSON.stringify(setupFiles.android),
            }),
          }
        })()

        // if user overrides it use theirs
        const serverURL = process.env.ONE_SERVER_URL || vxrnOptions?.server.url

        return {
          // Platform env defined at root level for client (workaround for Vite bug with environment.client.define)
          define: {
            ...getPlatformEnvDefine('client'),
            ...setupFileDefines,

            ...(options.web?.defaultRenderMode && {
              'process.env.ONE_DEFAULT_RENDER_MODE': JSON.stringify(
                options.web.defaultRenderMode
              ),
              'import.meta.env.ONE_DEFAULT_RENDER_MODE': JSON.stringify(
                options.web.defaultRenderMode
              ),
            }),

            ...(process.env.NODE_ENV !== 'production' &&
              serverURL && {
                'process.env.ONE_SERVER_URL': JSON.stringify(serverURL),
                'import.meta.env.ONE_SERVER_URL': JSON.stringify(serverURL),
              }),

            ...(options.web?.linkPrefetch && {
              'process.env.ONE_LINK_PREFETCH': JSON.stringify(options.web.linkPrefetch),
            }),

            ...(options.web?.skewProtection !== undefined && {
              'process.env.ONE_SKEW_PROTECTION': JSON.stringify(
                options.web.skewProtection === true
                  ? 'true'
                  : options.web.skewProtection === false
                    ? 'false'
                    : options.web.skewProtection // 'proactive'
              ),
            }),

            ...(options.web?.suspendRoutes !== undefined && {
              'process.env.ONE_SUSPEND_ROUTES': JSON.stringify(
                options.web.suspendRoutes ? '1' : '0'
              ),
            }),
          },

          environments: {
            ssr: {
              define: getPlatformEnvDefine('ssr'),
            },
            ios: {
              define: {
                ...getPlatformEnvDefine('ios'),
                ...(nativeOptions?.suspendRoutes !== undefined && {
                  'process.env.ONE_SUSPEND_ROUTES_NATIVE': JSON.stringify(
                    nativeOptions.suspendRoutes ? '1' : '0'
                  ),
                }),
              },
            },
            android: {
              define: {
                ...getPlatformEnvDefine('android'),
                ...(nativeOptions?.suspendRoutes !== undefined && {
                  'process.env.ONE_SUSPEND_ROUTES_NATIVE': JSON.stringify(
                    nativeOptions.suspendRoutes ? '1' : '0'
                  ),
                }),
              },
            },
          },

          ssr: {
            // ensure server-only/client-only go through vite so our environmentGuardPlugin can handle them
            noExternal: ['server-only', 'client-only'],
          },
        }
      },
    } satisfies Plugin,

    {
      name: 'one:tamagui',
      config() {
        return {
          define: {
            // safe to set because it only affects web in tamagui, and one is always react 19
            'process.env.TAMAGUI_REACT_19': '"1"',
          },

          environments: {
            ssr: {
              define: {
                'process.env.TAMAGUI_IS_SERVER': '"1"',
                'process.env.TAMAGUI_KEEP_THEMES': '"1"',
              },
            },
            ios: {
              define: {
                'process.env.TAMAGUI_KEEP_THEMES': '"1"',
              },
            },
            android: {
              define: {
                'process.env.TAMAGUI_KEEP_THEMES': '"1"',
              },
            },
          },
        }
      },
    } satisfies Plugin,

    createRouteModuleHmrPlugin(routerRoot),

    // Plugins may transform the source code and add imports of `react/jsx-dev-runtime`, which won't be discovered by Vite's initial `scanImports` since the implementation is using ESbuild where such plugins are not executed.
    // Thus, if the project has a valid `react/jsx-dev-runtime` import, we tell Vite to optimize it, so Vite won't only discover it on the next page load and trigger a full reload.
    {
      name: 'one:optimize-dev-deps',

      config(_, env) {
        if (env.mode === 'development') {
          return {
            optimizeDeps: {
              include: ['react/jsx-dev-runtime', 'react/compiler-runtime'],
            },
          }
        }
      },
    } satisfies Plugin,

    {
      name: 'one:remove-server-from-client',
      enforce: 'pre',

      // both conditions are rust-side: only one-server-only modules that
      // actually contain the import cross into js
      transform: {
        filter: {
          id: /one-server-only/,
          code: 'import { AsyncLocalStorage } from "node:async_hooks"',
        },
        handler(code) {
          if (this.environment.name !== 'client') return
          return code.replace(
            `import { AsyncLocalStorage } from "node:async_hooks"`,
            `class AsyncLocalStorage {}`
          )
        },
      },
    },

    // packages in resolve.dedupe must also be pre-bundled for SSR to prevent
    // duplicate module instances (e.g. symlinked monorepo packages resolving
    // to different paths)
    {
      name: 'one:ssr-dedupe-prebundle',

      config(config) {
        if (!dedupeSymlinks) return
        const dedupeList = config.resolve?.dedupe
        if (!Array.isArray(dedupeList) || dedupeList.length === 0) return

        return {
          ssr: {
            optimizeDeps: {
              include: [...dedupeList],
            },
            noExternal: [...dedupeList],
          },
        }
      },
    },

    // fix: vite's ssr dep optimizer registers pre-bundled deps by their
    // node_modules path, but symlinks cause imports to resolve to the real
    // (source) path. the optimizer doesn't recognize the real path, so it
    // loads from source — creating a duplicate instance.
    // this plugin forces optimized SSR deps to resolve via node_modules.
    // off by default, and every hook bails on `!dedupeSymlinks`, so skip
    // registering it entirely rather than paying a napi round trip per import
    ...(dedupeSymlinks ? [ssrSymlinkDedupPlugin] : []),
  ] satisfies Plugin[]

  // TODO move to single config and through environments
  const nativeWebDevAndProdPlugsin: Plugin[] = [clientTreeShakePlugin()]

  // TODO make this passed into vxrn through real API
  if (!nativeDisabled) {
    globalThis.__vxrnAddNativePlugins = [clientTreeShakePlugin({ runtime: 'rolldown' })]
  }
  globalThis.__vxrnAddWebPluginsProd = devAndProdPlugins

  const flags: One.Flags = {}
  const routeIndex = createRouteIndex({
    routerRoot: path.resolve(root, routerRoot),
    ignoredRouteFiles: options.router?.ignoredRouteFiles,
  })

  // pass config to the rolldown native entry (createNativeDevEngine reads this)
  if (!nativeDisabled) {
    globalThis.__vxrnNativeEntryConfig = {
      routerRoot: routerRoot,
      ignoredRouteFiles: options.router?.ignoredRouteFiles,
      linking: options.router?.linking,
      setupFile: options.setupFile,
      flags,
    }
  }

  // source inspector must come before clientTreeShakePlugin so line numbers
  // are computed from original source (tree-shaking removes loader code, shifting lines)
  const inspectorPlugins = (() => {
    const devtools = options.devtools ?? true
    const inspector =
      devtools === true || (devtools !== false && (devtools.inspector ?? true))
    const editor = devtools !== true && devtools !== false ? devtools.editor : undefined
    return inspector ? sourceInspectorPlugin({ editor }) : []
  })()

  const workerdDevPlugins = shouldEnableWorkerdDev(options.web?.deploy, root)
    ? createWorkerdDevPlugins(options, root, routeIndex)
    : []

  return [
    ...workerdDevPlugins,
    ...vxrnPlugins,
    ...devAndProdPlugins,
    ...inspectorPlugins,
    ...nativeWebDevAndProdPlugsin,

    /**
     * This is really the meat of one, where it handles requests:
     */
    createFileSystemRouterPlugin(options, routeIndex),

    generateFileSystemRouteTypesPlugin(options, routeIndex),

    fixDependenciesPlugin(options.patches),

    createVirtualEntry({
      ...options,
      flags,
      root: routerRoot,
      routeIndex,
    }),

    {
      name: 'one-define-environment',
      config() {
        return {
          define: {
            ...(nativeOptions?.key && {
              'process.env.ONE_APP_NAME': JSON.stringify(nativeOptions.key),
              'import.meta.env.ONE_APP_NAME': JSON.stringify(nativeOptions.key),
            }),

            'process.env.ONE_CACHE_KEY': JSON.stringify(CACHE_KEY),
            'import.meta.env.ONE_CACHE_KEY': JSON.stringify(CACHE_KEY),
          },
        }
      },
    } satisfies Plugin,

    SSRCSSPlugin({
      entries: [virtualEntryId],
    }),

    // devtools (always includes refresh preamble for HMR, optionally includes UI)
    ...(() => {
      const devtools = options.devtools ?? true
      const includeUI = devtools !== false
      return [
        // always include devtools plugin for refresh preamble (required for HMR)
        createDevtoolsPlugin({ includeUI }),
      ]
    })(),
  ]
}
// vite 8
