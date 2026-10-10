import type { Plugin } from 'vite'
import { renderKotlinSourceModule } from './kotlinSourceModule'

// the contract parser loads on the first .kt import, so an app without one
// never evaluates it.
export function kotlinSourcePlugin(platform: 'ios' | 'android', root: string): Plugin {
  return {
    name: 'one:kotlin-source',
    load: {
      filter: { id: /\.kt$/ },
      handler(id) {
        const { code, watchFiles } = renderKotlinSourceModule(id, platform, root)
        for (const file of watchFiles) this.addWatchFile(file)
        return code
      },
    },
  }
}
