import type { metroPlugin } from '@vxrn/vite-plugin-metro'
import module from 'node:module'
import path from 'node:path'
import tsconfigPaths from 'tsconfig-paths'

export function getViteMetroPluginOptions({
  projectRoot,
  relativeRouterRoot,
}: {
  projectRoot: string
  relativeRouterRoot: string
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
          },
        ],
      ],
    },
  }
}
