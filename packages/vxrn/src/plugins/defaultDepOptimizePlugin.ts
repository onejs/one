import type { Plugin } from 'vite'
// import { createDebugger } from '@vxrn/debug'
import { getOptimizeDeps } from '../config/getOptimizeDeps'
import { deepMergeOptimizeDeps } from '../config/mergeUserConfig'

const pluginName = 'vxrn:default-dep-optimize'

// const { debug, debugDetails } = createDebugger(pluginName)

/**
 * Plugin to set the config for pre-bundling dependencies that we already know
 * are needed and listed in `getOptimizeDeps`.
 *
 * This currently is only used in non-CLI mode since CLI this is done by `getViteServerConfig` in dev or config building logic in `vxrn/src/exports/build.ts` on build.
 */
export function defaultDepOptimizePlugin(): Plugin {
  return {
    name: pluginName,
    enforce: 'pre',
    config(config, env) {
      if (env.command !== 'build' && env.command !== 'serve') {
        throw new Error(
          `[${pluginName}]: Unknown env.command "${env.command}". This plugin should only be used in "build" or "serve" modes.`
        )
      }

      const { optimizeDeps } = getOptimizeDeps(env.command, config.root)

      // On dev, CLI mode will use `getViteServerConfig` which calls `mergeUserConfig` to merge
      // user defined configs with vxrn defaults. The `mergeUserConfig` function have a
      // "side effect" that will also populates some `optimizeDeps` and `noExternal` configs.
      // `mergeUserConfig` will call `deepMergeOptimizeDeps` under the hood to merge two configs
      // in-place and also handle adding stuff from `getOptimizeDeps`.
      // Logic in `deepMergeOptimizeDeps` is a bit complex and we don't want to refactor it for now,
      // so we just call it here to ensure `optimizeDeps` and `noExternal` configs are set as likely
      // same as in CLI mode.
      if (!config.ssr) config.ssr = {}
      deepMergeOptimizeDeps(config.ssr, {}, optimizeDeps)
    },
  } satisfies Plugin
}
