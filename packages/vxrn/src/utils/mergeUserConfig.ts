import { mergeConfig, type DepOptimizationConfig, type UserConfig } from 'vite'
import { coerceToArray } from './coerceToArray'
import { uniq } from './uniq'

type OptimizeDepsConf = {
  include: string[]
  exclude: string[]
  needsInterop: string[]
  esbuildOptions: {
    resolveExtensions: string[]
  }
}

type DepsOptConf = {
  optimizeDeps?: DepOptimizationConfig
  noExternal?: string | true | RegExp | (string | RegExp)[] | undefined
}

export function mergeUserConfig(
  optimizeDeps: OptimizeDepsConf,
  serverConfig: UserConfig,
  userViteConfig?: UserConfig | null
) {
  if (userViteConfig) {
    serverConfig = mergeConfig(serverConfig, userViteConfig) as any

    if (serverConfig.ssr?.noExternal && !Array.isArray(serverConfig.ssr?.noExternal)) {
      throw new Error(`ssr.noExternal must be array`)
    }

    deepAssignDepsOptimizationConfig(serverConfig, userViteConfig, optimizeDeps)

    // vite doesnt merge arrays but we want that
    // TODO move to `server` environment
    serverConfig.ssr ||= {}
    userViteConfig.ssr ||= {}
    deepAssignDepsOptimizationConfig(serverConfig.ssr, userViteConfig.ssr, optimizeDeps)
  }
}

function deepAssignDepsOptimizationConfig(
  a: DepsOptConf,
  b: DepsOptConf,
  extraDepsOpt: OptimizeDepsConf
) {
  a.optimizeDeps ||= {}
  b.optimizeDeps ||= {}

  a.noExternal = uniq([
    ...coerceToArray((a.noExternal as string[]) || []),
    ...(a.optimizeDeps.include || []),
    ...(b.optimizeDeps.include || []),
    ...coerceToArray(b.noExternal || []),
    ...extraDepsOpt.include,
    'react',
    'react-dom',
    'react-dom/server',
    'react-dom/client',
  ])

  a.optimizeDeps.exclude = uniq([
    ...(a.optimizeDeps.exclude || []),
    ...(b.optimizeDeps.exclude || []),
    ...extraDepsOpt.exclude,
  ])

  a.optimizeDeps.include = uniq([
    ...(a.optimizeDeps.include || []),
    ...(b.optimizeDeps.include || []),
    ...extraDepsOpt.include,
  ])

  a.optimizeDeps.needsInterop = uniq([
    ...(a.optimizeDeps.needsInterop || []),
    ...(b.optimizeDeps.needsInterop || []),
    ...extraDepsOpt.needsInterop,
  ])

  a.optimizeDeps.esbuildOptions = {
    ...(a.optimizeDeps.esbuildOptions || {}),
    ...(b.optimizeDeps.esbuildOptions || {}),
    ...extraDepsOpt.esbuildOptions,
  }
}
