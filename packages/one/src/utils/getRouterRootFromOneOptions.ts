import type { One } from '../vite/types'

export function getRouterRootFromOneOptions(options: One.PluginOptions) {
  return options?.router?.root || process.env.ONE_ROUTER_ROOT || 'app'
}
