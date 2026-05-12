import { loadConfigFromFile } from 'vite'
import '../polyfills-server'
import type { One } from './types'

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
