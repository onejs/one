import { dirname, resolve, relative } from 'node:path'
import {
  transformBackgroundComputations,
  loadBackgroundComputationModule,
} from '../backgroundComputation'
import type { Plugin } from 'rolldown'

export function backgroundComputationPlugin(platform: 'web' | 'native'): Plugin {
  return {
    name: `one:background-computation:${platform}`,
    transform: {
      order: 'pre',
      filter: { code: /defineBackgroundComputation/ },
      handler(code, id) {
        return transformBackgroundComputations(code, id, {
          platform,
          resolve: (source, importer) => resolve(dirname(importer), source),
          workerFactory: (module) =>
            `() => new Worker(new URL(${JSON.stringify(`./${relative(dirname(id), module.id).replaceAll('\\', '/')}`)}, import.meta.url), { type: 'module' })`,
        })
      },
    },
    resolveId: {
      filter: { id: /\.__one_background_worker_[a-f0-9]+\.js(?:\?.*)?$/ },
      handler(source) {
        if (platform === 'web' && loadBackgroundComputationModule(source)) return source
      },
    },
    load(id) {
      if (platform === 'web') return loadBackgroundComputationModule(id)?.source
    },
  }
}
