import type { metroPlugin } from '@vxrn/vite-plugin-metro'
import module from 'node:module'
import path from 'node:path'
import tsconfigPaths from 'tsconfig-paths'
import mm from 'micromatch'
import { API_ROUTE_GLOB_PATTERN } from '../router/glob-patterns'

export function getViteMetroPluginOptions({
  projectRoot,
  relativeRouterRoot,
  ignoredRouteFiles,
}: {
  projectRoot: string
  relativeRouterRoot: string
  ignoredRouteFiles?: Array<`**/*${string}`>
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
      mm.makeRe(API_ROUTE_GLOB_PATTERN),
    ]

    const supportedRegexMustStartWith = String.raw`^(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?`
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

      return String.raw`(?:.*${rePart})`
    })

    return String.raw`^(?:\.\/)(?!${negativeLookaheadGroups.join('|')}$).*\.tsx?$`
  })()

  return {
    defaultConfigOverrides: (defaultConfig) => {
      return {
        ...defaultConfig,
        resolver: {
          ...defaultConfig?.resolver,
          extraNodeModules: {
            ...defaultConfig?.resolver?.extraNodeModules,
            // "vite-tsconfig-paths" for Metro
            ...Object.fromEntries(
              Object.entries(tsconfigPathsConfigLoadResult.paths)
                .map(([k, v]) => {
                  if (k.endsWith('/*') && v[0]?.endsWith('/*')) {
                    const key = k.replace(/\/\*$/, '')
                    let value = v[0].replace(/\/\*$/, '')

                    value = path.join(tsconfigPathsConfigLoadResult.absoluteBaseUrl, value)

                    return [key, value]
                  }
                })
                .filter((i): i is NonNullable<typeof i> => !!i)
            ),
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
    },
    babelConfig: {
      plugins: [
        [
          'babel-plugin-module-resolver',
          {
            alias: {
              ...Object.fromEntries(
                Object.entries(tsconfigPathsConfigLoadResult.paths).map(([k, v]) => {
                  const key = k.replace(/\/\*$/, '')
                  let value = v[0].replace(/\/\*$/, '')

                  if (!value.startsWith('./')) {
                    value = `./${value}`
                  }

                  return [key, value]
                })
              ),
            },
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
          },
        ],
      ],
    },
  }
}
