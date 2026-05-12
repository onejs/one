import module from 'node:module'
import path from 'node:path'

export type BuildOneMetroResolverOverridesOptions = {
  projectRoot: string
}

export type MetroConfigLike = { resolver?: Record<string, any> } | undefined

/**
 * Build the Metro resolver overrides One needs for native bundles.
 *
 * Used by getViteMetroPluginOptions, which feeds these into the same
 * getMetroConfigFromViteConfig pipeline both production native bundles and
 * standalone Metro invocations (expo export, eas update) go through. The
 * overrides handle One-specific concerns: server-only stripping, .css → empty,
 * _middleware → empty, react-native-svg fix.
 *
 * Returns a function that takes Metro's default config and produces an
 * overridden config. Callers compose any additional overrides on top.
 */
export function buildOneMetroResolverOverrides({
  projectRoot,
}: BuildOneMetroResolverOverridesOptions): <T extends MetroConfigLike>(
  defaultConfig: T
) => T {
  const require = module.createRequire(projectRoot + '/')
  const emptyPath = require.resolve('@vxrn/vite-plugin-metro/empty', {
    paths: [projectRoot],
  })

  return <T extends MetroConfigLike>(defaultConfig: T): T => {
    const resolver: Record<string, any> = {
      ...defaultConfig?.resolver,
      extraNodeModules: {
        ...defaultConfig?.resolver?.extraNodeModules,
      },
      nodeModulesPaths: defaultConfig?.resolver?.nodeModulesPaths,
      resolveRequest: (context: any, moduleName: string, platform: string) => {
        if (moduleName.endsWith('.css')) {
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

        // server-only files should never be in the native bundle.
        // metro follows dynamic import chains (e.g. zero models →
        // server effects → server packages) and tries to resolve
        // everything, even though the code only runs on the server.
        if (/\.server(\.[jt]sx?)?$/.test(moduleName)) {
          return {
            type: 'sourceFile',
            filePath: emptyPath,
          }
        }

        // react-native-svg's package.json has "react-native": "src/index.ts"
        // which points to TS source that only type-exports Svg/Circle/Path etc.
        // force resolution to the compiled JS which has proper named value exports.
        if (moduleName === 'react-native-svg') {
          const defaultResolveRequest =
            defaultConfig?.resolver?.resolveRequest || context.resolveRequest
          const res = defaultResolveRequest(context, moduleName, platform)
          const svgSrcSuffix = `${path.sep}src${path.sep}index.ts`
          if (res && 'filePath' in res && res.filePath.includes(svgSrcSuffix)) {
            return {
              ...res,
              filePath: res.filePath.replace(
                svgSrcSuffix,
                `${path.sep}lib${path.sep}commonjs${path.sep}index.js`
              ),
            }
          }
          return res
        }

        const defaultResolveRequest =
          defaultConfig?.resolver?.resolveRequest || context.resolveRequest
        const res = defaultResolveRequest(context, moduleName, platform)

        // catch .server files that were resolved by path
        if (res && 'filePath' in res && /\.server\.[jt]sx?$/.test(res.filePath)) {
          return { type: 'sourceFile', filePath: emptyPath }
        }

        return res
      },
    }

    return {
      ...(defaultConfig as any),
      resolver,
    } as T
  }
}
