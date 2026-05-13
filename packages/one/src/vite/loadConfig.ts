import { loadConfigFromFile } from 'vite'
import '../polyfills-server'
import type { One } from './types'

/// Read `build.outDir` from the user's `vite.config.ts` without instantiating
/// the full One plugin chain. Used by `serve.ts` to resolve where
/// `buildInfo.json` lives when `--outDir` and the cwd-`buildInfo.json` UX both
/// miss. Returns `undefined` when there's no vite.config or `build.outDir`
/// isn't set.
///
/// Why the `IS_VXRN_CLI` + `globalThis` isolation: `one()` (the plugin) has
/// two branches keyed off `process.env.IS_VXRN_CLI`. In the CLI branch (which
/// `one build` enters by setting that env var) the plugin just stashes user
/// options into globals and returns an empty plugin list. In the non-CLI
/// branch it pushes `vxrnVitePlugin` and runs the full Vite-native dev path —
/// `configResolved` hooks, file watchers, server middleware. `one serve` does
/// NOT set `IS_VXRN_CLI`, so a naïve `loadConfigFromFile` call inside `serve`
/// would instantiate the full plugin chain, leak watchers / globals, and break
/// the subsequent `vxrn/serve` startup (manifests as flaking SPA navigation
/// tests in CI). Mirror the isolation `loadUserOneOptions` already uses: set
/// the env var + clear stale globals before the call, restore in `finally`.
///
/// The optional `configRoot` lets tests target a fixture directory without
/// having to `chdir` the whole vitest worker. Defaults to `process.cwd()`,
/// matching the production call site in `serve.ts`.
export async function loadViteBuildOutDir(
  configRoot?: string
): Promise<string | undefined> {
  const previousIsVxrnCli = process.env.IS_VXRN_CLI
  const previousOneOptions = globalThis['__oneOptions']
  const previousVxrnPluginConfig = globalThis['__vxrnPluginConfig__']
  const previousVxrnMetroOptions = globalThis['__vxrnMetroOptions__']

  try {
    process.env.IS_VXRN_CLI = 'true'
    delete globalThis['__oneOptions']
    delete globalThis['__vxrnPluginConfig__']
    delete globalThis['__vxrnMetroOptions__']

    const loaded = await loadConfigFromFile(
      { command: 'serve', mode: 'production' },
      undefined,
      configRoot
    )
    return loaded?.config?.build?.outDir as string | undefined
  } finally {
    if (previousIsVxrnCli === undefined) {
      delete process.env.IS_VXRN_CLI
    } else {
      process.env.IS_VXRN_CLI = previousIsVxrnCli
    }
    globalThis['__oneOptions'] = previousOneOptions
    globalThis['__vxrnPluginConfig__'] = previousVxrnPluginConfig
    globalThis['__vxrnMetroOptions__'] = previousVxrnMetroOptions
  }
}

// globalThis, otherwise we get issues with duplicates due to however vite calls loadConfigFromFile

export function setOneOptions(next: One.PluginOptions) {
  globalThis.__oneOptions = next
}

function getUserOneOptions() {
  if (!globalThis.__oneOptions) {
    throw new Error(
      `One not loaded properly, is the one() plugin in your vite.config.ts?`
    )
  }
  return globalThis.__oneOptions as One.PluginOptions
}

export async function loadUserOneOptions(command: 'serve' | 'build', silent = false) {
  // Suppress console output if silent
  const originalConsoleError = console.error
  const previousIsVxrnCli = process.env.IS_VXRN_CLI
  const previousOneOptions = globalThis['__oneOptions']
  const previousVxrnPluginConfig = globalThis['__vxrnPluginConfig__']
  const previousVxrnMetroOptions = globalThis['__vxrnMetroOptions__']

  if (silent) {
    console.error = () => {}
  }

  try {
    process.env.IS_VXRN_CLI = 'true'
    delete globalThis['__oneOptions']
    delete globalThis['__vxrnPluginConfig__']
    delete globalThis['__vxrnMetroOptions__']

    const config = await loadConfigFromFile({
      mode: command === 'serve' ? 'dev' : 'prod',
      command,
    })

    if (!config) {
      throw new Error(
        `No config config in ${process.cwd()}. Is this the correct directory?`
      )
    }

    const oneOptions = getUserOneOptions()

    if (!oneOptions) {
      throw new Error(`No One plugin config in this vite.config`)
    }

    return {
      config,
      oneOptions,
      metroOptions: globalThis['__vxrnMetroOptions__'],
    }
  } catch (error) {
    globalThis['__oneOptions'] = previousOneOptions
    globalThis['__vxrnPluginConfig__'] = previousVxrnPluginConfig
    globalThis['__vxrnMetroOptions__'] = previousVxrnMetroOptions
    throw error
  } finally {
    if (previousIsVxrnCli === undefined) {
      delete process.env.IS_VXRN_CLI
    } else {
      process.env.IS_VXRN_CLI = previousIsVxrnCli
    }

    if (silent) {
      console.error = originalConsoleError
    }
  }
}
