import {
  type DepOptimizationConfig,
  loadConfigFromFile,
  mergeConfig,
  type InlineConfig,
  type UserConfig,
} from 'vite'
import { reactNativeHMRPlugin } from '../plugins/reactNativeHMRPlugin'
import { expoManifestRequestHandlerPlugin } from '../plugins/expoManifestRequestHandlerPlugin'
import { coerceToArray } from './coerceToArray'
import { getBaseViteConfig } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { uniq } from './uniq'
import mkcert from 'vite-plugin-mkcert'

export async function getViteServerConfig(config: VXRNOptionsFilled) {
  const { root, host, https, port } = config
  const { optimizeDeps } = getOptimizeDeps('serve')
  const { config: userViteConfig } =
    (await loadConfigFromFile({
      mode: 'dev',
      command: 'serve',
    })) ?? {}

  let serverConfig: UserConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'development',
    }),
    {
      root,
      appType: 'custom',
      clearScreen: false,
      publicDir: 'public',
      plugins: [
        https ? mkcert() : null,

        reactNativeHMRPlugin(config),

        expoManifestRequestHandlerPlugin({
          projectRoot: root,
          port,
        }),

        // TODO very hacky/arbitrary
        {
          name: 'process-env-ssr',
          transform(code, id, options) {
            if (id.includes('node_modules')) return
            if (code.includes('process.env.TAMAGUI_IS_SERVER')) {
              return code.replaceAll('process.env.TAMAGUI_IS_SERVER', `${!!options?.ssr}`)
            }
          },
        },
      ],

      optimizeDeps,

      server: {
        hmr: {
          path: '/__vxrnhmr',
        },
        cors: true,
        host,
      },
    } satisfies UserConfig
  ) satisfies InlineConfig

  if (userViteConfig) {
    serverConfig = mergeConfig(serverConfig, userViteConfig) as any
  }

  if (serverConfig.ssr?.noExternal && !Array.isArray(serverConfig.ssr?.noExternal)) {
    throw new Error(`ssr.noExternal must be array`)
  }

  // vite doesnt merge arrays but we want that

  if (userViteConfig) {
    // TODO move to `server` environment
    serverConfig.ssr ||= {}
    userViteConfig.ssr ||= {}
    deepAssignDepsOptimizationConfig(serverConfig.ssr, userViteConfig.ssr, optimizeDeps)
  }

  // manually merge
  if (process.env.DEBUG) {
    console.debug('merged config is', JSON.stringify(serverConfig, null, 2))
  }

  return serverConfig
}

type DepsOptConf = {
  optimizeDeps?: DepOptimizationConfig
  noExternal?: string | true | RegExp | (string | RegExp)[] | undefined
}

type UserOptimizeDeps = {
  include: string[]
  exclude: string[]
  needsInterop: string[]
  esbuildOptions: {
    resolveExtensions: string[]
  }
}

function deepAssignDepsOptimizationConfig(
  a: DepsOptConf,
  b: DepsOptConf,
  extraDepsOpt: UserOptimizeDeps
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
