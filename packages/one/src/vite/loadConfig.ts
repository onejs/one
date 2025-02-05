import { loadConfigFromFile } from 'vite'
import '../polyfills-server'
import type { One } from './types'

// globalThis, otherwise we get issues with duplicates due to however vite calls loadConfigFromFile

export function setOneOptions(next: One.PluginOptions) {
  globalThis.__oneOptions = next
}

async function getUserOneOptions() {
  if (!globalThis.__oneOptions) {
    throw new Error(`One not loaded properly, is the one() plugin in your vite.config.ts?`)
  }
  return globalThis.__oneOptions as One.PluginOptions
}

export async function loadUserOneOptions(command: 'serve' | 'build') {
  const found = await loadConfigFromFile({
    mode: 'prod',
    command,
  })
  if (!found) {
    throw new Error(`No config found in ${process.cwd()}. Is this the correct directory?`)
  }
  const foundOptions = getUserOneOptions()
  if (!foundOptions) {
    throw new Error(`No One plugin found in this vite.config`)
  }
  return foundOptions
}
