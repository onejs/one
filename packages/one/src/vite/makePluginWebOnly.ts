import type { Plugin } from 'vite'

export function makePluginWebOnly(plugin: Plugin) {
  const og = plugin.transform as any

  if (og) {
    plugin.transform = function (this, ...args) {
      if (this.environment.name !== 'client') {
        return
      }
      return og.call(this, ...args)
    }
  }

  return plugin
}
