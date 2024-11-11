import { transformCommonJs } from '@vxrn/vite-native-swc'
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

export async function transformFlowFast(input: string) {
  const { default: removeFlowTypes } = await import('flow-remove-types')
  const stripped = removeFlowTypes(input).toString() as string

  return stripped
  // this freezes, likely due to not transforming react-native somehow properly, but not sure exactly how
  // return (await transformCommonJs('file.jsx', stripped))?.code
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
