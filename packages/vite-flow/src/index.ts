import type { FilterPattern, PluginOption } from 'vite'
import { createFilter } from 'vite'
import { transformFlowBabel } from './transformFlowBabel'

export async function transformFlow(
  input: string,
  { development = false }: { development?: boolean } = {}
) {
  const final = await transformFlowBabel(input)

  return final
}

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
        return transformFlow(code)
      }
      return null
    },
  }
}
