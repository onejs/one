import { dirname, resolve, relative } from 'node:path'
import { readFileSync } from 'node:fs'
import {
  transformBackgroundComputations,
  loadBackgroundComputationModule,
  backgroundDirectiveSource,
} from '../backgroundComputation'
import type { Plugin } from 'rolldown'

export function backgroundComputationPlugin(platform: 'web' | 'native'): Plugin {
  return {
    name: `one:background-computation:${platform}`,
    transform: {
      order: 'pre',
      filter: { code: /defineBackgroundComputation|use background/ },
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
      filter: {
        id: /\.__one_background_worker_[a-f0-9]+\.js(?:\?.*)?$|\?one-background-pure$/,
      },
      handler(source) {
        if (source.endsWith('?one-background-pure')) return source
        if (platform === 'web' && loadBackgroundComputationModule(source)) return source
      },
    },
    load(id) {
      if (id.endsWith('?one-background-pure')) {
        const path = id.slice(0, -'?one-background-pure'.length)
        this.addWatchFile(path)
        return backgroundDirectiveSource(readFileSync(path, 'utf8'), path)?.code
      }
      if (platform === 'web') return loadBackgroundComputationModule(id)?.source
    },
  }
}
