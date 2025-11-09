import type { ResolvedConfig } from 'vite'
import micromatch from 'micromatch'

// For Metro and Expo, we only import types here.
// We use `projectImport` to dynamically import the actual modules
// at runtime to ensure they are loaded from the user's project root.
import type { loadConfig as loadConfigT } from 'metro'
import type { getDefaultConfig as getDefaultConfigT } from '@expo/metro-config'

import { projectImport, projectResolve } from '../utils/projectImport'
import { getTerminalReporter } from '../utils/getTerminalReporter'
import { patchExpoGoManifestHandlerMiddlewareWithCustomMainModuleName } from '../utils/patchExpoGoManifestHandlerMiddlewareWithCustomMainModuleName'
import type { MetroPluginOptions } from '../plugins/metroPlugin'
import type { ExtraConfig, MetroConfigExtended } from './types'

type MetroInputConfig = Parameters<typeof loadConfigT>[1]

export async function getMetroConfigFromViteConfig(
  config: ResolvedConfig,
  metroPluginOptions: MetroPluginOptions
): Promise<MetroConfigExtended> {
  const extraConfig: ExtraConfig = {}
  const { root: projectRoot } = config
  const { mainModuleName, argv, defaultConfigOverrides, watchman, excludeModules } =
    metroPluginOptions

  const { loadConfig } = await projectImport<{
    loadConfig: typeof loadConfigT
  }>(projectRoot, 'metro')
  const { getDefaultConfig } = await projectImport<{
    getDefaultConfig: typeof getDefaultConfigT
  }>(projectRoot, '@expo/metro-config')

  const _defaultConfig: MetroInputConfig = getDefaultConfig(projectRoot) as any

  if (mainModuleName) {
    const origRewriteRequestUrl = _defaultConfig!.server!.rewriteRequestUrl!

    // We need to patch Expo's default `config.server.rewriteRequestUrl`
    // to change how URLs like '/.expo/.virtual-metro-entry.bundle?' are
    // rewritten.
    // But since that function is difficult to override, here we borrow
    // the ExpoGoManifestHandlerMiddleware and use it to resolve the
    // URL to the main module name.
    const resolveMainModuleName: (p: { platform: 'ios' | 'android' }) => string =
      await (async () => {
        const ExpoGoManifestHandlerMiddleware = (
          await projectImport(
            projectRoot,
            '@expo/cli/build/src/start/server/middleware/ExpoGoManifestHandlerMiddleware.js'
          )
        ).default.ExpoGoManifestHandlerMiddleware

        const manifestHandlerMiddleware = new ExpoGoManifestHandlerMiddleware(projectRoot, {})

        patchExpoGoManifestHandlerMiddlewareWithCustomMainModuleName(
          manifestHandlerMiddleware,
          mainModuleName
        )

        return (p) => {
          return manifestHandlerMiddleware.resolveMainModuleName({
            pkg: { main: mainModuleName },
            platform: p.platform,
          })
        }
      })()

    extraConfig.getResolveMainModuleName = resolveMainModuleName

    _defaultConfig!.server!.rewriteRequestUrl = (url) => {
      if (url.includes('/.expo/.virtual-metro-entry.bundle?')) {
        const resolvedMainModulePath = resolveMainModuleName({
          platform: 'ios', // we probably need to handle android here, but currently in our use case this won't affect the result
        })

        return url.replace('.expo/.virtual-metro-entry', resolvedMainModulePath)
      }

      return origRewriteRequestUrl(url)
    }
  }

  const defaultConfig: MetroInputConfig = {
    ..._defaultConfig,
    resolver: {
      ..._defaultConfig?.resolver,
      ...(watchman !== undefined ? { useWatchman: watchman } : {}),
      sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'mjs', 'cjs'], // `one` related packages are using `.mjs` extensions. This somehow fixes `.native` files not being resolved correctly when `.mjs` files are present.
      resolveRequest: (context, moduleName, platform) => {
        const origResolveRequestFn =
          _defaultConfig?.resolver?.resolveRequest || context.resolveRequest

        // Handle excludeModules - resolve excluded modules to empty module using glob patterns
        if (excludeModules && excludeModules.length > 0) {
          if (micromatch.isMatch(moduleName, excludeModules)) {
            return origResolveRequestFn(context, '@vxrn/vite-plugin-metro/empty', platform)
          }
        }

        // HACK: Do not assert the "import" condition for `@babel/runtime`. This
        // is a workaround for ESM <-> CJS interop, as we need the CJS versions of
        // `@babel/runtime` helpers.
        //
        // This hack is originally made in Metro and was removed in `v0.81.3`, but
        // we somehow still need it.
        // See: https://github.com/facebook/metro/commit/9552a64a0487af64cd86d8591e203a55c59c9686#diff-b03f1b511a2be7abd755b9c2561e47f513f84931466f2cc20a17a4238d70f12bL370-L378
        //
        // Resolves the "TypeError: _interopRequireDefault is not a function (it is Object)" error.
        if (moduleName.startsWith('@babel/runtime')) {
          const contextOverride = {
            ...context,
            unstable_conditionNames: context.unstable_conditionNames.filter((c) => c !== 'import'),
          }
          return origResolveRequestFn(contextOverride, moduleName, platform)
        }

        return origResolveRequestFn(context, moduleName, platform)
      },
    },
    transformer: {
      ..._defaultConfig?.transformer,
      babelTransformerPath: projectResolve(
        projectRoot,
        '@vxrn/vite-plugin-metro/babel-transformer'
      ),
      // TODO: This is what Expo is doing, but do we really need this?
      // Doing so seems to make the release build broken since assets will be
      // copied to /.../Xcode/DerivedData/.../Build/Products/Release-iphonesimulator/...app/assets/?unstable_path=.%2Fsrc%2Fimages/logo.png
      // publicPath: '/assets/?unstable_path=.',
    },
    reporter: await getTerminalReporter(projectRoot),
  }

  const metroConfig = await loadConfig(
    {
      cwd: projectRoot,
      projectRoot,
      'reset-cache': !!process.env.METRO_RESET_CACHE, // TODO: `--clean`
      ...argv,
    },
    {
      ...defaultConfig,
      ...(typeof defaultConfigOverrides === 'function'
        ? defaultConfigOverrides(defaultConfig)
        : defaultConfigOverrides),
    }
  )

  // @ts-expect-error TODO
  return {
    ...metroConfig,
    ...extraConfig,
  }
}
