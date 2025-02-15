import { loadConfigFromFile } from 'vite'
import '../polyfills-server'
import type { One } from './types'

// globalThis, otherwise we get issues with duplicates due to however vite calls loadConfigFromFile

export function setOneOptions(next: One.PluginOptions) {
  globalThis.__oneOptions = next
}

function getUserOneOptions() {
  if (!globalThis.__oneOptions) {
    throw new Error(`One not loaded properly, is the one() plugin in your vite.config.ts?`)
  }
  return globalThis.__oneOptions as One.PluginOptions
}

export async function loadUserOneOptions(command: 'serve' | 'build') {
  const config = await loadConfigFromFile({
    mode: command === 'serve' ? 'dev' : 'prod',
    command,
  })

  if (!config) {
    throw new Error(`No config config in ${process.cwd()}. Is this the correct directory?`)
  }

  const oneOptions = getUserOneOptions()

  if (!oneOptions) {
    throw new Error(`No One plugin config in this vite.config`)
  }

  return {
    config,
    oneOptions,
  }
}
