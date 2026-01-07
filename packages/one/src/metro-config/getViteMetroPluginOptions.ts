import type { metroPlugin } from '@vxrn/vite-plugin-metro'
import mm from 'micromatch'
import module from 'node:module'
import path from 'node:path'
import tsconfigPaths from 'tsconfig-paths'
import {
  API_ROUTE_GLOB_PATTERN,
  ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS,
} from '../router/glob-patterns'

export function getViteMetroPluginOptions({
  projectRoot,
  relativeRouterRoot,
  ignoredRouteFiles,
  userDefaultConfigOverrides,
  setupFile,
}: {
  projectRoot: string
  relativeRouterRoot: string
  ignoredRouteFiles?: Array<`**/*${string}`>
  userDefaultConfigOverrides?: NonNullable<
    Parameters<typeof metroPlugin>[0]
  >['defaultConfigOverrides']
  setupFile?: string | { native?: string; ios?: string; android?: string }
}): Parameters<typeof metroPlugin>[0] {
  const tsconfigPathsConfigLoadResult = tsconfigPaths.loadConfig(projectRoot)

  if (tsconfigPathsConfigLoadResult.resultType === 'failed') {
    throw new Error('tsconfigPathsConfigLoadResult.resultType is not success')
  }

  const require = module.createRequire(projectRoot)
  const emptyPath = require.resolve('@vxrn/vite-plugin-metro/empty', {
    paths: [projectRoot],
  })

  const metroEntryPath = require.resolve('one/metro-entry', {
    paths: [projectRoot],
  })

  const routerRequireContextRegexString = (() => {
    const excludeRes = [
      ...(ignoredRouteFiles || []).map((pattern) => mm.makeRe(pattern)),
      ...ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS.map((pattern) => mm.makeRe(pattern)),
      mm.makeRe(API_ROUTE_GLOB_PATTERN),
    ]

    const supportedRegexMustStartWith = String.raw`^(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?`
    // biome-ignore lint/complexity/noUselessStringRaw: keep original code
    const supportedRegexMustEndWith = String.raw`)$`

    const negativeLookaheadGroups = excludeRes.map((re, i) => {
      /**
       * Example:
       * ```
       * ^(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?\+api\.(ts|tsx))$
       * ```
       */
      const reSource = re.source

      if (
        !(
          reSource.startsWith(supportedRegexMustStartWith) &&
          reSource.endsWith(supportedRegexMustEndWith)
        )
      ) {
        const ignoredRouteFile = ignoredRouteFiles?.[i]

        if (ignoredRouteFile) {
          throw new Error(
            `[one/metro] ignoredRouteFile pattern "${ignoredRouteFile}" is not supported. We cannot process the corresponding regex "${reSource}" for now.`
          )
        }

        throw new Error(`Unsupported regex "${reSource}" in "ignoredRouteFiles".`)
      }

      const rePart = reSource.slice(
        supportedRegexMustStartWith.length,
        reSource.length - supportedRegexMustEndWith.length
      )

      // biome-ignore lint/complexity/noUselessStringRaw: keep original code
      return String.raw`(?:.*${rePart})`
    })

    return String.raw`^(?:\.\/)(?!${negativeLookaheadGroups.join('|')}$).*\.tsx?$`
  })()

  return {
    defaultConfigOverrides: (defaultConfig) => {
      let config: typeof defaultConfig = {
        ...defaultConfig,
        resolver: {
          ...defaultConfig?.resolver,
          extraNodeModules: {
            ...defaultConfig?.resolver?.extraNodeModules,
            // "vite-tsconfig-paths" for Metro
            // Commenting out since we are using babel-plugin-module-resolver alias instead
            // ...Object.fromEntries(
            //   Object.entries(tsconfigPathsConfigLoadResult.paths)
            //     .map(([k, v]) => {
            //       if (k.endsWith('/*') && v[0]?.endsWith('/*')) {
            //         const key = k.replace(/\/\*$/, '')
            //         let value = v[0].replace(/\/\*$/, '')

            //         value = path.join(tsconfigPathsConfigLoadResult.absoluteBaseUrl, value)

            //         return [key, value]
            //       }
            //     })
            //     .filter((i): i is NonNullable<typeof i> => !!i)
            // ),
          },
          nodeModulesPaths: tsconfigPathsConfigLoadResult.absoluteBaseUrl
            ? [
                // "vite-tsconfig-paths" for Metro
                tsconfigPathsConfigLoadResult.absoluteBaseUrl,
                ...(defaultConfig?.resolver?.nodeModulesPaths || []),
              ]
            : defaultConfig?.resolver?.nodeModulesPaths,
          resolveRequest: (context, moduleName, platform) => {
            if (moduleName.endsWith('.css')) {
              console.warn(
                `[one/metro] *.css files are ignored for now, resolving ${moduleName} to empty module.`
              )
              return {
                type: 'sourceFile',
                filePath: emptyPath,
              }
            }

            // On Vite side this is done by excludeAPIAndMiddlewareRoutesPlugin
            if (/_middleware.tsx?$/.test(moduleName)) {
              return {
                type: 'sourceFile',
                filePath: emptyPath,
              }
            }

            const defaultResolveRequest =
              defaultConfig?.resolver?.resolveRequest || context.resolveRequest
            const res = defaultResolveRequest(context, moduleName, platform)
            return res
          },
        },
      }

      if (typeof userDefaultConfigOverrides === 'function') {
        config = userDefaultConfigOverrides(config)
      } // TODO: support if userDefaultConfigOverrides is an object, or do not let userDefaultConfigOverrides be an object at all?

      return config
    },
    babelConfig: {
      plugins: [
        // Remove server-only code (loader, generateStaticParams) from route files
        // This must run early to prevent server-only imports from being bundled
        [
          'one/babel-plugin-remove-server-code',
          {
            routerRoot: relativeRouterRoot,
          },
        ],
        [
          'babel-plugin-module-resolver',
          {
            // "vite-tsconfig-paths" for Metro
            alias: Object.fromEntries(
              Object.entries(tsconfigPathsConfigLoadResult.paths).map(([k, v]) => {
                const key = (() => {
                  if (k.endsWith('/*')) {
                    return k.replace(/\/\*$/, '')
                  }

                  // If the key does not end with "/*", only alias exact matches.
                  // Ref: https://www.npmjs.com/package/babel-plugin-module-resolver/v/3.0.0#regular-expression-alias
                  return `${k}$`
                })()

                let value = v[0].replace(/\/\*$/, '')

                if (!value.startsWith('./')) {
                  value = `./${value}`
                }

                return [key, value]
              })
            ),
          },
        ],
        [
          'one/babel-plugin-one-router-metro',
          {
            ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY: path.relative(
              path.dirname(metroEntryPath),
              path.join(projectRoot, relativeRouterRoot)
            ),
            ONE_ROUTER_ROOT_FOLDER_NAME: relativeRouterRoot,
            ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING: routerRequireContextRegexString,
            ONE_SETUP_FILE_NATIVE: (() => {
              if (!setupFile) return undefined
              // Extract native setup file path
              const nativeSetupFile =
                typeof setupFile === 'string'
                  ? setupFile
                  : setupFile.native || setupFile.ios || setupFile.android
              if (!nativeSetupFile) return undefined
              // Return path relative to metro entry
              return path.relative(
                path.dirname(metroEntryPath),
                path.join(projectRoot, nativeSetupFile)
              )
            })(),
          },
        ],
      ],
    },
  }
}
