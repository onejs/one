import type { ResolvedConfig } from 'vite'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import micromatch from 'micromatch'
import { getDefaultConfig } from '@react-native/metro-config'

// metro itself is loaded from the app so its cli and config stay aligned.
// the base config belongs to this package and matches its react-native peer.
import type { loadConfig as loadConfigT } from 'metro'

import { findUserBabelConfig } from '@vxrn/compiler'
import { projectImport, projectResolve } from '../utils/projectImport'
import { getTerminalReporter } from '../utils/getTerminalReporter'
import type { MetroPluginOptions } from '../plugins/metroPlugin'
import type { ExtraConfig, MetroConfigExtended } from './types'

type MetroInputConfig = Parameters<typeof loadConfigT>[1]

const WATCHMAN_PROBE_TIMEOUT_MS = 2000
const watchmanResponsivePromises = new Map<string, Promise<boolean>>()
let didWarnAboutWatchmanFallback = false
const rootIndexBundleRequestPattern = /^(https?:\/\/[^/]+)?\/index\.bundle(?=$|[?#])/
// keep app build output and volatile caches out of Metro's fallback watcher.
// package dist directories remain visible because Metro resolves modules from them.
const metroWatchExclusions = [
  /[/\\]dist[/\\](?:static|server)(?:[/\\]|$)/,
  /[/\\]tests[/\\][^/\\]+[/\\]dist(?:[/\\]|$)/,
  /[/\\]\.docker(?:[/\\]|$)/,
  /[/\\]\.vite(?:[/\\]|$)/,
  /[/\\]node_modules[/\\]\.vxrn(?:[/\\]|$)/,
]

function getPlatformFromBundleUrl(url: string): 'ios' | 'android' {
  const platform = url.match(/[?&]platform=(ios|android)(?:&|$)/)?.[1]
  return platform === 'android' ? 'android' : 'ios'
}

function rewriteMainModuleBundleUrl(
  url: string,
  resolveMainModuleName: (p: { platform: 'ios' | 'android' }) => string
) {
  const resolvedMainModulePath = resolveMainModuleName({
    platform: getPlatformFromBundleUrl(url),
  })

  return url.replace(rootIndexBundleRequestPattern, `$1/${resolvedMainModulePath}.bundle`)
}

async function isWatchmanResponsive(projectRoot: string) {
  let probe = watchmanResponsivePromises.get(projectRoot)
  if (probe) {
    return probe
  }

  probe = new Promise<boolean>((resolve) => {
    let settled = false

    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve(value)
    }

    const child = spawn('watchman', ['watch-project', projectRoot], {
      stdio: 'ignore',
    })

    const timeout = setTimeout(() => {
      child.kill()
      finish(false)
    }, WATCHMAN_PROBE_TIMEOUT_MS)

    child.once('error', () => {
      finish(false)
    })

    child.once('exit', (code) => {
      finish(code === 0)
    })
  })

  watchmanResponsivePromises.set(projectRoot, probe)
  return probe
}

/**
 * Decides whether Metro runs the native worker or the babel transformer.
 * No babel by default: the worker throws on a babel plugin it has no port
 * for, so opting back in is explicit rather than something you drift into.
 * When a user adds a custom babel config, respect it rather than forcing
 * native transforms, unless explicitly overridden. Shared by both config
 * builders so the two never drift apart.
 */
function resolveNativeTransforms(
  projectRoot: string,
  metroPluginOptions: MetroPluginOptions
): { isNativeTransforms: boolean; userBabelConfigPath: string | null } {
  const userBabelConfigPath = projectRoot ? findUserBabelConfig(projectRoot) : null
  const hasUserBabelConfig = Boolean(userBabelConfigPath)

  const isNativeTransforms =
    process.env.ONE_METRO_NATIVE_TRANSFORMS === '0'
      ? false
      : process.env.ONE_METRO_NATIVE_TRANSFORMS === '1'
        ? true
        : metroPluginOptions.nativeTransforms === false
          ? false
          : metroPluginOptions.nativeTransforms === true
            ? true
            : hasUserBabelConfig
              ? false
              : true

  // the native worker runs no babel at all, so reaching it here means an
  // explicit override is about to silently drop the user's plugins. name the
  // ignored file rather than swallowing it.
  if (userBabelConfigPath && isNativeTransforms) {
    console.warn(
      `[vxrn/metro] Ignoring user babel config at ${userBabelConfigPath} because native transforms are explicitly enabled (nativeTransforms: true or ONE_METRO_NATIVE_TRANSFORMS=1). ` +
        `Port its plugins to nativeTransformModules, or set nativeTransforms: false (or ONE_METRO_NATIVE_TRANSFORMS=0) to use the babel transformer.`
    )
  }

  return { isNativeTransforms, userBabelConfigPath }
}

/**
 * Build the Metro config input WITHOUT calling Metro's `loadConfig`. Returns
 * the same shape Metro `loadConfig` expects as its second argument. Use this
 * from a project's `metro.config.cjs` so the outer `loadConfig` (driven by
 * the Metro CLI) is the only one that runs. this avoids infinite
 * recursion that would happen if the inner pipeline also called `loadConfig`
 * and re-read the same metro.config.cjs.
 */
export async function buildMetroConfigInputFromViteConfig(
  config: ResolvedConfig,
  metroPluginOptions: MetroPluginOptions
): Promise<{ defaultConfig: any; projectRoot: string; extraConfig: ExtraConfig }> {
  const extraConfig: ExtraConfig = {}
  const projectRoot = resolve(metroPluginOptions.argv?.projectRoot ?? config.root)
  const { mainModuleName, defaultConfigOverrides, watchman, excludeModules } =
    metroPluginOptions
  const useWatchman = watchman ?? (await isWatchmanResponsive(projectRoot))

  if (watchman === undefined && !useWatchman && !didWarnAboutWatchmanFallback) {
    didWarnAboutWatchmanFallback = true
    console.warn(
      '[vxrn/metro] Watchman is unavailable or unresponsive; falling back to Node file watching.'
    )
  }

  const _defaultConfig: MetroInputConfig = getDefaultConfig(projectRoot) as any

  if (mainModuleName) {
    const origRewriteRequestUrl = _defaultConfig!.server?.rewriteRequestUrl
    const resolveMainModuleName = () => mainModuleName

    extraConfig.getResolveMainModuleName = resolveMainModuleName

    // @ts-expect-error Metro 0.83 made this read-only in types but we need to patch it
    _defaultConfig!.server!.rewriteRequestUrl = (url) => {
      if (rootIndexBundleRequestPattern.test(url)) {
        return rewriteMainModuleBundleUrl(url, resolveMainModuleName)
      }
      return origRewriteRequestUrl?.(url) ?? url
    }
  }

  const existingBlockList = _defaultConfig?.resolver?.blockList
  const blockList: RegExp[] = [
    ...(existingBlockList
      ? Array.isArray(existingBlockList)
        ? existingBlockList
        : [existingBlockList]
      : []),
    ...metroWatchExclusions,
  ]

  // no babel by default. the worker throws on a babel plugin it has no port
  // for, so opting back in is explicit rather than something you drift into.
  // When a user adds a custom babel config, respect it rather than forcing native transforms.
  const { isNativeTransforms } = resolveNativeTransforms(projectRoot, metroPluginOptions)

  let nativeWorkerPath: string | undefined
  if (isNativeTransforms) {
    // must resolve through createRequire: this module is also built as ESM,
    // where a bare require.resolve is not defined.
    nativeWorkerPath = projectResolve(
      projectRoot,
      '@vxrn/vite-plugin-metro/transformer/metroNativeWorker'
    )
  }

  const defaultConfig: MetroInputConfig = {
    ..._defaultConfig,
    resolver: {
      ..._defaultConfig?.resolver,
      useWatchman,
      blockList,
      sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'mjs', 'cjs'], // `one` related packages are using `.mjs` extensions. This fixes `.native` files not being resolved correctly when `.mjs` files are present.
      resolveRequest: (context, moduleName, platform) => {
        const origResolveRequestFn =
          _defaultConfig?.resolver?.resolveRequest || context.resolveRequest

        if (excludeModules && excludeModules.length > 0) {
          if (micromatch.isMatch(moduleName, excludeModules)) {
            return origResolveRequestFn(
              context,
              '@vxrn/vite-plugin-metro/empty',
              platform
            )
          }
        }

        // HACK: Do not assert the "import" condition for `@babel/runtime`.
        // Resolves the "TypeError: _interopRequireDefault is not a function (it is Object)" error.
        if (moduleName.startsWith('@babel/runtime')) {
          const contextOverride = {
            ...context,
            unstable_conditionNames: context.unstable_conditionNames.filter(
              (c) => c !== 'import'
            ),
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
    },
    // transformerPath is a TOP-LEVEL metro config key, not a transformer option.
    // nesting it under transformer silently leaves metro on its default worker.
    ...(nativeWorkerPath ? { transformerPath: nativeWorkerPath } : {}),
    reporter: await getTerminalReporter(projectRoot),
  }

  const merged = {
    ...defaultConfig,
    ...(typeof defaultConfigOverrides === 'function'
      ? defaultConfigOverrides(defaultConfig)
      : defaultConfigOverrides),
  }

  return { defaultConfig: merged, projectRoot, extraConfig }
}

export async function getMetroConfigFromViteConfig(
  config: ResolvedConfig,
  metroPluginOptions: MetroPluginOptions
): Promise<MetroConfigExtended> {
  const extraConfig: ExtraConfig = {}
  // prefer argv.projectRoot (user override) over config.root (vite resolved)
  // this is needed for monorepo setups where config.root may resolve to
  // the monorepo root instead of the app subdirectory
  const projectRoot = resolve(metroPluginOptions.argv?.projectRoot ?? config.root)
  const { mainModuleName, argv, defaultConfigOverrides, watchman, excludeModules } =
    metroPluginOptions
  const useWatchman = watchman ?? (await isWatchmanResponsive(projectRoot))

  if (watchman === undefined && !useWatchman && !didWarnAboutWatchmanFallback) {
    didWarnAboutWatchmanFallback = true
    console.warn(
      '[vxrn/metro] Watchman is unavailable or unresponsive; falling back to Node file watching.'
    )
  }

  const { loadConfig } = await projectImport<{
    loadConfig: typeof loadConfigT
  }>(projectRoot, 'metro')
  const _defaultConfig: MetroInputConfig = getDefaultConfig(projectRoot) as any

  if (mainModuleName) {
    const origRewriteRequestUrl = _defaultConfig!.server?.rewriteRequestUrl
    const resolveMainModuleName = () => mainModuleName

    extraConfig.getResolveMainModuleName = resolveMainModuleName

    // @ts-expect-error Metro 0.83 made this read-only in types but we need to patch it
    _defaultConfig!.server!.rewriteRequestUrl = (url) => {
      if (rootIndexBundleRequestPattern.test(url)) {
        return rewriteMainModuleBundleUrl(url, resolveMainModuleName)
      }

      return origRewriteRequestUrl?.(url) ?? url
    }
  }

  const existingBlockList = _defaultConfig?.resolver?.blockList
  const blockList: RegExp[] = [
    ...(existingBlockList
      ? Array.isArray(existingBlockList)
        ? existingBlockList
        : [existingBlockList]
      : []),
    ...metroWatchExclusions,
  ]

  // no babel by default. the worker throws on a babel plugin it has no port
  // for, so opting back in is explicit rather than something you drift into.
  // When a user adds a custom babel config, respect it rather than forcing native transforms.
  const { isNativeTransforms } = resolveNativeTransforms(projectRoot, metroPluginOptions)

  let nativeWorkerPath: string | undefined
  if (isNativeTransforms) {
    // must resolve through createRequire: this module is also built as ESM,
    // where a bare require.resolve is not defined.
    nativeWorkerPath = projectResolve(
      projectRoot,
      '@vxrn/vite-plugin-metro/transformer/metroNativeWorker'
    )
  }

  const defaultConfig: MetroInputConfig = {
    ..._defaultConfig,
    resolver: {
      ..._defaultConfig?.resolver,
      useWatchman,
      blockList,
      sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'mjs', 'cjs'], // `one` related packages are using `.mjs` extensions. This somehow fixes `.native` files not being resolved correctly when `.mjs` files are present.
      resolveRequest: (context, moduleName, platform) => {
        const origResolveRequestFn =
          _defaultConfig?.resolver?.resolveRequest || context.resolveRequest

        // Handle excludeModules - resolve excluded modules to empty module using glob patterns
        if (excludeModules && excludeModules.length > 0) {
          if (micromatch.isMatch(moduleName, excludeModules)) {
            return origResolveRequestFn(
              context,
              '@vxrn/vite-plugin-metro/empty',
              platform
            )
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
            unstable_conditionNames: context.unstable_conditionNames.filter(
              (c) => c !== 'import'
            ),
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
    },
    // transformerPath is a TOP-LEVEL metro config key, not a transformer option.
    // nesting it under transformer silently leaves metro on its default worker.
    ...(nativeWorkerPath ? { transformerPath: nativeWorkerPath } : {}),
    reporter: await getTerminalReporter(projectRoot),
  }

  const metroConfig = await loadConfig(
    {
      cwd: projectRoot,
      projectRoot,
      'reset-cache': !!process.env.METRO_RESET_CACHE,
      ...argv,
    },
    {
      ...defaultConfig,
      ...(typeof defaultConfigOverrides === 'function'
        ? defaultConfigOverrides(defaultConfig)
        : defaultConfigOverrides),
    }
  )

  return {
    ...metroConfig,
    ...extraConfig,
  } as MetroConfigExtended
}
