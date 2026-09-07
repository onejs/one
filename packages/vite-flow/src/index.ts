import type { FilterPattern, PluginOption } from 'vite'
import { createFilter } from 'vite'
import { transformFlow, transformFlowBabel } from './transformFlowBabel'

export { transformFlow, transformFlowBabel } from './transformFlowBabel'

export type Options = {
  include?: FilterPattern
  exclude?: FilterPattern
}

export default function createFlowPlugin(opts?: Options): PluginOption {
  if (!opts?.include || (Array.isArray(opts.include) && opts.include.length === 0)) {
    return
  }

  const filter = createFilter(opts?.include, opts?.exclude)

  return {
    name: '@vxrn/vite-flow',
    enforce: 'pre',
    transform(code, id) {
      if (filter(id)) {
        return transformFlow(code, { path: id })
      }
      return null
    },
  }
}
