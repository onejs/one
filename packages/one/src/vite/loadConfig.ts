import { loadConfigFromFile } from 'vite'
import '../polyfills-server'
import type { One } from './types'

let oneOptions: One.PluginOptions | null = null

export function setOneOptions(next: One.PluginOptions) {
  oneOptions = next
}

async function getUserOneOptions(command?: 'serve' | 'build') {
  if (!oneOptions) {
    if (!command) throw new Error(`Options not loaded and no command given`)
    await loadUserOneOptions(command)
  }
  if (!oneOptions) {
    throw new Error(`No One options were loaded`)
  }
  return oneOptions
}

export async function loadUserOneOptions(command: 'serve' | 'build') {
  const found = await loadConfigFromFile({
    mode: 'prod',
    command,
  })
  if (!found) {
    throw new Error(`No config found in ${process.cwd()}. Is this the correct directory?`)
  }
  const foundOptions = getUserOneOptions(command)
  if (!foundOptions) {
    throw new Error(`No One plugin found in this vite.config`)
  }
  return foundOptions
}
